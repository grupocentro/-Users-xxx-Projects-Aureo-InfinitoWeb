import { useState, useEffect, useRef } from "react";
import { Calendar, ArrowRight, Sparkles, Clock, MapPin, ShoppingCart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fireAndForget } from "@/lib/analytics";

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

function formatFecha(fecha: string | null) {
  if (!fecha) return "Por confirmar";
  try {
    return format(new Date(fecha + "T00:00:00"), "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase());
  } catch { return fecha; }
}

function formatFechaLarga(fecha: string | null) {
  if (!fecha) return "Fecha por confirmar";
  try {
    return format(new Date(fecha + "T00:00:00"), "EEEE d 'de' MMMM, yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase());
  } catch { return fecha; }
}

function formatHorario(inicio: string | null, fin: string | null) {
  if (!inicio) return "";
  const fmt = (t: string) => t.slice(0, 5);
  return fin ? `${fmt(inicio)} — ${fmt(fin)}` : fmt(inicio);
}

function EventCard({ event, index, onClick }: { event: Evento; index: number; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const gradient = event.gradiente || "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)";
  const firstColor = gradient.match(/#[A-Fa-f0-9]{6}/g)?.[0] || '#000';
  const statusLabel = event.estado === "activo" ? "Confirmado" : "Próximamente";

  return (
    <div
      ref={ref}
      className="relative rounded-3xl overflow-hidden cursor-pointer group"
      style={{
        minHeight: 280,
        opacity: visible ? 1 : 0,
        transform: visible
          ? hovered ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)"
          : "translateY(50px) scale(0.9)",
        transition: `opacity 0.7s ease ${index * 0.15}s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${visible ? '0s' : `${index * 0.15}s`}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <img src={event.imagen_url || ''} alt={event.nombre} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${firstColor} 0%, ${firstColor}cc 35%, transparent 60%)` }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-700" style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)", backgroundSize: "200% auto", animation: "shimmer-gold 2.5s linear infinite" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" }} />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-white/30" style={{ left: `${15 + Math.random() * 70}%`, top: `${20 + Math.random() * 60}%`, animation: `sparkle ${2 + Math.random() * 2}s ease-in-out ${Math.random() * 3}s infinite` }} />
        ))}
      </div>

      <div className="relative z-10 p-6 sm:p-8 h-full flex flex-col justify-between" style={{ minHeight: 280, textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md" style={{ background: statusLabel === "Confirmado" ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.15)", color: statusLabel === "Confirmado" ? "#86efac" : "rgba(255,255,255,0.8)", border: statusLabel === "Confirmado" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.2)" }}>
            {statusLabel === "Confirmado" ? "✅ " : "🔜 "}{statusLabel}
          </span>
          <span className="text-3xl">{event.emoji}</span>
        </div>
        <div className="mt-auto">
          <p className="text-white/60 text-xs uppercase tracking-[0.2em] font-extrabold mb-1">{event.edicion}</p>
          <h3 className="text-white font-black text-4xl sm:text-5xl tracking-tight leading-none mb-2">{event.nombre}</h3>
          <p className="text-white/80 text-sm mb-4">{event.tagline}</p>
          <div className="flex flex-wrap items-center gap-3 text-white/70 text-xs">
            <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5" /> {formatFecha(event.fecha)}
            </span>
            {event.hora_inicio && (
              <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" /> {formatHorario(event.hora_inicio, event.hora_fin)}
              </span>
            )}
            <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" /> Infinito WP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetailSheet({ event, open, onClose }: { event: Evento | null; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  if (!event) return null;

  const handleComprar = () => {
    fireAndForget("comprar_entrada_click", {
      element_label: `Evento: ${event.nombre}`,
      element_id: event.id,
      metadata: { source: "evento_detail_sheet" },
    });
    if (!user) {
      toast({ title: "Iniciá sesión", description: "Necesitás una cuenta para comprar accesos.", variant: "destructive" });
      navigate(`/cliente/login?redirect=${encodeURIComponent(`/comprar?entrada=evento&evento_id=${event.id}`)}`);
      return;
    }
    navigate(`/comprar?entrada=evento&evento_id=${event.id}`);
  };

  const gradient = event.gradiente || "linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)";

  // Mobile: bottom sheet via Sheet component
  // Desktop: custom floating card
  if (isDesktop) {
    return (
      <>
        <div className="fixed inset-0 z-50" style={{ background: "rgba(2,62,138,0.4)", backdropFilter: "blur(6px)" }} onClick={onClose} />
        <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-3xl overflow-hidden bg-white" style={{ animation: "drawer-up 0.35s cubic-bezier(0.32,0.72,0,1)", boxShadow: "0 20px 60px rgba(0,60,130,0.3)" }}>
          <div className="relative" style={{ height: 280, zIndex: 0 }}>
            {event.imagen_url ? (
              <img src={event.imagen_url} alt={event.nombre} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: gradient }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, white 0%, white 10%, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.4) 55%, transparent 80%)" }} />
            <div className="absolute top-5 left-5 right-5 flex justify-between z-10">
              <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-white/90 backdrop-blur-sm"><X className="w-5 h-5" style={{ color: "hsl(var(--water-700))" }} /></button>
              <button className="w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-white/90 backdrop-blur-sm"><Calendar className="w-5 h-5" style={{ color: "hsl(var(--water-700))" }} /></button>
            </div>
            {/* Title overlapping image */}
            <div className="absolute bottom-4 left-8 right-8 z-10">
              <h2 className="text-2xl font-black mb-0.5" style={{ color: "hsl(var(--water-800))" }}>{event.emoji} {event.nombre}</h2>
              {event.edicion && <p className="text-sm" style={{ color: "hsl(var(--app-muted))" }}>{event.edicion}</p>}
            </div>
          </div>

          <div className="relative z-10 px-8 pb-8 bg-white -mt-3">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(var(--water-50))", border: "1px solid hsl(var(--app-border))" }}>
                <Calendar className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(var(--water-500))" }} />
                <p className="font-black text-sm" style={{ color: "hsl(var(--water-800))" }}>
                  {event.fecha ? format(new Date(event.fecha + "T00:00:00"), "d MMM", { locale: es }) : "TBD"}
                </p>
                <p className="text-xs" style={{ color: "hsl(var(--app-muted))" }}>Fecha</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(var(--water-50))", border: "1px solid hsl(var(--app-border))" }}>
                <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(var(--water-500))" }} />
                <p className="font-black text-sm" style={{ color: "hsl(var(--water-800))" }}>
                  {event.hora_inicio ? event.hora_inicio.slice(0, 5) : "TBD"}
                </p>
                <p className="text-xs" style={{ color: "hsl(var(--app-muted))" }}>Hora</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: "hsl(var(--water-50))", border: "1px solid hsl(var(--app-border))" }}>
                <ShoppingCart className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(var(--water-500))" }} />
                <p className="font-black text-sm" style={{ color: "hsl(var(--water-800))" }}>
                  {event.precio > 0 ? `$${event.precio.toLocaleString("es-AR")}` : "Gratis"}
                </p>
                <p className="text-xs" style={{ color: "hsl(var(--app-muted))" }}>Precio</p>
              </div>
            </div>

            {(event.descripcion || event.tagline) && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: "hsl(var(--app-muted))" }}>
                {event.descripcion || event.tagline}
              </p>
            )}

            <button onClick={handleComprar} className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95 shadow-lg" style={{ background: "linear-gradient(135deg, hsl(var(--water-800)), hsl(var(--water-600)))", boxShadow: "0 6px 24px hsl(var(--water-700) / 0.3)" }}>
              <ShoppingCart className="w-5 h-5" /> Comprar acceso
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="p-0 rounded-t-3xl border-0 max-h-[85vh] overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="relative w-full aspect-video rounded-t-2xl overflow-hidden mx-0">
          {event.imagen_url ? (
            <img src={event.imagen_url} alt={event.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: gradient }} />
          )}
          <button onClick={onClose} className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
          {event.precio > 0 && (
            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-sm font-bold px-3 py-1">
              ${event.precio.toLocaleString("es-AR")} /persona
            </Badge>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
              <MapPin className="w-4 h-4" /><span>Infinito Water Park</span>
            </div>
            <h2 className="text-2xl font-black text-foreground leading-tight">{event.emoji} {event.nombre}</h2>
            {event.edicion && <p className="text-muted-foreground text-sm mt-0.5">{event.edicion}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-2xl p-3 text-center">
              <Calendar className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">{event.fecha ? format(new Date(event.fecha + "T00:00:00"), "d MMM", { locale: es }) : "TBD"}</p>
              <p className="text-xs text-muted-foreground">Fecha</p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-3 text-center">
              <Clock className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">{event.hora_inicio ? event.hora_inicio.slice(0, 5) : "TBD"}</p>
              <p className="text-xs text-muted-foreground">Hora</p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-3 text-center">
              <ShoppingCart className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold text-foreground">{event.precio > 0 ? `$${event.precio.toLocaleString("es-AR")}` : "Gratis"}</p>
              <p className="text-xs text-muted-foreground">Precio</p>
            </div>
          </div>
          {event.descripcion && <p className="text-muted-foreground text-sm leading-relaxed">{event.descripcion}</p>}
          {event.tagline && !event.descripcion && <p className="text-muted-foreground text-sm leading-relaxed">{event.tagline}</p>}
          <Button className="w-full h-14 text-base font-bold rounded-2xl" onClick={handleComprar}>
            <ShoppingCart className="w-5 h-5 mr-2" /> Comprar acceso
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
export default function ProximosEventos() {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setHeaderVisible(true); obs.disconnect(); } }, { threshold: 0.05, rootMargin: "200px" });
    if (headerRef.current) obs.observe(headerRef.current);
    const timer = setTimeout(() => setHeaderVisible(true), 2000);
    return () => { obs.disconnect(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    supabase
      .from("eventos")
      .select("*")
      .eq("estado", "activo")
      .order("fecha", { ascending: true })
      .limit(3)
      .then(({ data }) => {
        if (data) setEventos(data as Evento[]);
        setLoading(false);
      });
  }, []);

  if (loading || eventos.length === 0) return null;

  return (
    <>
      <section id="eventos" className="relative py-12 sm:py-16 overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(var(--event-night-deep)) 0%, hsl(226 54% 12%) 50%, hsl(var(--event-night-deep)) 100%)" }}>
        {/* Sparkles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="absolute w-0.5 h-0.5 rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, background: i % 2 === 0 ? "hsl(var(--event-gold))" : "hsl(var(--event-aqua-light))", animation: `sparkle ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 5}s infinite` }} />
          ))}
        </div>

        {/* Animated spotlights */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute" style={{
            width: 300, height: '120%', top: '-10%', left: '10%',
            background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--event-aqua-light) / 0.06) 30%, hsl(var(--event-aqua-light) / 0.12) 50%, hsl(var(--event-aqua-light) / 0.06) 70%, transparent 100%)',
            transformOrigin: 'top center',
            animation: 'spotlight-sweep-1 8s ease-in-out infinite',
          }} />
          <div className="absolute" style={{
            width: 250, height: '120%', top: '-10%', right: '15%',
            background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--event-gold) / 0.05) 30%, hsl(var(--event-gold) / 0.10) 50%, hsl(var(--event-gold) / 0.05) 70%, transparent 100%)',
            transformOrigin: 'top center',
            animation: 'spotlight-sweep-2 10s ease-in-out 2s infinite',
          }} />
          <div className="absolute" style={{
            width: 200, height: '120%', top: '-10%', left: '45%',
            background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--event-aqua-light) / 0.04) 30%, hsl(var(--event-aqua-light) / 0.08) 50%, hsl(var(--event-aqua-light) / 0.04) 70%, transparent 100%)',
            transformOrigin: 'top center',
            animation: 'spotlight-sweep-3 12s ease-in-out 4s infinite',
          }} />
        </div>

        <style>{`
          @keyframes spotlight-sweep-1 {
            0%, 100% { transform: rotate(-15deg); opacity: 0.6; }
            50% { transform: rotate(15deg); opacity: 1; }
          }
          @keyframes spotlight-sweep-2 {
            0%, 100% { transform: rotate(20deg); opacity: 0.5; }
            50% { transform: rotate(-20deg); opacity: 1; }
          }
          @keyframes spotlight-sweep-3 {
            0%, 100% { transform: rotate(-10deg); opacity: 0.4; }
            50% { transform: rotate(25deg); opacity: 0.8; }
          }
        `}</style>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div ref={headerRef} className="text-center mb-14" style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? "translateY(0)" : "translateY(30px)", transition: "opacity 0.8s ease, transform 0.8s ease" }}>
            <div className="inline-flex items-center gap-2 event-glass rounded-full px-5 py-2 mb-5" style={{ border: "1px solid hsl(var(--event-gold) / 0.4)" }}>
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-yellow-300 text-sm font-bold">Próximos eventos</span>
            </div>
            <h2 className="font-black leading-tight mb-3" style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", background: "linear-gradient(135deg, #fff 0%, hsl(var(--event-gold)) 50%, hsl(var(--event-aqua-light)) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Lo que se viene 🔥
            </h2>
            <p className="text-white/50 text-lg max-w-lg mx-auto">Las noches más épicas del verano te esperan en Infinito Water Park</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {eventos.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                index={i}
                onClick={() => {
                  fireAndForget("evento_click", { element_label: event.nombre, element_id: event.id });
                  setSelectedEvent(event);
                }}
              />
            ))}
          </div>

          <div className="mt-12 text-center" style={{ opacity: headerVisible ? 1 : 0, transition: "opacity 0.8s ease 0.5s" }}>
            <button onClick={() => navigate("/eventos")} className="group inline-flex items-center gap-3 event-glass rounded-2xl px-8 py-4 font-bold text-white hover:scale-105 transition-all duration-300" style={{ border: "1px solid hsl(var(--event-gold) / 0.3)" }}>
              <span>Ver todos los eventos</span>
              <ArrowRight className="w-5 h-5 text-yellow-300 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      <EventDetailSheet event={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
