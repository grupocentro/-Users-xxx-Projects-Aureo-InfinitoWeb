import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Minus, Plus, ShoppingCart, ArrowLeft, Loader2, Calendar as CalendarIcon,
  Sparkles, ShieldCheck, ChevronRight, UserPlus, LogIn,
} from "lucide-react";
import CalendarioEntradas, { type CalendarioDayInfo } from "@/components/comprar/CalendarioEntradas";
import { trackEvent } from "@/lib/analytics";

// =============================================================================
// /comprar — flujo público de compra (NO requiere login para ingresar).
//
//   1. Visitante selecciona fecha en calendario.
//   2. Ajusta cantidades de cada tipo de entrada con +/-.
//   3. Ve resumen dinámico + total estimado.
//   4. Tocá "Continuar compra":
//      - sin sesión → abre modal/sheet de login o registro rápido.
//      - con sesión → crea N filas en `compras` con grupo_id compartido y llama
//                     a edge function create-payment con { grupo_id }.
//
// Persistencia: la fecha y cantidades se guardan en sessionStorage para
// sobrevivir al ir a login/registro. Al volver con sesión activa, si el flag
// `?continue=true` está presente, se intenta el checkout automáticamente.
// =============================================================================

type TipoEntrada = {
  id: string;
  nombre: string;
  emoji: string | null;
  tag: string | null;
  features: Array<string | { icon?: string; text?: string }>;
  precio_semana: number;
  precio_finde: number;
  highlight: boolean | null;
  estado: string;
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

type StoredState = {
  fechaISO: string | null;
  cantidades: Record<string, number>;
  timestamp: number;
};

const STORAGE_KEY = "infinito-compra-state";
const STORAGE_TTL_MS = 60 * 60 * 1000; // 1 hora

function loadStored(): StoredState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed.timestamp || Date.now() - parsed.timestamp > STORAGE_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(state: { fechaISO: string | null; cantidades: Record<string, number> }) {
  try {
    const payload: StoredState = { ...state, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage puede fallar en modo privado; ignoramos silenciosamente.
  }
}

function clearStored() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

function fechaYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatARS(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function dateLabel(d: Date) {
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function Comprar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Compra directa de evento (legacy desde EventCard).
  const isDirectEvento = searchParams.get("entrada") === "evento" && !!searchParams.get("evento_id");
  const directEventoId = searchParams.get("evento_id");
  const shouldAutoContinue = searchParams.get("continue") === "true";

  // Estado público
  const [tipos, setTipos] = useState<TipoEntrada[]>([]);
  const [tiposLoading, setTiposLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayInfo, setDayInfo] = useState<CalendarioDayInfo | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  // Evento directo
  const [directEvento, setDirectEvento] = useState<Evento | null>(null);
  const [eventoLoading, setEventoLoading] = useState(isDirectEvento);
  const [cantidadEvento, setCantidadEvento] = useState(1);

  // UI
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [processing, setProcessing] = useState(false);
  const restoredRef = useRef(false);
  const autoContinueRef = useRef(false);

  // Tracking
  useEffect(() => { void trackEvent("page_view"); }, []);

  // -------------------------------------------------------------------------
  // 1) Cargar tipos_entrada y restaurar estado desde sessionStorage.
  // -------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tipos_entrada")
        .select("*")
        .eq("estado", "activo")
        .order("precio_semana", { ascending: false }); // Mayores primero (precio mayor)
      if (data) {
        const parsed = data.map((d) => ({
          ...d,
          features: Array.isArray(d.features) ? (d.features as Array<string | { icon?: string; text?: string }>) : [],
        }));
        setTipos(parsed);
        // Inicializar cantidades en 0
        const init: Record<string, number> = {};
        for (const t of parsed) init[t.id] = 0;

        // Restaurar desde sessionStorage
        const stored = loadStored();
        if (stored) {
          if (stored.fechaISO) {
            const d = new Date(stored.fechaISO);
            if (d >= new Date(new Date().setHours(0, 0, 0, 0))) {
              setSelectedDate(d);
            }
          }
          for (const [id, qty] of Object.entries(stored.cantidades || {})) {
            if (id in init && qty > 0) init[id] = Math.min(10, Math.max(0, Number(qty)));
          }
          restoredRef.current = true;
        }
        setCantidades(init);
      }
      setTiposLoading(false);
    })();
  }, []);

  // -------------------------------------------------------------------------
  // 2) Persistir cambios en sessionStorage.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (tiposLoading) return;
    saveStored({
      fechaISO: selectedDate ? selectedDate.toISOString() : null,
      cantidades,
    });
  }, [selectedDate, cantidades, tiposLoading]);

  // -------------------------------------------------------------------------
  // 3) Evento directo (legacy desde EventCard).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isDirectEvento && directEventoId) {
      supabase
        .from("eventos")
        .select("id, nombre, emoji, fecha, hora_inicio, hora_fin, descripcion, tagline, precio, imagen_url")
        .eq("id", directEventoId)
        .single()
        .then(({ data }) => {
          if (data) setDirectEvento(data);
          setEventoLoading(false);
        });
    }
  }, [isDirectEvento, directEventoId]);

  // -------------------------------------------------------------------------
  // 4) Cálculo del total estimado (espejo client-side del trigger SQL).
  //    Aplica precio_modificador si la fecha tiene fila en `calendario`.
  // -------------------------------------------------------------------------
  const itemsResumen = useMemo(() => {
    if (!selectedDate || !dayInfo) return [];
    return tipos
      .filter((t) => (cantidades[t.id] ?? 0) > 0)
      .map((t) => {
        const baseUnit = dayInfo.isWeekend ? t.precio_finde : t.precio_semana;
        const mod = dayInfo.precioModificador;
        const unitWithMod = mod !== null && Number.isFinite(mod)
          ? Math.round(baseUnit * (1 + mod / 100))
          : baseUnit;
        const qty = cantidades[t.id] ?? 0;
        return {
          tipo: t,
          unitPrice: unitWithMod,
          quantity: qty,
          subtotal: unitWithMod * qty,
        };
      });
  }, [selectedDate, dayInfo, tipos, cantidades]);

  const totalEstimado = useMemo(
    () => itemsResumen.reduce((s, i) => s + i.subtotal, 0),
    [itemsResumen],
  );

  const totalEntradas = useMemo(
    () => itemsResumen.reduce((s, i) => s + i.quantity, 0),
    [itemsResumen],
  );

  const canContinuar = !isDirectEvento && !!selectedDate && totalEntradas > 0 && !processing;

  // -------------------------------------------------------------------------
  // 5) Cambiar cantidad de un tipo.
  // -------------------------------------------------------------------------
  const changeCantidad = (tipoId: string, delta: number) => {
    setCantidades((prev) => {
      const next = { ...prev };
      const current = next[tipoId] ?? 0;
      next[tipoId] = Math.max(0, Math.min(10, current + delta));
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // 6) Selección de fecha en calendario.
  // -------------------------------------------------------------------------
  const handleSelectDate = (date: Date, _entradas: TipoEntrada[], _isWeekend: boolean, info: CalendarioDayInfo) => {
    setSelectedDate(date);
    setDayInfo(info);
    // Auto-scroll al panel de entradas
    setTimeout(() => {
      document.getElementById("paso-2-entradas")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleChangeDate = () => {
    setSelectedDate(null);
    setDayInfo(null);
  };

  // -------------------------------------------------------------------------
  // 7) Continuar compra. Si no hay sesión, modal. Si hay, checkout.
  // -------------------------------------------------------------------------
  const handleContinuar = async () => {
    if (isDirectEvento) {
      void handleCheckoutEvento();
      return;
    }
    if (!selectedDate) {
      toast({ title: "Falta la fecha", description: "Elegí un día para visitar el parque.", variant: "destructive" });
      return;
    }
    if (totalEntradas === 0) {
      toast({ title: "Sin entradas", description: "Agregá al menos 1 entrada.", variant: "destructive" });
      return;
    }
    if (!user) {
      setShowLoginSheet(true);
      return;
    }
    void handleCheckoutGrupo();
  };

  // -------------------------------------------------------------------------
  // 8) Checkout MODO GRUPO — crea N compras con grupo_id y llama create-payment.
  // -------------------------------------------------------------------------
  const handleCheckoutGrupo = async () => {
    if (!user || !selectedDate) return;
    setProcessing(true);
    try {
      const grupoId = crypto.randomUUID();
      const fechaVisita = fechaYMD(selectedDate);

      const inserts = tipos
        .filter((t) => (cantidades[t.id] ?? 0) > 0)
        .map((t) => ({
          user_id: user.id,
          tipo_entrada_id: t.id,
          cantidad: cantidades[t.id],
          estado_pago: "pendiente",
          fecha_visita: fechaVisita,
          grupo_id: grupoId,
          // NO enviamos total: el trigger trg_compras_set_total lo recalcula.
        })) as never[];

      if (inserts.length === 0) {
        setProcessing(false);
        return;
      }

      const { error: insertError } = await supabase.from("compras").insert(inserts);
      if (insertError) throw insertError;

      const { data: mpData, error: mpError } = await supabase.functions.invoke(
        "create-payment",
        { body: { grupo_id: grupoId } }
      );
      if (mpError) throw mpError;
      if (!mpData?.init_point) throw new Error("No se pudo iniciar el pago.");

      clearStored();
      window.location.href = mpData.init_point;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ocurrió un error al procesar la compra.";
      console.error("Error checkout grupo:", err);
      toast({ title: "Error", description: message, variant: "destructive" });
      setProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // 9) Checkout EVENTO DIRECTO (legacy single-compra).
  // -------------------------------------------------------------------------
  const handleCheckoutEvento = async () => {
    if (!directEvento) return;
    if (!user) {
      // Para evento directo también ofrecemos el modal.
      setShowLoginSheet(true);
      return;
    }
    setProcessing(true);
    try {
      const { data: compra, error: compraError } = await supabase
        .from("compras")
        .insert({
          user_id: user.id,
          tipo_entrada_id: null,
          evento_id: directEvento.id,
          cantidad: cantidadEvento,
          estado_pago: "pendiente",
          fecha_visita: directEvento.fecha,
        } as never)
        .select("id")
        .single();
      if (compraError) throw compraError;

      const { data: mpData, error: mpError } = await supabase.functions.invoke(
        "create-payment",
        { body: { compra_id: compra.id } }
      );
      if (mpError) throw mpError;
      if (!mpData?.init_point) throw new Error("No se pudo iniciar el pago.");

      window.location.href = mpData.init_point;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ocurrió un error al procesar la compra.";
      console.error("Error checkout evento:", err);
      toast({ title: "Error", description: message, variant: "destructive" });
      setProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // 10) Auto-continuar después de login/registro (?continue=true + sesión OK).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (autoContinueRef.current) return;
    if (authLoading) return;
    if (!shouldAutoContinue) return;
    if (!user) return;
    if (tiposLoading) return;
    if (isDirectEvento) {
      // Para evento directo solo continuamos si hay cantidad válida.
      if (directEvento) {
        autoContinueRef.current = true;
        void handleCheckoutEvento();
      }
      return;
    }
    if (!selectedDate || totalEntradas === 0) return;
    autoContinueRef.current = true;
    void handleCheckoutGrupo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoContinue, user, authLoading, tiposLoading, selectedDate, totalEntradas, directEvento, isDirectEvento]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  if (tiposLoading || eventoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-water-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-water-50 via-white to-water-100 pb-32 lg:pb-12">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-water-200/50 bg-white/70 backdrop-blur-md">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-water-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-water-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-water-700 hover:text-water-900"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-water-200 bg-water-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-water-700">
            🎟️ Temporada 2025/2026
          </div>
          <h1 className="mt-2 text-3xl font-black leading-tight text-water-800 sm:text-4xl">
            Comprá tus entradas
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-app-muted sm:text-base">
            Elegí el día de visita, la cantidad de entradas y pagá online de forma segura.
          </p>
        </div>
      </div>

      {/* ── CONTENIDO ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-8">
        {/* ── COLUMNA PRINCIPAL ─────────────────────────────────── */}
        <div className="space-y-6">
          {isDirectEvento && directEvento ? (
            <EventoDirectoCard
              evento={directEvento}
              cantidad={cantidadEvento}
              setCantidad={setCantidadEvento}
            />
          ) : (
            <>
              {/* Paso 1: Calendario */}
              {!selectedDate && (
                <Card className="border-water-200/70 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <SectionStep n={1} title="Elegí la fecha de visita" />
                    <CalendarioEntradas
                      onSelectDate={handleSelectDate}
                      preselectedDate={null}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Paso 2: Entradas */}
              {selectedDate && (
                <Card id="paso-2-entradas" className="border-water-200/70 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <SectionStep n={2} title="Elegí las entradas" />
                      <button
                        onClick={handleChangeDate}
                        className="inline-flex items-center gap-1 rounded-full border border-water-200 bg-water-50 px-3 py-1 text-xs font-bold text-water-700 hover:bg-water-100"
                      >
                        <CalendarIcon className="h-3 w-3" /> Cambiar fecha
                      </button>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        📅 {dateLabel(selectedDate)}
                      </Badge>
                      {dayInfo?.isWeekend && (
                        <Badge className="bg-amber-100 text-amber-900 border border-amber-200">
                          Fin de semana
                        </Badge>
                      )}
                      {dayInfo?.etiqueta && (
                        <Badge
                          className="border"
                          style={dayInfo.colorHex
                            ? { background: dayInfo.colorHex + "20", color: dayInfo.colorHex, borderColor: dayInfo.colorHex + "60" }
                            : { background: "hsl(var(--water-100))", color: "hsl(var(--water-700))" }
                          }
                        >
                          <Sparkles className="h-3 w-3 mr-1" />{dayInfo.etiqueta}
                        </Badge>
                      )}
                      {dayInfo?.precioModificador !== null && dayInfo?.precioModificador !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {dayInfo.precioModificador > 0 ? "+" : ""}
                          {dayInfo.precioModificador}% sobre precio base
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3">
                      {tipos.map((t) => {
                        const baseUnit = dayInfo?.isWeekend ? t.precio_finde : t.precio_semana;
                        const mod = dayInfo?.precioModificador;
                        const unitWithMod = mod !== null && mod !== undefined && Number.isFinite(mod)
                          ? Math.round(baseUnit * (1 + mod / 100))
                          : baseUnit;
                        const qty = cantidades[t.id] ?? 0;
                        const subtotal = unitWithMod * qty;
                        return (
                          <TipoCard
                            key={t.id}
                            tipo={t}
                            unitPrice={unitWithMod}
                            quantity={qty}
                            subtotal={subtotal}
                            onMinus={() => changeCantidad(t.id, -1)}
                            onPlus={() => changeCantidad(t.id, +1)}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Aviso QR */}
          <div className="rounded-2xl border border-water-200 bg-water-50/60 px-4 py-3 text-xs text-water-700 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Los QR se generan automáticamente después de acreditarse el pago.
              Vas a poder verlos en <Link to="/mi-cuenta" className="font-bold underline">Mi Cuenta</Link>.
            </p>
          </div>
        </div>

        {/* ── COLUMNA DERECHA: RESUMEN (desktop sticky) ─────────── */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <ResumenCard
              isDirectEvento={isDirectEvento}
              directEvento={directEvento}
              cantidadEvento={cantidadEvento}
              selectedDate={selectedDate}
              dayInfo={dayInfo}
              items={itemsResumen}
              totalEntradas={isDirectEvento ? cantidadEvento : totalEntradas}
              totalEstimado={isDirectEvento && directEvento ? directEvento.precio * cantidadEvento : totalEstimado}
              canContinuar={isDirectEvento ? cantidadEvento > 0 : canContinuar}
              processing={processing}
              onContinuar={handleContinuar}
            />
          </div>
        </div>
      </div>

      {/* ── BARRA INFERIOR MOBILE ──────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-water-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted">Total</p>
            <p className="text-xl font-black text-water-800">
              {formatARS(isDirectEvento && directEvento ? directEvento.precio * cantidadEvento : totalEstimado)}
            </p>
            {((isDirectEvento ? cantidadEvento : totalEntradas) > 0) && (
              <p className="text-[10px] text-app-muted">
                {(isDirectEvento ? cantidadEvento : totalEntradas)} {(isDirectEvento ? cantidadEvento : totalEntradas) === 1 ? "entrada" : "entradas"}
              </p>
            )}
          </div>
          <Button
            onClick={handleContinuar}
            disabled={!(isDirectEvento ? cantidadEvento > 0 : canContinuar)}
            className="h-12 flex-1 max-w-[60%] rounded-2xl bg-gradient-to-br from-water-700 to-water-500 font-black text-white shadow-lg disabled:opacity-50"
          >
            {processing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando…</>
            ) : (
              <>Continuar <ChevronRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>

      {/* ── SHEET: Login o Registro intermedio ─────────────────────── */}
      <Sheet open={showLoginSheet} onOpenChange={setShowLoginSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 max-h-[85vh] overflow-y-auto bg-background">
          <SheetHeader className="mb-2 text-left">
            <SheetTitle className="text-2xl font-black text-water-800">Confirmá tu compra</SheetTitle>
            <SheetDescription className="text-sm">
              Ingresá o creá tu cuenta para finalizar. Vamos a guardar tu selección.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <Button
              size="lg"
              className="h-14 rounded-2xl bg-gradient-to-br from-water-700 to-water-500 font-bold text-white shadow-lg"
              onClick={() => {
                setShowLoginSheet(false);
                navigate(`/cliente/login?redirect=/comprar?continue=true${isDirectEvento ? `%26entrada=evento%26evento_id=${directEventoId}` : ""}`);
              }}
            >
              <LogIn className="mr-2 h-5 w-5" /> Ya tengo cuenta — Iniciar sesión
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-2xl border-2 border-water-300 bg-white font-bold text-water-700"
              onClick={() => {
                setShowLoginSheet(false);
                navigate(`/cliente/registro?redirect=/comprar?continue=true${isDirectEvento ? `%26entrada=evento%26evento_id=${directEventoId}` : ""}`);
              }}
            >
              <UserPlus className="mr-2 h-5 w-5" /> Crear cuenta rápida
            </Button>
          </div>

          <div className="mt-4 rounded-2xl bg-water-50/70 px-4 py-3 text-xs text-water-700">
            <p className="font-bold mb-1">💡 Tu selección se guarda</p>
            <p>
              {isDirectEvento && directEvento
                ? `${cantidadEvento} acceso${cantidadEvento === 1 ? "" : "s"} a ${directEvento.nombre}`
                : selectedDate
                  ? `${totalEntradas} ${totalEntradas === 1 ? "entrada" : "entradas"} para el ${dateLabel(selectedDate).replace(/^(\w)/, c => c.toLowerCase())}`
                  : ""
              }
              {" — total estimado "}
              <strong>
                {formatARS(isDirectEvento && directEvento ? directEvento.precio * cantidadEvento : totalEstimado)}
              </strong>.
              Cuando vuelvas vamos a continuar donde lo dejaste.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

function SectionStep({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-water-600 to-water-800 text-xs font-black text-white shadow-md">
        {n}
      </span>
      <h2 className="text-lg font-black text-water-800 sm:text-xl">{title}</h2>
    </div>
  );
}

function TipoCard({
  tipo, unitPrice, quantity, subtotal, onMinus, onPlus,
}: {
  tipo: TipoEntrada;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const isActive = quantity > 0;
  return (
    <div
      className={`relative rounded-2xl border-2 p-4 transition-all duration-200 ${
        isActive
          ? "border-water-500 bg-water-50/50 shadow-md"
          : "border-app-border bg-white hover:border-water-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tipo.emoji || "🎟️"}</span>
            <div>
              <p className="font-black text-base text-water-800">{tipo.nombre}</p>
              {tipo.tag && (
                <p className="text-xs text-app-muted">{tipo.tag}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-water-700">{formatARS(unitPrice)}</span>
            <span className="text-xs text-app-muted">por entrada</span>
          </div>
          {quantity > 0 && (
            <p className="mt-1 text-xs font-bold text-water-800">
              Subtotal: {formatARS(subtotal)}
            </p>
          )}
        </div>

        {/* Selector +/- */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-2 border-water-300 disabled:opacity-40"
            onClick={onMinus}
            disabled={quantity <= 0}
            aria-label={`Quitar 1 ${tipo.nombre}`}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-7 text-center text-lg font-black text-water-800 tabular-nums">{quantity}</span>
          <Button
            variant="default"
            size="icon"
            className="h-9 w-9 rounded-full bg-water-700 text-white hover:bg-water-800 disabled:opacity-40"
            onClick={onPlus}
            disabled={quantity >= 10}
            aria-label={`Agregar 1 ${tipo.nombre}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResumenCard({
  isDirectEvento, directEvento, cantidadEvento,
  selectedDate, dayInfo, items, totalEntradas, totalEstimado,
  canContinuar, processing, onContinuar,
}: {
  isDirectEvento: boolean;
  directEvento: Evento | null;
  cantidadEvento: number;
  selectedDate: Date | null;
  dayInfo: CalendarioDayInfo | null;
  items: Array<{ tipo: TipoEntrada; unitPrice: number; quantity: number; subtotal: number }>;
  totalEntradas: number;
  totalEstimado: number;
  canContinuar: boolean;
  processing: boolean;
  onContinuar: () => void;
}) {
  return (
    <Card className="border-water-200/70 shadow-lg">
      <CardContent className="p-5">
        <h3 className="text-lg font-black text-water-800 mb-3">Resumen</h3>

        {isDirectEvento && directEvento ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-app-muted">Evento</p>
              <p className="text-sm font-semibold text-water-800">
                {directEvento.emoji} {directEvento.nombre}
              </p>
              {directEvento.fecha && (
                <p className="text-xs text-app-muted">
                  📅 {new Date(directEvento.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{cantidadEvento} × {formatARS(directEvento.precio)}</span>
              <span className="font-mono font-bold">{formatARS(directEvento.precio * cantidadEvento)}</span>
            </div>
          </div>
        ) : !selectedDate ? (
          <p className="text-sm text-app-muted">
            Elegí una fecha para ver el detalle de tu compra.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-app-muted">Fecha</p>
              <p className="text-sm font-semibold text-water-800 capitalize">
                {dateLabel(selectedDate)}
              </p>
              {dayInfo?.etiqueta && (
                <p className="text-xs font-medium text-fuchsia-700 mt-0.5">✨ {dayInfo.etiqueta}</p>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-app-muted">Agregá al menos 1 entrada para ver el total.</p>
            ) : (
              <>
                <div className="border-t border-water-200 pt-3 space-y-1.5">
                  {items.map((it) => (
                    <div key={it.tipo.id} className="flex items-center justify-between text-sm">
                      <span className="text-water-800">
                        {it.tipo.emoji || "🎟️"} {it.tipo.nombre} × {it.quantity}
                      </span>
                      <span className="font-mono font-medium text-water-800">
                        {formatARS(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="my-4 border-t border-water-200" />

        <div className="flex items-end justify-between">
          <span className="text-sm font-bold text-water-700">Total {isDirectEvento ? "" : "estimado"}</span>
          <span className="text-2xl font-black text-water-800">{formatARS(totalEstimado)}</span>
        </div>
        {totalEntradas > 0 && (
          <p className="mt-0.5 text-right text-xs text-app-muted">
            {totalEntradas} {totalEntradas === 1 ? "entrada" : "entradas"}
          </p>
        )}

        <Button
          onClick={onContinuar}
          disabled={!canContinuar}
          className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-br from-water-700 to-water-500 font-black text-white shadow-md disabled:opacity-50"
        >
          {processing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando…</>
          ) : (
            <><ShoppingCart className="mr-2 h-4 w-4" /> Continuar compra</>
          )}
        </Button>

        <p className="mt-3 text-[11px] text-app-muted text-center">
          El precio final lo calcula el sistema al confirmar la compra.
        </p>
      </CardContent>
    </Card>
  );
}

function EventoDirectoCard({
  evento, cantidad, setCantidad,
}: {
  evento: Evento;
  cantidad: number;
  setCantidad: (n: number) => void;
}) {
  return (
    <Card className="border-water-200/70 shadow-sm">
      <CardContent className="p-0 overflow-hidden">
        {evento.imagen_url && (
          <img src={evento.imagen_url} alt={evento.nombre} className="w-full h-40 object-cover" />
        )}
        <div className="p-4 sm:p-5">
          <SectionStep n={1} title="Confirmá tu acceso" />
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-black text-water-800">{evento.emoji} {evento.nombre}</h2>
              {evento.tagline && <p className="text-sm text-app-muted">{evento.tagline}</p>}
            </div>
            <span className="text-xl font-black text-water-700">
              {formatARS(evento.precio)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 text-xs text-app-muted">
            {evento.fecha && (
              <Badge variant="secondary">
                📅 {new Date(evento.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </Badge>
            )}
            {evento.hora_inicio && (
              <Badge variant="secondary">
                🕐 {evento.hora_inicio.slice(0, 5)}{evento.hora_fin ? ` - ${evento.hora_fin.slice(0, 5)}` : ""}
              </Badge>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-water-200 pt-4">
            <p className="font-bold text-water-800">Cantidad de accesos</p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-2"
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                disabled={cantidad <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-7 text-center text-lg font-black tabular-nums">{cantidad}</span>
              <Button
                variant="default"
                size="icon"
                className="h-9 w-9 rounded-full bg-water-700 hover:bg-water-800"
                onClick={() => setCantidad(Math.min(10, cantidad + 1))}
                disabled={cantidad >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
