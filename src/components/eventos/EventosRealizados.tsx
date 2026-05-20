import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Play, Share2, Users, Music, Sunset, Waves, ChevronRight, Lock, Calendar, MapPin, Phone } from "lucide-react";

// ─── DATA ────────────────────────────────────────────────────────────────────


const OCASO_EVENT = {
  id: "ocaso-1",
  name: "OCASO",
  subtitle: "La fiesta del atardecer en el agua",
  edition: "Edición 1",
  date: "Enero 2026",
  type: "Fiesta · Música en vivo · Sunset",
  attendees: 500,
  description:
    "La primera edición de OCASO, la fiesta del atardecer más única de Córdoba, realizada en las instalaciones de Infinito Water Park. Música en vivo, piletas abiertas y el mejor sunset de la temporada.",
  youtubeId: "1YAU8fHjAtU",
  stats: [
    { icon: Users, label: "+500", sub: "personas" },
    { icon: Music, label: "Live music", color: "text-pink-300" },
    { icon: Sunset, label: "Sunset vibes", color: "text-orange-300" },
    { icon: Waves, label: "Pileta abierta", color: "text-cyan-300" },
  ],
  gradient: "linear-gradient(135deg, #FF6B35 0%, #F7C948 35%, #FF8C42 60%, #0077B6 100%)",
};

const EVENTS_GRID = [
  { ...OCASO_EVENT, locked: false },
  {
    id: "coming-soon-1",
    name: "Próximamente",
    subtitle: "Nuevo evento en preparación",
    edition: "Edición 2",
    date: "2026",
    type: "Evento especial",
    locked: true,
    gradient: "linear-gradient(135deg, #1a2a4a 0%, #0077B6 100%)",
  },
  {
    id: "coming-soon-2",
    name: "Próximamente",
    subtitle: "Sorpresa para la próxima temporada",
    edition: "TBD",
    date: "2026",
    type: "Evento especial",
    locked: true,
    gradient: "linear-gradient(135deg, #0A0E1A 0%, #1a3a5c 100%)",
  },
];

const TIMELINE = [
  { id: 1, name: "OCASO Edición 1", date: "Enero 2026", done: true },
  { id: 2, name: "Próximo evento", date: "2026", done: false },
  { id: 3, name: "???", date: "Próximamente", done: false },
];

// ─── COUNT-UP HOOK ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);
  return count;
}

// ─── SPARKLE PARTICLES ────────────────────────────────────────────────────────

