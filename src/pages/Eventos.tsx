import { useState, useEffect, useRef } from "react";
import eventosHeroBg from "@/assets/eventos-hero-bg.jpg";
import eventosCtaBg from "@/assets/eventos-cta-bg.jpg";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import Navbar from "@/components/waterpark/Navbar";
import Footer from "@/components/waterpark/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Calendar, Clock, MapPin, ShoppingCart, X, Ticket,
  Sparkles, ArrowRight,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type Evento = {
  id: string;
  nombre: string;
  edicion: string | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  tagline: string | null;
  gradiente: string | null;
  emoji: string | null;
  estado: string;
  imagen_url: string | null;
  descripcion: string | null;
  precio: number;
};

function formatFechaCorta(fecha: string | null) {
  if (!fecha) return "TBD";
  try {
    return format(new Date(fecha + "T12:00:00"), "d MMM", { locale: es });
  } catch { return fecha; }
}

function formatFechaLarga(fecha: string | null) {
  if (!fecha) return "Fecha por confirmar";
  try {
    return format(new Date(fecha + "T12:00:00"), "EEEE d 'de' MMMM, yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase());
  } catch { return fecha; }
}

function formatHorario(inicio: string | null, fin: string | null) {
  if (!inicio) return "";
  const fmt = (t: string) => t.slice(0, 5);
  return fin ? `${fmt(inicio)} — ${fmt(fin)}` : fmt(inicio);
}

function isEventPast(fecha: string | null) {
  if (!fecha) return false;
  const d = new Date(fecha + "T23:59:59");
  return isPast(d) && !isToday(d);
}

function formatMesAnio(fecha: string | null) {
  if (!fecha) return "";
  try {
    return format(new Date(fecha + "T12:00:00"), "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase());
  } catch { return ""; }
}

function formatDia(fecha: string | null) {
  if (!fecha) return "?";
  try {
    return format(new Date(fecha + "T12:00:00"), "d", { locale: es });
  } catch { return "?"; }
}

function formatDiaSemana(fecha: string | null) {
  if (!fecha) return "";
  try {
    return format(new Date(fecha + "T12:00:00"), "EEE", { locale: es }).replace(/^\w/, c => c.toUpperCase());
  } catch { return ""; }
}

// ─── TIMELINE EVENT ITEM ────────────────────────────────────────────────────

function TimelineItem({ event, past, index, onDetail, onComprar }: {
  event: Evento; past: boolean; index: number;
  onDetail: () => void; onComprar: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const gradient = event.gradiente || "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)";
  const firstColor = gradient.match(/#[A-Fa-f0-9]{6}/g)?.[0] || '#0077B6';

  return (
    <div
      ref={ref}
      className="relative flex gap-4 sm:gap-6 lg:block group"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.6s ease ${index * 0.06}s, transform 0.6s ease ${index * 0.06}s`,
      }}
    >
      {/* Timeline line + dot (hidden on lg, shown on mobile) */}
      <div className="flex flex-col items-center flex-shrink-0 w-12 sm:w-16 lg:hidden">
        {/* Date circle */}
        <div
          className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center font-black text-xs shadow-lg transition-transform group-hover:scale-110"
          style={{
            background: past
              ? "hsl(var(--muted))"
              : `linear-gradient(135deg, ${firstColor}, ${firstColor}cc)`,
            color: past ? "hsl(var(--muted-foreground))" : "#fff",
            boxShadow: past ? "none" : `0 4px 20px ${firstColor}50`,
          }}
        >
          <span className="text-lg sm:text-xl leading-none">{formatDia(event.fecha)}</span>
          <span className="text-[10px] opacity-80 uppercase">{formatDiaSemana(event.fecha)}</span>
        </div>
        {/* Vertical line */}
        <div
          className="flex-1 w-0.5 mt-2"
          style={{
            background: past
              ? "hsl(var(--border))"
              : `linear-gradient(to bottom, ${firstColor}60, transparent)`,
            minHeight: 40,
          }}
        />
      </div>

      {/* Card */}
      <div
        className={`flex-1 rounded-2xl overflow-hidden cursor-pointer mb-6 lg:mb-0 transition-all duration-300 ${past ? "hover:opacity-90" : "hover:shadow-2xl hover:-translate-y-1"}`}
        style={{
          border: past ? "1px solid hsl(var(--border))" : `1px solid ${firstColor}30`,
          background: past ? "hsl(var(--muted) / 0.3)" : "hsl(var(--card))",
          filter: past ? "grayscale(0.7)" : "none",
        }}
        onClick={onDetail}
      >
        {/* Image */}
        {event.imagen_url && (
          <div className="relative h-36 sm:h-44 lg:h-52 overflow-hidden">
            <img
              src={event.imagen_url}
              alt={event.nombre}
              className={`w-full h-full object-cover transition-transform duration-500 ${past ? "" : "group-hover:scale-105"}`}
              loading="lazy"
              style={past ? { filter: "grayscale(0.8) brightness(0.7)" } : {}}
            />
            <div
              className="absolute inset-0"
              style={{
                background: past
                  ? "linear-gradient(to top, hsl(var(--muted)) 0%, transparent 60%)"
                  : `linear-gradient(to top, hsl(var(--card)) 0%, transparent 50%)`,
              }}
            />
            {!past && (
              <Badge
                className="absolute top-3 right-3 text-xs font-bold shadow-md"
                style={{
                  background: "rgba(34,197,94,0.2)",
                  color: "#86efac",
                  border: "1px solid rgba(34,197,94,0.4)",
                  backdropFilter: "blur(8px)",
                }}
              >
                🔥 Próximo
              </Badge>
            )}
            {past && (
              <Badge className="absolute top-3 right-3 text-xs bg-muted/80 text-muted-foreground border-border backdrop-blur-sm">
                Finalizado
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-black text-xl sm:text-2xl leading-tight mb-1 truncate ${past ? "text-muted-foreground" : "text-foreground"}`}
              >
                {event.emoji} {event.nombre}
              </h3>
              {event.edicion && (
                <p className={`text-xs uppercase tracking-widest font-bold ${past ? "text-muted-foreground/60" : "text-primary/70"}`}>
                  {event.edicion}
                </p>
              )}
            </div>
            {!past && event.precio > 0 && (
              <span
                className="flex-shrink-0 font-black text-lg"
                style={{ color: firstColor }}
              >
                ${event.precio.toLocaleString("es-AR")}
              </span>
            )}
          </div>

          {event.tagline && (
            <p className={`text-sm mb-3 line-clamp-2 ${past ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
              {event.tagline}
            </p>
          )}

          {/* Info chips */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${past ? "bg-muted text-muted-foreground/70" : "bg-primary/10 text-primary"}`}>
              <Calendar className="w-3 h-3" /> {formatFechaLarga(event.fecha)}
            </span>
            {event.hora_inicio && (
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${past ? "bg-muted text-muted-foreground/70" : "bg-primary/10 text-primary"}`}>
                <Clock className="w-3 h-3" /> {formatHorario(event.hora_inicio, event.hora_fin)}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${past ? "bg-muted text-muted-foreground/70" : "bg-primary/10 text-primary"}`}>
              <MapPin className="w-3 h-3" /> Infinito WP
            </span>
          </div>

          {/* Actions */}
          {!past ? (
            <div className="flex items-center gap-3">
              <Button
                onClick={onComprar}
                className="rounded-xl font-bold text-sm flex-1 sm:flex-none"
                style={{
                  background: `linear-gradient(135deg, ${firstColor}, ${firstColor}cc)`,
                  boxShadow: `0 4px 16px ${firstColor}30`,
                }}
              >
                <ShoppingCart className="w-4 h-4 mr-1.5" /> Comprar acceso
              </Button>
              <button
                className="text-muted-foreground text-sm flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={(e) => { e.stopPropagation(); onDetail(); }}
              >
                Detalles <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">Este evento ya se realizó</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EVENT DETAIL SHEET ─────────────────────────────────────────────────────

function EventDetail({ event, open, onClose }: { event: Evento | null; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDesktop, setIsDesktop] = useState(false);
  const past = event ? isEventPast(event.fecha) : false;

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  if (!event) return null;

  const handleComprar = () => {
    if (!user) {
      toast({ title: "Iniciá sesión", description: "Necesitás una cuenta para comprar accesos.", variant: "destructive" });
      navigate("/login");
      return;
    }
    navigate(`/comprar?entrada=evento&evento_id=${event.id}`);
  };

  const gradient = event.gradiente || "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)";

  const content = (
    <>
      <div className="relative" style={{ height: isDesktop ? 300 : 220, zIndex: 0 }}>
        {event.imagen_url ? (
          <img src={event.imagen_url} alt={event.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: gradient }} />
        )}
        <div className="absolute inset-0" style={{ background: isDesktop ? "linear-gradient(to top, white 0%, white 5%, rgba(255,255,255,0.85) 25%, rgba(255,255,255,0.3) 55%, transparent 80%)" : "linear-gradient(to top, hsl(var(--background)) 0%, transparent 60%)" }} />
        <button onClick={onClose} className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-white/90 dark:bg-black/60 backdrop-blur-sm">
          <X className="w-5 h-5" style={{ color: "hsl(var(--foreground))" }} />
        </button>
        {!past && event.precio > 0 && (
          <Badge className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground text-sm font-bold px-3 py-1.5 shadow-lg">
            ${event.precio.toLocaleString("es-AR")} /persona
          </Badge>
        )}
        <div className="absolute bottom-4 left-6 right-6 z-10">
          <h2 className={`text-2xl font-black leading-tight ${isDesktop ? "text-foreground" : "text-white"}`} style={!isDesktop ? { textShadow: "0 2px 8px rgba(0,0,0,0.7)" } : {}}>
            {event.emoji} {event.nombre}
          </h2>
          {event.edicion && <p className={`text-sm ${isDesktop ? "text-muted-foreground" : "text-white/70"}`}>{event.edicion}</p>}
        </div>
      </div>
      <div className={`relative z-10 bg-white -mt-3 ${isDesktop ? "px-8 pb-8" : "p-5 space-y-4"}`}>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-muted/50 rounded-2xl p-3 text-center" style={isDesktop ? { background: "hsl(var(--water-50))", border: "1px solid hsl(var(--app-border))" } : {}}>
            <Calendar className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="font-black text-sm text-foreground">{formatFechaCorta(event.fecha)}</p>
            <p className="text-xs text-muted-foreground">Fecha</p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-3 text-center" style={isDesktop ? { background: "hsl(var(--water-50))", border: "1px solid hsl(var(--app-border))" } : {}}>
            <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="font-black text-sm text-foreground">{event.hora_inicio ? event.hora_inicio.slice(0, 5) : "TBD"}</p>
            <p className="text-xs text-muted-foreground">Hora</p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-3 text-center" style={isDesktop ? { background: "hsl(var(--water-50))", border: "1px solid hsl(var(--app-border))" } : {}}>
            <Ticket className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="font-black text-sm text-foreground">{event.precio > 0 ? `$${event.precio.toLocaleString("es-AR")}` : "Gratis"}</p>
            <p className="text-xs text-muted-foreground">Precio</p>
          </div>
        </div>
        {(event.descripcion || event.tagline) && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{event.descripcion || event.tagline}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <MapPin className="w-4 h-4 text-primary" />
          <span>Infinito Water Park — Av. Circunvalación, Córdoba</span>
        </div>
        {!past ? (
          <Button onClick={handleComprar} className="w-full h-14 text-base font-bold rounded-2xl" style={{ background: "linear-gradient(135deg, hsl(var(--water-800)), hsl(var(--water-600)))", boxShadow: "0 6px 24px hsl(var(--water-700) / 0.3)" }}>
            <ShoppingCart className="w-5 h-5 mr-2" />
            {event.precio > 0 ? `Comprar acceso — $${event.precio.toLocaleString("es-AR")}` : "Reservar acceso gratis"}
          </Button>
        ) : (
          <div className="text-center py-4">
            <Badge variant="secondary" className="text-sm">✅ Este evento ya se realizó</Badge>
          </div>
        )}
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <>
        <div className="fixed inset-0 z-50" style={{ background: "rgba(2,62,138,0.4)", backdropFilter: "blur(6px)" }} onClick={onClose} />
        <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-3xl overflow-hidden bg-card shadow-2xl" style={{ animation: "drawer-up 0.35s cubic-bezier(0.32,0.72,0,1)", maxHeight: "90vh", overflowY: "auto" }}>
          {content}
        </div>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="p-0 rounded-t-3xl border-0 max-h-[90vh] overflow-y-auto bg-background">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        {content}
      </SheetContent>
    </Sheet>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function Eventos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setHeaderVisible(true); }, { threshold: 0.1 });
    if (headerRef.current) obs.observe(headerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    void trackEvent("page_view");
  }, []);

  useEffect(() => {
    supabase
      .from("eventos")
      .select("*")
      .order("fecha", { ascending: true })
      .then(({ data }) => {
        if (data) setEventos(data as Evento[]);
        setLoading(false);
      });
  }, []);

  const upcoming = eventos.filter(e => e.estado === "activo" && !isEventPast(e.fecha));
  const pastEvents = eventos.filter(e => isEventPast(e.fecha) || e.estado !== "activo");

  const handleComprar = (e: React.MouseEvent, event: Evento) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Iniciá sesión", description: "Necesitás una cuenta para comprar accesos.", variant: "destructive" });
      navigate("/login");
      return;
    }
    navigate(`/comprar?entrada=evento&evento_id=${event.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Header ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={eventosHeroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(var(--event-night-deep) / 0.7) 0%, hsl(226 54% 12% / 0.85) 60%, hsl(var(--water-900)) 100%)" }} />
        </div>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="absolute w-0.5 h-0.5 rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, background: i % 2 === 0 ? "hsl(var(--event-gold))" : "hsl(var(--event-aqua-light))", animation: `sparkle ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 5}s infinite` }} />
          ))}
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-10 sm:pb-14">
          <div
            ref={headerRef}
            className="text-center"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? "translateY(0)" : "translateY(30px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-4 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-white/80 text-sm font-medium">Eventos Infinito Water Park</span>
            </div>
            <h1
              className="font-black leading-tight mb-3"
              style={{
                fontSize: "clamp(2rem, 6vw, 3.5rem)",
                background: "linear-gradient(135deg, #fff 0%, hsl(var(--event-gold)) 50%, hsl(var(--event-aqua-light)) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Línea de Eventos
            </h1>
            <p className="text-white/50 text-base sm:text-lg max-w-lg mx-auto">
              Todo lo que viene y lo que ya vivimos en el parque más épico
            </p>
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section
        className="py-10 sm:py-16 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, hsl(var(--water-900)) 0%, hsl(var(--water-800)) 40%, hsl(var(--water-700) / 0.6) 100%)",
        }}
      >
        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 30 }, (_, i) => {
            const size = 2 + Math.random() * 4;
            const isGold = i % 3 === 0;
            const isAqua = i % 3 === 1;
            return (
              <div
                key={`p-${i}`}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: isGold
                    ? "hsl(var(--event-gold) / 0.6)"
                    : isAqua
                    ? "hsl(var(--event-aqua-light) / 0.5)"
                    : "rgba(255,255,255,0.3)",
                  boxShadow: isGold
                    ? "0 0 8px hsl(var(--event-gold) / 0.4)"
                    : isAqua
                    ? "0 0 8px hsl(var(--event-aqua-light) / 0.3)"
                    : "0 0 6px rgba(255,255,255,0.15)",
                  animation: `float-particle ${6 + Math.random() * 8}s ease-in-out ${Math.random() * 5}s infinite`,
                }}
              />
            );
          })}
          {/* Ambient glow orbs */}
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(var(--event-aqua) / 0.4), transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute top-1/2 -right-20 w-60 h-60 rounded-full opacity-15" style={{ background: "radial-gradient(circle, hsl(var(--event-gold) / 0.3), transparent 70%)", filter: "blur(50px)" }} />
          <div className="absolute -bottom-10 left-1/3 w-72 h-72 rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(var(--water-400) / 0.4), transparent 70%)", filter: "blur(55px)" }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {loading && (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && upcoming.length === 0 && pastEvents.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-white/40" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Próximamente nuevos eventos</h3>
            <p className="text-white/50 text-sm">Estamos preparando experiencias increíbles. ¡Volvé pronto!</p>
          </div>
        )}

        {/* Upcoming section */}
        {upcoming.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-white font-black text-lg uppercase tracking-widest">Próximos</h2>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-5">
            {upcoming.map((event, i) => (
              <TimelineItem
                key={event.id}
                event={event}
                past={false}
                index={i}
                onDetail={() => setSelectedEvent(event)}
                onComprar={(e) => handleComprar(e, event)}
              />
            ))}
            </div>
          </div>
        )}

        {/* Past section */}
        {pastEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
              <h2 className="text-white/40 font-black text-lg uppercase tracking-widest">Realizados</h2>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-5">
            {pastEvents.map((event, i) => (
              <TimelineItem
                key={event.id}
                event={event}
                past={true}
                index={i}
                onDetail={() => setSelectedEvent(event)}
                onComprar={(e) => handleComprar(e, event)}
              />
            ))}
            </div>
          </div>
        )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="absolute inset-0">
          <img src={eventosCtaBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(var(--water-900) / 0.6) 0%, hsl(var(--water-800) / 0.75) 50%, hsl(var(--water-900) / 0.85) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="p-8 sm:p-12 text-center">
              <h3 className="text-white font-black text-2xl sm:text-3xl mb-3">
                ¿Querés organizar tu evento? 🎪
              </h3>
              <p className="text-white/80 text-sm sm:text-base mb-6 max-w-lg mx-auto">
                Infinito Water Park es el venue más único de la región. Contactanos para tu próximo evento.
              </p>
              <a
                href="https://api.whatsapp.com/send?phone=543512041301&text=Hola!%20Me%20interesa%20organizar%20un%20evento%20en%20Infinito%20Water%20Park"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="rounded-2xl px-8 py-4 font-bold text-base bg-white text-foreground hover:bg-white/90 hover:scale-105 transition-transform">
                  💬 Contactanos por WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <EventDetail
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
