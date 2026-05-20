import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ShoppingCart, ArrowLeft, Loader2, Calendar } from "lucide-react";
import CalendarioEntradas from "@/components/comprar/CalendarioEntradas";

type TipoEntrada = {
  id: string;
  nombre: string;
  emoji: string | null;
  tag: string | null;
  features: string[];
  precio_semana: number;
  precio_finde: number;
  highlight: boolean | null;
};

type Evento = {
  id: string;
  nombre: string;
  emoji: string | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  descripcion: string | null;
  tagline: string | null;
  precio: number;
  imagen_url: string | null;
};

export default function Comprar() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const isDirectEvento = searchParams.get("entrada") === "evento" && !!searchParams.get("evento_id");
  const directEventoId = searchParams.get("evento_id");

  // Step 1: calendar, Step 2: ticket selection, Step 3: evento direct (skip calendar)
  const [step, setStep] = useState<1 | 2>(isDirectEvento ? 2 : 1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isWeekend, setIsWeekend] = useState(false);
  const [entradas, setEntradas] = useState<TipoEntrada[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(directEventoId);
  const [directEvento, setDirectEvento] = useState<Evento | null>(null);
  const [loadingEvento, setLoadingEvento] = useState(isDirectEvento);

  const isEventosSelected = isDirectEvento || entradas.find((e) => e.id === selectedId)?.nombre === "Eventos";

  // Fetch direct evento data when coming from event card
  useEffect(() => {
    if (isDirectEvento && directEventoId) {
      supabase
        .from("eventos")
        .select("id, nombre, emoji, fecha, hora_inicio, hora_fin, descripcion, tagline, precio, imagen_url")
        .eq("id", directEventoId)
        .single()
        .then(({ data }) => {
          if (data) {
            setDirectEvento(data);
            setSelectedEventoId(data.id);
          }
          setLoadingEvento(false);
        });
    }
  }, [isDirectEvento, directEventoId]);

  useEffect(() => {
    if (isEventosSelected && !isDirectEvento && eventos.length === 0) {
      supabase
        .from("eventos")
        .select("id, nombre, emoji, fecha, hora_inicio, hora_fin, descripcion, tagline, precio, imagen_url")
        .eq("estado", "activo")
        .then(({ data }) => {
          if (data) {
            setEventos(data);
            if (data.length > 0) setSelectedEventoId(data[0].id);
          }
        });
    }
  }, [isEventosSelected]);

  const handleDateSelect = (date: Date, entradasList: TipoEntrada[], weekend: boolean) => {
    setSelectedDate(date);
    setIsWeekend(weekend);
    setEntradas(entradasList);
    const hl = entradasList.find((e) => e.highlight);
    setSelectedId(hl ? hl.id : entradasList[0]?.id || null);
    setCantidad(1);
    setStep(2);
  };

  const selected = entradas.find((e) => e.id === selectedId);
  const selectedEvento = isDirectEvento ? directEvento : eventos.find((e) => e.id === selectedEventoId);
  // Precio "estimado" que ve el usuario en pantalla. NO se envía al backend.
  // El total real lo calcula un trigger SQL leyendo precios oficiales desde DB.
  const precio = isEventosSelected && selectedEvento
    ? selectedEvento.precio
    : selected
      ? (isWeekend ? selected.precio_finde : selected.precio_semana)
      : 0;
  const total = precio * cantidad;

  const handleComprar = async () => {
    if (!user) {
      toast({ title: "Iniciá sesión", description: "Necesitás una cuenta para comprar entradas.", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!isDirectEvento && !selected) return;
    if (isDirectEvento && !selectedEvento) return;

    // fecha_visita: para eventos viene del propio evento; para parque, del calendario.
    // Se envía como string YYYY-MM-DD para que el trigger SQL decida semana vs finde.
    let fechaVisita: string | null = null;
    if (isEventosSelected && selectedEvento?.fecha) {
      fechaVisita = selectedEvento.fecha; // ya viene YYYY-MM-DD desde DB
    } else if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      fechaVisita = `${y}-${m}-${d}`;
    }

    setProcessing(true);
    try {
      // IMPORTANTE: NO mandamos `total`. El trigger `trg_compras_set_total`
      // sobreescribe cualquier valor enviado por el cliente con el precio
      // oficial de DB (precio_semana / precio_finde / evento.precio).
      const { data: compra, error: compraError } = await supabase
        .from("compras")
        .insert({
          user_id: user.id,
          tipo_entrada_id: isDirectEvento ? null : selected?.id || null,
          cantidad,
          estado_pago: "pendiente",
          evento_id: selectedEventoId || null,
          // NOTA: `fecha_visita` se agregó en migración 20260518_pricing_server_side.
          // Cuando se regenere src/integrations/supabase/types.ts, este campo
          // quedará tipado formalmente. Con `strict: false` actual, TS lo acepta.
          fecha_visita: fechaVisita,
        })
        .select("id, total")
        .single();

      if (compraError) throw compraError;

      // Aviso defensivo: si el total oficial difiere del estimado mostrado, lo log
      // para QA. La UI no se cambia (queda fuera de scope visual).
      if (compra && Math.abs(Number(compra.total) - total) > 0.01) {
        console.warn(
          `[pricing] Total estimado ($${total}) difiere del oficial ($${compra.total}). Se cobra el oficial.`
        );
      }

      const { data: mpData, error: mpError } = await supabase.functions.invoke(
        "create-payment",
        { body: { compra_id: compra.id } }
      );

      if (mpError) throw mpError;

      if (mpData?.init_point) {
        window.location.href = mpData.init_point;
      } else {
        toast({ title: "Error", description: "No se pudo iniciar el pago. Intentá de nuevo.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Error al comprar:", err);
      toast({ title: "Error", description: err.message || "Ocurrió un error al procesar la compra.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Iniciá sesión", description: "Necesitás una cuenta para comprar entradas.", variant: "destructive" });
      navigate("/login");
    }
  }, [authLoading, user]);

  if (authLoading || loadingEvento || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-4">
      <div className="max-w-2xl mx-auto pt-4 pb-8">
        <button
          onClick={() => {
            if (isDirectEvento) { navigate(-1); return; }
            if (step === 2) { setStep(1); return; }
            navigate(-1);
          }}
          className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> {isDirectEvento ? "Volver" : step === 2 ? "Cambiar fecha" : "Volver"}
        </button>

        <h1 className="text-3xl font-black text-primary-foreground mb-1">
          {isDirectEvento ? "🎫 Comprá tu acceso" : "🎟️ Comprá tu entrada"}
        </h1>

        {/* Direct evento purchase - skip calendar */}
        {isDirectEvento && directEvento && (
          <>
            <Card className="mt-6">
              <CardContent className="p-0 overflow-hidden">
                {directEvento.imagen_url && (
                  <img src={directEvento.imagen_url} alt={directEvento.nombre} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="text-xl font-black text-foreground">{directEvento.emoji} {directEvento.nombre}</h2>
                      {directEvento.tagline && <p className="text-sm text-muted-foreground">{directEvento.tagline}</p>}
                    </div>
                    <span className="text-xl font-black text-accent">
                      ${directEvento.precio.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                    {directEvento.fecha && (
                      <Badge variant="secondary">
                        📅 {new Date(directEvento.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                      </Badge>
                    )}
                    {directEvento.hora_inicio && (
                      <Badge variant="secondary">
                        🕐 {directEvento.hora_inicio.slice(0, 5)}{directEvento.hora_fin ? ` - ${directEvento.hora_fin.slice(0, 5)}` : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cantidad */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Cantidad de accesos</p>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setCantidad(Math.max(1, cantidad - 1))} disabled={cantidad <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-bold w-8 text-center">{cantidad}</span>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setCantidad(Math.min(10, cantidad + 1))} disabled={cantidad >= 10}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total + CTA */}
            <Card className="mt-4 border-2 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-muted-foreground">Total</p>
                  <p className="text-3xl font-black text-primary">
                    ${total.toLocaleString("es-AR")}
                  </p>
                </div>
                <Button className="w-full h-12 text-base font-bold" onClick={handleComprar} disabled={processing}>
                  {processing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
                  ) : (
                    <><ShoppingCart className="mr-2 h-5 w-5" /> Pagar con MercadoPago</>
                  )}
                </Button>
                {!user && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Necesitás iniciar sesión para comprar
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!isDirectEvento && step === 1 && (
          <div className="mt-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <CalendarioEntradas onSelectDate={handleDateSelect} />
              </CardContent>
            </Card>
          </div>
        )}

        {!isDirectEvento && step === 2 && (
          <>
            <p className="text-primary-foreground/70 text-sm mb-6 capitalize">
              📅 {dateLabel} — Precio de {isWeekend ? "fin de semana" : "lunes a jueves"}
            </p>

            {/* Precios disponibles */}
            <h2 className="text-xl font-bold text-primary-foreground mb-4 flex items-center gap-2">
              💎 Precios disponibles
            </h2>

            <div className="space-y-3">
              {entradas
                .filter((entrada) => {
                  // Hide "Menores" when "Eventos" is selected
                  if (isEventosSelected && entrada.nombre === "Menores") return false;
                  return true;
                })
                .map((entrada) => {
                const isSelected = selectedId === entrada.id;
                const precioActual = isWeekend ? entrada.precio_finde : entrada.precio_semana;

                return (
                  <Card
                    key={entrada.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected ? "ring-2 ring-primary shadow-xl scale-[1.02]" : "opacity-80 hover:opacity-100"
                    }`}
                    onClick={() => {
                      setSelectedId(entrada.id);
                      if (entrada.nombre !== "Eventos") setSelectedEventoId(null);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{entrada.emoji || "🎟️"}</span>
                          <span className="font-bold text-base">{entrada.nombre}</span>
                        </div>
                        <span className="text-lg font-black text-accent">
                          ${precioActual.toLocaleString("es-AR")}
                        </span>
                      </div>
                      {entrada.tag && (
                        <Badge variant="default" className="mb-2 text-xs">
                          👤 {entrada.tag}
                        </Badge>
                      )}
                      {isSelected && entrada.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entrada.features.map((f, i) => {
                            const label = typeof f === 'string' ? f : (f as any)?.text || String(f);
                            return (
                              <Badge key={i} variant="outline" className="text-xs font-normal">
                                {label} <span className="font-bold ml-1">Incluido</span>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Available events when Eventos is selected */}
            {isEventosSelected && eventos.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-primary-foreground mb-4 mt-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Eventos disponibles
                </h2>
                <div className="space-y-3">
                  {eventos.map((evento) => {
                    const isEvSel = selectedEventoId === evento.id;
                    const fechaLabel = evento.fecha
                      ? new Date(evento.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })
                      : "";
                    return (
                      <Card
                        key={evento.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          isEvSel ? "ring-2 ring-primary shadow-xl scale-[1.02]" : "opacity-80 hover:opacity-100"
                        }`}
                        onClick={() => setSelectedEventoId(evento.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{evento.emoji || "🎉"}</span>
                              <span className="font-bold text-base">{evento.nombre}</span>
                            </div>
                            <span className="text-lg font-black text-accent">
                              {evento.precio > 0 ? `$${evento.precio.toLocaleString("es-AR")}` : "Gratis"}
                            </span>
                          </div>
                          {fechaLabel && (
                            <Badge variant="secondary" className="text-xs">
                              📅 {fechaLabel}
                            </Badge>
                          )}
                          {evento.tagline && (
                            <p className="text-sm text-muted-foreground">{evento.tagline}</p>
                          )}
                          {evento.hora_inicio && (
                            <p className="text-xs text-muted-foreground mt-1">
                              🕐 {evento.hora_inicio}{evento.hora_fin ? ` - ${evento.hora_fin}` : ""}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {/* Cantidad */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Cantidad</p>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setCantidad(Math.max(1, cantidad - 1))} disabled={cantidad <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-xl font-bold w-8 text-center">{cantidad}</span>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setCantidad(Math.min(10, cantidad + 1))} disabled={cantidad >= 10}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total + CTA */}
            <Card className="mt-4 border-2 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-muted-foreground">Total</p>
                  <p className="text-3xl font-black text-primary">
                    ${total.toLocaleString("es-AR")}
                  </p>
                </div>
                <Button className="w-full h-12 text-base font-bold" onClick={handleComprar} disabled={processing || !selected}>
                  {processing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
                  ) : (
                    <><ShoppingCart className="mr-2 h-5 w-5" /> Pagar con MercadoPago</>
                  )}
                </Button>
                {!user && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Necesitás iniciar sesión para comprar
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
