import { useEffect, useState, useRef, useCallback } from "react";
import { MapPin, Star, ChevronRight, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const TICKET_URL = "/comprar";

type SlideData = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  location: string;
  rating: number;
  image_url: string;
  accent: string;
  cta_text: string;
  video_url: string | null;
};

const DURATION = 5500;

export default function HeroSection() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTouchX = useRef(0);

  useEffect(() => {
    supabase.from("hero_slides").select("*").eq("estado", "activo").order("orden", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setSlides(data as SlideData[]);
      });
  }, []);

  const total = slides.length;

  const goTo = useCallback((idx: number) => {
    if (total === 0) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIdx((idx + total) % total);
      setProgress(0);
      setTransitioning(false);
    }, 280);
  }, [total]);

  const next = useCallback(() => goTo(currentIdx + 1), [currentIdx, goTo]);
  const prev = useCallback(() => goTo(currentIdx - 1), [currentIdx, goTo]);

  useEffect(() => {
    if (paused) return;
    const step = 100 / (DURATION / 50);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p + step >= 100) { next(); return 0; }
        return p + step;
      });
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, currentIdx, next]);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    startTouchX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startTouchX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    setPaused(false);
  };

  const story = slides[currentIdx];

  if (slides.length === 0) return <section id="hero" className="relative w-full" style={{ minHeight: "100svh", background: "hsl(var(--water-800))" }} />;

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100svh" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`@media(min-width:1024px){#hero{min-height:80svh!important;height:80svh!important}}`}</style>
      {/* ── Fullscreen background images/video ── */}
      {slides.map((s, i) => {
        const isActive = i === currentIdx;
        return (
          <div
            key={s.id}
            className="absolute inset-0"
            style={{
              zIndex: isActive ? 1 : 0,
              opacity: isActive && !transitioning ? 1 : 0,
              transition: "opacity 0.5s ease",
            }}
          >
            {s.video_url && isActive ? (
              <iframe
                src={s.video_url}
                title={s.title}
                allow="autoplay; fullscreen"
                style={{
                  border: 0,
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "177.78vh",
                  height: "100vh",
                  minWidth: "100%",
                  minHeight: "56.25vw",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <img
                src={s.image_url}
                alt={s.title}
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}
          </div>
        );
      })}

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-[2]" style={{ background: "linear-gradient(to bottom, rgba(0,30,80,0.5) 0%, transparent 35%, rgba(2,30,100,0.85) 100%)" }} />

      {/* ── Top bar: solo safe area, sin texto ── */}
      <div className="relative z-30 pt-[calc(env(safe-area-inset-top,0px))]" />

      {/* ── MOBILE Bottom content ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:hidden"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s",
        }}
      >
        {/* Tag */}
        <div
          className="inline-block px-3 py-1.5 rounded-full text-xs font-bold text-white mb-3"
          style={{
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.2)",
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? "translateY(6px)" : "translateY(0)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          {story.tag}
        </div>

        {/* Title & subtitle */}
        <div style={{ opacity: transitioning ? 0 : 1, transform: transitioning ? "translateY(8px)" : "translateY(0)", transition: "opacity 0.3s ease, transform 0.3s ease" }}>
          <h2 className="text-white font-black text-3xl leading-tight mb-1" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>{story.title}</h2>
          <p className="text-white/70 text-sm mb-4">{story.subtitle}</p>

          {/* Location + rating */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-white/60" />
              <span className="text-white/60 text-xs">{story.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-bold text-sm">{story.rating}</span>
            </div>
          </div>
        </div>

        {/* Accent bar */}
        <div className="h-0.5 rounded-full mb-4 transition-all duration-500 mx-auto"
          style={{ background: story.accent, width: "35%", boxShadow: `0 0 16px ${story.accent}` }}
        />

        {/* CTA */}
        <button
          onClick={() => navigate(TICKET_URL)}
          className="flex items-center justify-center w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(16px)",
            border: "1.5px solid rgba(255,255,255,0.3)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          }}
        >
          🎟️ Comprá tu entrada
        </button>

        {/* Progress bars */}
        <div className="flex gap-1 mt-4">
          {slides.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.25)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: "white",
                  width: i < currentIdx ? "100%" : i === currentIdx ? `${progress}%` : "0%",
                  transition: i === currentIdx ? "none" : "width 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── DESKTOP Bottom content ── */}
      <div
        className="absolute inset-0 z-10 hidden lg:flex items-end"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s ease 0.3s",
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-12 pb-20">
          <div className="flex items-end justify-between gap-12">
            {/* Left: content */}
            <div className="max-w-xl" style={{ opacity: transitioning ? 0 : 1, transform: transitioning ? "translateY(12px)" : "translateY(0)", transition: "opacity 0.4s ease, transform 0.4s ease" }}>
              <div
                className="inline-block px-4 py-2 rounded-full text-sm font-bold text-white mb-4"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                {story.tag}
              </div>
              <h2 className="text-white font-black text-6xl leading-[1.05] mb-3" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{story.title}</h2>
              <p className="text-white/70 text-lg mb-6 max-w-md">{story.subtitle}</p>

              <div className="flex items-center gap-5 mb-8">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-white/60" />
                  <span className="text-white/60 text-sm">{story.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-white font-bold text-base">{story.rating}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(TICKET_URL)}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-105 hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--water-600)), hsl(var(--water-400)))",
                    boxShadow: "0 8px 32px hsl(var(--water-600) / 0.4)",
                  }}
                >
                  🎟️ Comprá tu entrada
                </button>
                <button
                  onClick={() => document.querySelector("#atracciones")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-white text-sm transition-all hover:scale-105"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(12px)",
                    border: "1.5px solid rgba(255,255,255,0.25)",
                  }}
                >
                  Explorar atracciones <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: story thumbnails + progress */}
            <div className="flex flex-col items-end gap-4">
              <div className="flex gap-3">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => goTo(i)}
                    className="relative rounded-2xl overflow-hidden transition-all duration-300"
                    style={{
                      width: i === currentIdx ? 100 : 72,
                      height: i === currentIdx ? 72 : 56,
                      outline: i === currentIdx ? "2.5px solid rgba(255,255,255,0.8)" : "2px solid rgba(255,255,255,0.2)",
                      boxShadow: i === currentIdx ? "0 0 20px rgba(0,180,216,0.5)" : "none",
                      transform: i === currentIdx ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" />
                    {i !== currentIdx && <div className="absolute inset-0 bg-black/40" />}
                  </button>
                ))}
              </div>
              {/* Progress bars */}
              <div className="flex gap-1.5 w-full max-w-xs">
                {slides.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: "white",
                        width: i < currentIdx ? "100%" : i === currentIdx ? `${progress}%` : "0%",
                        transition: i === currentIdx ? "none" : "width 0.3s ease",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tap zones - mobile only */}
      <button className="absolute left-0 top-0 bottom-0 z-20 lg:hidden" style={{ width: "30%" }} onClick={prev} aria-label="Anterior" />
      <button className="absolute right-0 top-0 bottom-0 z-20 lg:hidden" style={{ width: "30%" }} onClick={next} aria-label="Siguiente" />

      {/* Desktop nav arrows */}
      <button className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden lg:flex w-12 h-12 rounded-full items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" }} onClick={prev} aria-label="Anterior">
        <ChevronRight className="w-6 h-6 text-white rotate-180" />
      </button>
      <button className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden lg:flex w-12 h-12 rounded-full items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" }} onClick={next} aria-label="Siguiente">
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </section>
  );
}
