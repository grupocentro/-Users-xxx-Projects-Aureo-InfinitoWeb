import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Waves, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// =============================================================================
// /cliente/registro — registro de visitantes del parque
// =============================================================================
// Misma lógica que el viejo Registro.tsx pero con estética premium acuática y
// redirección a /cliente/login (no al login interno).
// =============================================================================

export default function RegistroCliente() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Captcha matemático simple (anti-bots básico)
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaNumbers] = useState(() => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b, result: a + b };
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(captchaAnswer) !== captchaNumbers.result) {
      toast({ title: "Captcha incorrecto", description: "Resolvé la operación matemática correctamente.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido, whatsapp },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({ title: "Error al registrarse", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "¡Registro exitoso!", description: "Revisá tu email para confirmar tu cuenta." });
    navigate("/cliente/login?just_registered=true");
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
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-water-400 to-water-700 shadow-lg shadow-water-500/40">
              <Waves className="h-7 w-7 text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-water-600">
              Infinito Water Park
            </p>
            <h1 className="mt-1 text-2xl font-bold text-water-800">Crear tu cuenta</h1>
            <p className="mt-1 text-sm text-app-muted">
              Registrate para comprar entradas y guardar tus QR
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-7 shadow-xl shadow-water-500/15 backdrop-blur-xl">
            <button
              onClick={() => navigate("/")}
              className="absolute left-4 top-4 flex items-center gap-1 rounded-full border border-app-border bg-white/70 px-2.5 py-1 text-[11px] font-medium text-app-muted transition-colors hover:bg-water-50 hover:text-water-700"
            >
              <ArrowLeft className="h-3 w-3" /> Inicio
            </button>

            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className="text-xs font-medium text-water-700">Nombre</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    autoComplete="given-name"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apellido" className="text-xs font-medium text-water-700">Apellido</Label>
                  <Input
                    id="apellido"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    required
                    autoComplete="family-name"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

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
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-xs font-medium text-water-700">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  autoComplete="tel"
                  className="h-11 rounded-xl"
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
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="h-11 rounded-xl pr-10"
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
                <Label htmlFor="captcha" className="flex items-center gap-1.5 text-xs font-medium text-water-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-water-500" />
                  Verificación: ¿Cuánto es {captchaNumbers.a} + {captchaNumbers.b}?
                </Label>
                <Input
                  id="captcha"
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  required
                  placeholder="Tu respuesta"
                  className="h-11 max-w-[140px] rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-water-500 to-water-700 text-base font-semibold text-white shadow-lg shadow-water-500/30 transition-all hover:from-water-600 hover:to-water-800 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Registrando...
                  </span>
                ) : (
                  "Crear cuenta"
                )}
              </Button>

              <p className="text-center text-sm text-app-muted">
                ¿Ya tenés cuenta?{" "}
                <Link to="/cliente/login" className="font-medium text-water-600 hover:text-water-800 hover:underline">
                  Iniciá sesión
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
