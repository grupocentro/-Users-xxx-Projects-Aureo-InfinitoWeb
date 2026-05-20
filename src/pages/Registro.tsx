import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Waves, ArrowLeft, ShieldCheck } from "lucide-react";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    } else {
      toast({ title: "¡Registro exitoso!", description: "Revisá tu email para confirmar tu cuenta." });
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <button
            onClick={() => navigate("/")}
            className="absolute top-4 left-4 flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors px-3 py-1.5 rounded-full border border-border hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4" /> Inicio
          </button>
          <div className="flex justify-center mb-2">
            <Waves className="h-10 w-10 text-cyan-500" />
          </div>
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Registrate para comprar entradas</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+54 9 11 1234-5678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="captcha" className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Verificación: ¿Cuánto es {captchaNumbers.a} + {captchaNumbers.b}?
              </Label>
              <Input
                id="captcha"
                type="number"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                required
                placeholder="Tu respuesta"
                className="max-w-[140px]"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registrando..." : "Crear Cuenta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tenés cuenta? <Link to="/login" className="text-primary hover:underline">Iniciá sesión</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
