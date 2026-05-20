import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, QrCode, User, ShoppingBag, LogOut, MessageCircle, ScanLine } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type Profile = { nombre: string; apellido: string; email: string; whatsapp: string | null };
type Compra = {
  id: string;
  cantidad: number;
  total: number;
  estado_pago: string;
  created_at: string;
  tipo_entrada: { nombre: string; emoji: string | null } | null;
};
type QR = {
  id: string;
  uuid_code: string;
  usado: boolean;
  usado_at: string | null;
  compra_id: string;
};

export default function MiCuenta() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isStaff, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [qrs, setQrs] = useState<QR[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const fetchData = async () => {
      // Fase 1: profile + compras del usuario en paralelo.
      const [profileRes, comprasRes] = await Promise.all([
        supabase.from("profiles").select("nombre, apellido, email, whatsapp").eq("id", user.id).single(),
        supabase.from("compras").select("id, cantidad, total, estado_pago, created_at, tipo_entrada:tipos_entrada(nombre, emoji)").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      const compras = comprasRes.data ?? [];
      setCompras(compras as unknown as Compra[]);

      // Fase 2: codigos_qr SÓLO de las compras propias.
      // Defensa en profundidad: RLS sigue siendo la primaria, pero si una
      // política futura fallara, igual no leeríamos QR ajenos.
      const comprasIds = compras.map((c) => c.id);
      if (comprasIds.length > 0) {
        const { data: qrsData } = await supabase
          .from("codigos_qr")
          .select("id, uuid_code, usado, usado_at, compra_id")
          .in("compra_id", comprasIds)
          .order("created_at", { ascending: false });
        if (qrsData) setQrs(qrsData);
      } else {
        setQrs([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, authLoading, navigate]);

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nombre: profile.nombre, apellido: profile.apellido, whatsapp: profile.whatsapp })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil actualizado ✅" });
    }
    setSaving(false);
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobado": return <Badge className="bg-green-100 text-green-800 border-green-200">Aprobado</Badge>;
      case "pendiente": return <Badge variant="secondary">Pendiente</Badge>;
      case "rechazado": return <Badge variant="destructive">Rechazado</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
            <ArrowLeft className="w-4 h-4" /> Inicio
          </button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Salir
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-1">Mi Cuenta</h1>
        <p className="text-sm text-muted-foreground mb-6">{profile?.email}</p>

        {(isStaff || isAdmin) && (
          <Button
            onClick={() => navigate("/staff/scanner")}
            className="w-full mb-6 gap-2 h-14 text-base font-bold rounded-2xl"
            style={{ background: "linear-gradient(135deg, hsl(var(--water-700)), hsl(var(--water-500)))" }}
          >
            <ScanLine className="w-5 h-5" /> Escanear QR
          </Button>
        )}
        <Tabs defaultValue="qr" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="qr"><QrCode className="w-4 h-4 mr-1" /> QR</TabsTrigger>
            <TabsTrigger value="compras"><ShoppingBag className="w-4 h-4 mr-1" /> Compras</TabsTrigger>
            <TabsTrigger value="perfil"><User className="w-4 h-4 mr-1" /> Perfil</TabsTrigger>
          </TabsList>

          {/* QR Codes */}
          <TabsContent value="qr" className="space-y-3">
            {qrs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <QrCode className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No tenés códigos QR activos</p>
                  <Button className="mt-4" onClick={() => navigate("/comprar")}>Comprar entradas</Button>
                </CardContent>
              </Card>
            ) : (
              qrs.map((qr) => (
                <Card key={qr.id} className={qr.usado ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground mb-1">Código</p>
                        <p className="font-mono font-bold text-sm">{qr.uuid_code.slice(0, 8)}...{qr.uuid_code.slice(-4)}</p>
                      </div>
                      <div className="text-right">
                        {qr.usado ? (
                          <Badge variant="destructive">Usado</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Válido</Badge>
                        )}
                      </div>
                    </div>
                    {!qr.usado && (
                      <>
                        <div className="mt-3 p-4 bg-white border rounded-xl flex items-center justify-center">
                          <div className="text-center">
                            <QRCodeSVG value={qr.uuid_code} size={160} level="H" className="mx-auto" />
                            <p className="text-xs text-muted-foreground font-mono mt-2">{qr.uuid_code}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full mt-3 gap-2 text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => {
                            const msg = encodeURIComponent(
                              `🎟️ ¡Acá está tu entrada para Infinito Water Park!\n\nCódigo QR: ${qr.uuid_code}\n\nMostrá este código en la entrada. ¡Nos vemos! 🌊`
                            );
                            window.open(`https://wa.me/?text=${msg}`, "_blank");
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Enviar por WhatsApp
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Compras */}
          <TabsContent value="compras" className="space-y-3">
            {compras.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Aún no realizaste compras</p>
                  <Button className="mt-4" onClick={() => navigate("/comprar")}>Comprar entradas</Button>
                </CardContent>
              </Card>
            ) : (
              compras.map((compra) => (
                <Card key={compra.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          {compra.tipo_entrada?.emoji} {compra.tipo_entrada?.nombre || "Entrada"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(compra.created_at).toLocaleDateString("es-AR")} · {compra.cantidad} entrada{compra.cantidad > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${compra.total.toLocaleString("es-AR")}</p>
                        {estadoBadge(compra.estado_pago)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Perfil */}
          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle>Datos personales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={profile?.nombre || ""} onChange={(e) => setProfile((p) => p ? { ...p, nombre: e.target.value } : p)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input value={profile?.apellido || ""} onChange={(e) => setProfile((p) => p ? { ...p, apellido: e.target.value } : p)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={profile?.whatsapp || ""} onChange={(e) => setProfile((p) => p ? { ...p, whatsapp: e.target.value } : p)} placeholder="+54 9 11 1234-5678" />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Guardar cambios
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
