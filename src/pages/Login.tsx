import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Waves, ArrowLeft, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "¡Bienvenido!" });
    // Mandamos al selector: AdminSelector decide a dónde ir según rol
    // (admin/editor → cards, staff → scanner, sin rol → home).
    navigate("/admin/seleccionar");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-water-50 via-app-bg to-water-100 p-4">
      {/* Decoración acuática */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-water-200/50 blur-3xl" />
        <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-water-300/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-water-100/60 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-8 shadow-2xl shadow-water-500/20 backdrop-blur-xl">
          {/* Glow interno */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-water-300 to-water-500 opacity-20 blur-2xl" />

          <div className="relative">
            {/* Botón inicio */}
            <button
              onClick={() => navigate("/")}
              className="absolute -top-2 left-0 flex items-center gap-1.5 rounded-full border border-app-border bg-white/70 px-3 py-1.5 text-xs font-medium text-app-muted transition-colors hover:bg-water-50 hover:text-water-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Inicio
            </button>

            {/* Logo + título */}
            <div className="mb-8 flex flex-col items-center pt-6 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-water-400 to-water-700 shadow-lg shadow-water-500/40">
                <Waves className="h-8 w-8 text-white" />
              </div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-water-600">
                Infinito Water Park
              </p>
              <h1 className="text-2xl font-bold text-water-800">Iniciar sesión</h1>
              <p className="mt-1 text-sm text-app-muted">Ingresá a tu cuenta para continuar</p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-water-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="h-11 rounded-xl border-app-border bg-white/80 focus-visible:ring-water-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-water-700">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 rounded-xl border-app-border bg-white/80 pr-10 focus-visible:ring-water-400"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted transition-colors hover:text-water-700"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-water-500 to-water-700 text-base font-semibold text-white shadow-lg shadow-water-500/30 transition-transform hover:from-water-600 hover:to-water-800 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>

              <div className="space-y-2 pt-2 text-center text-sm">
                <Link
                  to="/reset-password"
                  className="block font-medium text-water-600 transition-colors hover:text-water-800 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
                <p className="text-app-muted">
                  ¿No tenés cuenta?{" "}
                  <Link to="/registro" className="font-medium text-water-600 hover:text-water-800 hover:underline">
                    Registrate
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
