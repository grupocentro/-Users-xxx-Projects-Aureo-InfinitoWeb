import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PinGate } from "@/components/login/PinGate";
import { LoginPanels } from "@/components/login/LoginPanels";
import {
  resolveDestination,
  type AppRole,
  type LoginPanel,
  isPinUnlockValid,
  markPinUnlocked,
  clearPinSession,
  pinUnlockRemainingMs,
} from "@/lib/access-control";

// =============================================================================
// /login — PIN gate (TTL 60s) + triple login + redirect por rol
// =============================================================================
// Flujo:
//   1. Si hay sesión activa → redirigir a /admin/seleccionar (no pedir PIN).
//   2. PinGate central — bloqueado hasta validar PIN.
//   3. PIN OK → sessionStorage(infinito-pin-ok=true, infinito-pin-unlocked-at=now).
//   4. Si pasan 60s sin login → re-lock automático y clear sessionStorage.
//   5. Usuario elige uno de los 3 paneles (Ticketera, Web, Sistemas).
//   6. signInWithPassword → query directa a user_roles (sin race condition).
//   7. resolveDestination(panel, role) → URL o null si sin permiso.
//   8. Sin permiso → signOut + mensaje específico en el panel elegido.
// =============================================================================

// Prioridad de roles (mayor a menor) — coherente con useUserRole.
const ROLE_PRIORITY: readonly AppRole[] = ["admin", "editor", "control_entradas"];

function highestRoleOf(roles: string[]): AppRole | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pinUnlocked, setPinUnlocked] = useState<boolean>(() => isPinUnlockValid());
  const [sessionCheckDone, setSessionCheckDone] = useState(false);

  // Si ya hay sesión activa, no pedir PIN: enviamos al selector que decide ruta.
  useEffect(() => {
    let cancel = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancel) return;
      if (data.session) {
        navigate("/admin/seleccionar", { replace: true });
      } else {
        setSessionCheckDone(true);
      }
    }).catch(() => { if (!cancel) setSessionCheckDone(true); });
    return () => { cancel = true; };
  }, [navigate]);

  // Programar la expiración del PIN: si pasa el TTL sin login, re-lock.
  useEffect(() => {
    if (!pinUnlocked) return;
    const remaining = pinUnlockRemainingMs();
    if (remaining <= 0) {
      clearPinSession();
      setPinUnlocked(false);
      return;
    }
    const t = setTimeout(() => {
      clearPinSession();
      setPinUnlocked(false);
    }, remaining);
    return () => clearTimeout(t);
  }, [pinUnlocked]);

  const handlePinUnlock = () => {
    markPinUnlocked();
    setPinUnlocked(true);
  };

  // Estado por panel
  const [tickLoading, setTickLoading] = useState(false);
  const [tickError, setTickError]     = useState<string | null>(null);
  const [webLoading, setWebLoading]   = useState(false);
  const [webError, setWebError]       = useState<string | null>(null);
  const [sistLoading, setSistLoading] = useState(false);
  const [sistError, setSistError]     = useState<string | null>(null);

  const handleLogin = async (panel: LoginPanel, email: string, password: string) => {
    const { data: signIn, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError) throw new Error(signInError.message || "No se pudo iniciar sesión.");
    const userId = signIn.user?.id;
    if (!userId) throw new Error("Sesión inválida.");

    // Query directa a user_roles (evita race con useUserRole).
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      await supabase.auth.signOut();
      throw new Error("No se pudieron verificar los permisos.");
    }

    const roleStrings = (rolesData ?? []).map((r) => r.role as string);
    const role = highestRoleOf(roleStrings);

    const destination = resolveDestination(panel, role);
    if (!destination) {
      await supabase.auth.signOut();
      const label = panel === "web" ? "Panel Web" : panel === "ticketera" ? "Panel Ticketera" : "Panel Sistemas";
      throw new Error(`No tenés permisos para acceder al ${label}.`);
    }
    return destination;
  };

  const wrap = (
    panel: LoginPanel,
    setLoading: (b: boolean) => void,
    setError: (s: string | null) => void,
  ) => async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const dest = await handleLogin(panel, email, password);
      toast({ title: "¡Bienvenido!" });
      navigate(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  // Aún chequeando sesión existente: pantalla en blanco breve para evitar flash.
  if (!sessionCheckDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-water-900" />
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, hsl(204 100% 36% / 0.55), transparent 60%)," +
          "radial-gradient(ellipse at 100% 60%, hsl(196 100% 43% / 0.35), transparent 55%)," +
          "linear-gradient(160deg, hsl(220 90% 16%) 0%, hsl(226 54% 8%) 100%)",
      }}
    >
      {/* Decoración acuática */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-15%] h-[40rem] w-[40rem] rounded-full bg-water-500/20 blur-3xl" />
        <div className="absolute right-[-15%] top-1/3 h-[35rem] w-[35rem] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-[-20%] left-1/4 h-[40rem] w-[40rem] rounded-full bg-violet-700/25 blur-3xl" />
      </div>

      {!pinUnlocked && (
        <div className="pointer-events-none absolute inset-0 bg-water-900/30 backdrop-blur-[2px]" aria-hidden />
      )}

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* Header */}
        <header className="relative mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            <Waves className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-white/90">Infinito</p>
          <p className="text-[10px] font-medium tracking-[0.5em] text-water-200/70">WATER PARK</p>
          <h1 className="mt-5 text-xl font-semibold text-white sm:text-2xl">Acceso Administrativo</h1>
          <p className="mt-1 text-sm text-water-200/70">
            Seleccioná el área a la que deseas ingresar
          </p>
        </header>

        {/* Triple panel + PIN gate overlapped */}
        <div className="relative flex w-full max-w-6xl items-center justify-center">
          <LoginPanels
            locked={!pinUnlocked}
            ticketera={{ loading: tickLoading, error: tickError }}
            web={{ loading: webLoading, error: webError }}
            sistemas={{ loading: sistLoading, error: sistError }}
            onTicketeraSubmit={wrap("ticketera", setTickLoading, setTickError)}
            onWebSubmit={wrap("web", setWebLoading, setWebError)}
            onSistemasSubmit={wrap("sistemas", setSistLoading, setSistError)}
          />

          {!pinUnlocked && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <PinGate onUnlock={handlePinUnlock} />
            </div>
          )}
        </div>

        <div className="mt-8 max-w-2xl rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center backdrop-blur-md">
          <p className="text-xs text-water-100/70">
            Si tenés problemas para acceder, contactá al administrador del sistema. Tu acceso está protegido con encriptación de extremo a extremo.
          </p>
        </div>

        <p className="mt-6 text-[11px] text-water-200/40">
          Infinito Water Park © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
