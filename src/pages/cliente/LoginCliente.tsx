import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Waves, Eye, EyeOff, Loader2, ArrowLeft, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// =============================================================================
// /cliente/login — login simple para visitantes del parque
// =============================================================================
// Sin PIN. Sin triple panel. Sin chequeo de rol obligatorio.
// Si el usuario tiene rol interno (admin/editor/control_entradas), se le ofrece
// el atajo al login administrativo sin signOut forzado.
// Acepta ?redirect=<ruta> para volver al destino original tras login.
// Acepta ?just_registered=true para mostrar banner de confirmación.
// =============================================================================

const INTERNAL_ROLES = new Set(["admin", "editor", "control_entradas"]);

// Sanitiza el `?redirect=` para evitar open redirect: sólo aceptamos rutas
// internas que empiecen con "/" y NO con "//" (que sería protocol-relative).
function safeRedirect(raw: string | null): string {
  if (!raw) return "/mi-cuenta";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/mi-cuenta";
  // Bloqueamos rutas administrativas como destino de un cliente
  if (raw.startsWith("/admin") || raw.startsWith("/staff")) return "/mi-cuenta";
  return raw;
}

export default function LoginCliente() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const redirect = safeRedirect(params.get("redirect"));
  const justRegistered = params.get("just_registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [internalRoleNotice, setInternalRoleNotice] = useState(false);

  // Si ya hay sesión activa, salir directo al destino o /mi-cuenta. No es
  // necesario verificar rol interno acá: si el cliente es interno y volvió a
  // /cliente/login, igualmente puede ir a su perfil y desde ahí cambiar de panel.
  useEffect(() => {
    let cancel = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancel) return;
      if (data.session) navigate(redirect, { replace: true });
    });
    return () => { cancel = true; };
  }, [navigate, redirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInternalRoleNotice(false);

    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const userId = signIn.user?.id;
    if (!userId) {
      toast({ title: "Sesión inválida", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Chequeo no-bloqueante: si el usuario tiene rol interno, le ofrecemos
    // el atajo al login administrativo (sin signOut forzado).
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const hasInternalRole = (rolesData ?? []).some((r) => INTERNAL_ROLES.has(r.role as string));

    setLoading(false);

    if (hasInternalRole) {
      setInternalRoleNotice(true);
      return;
    }

    toast({ title: "¡Bienvenido!" });
    navigate(redirect, { replace: true });
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, hsl(196 100% 43% / 0.35), transparent 60%)," +
          "radial-gradient(ellipse at 100% 70%, hsl(204 100% 36% / 0.30), transparent 55%)," +
          "linear-gradient(180deg, hsl(204 60% 97%) 0%, hsl(196 100% 90%) 50%, hsl(204 60% 97%) 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-water-200/50 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-water-300/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-water-100/60 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-water-400 to-water-700 shadow-lg shadow-water-500/40">
              <Waves className="h-7 w-7 text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-water-600">
              Infinito Water Park
            </p>
            <h1 className="mt-1 text-2xl font-bold text-water-800">Tu cuenta de visitante</h1>
            <p className="mt-1 text-sm text-app-muted">
              Iniciá sesión para acceder a tus entradas y QR
            </p>
          </div>

          {/* Banner just_registered */}
          {justRegistered && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 backdrop-blur-md">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs text-emerald-800">
                ¡Cuenta creada! Revisá tu email para confirmar tu cuenta. Ya podés iniciar sesión.
              </p>
            </div>
          )}

          {/* Banner aviso usuario interno */}
          {internalRoleNotice && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 backdrop-blur-md">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Esta entrada es para visitantes.</p>
                  <p className="mt-0.5 text-xs text-amber-800">
                    Tu cuenta tiene acceso administrativo. Para entrar al panel interno, ingresá por <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px]">/login</code>.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="default" className="h-8" onClick={() => navigate("/login")}>
                      Ir al login interno
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => navigate("/mi-cuenta")}>
                      Continuar como visitante
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-7 shadow-xl shadow-water-500/15 backdrop-blur-xl">
            <button
              onClick={() => navigate("/")}
              className="absolute left-4 top-4 flex items-center gap-1 rounded-full border border-app-border bg-white/70 px-2.5 py-1 text-[11px] font-medium text-app-muted transition-colors hover:bg-water-50 hover:text-water-700"
            >
              <ArrowLeft className="h-3 w-3" /> Inicio
            </button>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-water-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="h-11 rounded-xl border-app-border bg-white focus-visible:ring-water-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-water-700">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 rounded-xl border-app-border bg-white pr-10 focus-visible:ring-water-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted transition-colors hover:text-water-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-water-500 to-water-700 text-base font-semibold text-white shadow-lg shadow-water-500/30 transition-all hover:from-water-600 hover:to-water-800 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Ingresando...
                  </span>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>

              <div className="space-y-1 pt-2 text-center text-sm">
                <Link to="/reset-password" className="block font-medium text-water-600 hover:text-water-800 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
                <p className="text-app-muted">
                  ¿Todavía no tenés cuenta?{" "}
                  <Link to="/cliente/registro" className="font-medium text-water-600 hover:text-water-800 hover:underline">
                    Registrate
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <p className="mt-5 text-center text-[11px] text-app-muted">
            ¿Sos staff o administrador?{" "}
            <Link to="/login" className="font-medium text-water-700 hover:underline">
              Ingresá por el acceso interno
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
