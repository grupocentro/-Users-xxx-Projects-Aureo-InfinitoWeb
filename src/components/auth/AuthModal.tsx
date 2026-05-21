import {
  createContext, useCallback, useContext, useMemo, useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Waves, Eye, EyeOff, Loader2, ShieldCheck, X, Mail, Lock,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// =============================================================================
// AuthModal — login + registro dentro del mismo sitio, sin abandonar la página.
// =============================================================================
// Reutiliza la lógica de Supabase Auth existente (signInWithPassword + signUp).
// Expone `useAuthModal()` para abrir desde cualquier componente con intención
// de redirect opcional (ej. compra de entradas → llevar a /comprar tras login).
// =============================================================================

type AuthMode = "login" | "register";

type OpenOptions = {
  /** Modo inicial al abrir: login (default) o register */
  mode?: AuthMode;
  /** Ruta interna a la que navegar tras login/registro exitoso. Default: /mi-cuenta */
  redirect?: string;
};

type AuthModalContextValue = {
  open: boolean;
  openAuth: (opts?: OpenOptions) => void;
  closeAuth: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used inside <AuthModalProvider>");
  return ctx;
}

// Sanitiza la ruta de redirect: sólo permite rutas internas que comiencen con
// "/" pero no con "//", y bloquea destinos administrativos para un cliente.
function safeRedirect(raw: string | null | undefined, fallback = "/mi-cuenta"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.startsWith("/admin") || raw.startsWith("/staff") || raw.startsWith("/sistemas")) return fallback;
  return raw;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [redirect, setRedirect] = useState<string>("/mi-cuenta");

  const openAuth = useCallback((opts?: OpenOptions) => {
    setMode(opts?.mode ?? "login");
    setRedirect(safeRedirect(opts?.redirect ?? null));
    setOpen(true);
  }, []);

  const closeAuth = useCallback(() => setOpen(false), []);

  const ctxValue = useMemo(() => ({ open, openAuth, closeAuth }), [open, openAuth, closeAuth]);

  return (
    <AuthModalContext.Provider value={ctxValue}>
      {children}
      <AuthModalContent
        open={open}
        mode={mode}
        setMode={setMode}
        redirect={redirect}
        onClose={closeAuth}
      />
    </AuthModalContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Modal content
// ──────────────────────────────────────────────────────────────────────────────
function AuthModalContent({
  open, mode, setMode, redirect, onClose,
}: {
  open: boolean;
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  redirect: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="
          p-0 overflow-hidden border-0
          max-w-md w-[calc(100vw-1rem)]
          sm:max-w-md sm:w-auto
          rounded-3xl
          bg-transparent
          shadow-none
        "
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl shadow-water-500/25 backdrop-blur-xl">
          {/* Glow ambient */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-water-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-48 w-48 rounded-full bg-water-200/30 blur-3xl" />

          {/* Botón cerrar */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-white/80 text-app-muted backdrop-blur-md transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="relative px-6 pt-7 pb-3 text-center sm:px-8 sm:pt-8">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-water-400 to-water-700 shadow-lg shadow-water-500/40">
              <Waves className="h-6 w-6 text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-water-600">
              Infinito Water Park
            </p>
            <h2 className="mt-1 text-xl font-bold text-water-800 sm:text-2xl">
              {mode === "login" ? "Ingresá a tu cuenta" : "Crear tu cuenta"}
            </h2>
            <p className="mt-1 text-sm text-app-muted">
              {mode === "login"
                ? "Accedé a tus entradas, compras y códigos QR"
                : "Registrate para comprar entradas y guardar tus QR"}
            </p>
          </div>

          {/* Tabs login / registro */}
          <div className="relative px-6 sm:px-8">
            <div className="mx-auto flex max-w-xs items-center gap-1 rounded-full border border-app-border bg-water-50/60 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  mode === "login"
                    ? "bg-white text-water-800 shadow-sm"
                    : "text-app-muted hover:text-water-700"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  mode === "register"
                    ? "bg-white text-water-800 shadow-sm"
                    : "text-app-muted hover:text-water-700"
                }`}
              >
                Registrarme
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="relative px-6 pb-7 pt-5 sm:px-8 sm:pb-8">
            {mode === "login" ? (
              <LoginForm redirect={redirect} onClose={onClose} onSwitchToRegister={() => setMode("register")} />
            ) : (
              <RegisterForm redirect={redirect} onClose={onClose} onSwitchToLogin={() => setMode("login")} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LoginForm
// ──────────────────────────────────────────────────────────────────────────────
function LoginForm({
  redirect, onClose, onSwitchToRegister,
}: {
  redirect: string;
  onClose: () => void;
  onSwitchToRegister: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: "No pudimos iniciar tu sesión",
        description: friendlyAuthError(error.message),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setLoading(false);
    toast({ title: "¡Bienvenido!" });
    onClose();
    navigate(redirect, { replace: false });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="auth-email" className="text-xs font-medium text-water-700">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className="h-11 rounded-xl border-app-border bg-white pl-9 focus-visible:ring-water-400"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="auth-password" className="text-xs font-medium text-water-700">Contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <Input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 rounded-xl border-app-border bg-white pl-9 pr-10 focus-visible:ring-water-400"
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
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Ingresando...</span>
        ) : (
          "Iniciar sesión"
        )}
      </Button>

      <div className="space-y-1 pt-1 text-center text-sm">
        <button
          type="button"
          onClick={() => { onClose(); navigate("/reset-password"); }}
          className="block w-full font-medium text-water-600 hover:text-water-800 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </button>
        <p className="text-app-muted">
          ¿Todavía no tenés cuenta?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-water-600 hover:text-water-800 hover:underline"
          >
            Registrate
          </button>
        </p>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// RegisterForm
// ──────────────────────────────────────────────────────────────────────────────
function RegisterForm({
  redirect, onClose, onSwitchToLogin,
}: {
  redirect: string;
  onClose: () => void;
  onSwitchToLogin: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  // Captcha matemático regenerado cada vez que el form se monta (cambio de mode)
  const [captcha] = useState(() => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b, result: a + b };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(captchaAnswer, 10) !== captcha.result) {
      toast({
        title: "Verificación incorrecta",
        description: `Resolvé: ${captcha.a} + ${captcha.b}`,
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Contraseña muy corta",
        description: "Tu contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido, whatsapp },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "No pudimos crear tu cuenta",
        description: friendlyAuthError(error.message),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setLoading(false);

    // Si Supabase devolvió sesión (auto-confirm activado), seguimos al destino.
    // Si no hay sesión, mostramos mensaje de confirmación por email y cambiamos a login.
    if (data.session) {
      toast({ title: "¡Cuenta creada!", description: "Bienvenido a Infinito Water Park." });
      onClose();
      navigate(redirect, { replace: false });
    } else {
      toast({
        title: "¡Registro exitoso!",
        description: "Revisá tu email para confirmar tu cuenta. Después podés iniciar sesión.",
      });
      onSwitchToLogin();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="reg-nombre" className="text-xs font-medium text-water-700">Nombre</Label>
          <Input
            id="reg-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            autoComplete="given-name"
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-apellido" className="text-xs font-medium text-water-700">Apellido</Label>
          <Input
            id="reg-apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            required
            autoComplete="family-name"
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-xs font-medium text-water-700">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <Input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className="h-10 rounded-xl pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-whatsapp" className="text-xs font-medium text-water-700">WhatsApp</Label>
        <Input
          id="reg-whatsapp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+54 9 11 1234-5678"
          autoComplete="tel"
          className="h-10 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-xs font-medium text-water-700">Contraseña</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            className="h-10 rounded-xl pl-9 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-water-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-captcha" className="flex items-center gap-1.5 text-xs font-medium text-water-700">
          <ShieldCheck className="h-3.5 w-3.5 text-water-500" />
          Verificación: ¿Cuánto es {captcha.a} + {captcha.b}?
        </Label>
        <Input
          id="reg-captcha"
          type="number"
          value={captchaAnswer}
          onChange={(e) => setCaptchaAnswer(e.target.value)}
          required
          placeholder="Tu respuesta"
          className="h-10 max-w-[140px] rounded-xl"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-water-500 to-water-700 text-base font-semibold text-white shadow-lg shadow-water-500/30 transition-all hover:from-water-600 hover:to-water-800 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</span>
        ) : (
          "Crear cuenta"
        )}
      </Button>

      <p className="pt-1 text-center text-sm text-app-muted">
        ¿Ya tenés cuenta?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium text-water-600 hover:text-water-800 hover:underline"
        >
          Iniciá sesión
        </button>
      </p>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Util: traducción amigable de errores comunes de Supabase Auth
// ──────────────────────────────────────────────────────────────────────────────
function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("user already registered") || m.includes("already registered")) {
    return "Este email ya está registrado. Probá iniciar sesión.";
  }
  if (m.includes("password should be at least")) return "La contraseña es muy corta (mínimo 6 caracteres).";
  if (m.includes("invalid email")) return "El email no parece válido.";
  if (m.includes("email not confirmed")) return "Revisá tu email y confirmá tu cuenta antes de iniciar sesión.";
  if (m.includes("network") || m.includes("fetch")) return "Problema de conexión. Intentá de nuevo.";
  return msg;
}