function Sparkles() {
  const particles = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "hsl(var(--event-gold))" : i % 3 === 1 ? "hsl(var(--event-aqua-light))" : "hsl(var(--event-orange))",
            animation: `sparkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 4}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── WAVE SEPARATOR ──────────────────────────────────────────────────────────

function WaveSeparator({ flipped = false }: { flipped?: boolean }) {
  return (
    <div className={`w-full overflow-hidden leading-none ${flipped ? "rotate-180" : ""}`} style={{ height: 64 }}>
      <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M0,32 C240,0 480,64 720,32 C960,0 1200,64 1440,32 L1440,64 L0,64 Z"
          fill="hsl(var(--event-night-deep))"
        />
      </svg>
    </div>
  );
}

// ─── OCASO STATS ─────────────────────────────────────────────────────────────

function OcasoStats({ started }: { started: boolean }) {
  const count = useCountUp(500, 1800, started);
  return (
    <div className="flex flex-wrap gap-2 mt-5">
      <div className="event-glass rounded-2xl px-4 py-2 flex items-center gap-2">
        <Users className="w-4 h-4 text-yellow-300" />
        <span className="font-bold text-white text-sm">+{count}</span>
        <span className="text-white/60 text-xs">personas</span>
      </div>
      {[
        { icon: Music, label: "Live music", color: "text-pink-300" },
        { icon: Sunset, label: "Sunset vibes", color: "text-orange-300" },
        { icon: Waves, label: "Pileta abierta", color: "text-cyan-300" },
      ].map(({ icon: Icon, label, color }) => (
        <div key={label} className="event-glass rounded-2xl px-4 py-2 flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-white text-sm font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── OCASO MODAL ─────────────────────────────────────────────────────────────

function OcasoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden border-0 rounded-3xl" style={{ background: "hsl(var(--event-night-deep))" }}>
        <div className="relative">
          {/* YouTube embed */}
          <div className="aspect-video w-full">
            {open && (
              <iframe
                src={`https://www.youtube.com/embed/${OCASO_EVENT.youtubeId}?autoplay=1&mute=1&rel=0`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )}
          </div>
          <DialogClose className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition-colors">
            <X className="w-5 h-5 text-white" />
          </DialogClose>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="badge-animated text-black font-bold text-xs px-3 py-1 rounded-full inline-block mb-2">
                🌅 Edición 1 · Enero 2026
              </span>
              <h2 className="text-4xl font-black text-white tracking-tight">OCASO</h2>
              <p className="text-white/70 mt-1">{OCASO_EVENT.subtitle}</p>
            </div>
            <button
              className="event-glass rounded-full p-3 hover:scale-110 transition-transform"
              onClick={() => navigator.share?.({ title: "OCASO — Infinito Water Park", url: window.location.href })}
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>

          <p className="text-white/80 text-sm leading-relaxed">{OCASO_EVENT.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: "+500", label: "Asistentes" },
              { value: "1", label: "Artistas" },
              { value: "6h", label: "Duración" },
              { value: "🌅", label: "Sunset" },
            ].map(({ value, label }) => (
              <div key={label} className="event-glass rounded-2xl p-3 text-center">
                <div className="text-2xl font-black shimmer-gold bg-clip-text" style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {value}
                </div>
                <div className="text-white/60 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── HERO CARD — OCASO ────────────────────────────────────────────────────────

function OcasoHeroCard({ onOpenGallery }: { onOpenGallery: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative rounded-3xl overflow-hidden cursor-pointer glow-gold group transition-all duration-700"
      style={{
        background: OCASO_EVENT.gradient,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        minHeight: 360,
      }}
      onClick={onOpenGallery}
    >
      <Sparkles />

      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500"
        style={{
          background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
          backgroundSize: "200% auto",
          animation: "shimmer-gold 3s linear infinite",
        }}
      />

      {/* Dark overlay bottom */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />

      <div className="relative z-10 p-6 sm:p-8 h-full flex flex-col justify-between" style={{ minHeight: 360 }}>
        {/* Top badges */}
        <div className="flex items-center justify-between">
          <span className="badge-animated text-black font-black text-xs px-4 py-1.5 rounded-full">
            🌅 Edición 1
          </span>
          <span className="event-glass text-white text-xs px-3 py-1.5 rounded-full font-medium">
            Enero 2026
          </span>
        </div>

        {/* Main content */}
        <div className="mt-auto">
          <p className="text-white/80 text-sm font-medium mb-1 uppercase tracking-widest">Evento estrella</p>
          <h2
            className="font-black leading-none tracking-tight"
            style={{
              fontSize: "clamp(4rem, 15vw, 8rem)",
              background: "linear-gradient(135deg, #fff 0%, #F7C948 50%, #FF6B35 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            OCASO
          </h2>
          <p className="text-white/90 text-lg mt-1">{OCASO_EVENT.subtitle}</p>

          <OcasoStats started={visible} />

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={(e) => { e.stopPropagation(); onOpenGallery(); }}
              className="rounded-2xl px-6 py-3 font-bold text-black hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(135deg, hsl(var(--event-gold)), hsl(var(--event-orange)))" }}
            >
              <Play className="w-4 h-4 mr-2" />
              Ver galería
            </Button>
            <span className="text-white/60 text-sm flex items-center gap-1">
              <ChevronRight className="w-4 h-4" />
              Tocá para explorar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GRID CARD ────────────────────────────────────────────────────────────────

function EventGridCard({ event, index, onOpen }: { event: typeof EVENTS_GRID[0]; index: number; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: event.gradient,
        minHeight: 220,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.95)",
        transition: `opacity 0.6s ease ${index * 0.12}s, transform 0.6s ease ${index * 0.12}s`,
      }}
      onClick={!event.locked ? onOpen : undefined}
    >
      {!event.locked && <Sparkles />}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />

      {/* Bottom gradient */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)" }} />

      {event.locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-sm bg-black/40">
          <Lock className="w-10 h-10 text-white/50" />
          <span className="text-white/70 font-bold text-lg">Próximamente</span>
          <span className="text-white/40 text-xs">Nuevo evento en preparación</span>
        </div>
      )}

      <div className="relative z-10 p-5 h-full flex flex-col justify-between" style={{ minHeight: 220 }}>
        <div className="flex justify-between items-start">
          {!event.locked && (
            <span className="badge-animated text-black font-bold text-xs px-3 py-1 rounded-full">
              {event.edition}
            </span>
          )}
        </div>

        {!event.locked && (
          <div className="mt-auto">
            <p className="text-white/70 text-xs uppercase tracking-widest mb-1">{event.date}</p>
            <h3 className="text-white font-black text-2xl">{event.name}</h3>
            <p className="text-white/70 text-xs mt-1">{event.type}</p>
            <button
              className="mt-3 event-glass text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex items-center gap-1"
              onClick={onOpen}
            >
              Ver más <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

function EventTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-16 px-2">
      <h3 className="text-white/80 text-sm font-bold uppercase tracking-widest mb-8 text-center">
        Historia de eventos
      </h3>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        <div className="relative pl-8">
          {/* Vertical line */}
          <div
            className="absolute left-3 top-0 w-0.5 rounded-full transition-all duration-1000"
            style={{
              height: visible ? "100%" : "0%",
              background: "linear-gradient(to bottom, hsl(var(--event-gold)), hsl(var(--event-aqua)), rgba(255,255,255,0.1))",
            }}
          />
          {TIMELINE.map((item, i) => (
            <div key={item.id} className="relative mb-8 last:mb-0">
              {/* Dot */}
              <div
                className="absolute -left-5 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-500"
                style={{
                  borderColor: item.done ? "hsl(var(--event-gold))" : "rgba(255,255,255,0.2)",
                  background: item.done ? "hsl(var(--event-gold))" : "transparent",
                  opacity: visible ? 1 : 0,
                  transitionDelay: `${i * 0.2 + 0.5}s`,
                }}
              />
              <div
                className="event-glass rounded-2xl p-4"
                style={{ opacity: item.done ? 1 : 0.4 }}
              >
                <p className="text-white font-bold">{item.name}</p>
                <p className="text-white/50 text-xs mt-0.5">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center gap-0 overflow-x-auto pb-4">
        {TIMELINE.map((item, i) => (
          <React.Fragment key={item.id}>
            <div
              className="flex flex-col items-center gap-3 min-w-[160px] flex-shrink-0"
              style={{ opacity: item.done ? 1 : 0.4 }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500"
                style={{
                  borderColor: item.done ? "hsl(var(--event-gold))" : "rgba(255,255,255,0.2)",
                  background: item.done ? "hsl(var(--event-gold))" : "transparent",
                  opacity: visible ? 1 : 0,
                  transitionDelay: `${i * 0.25}s`,
                  boxShadow: item.done ? "0 0 12px hsl(var(--event-gold))" : "none",
                }}
              />
              <div className="event-glass rounded-2xl p-4 text-center w-full">
                <p className="text-white font-bold text-sm">{item.name}</p>
                <p className="text-white/50 text-xs mt-0.5">{item.date}</p>
              </div>
            </div>
            {i < TIMELINE.length - 1 && (
              <div
                className="h-0.5 flex-1 min-w-[40px] transition-all duration-1000 rounded-full"
                style={{
                  background: `linear-gradient(to right, hsl(var(--event-gold)), ${i === 0 ? "rgba(255,255,255,0.1)" : "transparent"})`,
                  opacity: visible ? 1 : 0,
                  transitionDelay: `${i * 0.3 + 0.3}s`,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── CTA — ORGANIZAR EVENTO ───────────────────────────────────────────────────

function OrganizarEventoCTA() {
  return (
    <div
      className="mt-16 rounded-3xl overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(0,119,182,0.3) 100%)" }}
    >
      <div className="event-glass p-8 sm:p-12">
        <div className="max-w-2xl mx-auto text-center">
          <span className="badge-animated text-black font-bold text-xs px-4 py-1.5 rounded-full inline-block mb-4">
            🎪 Para empresas y organizadores
          </span>
          <h3 className="text-white font-black text-3xl sm:text-4xl leading-tight mb-4">
            ¿Querés organizar<br />tu evento? 🎉
          </h3>
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            <strong className="text-white">Infinito Water Park</strong> es el venue más único de la región.
            Piletas, atardeceres y adrenalina — el escenario perfecto para tu próximo evento.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm text-white/70">
            {[
              { icon: MapPin, text: "Av. Circunvalación, Córdoba" },
              { icon: Phone, text: "+54 351 204-1301" },
              { icon: Calendar, text: "Disponibilidad todo el verano" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-yellow-400" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <a
            href="https://api.whatsapp.com/send?phone=543512041301&text=Hola!%20Me%20interesa%20organizar%20un%20evento%20en%20Infinito%20Water%20Park"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              className="rounded-2xl px-8 py-4 font-black text-black text-lg hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(135deg, hsl(var(--event-gold)), hsl(var(--event-orange)))" }}
            >
              💬 Contactanos por WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}




// ─── MAIN MODULE ─────────────────────────────────────────────────────────────

export default function EventosRealizados() {
  const [modalOpen, setModalOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setHeaderVisible(true); }, { threshold: 0.2 });
    if (headerRef.current) obs.observe(headerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section style={{ background: "linear-gradient(180deg, hsl(var(--event-night-deep)) 0%, hsl(226 54% 12%) 50%, hsl(var(--event-night-deep)) 100%)" }}>
      {/* Wave top separator */}
      <WaveSeparator />

      <div className="relative overflow-hidden">
        <Sparkles />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

          {/* ── Section Header ── */}
          <div
            ref={headerRef}
            className="text-center mb-12"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? "translateY(0)" : "translateY(30px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            <div
              className="inline-block event-glass rounded-full px-5 py-2 mb-4"
              style={{ border: "1px solid hsl(var(--event-gold) / 0.4)" }}
            >
              <span className="text-yellow-300 text-sm font-bold">✨ Momentos que no se olvidan</span>
            </div>

            <h2
              className="font-black leading-tight mb-3"
              style={{
                fontSize: "clamp(2rem, 6vw, 3.5rem)",
                background: "linear-gradient(135deg, #fff 0%, hsl(var(--event-gold)) 50%, hsl(var(--event-aqua-light)) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Eventos que ya fueron historia
            </h2>
            <p className="text-white/60 text-lg">Noches únicas en el mejor parque acuático</p>
          </div>

          {/* ── OCASO Hero Card ── */}

          {/* ── OCASO Hero Card ── */}
          <OcasoHeroCard onOpenGallery={() => setModalOpen(true)} />

          {/* ── Events Grid ── */}
          <div className="mt-10">
            <h3 className="text-white/70 text-sm font-bold uppercase tracking-widest mb-6">
              Todos los eventos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {EVENTS_GRID.map((event, i) => (
                <EventGridCard
                  key={event.id}
                  event={event}
                  index={i}
                  onOpen={() => !event.locked && event.id === "ocaso-1" && setModalOpen(true)}
                />
              ))}
            </div>
          </div>

          {/* ── Timeline ── */}
          <EventTimeline />

          {/* ── Organizar CTA ── */}
          <OrganizarEventoCTA />
        </div>
      </div>

      {/* Wave bottom separator */}
      <WaveSeparator flipped />

      {/* OCASO Modal */}
      <OcasoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
