import { useState, useRef, useEffect } from "react";
import { Play, X, ChevronLeft, ChevronRight, Camera, Film, ArrowUpRight } from "lucide-react";

const B = "https://infinitowaterpark.com/wp-content/uploads/2026/01/";

type MediaItem = {
  type: "image" | "video";
  src: string;
  thumb: string;
  title: string;
  tag: string;
  span: string; // grid area
};

const MEDIA: MediaItem[] = [
  { type: "image", src: `${B}Pileta-de-Olas.png`, thumb: `${B}Pileta-de-Olas.png`, title: "Pileta de Olas", tag: "💧 Pileta", span: "col-span-2 row-span-2" },
  { type: "video", src: "https://www.youtube.com/embed/1YAU8fHjAtU?autoplay=1&mute=1&loop=1&playlist=1YAU8fHjAtU&controls=0&playsinline=1&rel=0&modestbranding=1", thumb: `${B}pile-central.png`, title: "El parque en acción", tag: "🎬 Video", span: "col-span-1 row-span-1" },
  { type: "image", src: `${B}4-scaled-1.jpeg`, thumb: `${B}4-scaled-1.jpeg`, title: "Toboganes extremos", tag: "🎢 Aventura", span: "col-span-1 row-span-2" },
  { type: "image", src: `${B}Zona-lounge.png`, thumb: `${B}Zona-lounge.png`, title: "Zona Lounge", tag: "😎 Relax", span: "col-span-1 row-span-1" },
  { type: "image", src: `${B}5-scaled-1.jpeg`, thumb: `${B}5-scaled-1.jpeg`, title: "Río Lento", tag: "🌊 Río Lento", span: "col-span-2 row-span-1" },
  { type: "image", src: `${B}pile-central.png`, thumb: `${B}pile-central.png`, title: "Pileta Central", tag: "🏊 Central", span: "col-span-1 row-span-1" },
];

function BentoCard({ item, index, onClick }: { item: MediaItem; index: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`${item.span} relative rounded-3xl overflow-hidden cursor-pointer group`}
      style={{ minHeight: item.span.includes("row-span-2") ? 340 : 160 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {item.type === "video" && hovered ? (
        <iframe
          src={item.src}
          title={item.title}
          allow="autoplay; fullscreen"
          className="absolute inset-0 w-full h-full"
          style={{ border: 0 }}
        />
      ) : (
        <img
          src={item.thumb}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700"
          style={{ transform: hovered ? "scale(1.08)" : "scale(1)" }}
        />
      )}

      {/* Hover overlay */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          background: hovered
            ? "linear-gradient(to top, hsl(var(--water-800) / 0.85) 0%, hsl(var(--water-800) / 0.2) 50%, transparent 100%)"
            : "linear-gradient(to top, hsl(var(--water-800) / 0.5) 0%, transparent 40%)",
        }}
      />

      {/* Tag pill */}
      <div
        className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-300"
        style={{
          background: "white",
          color: "hsl(var(--water-700))",
          transform: hovered ? "translateY(0)" : "translateY(-4px)",
          opacity: hovered ? 1 : 0.85,
        }}
      >
        {item.tag}
      </div>

      {/* Video play icon */}
      {item.type === "video" && !hovered && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            <Play className="w-6 h-6 ml-0.5" style={{ color: "hsl(var(--water-600))" }} />
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 z-10 transition-all duration-400"
        style={{
          transform: hovered ? "translateY(0)" : "translateY(6px)",
          opacity: hovered ? 1 : 0.8,
        }}
      >
        <div className="flex items-end justify-between">
          <h3 className="text-white font-black text-lg" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{item.title}</h3>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{
              background: "white",
              transform: hovered ? "scale(1) rotate(0deg)" : "scale(0.7) rotate(-45deg)",
              opacity: hovered ? 1 : 0,
            }}
          >
            <ArrowUpRight className="w-4 h-4" style={{ color: "hsl(var(--water-700))" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GaleriaMultimedia() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) { setLoaded(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setLoaded(true); obs.disconnect(); } }, { threshold: 0.05, rootMargin: "200px" });
    obs.observe(el);
    const t = setTimeout(() => setLoaded(true), 2000);
    return () => { obs.disconnect(); clearTimeout(t); };
  }, []);

  const goTo = (idx: number) => setLightboxIdx(((idx % MEDIA.length) + MEDIA.length) % MEDIA.length);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") goTo(lightboxIdx + 1);
      if (e.key === "ArrowLeft") goTo(lightboxIdx - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx]);

  const lbItem = lightboxIdx !== null ? MEDIA[lightboxIdx] : null;

  return (
    <>
      {/* Desktop only */}
      <section ref={sectionRef} className="hidden lg:block w-full" style={{ background: "white" }}>
        <div className="max-w-7xl mx-auto px-8 py-14" style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(20px)", transition: "all 0.8s ease" }}>
          {/* Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-4 h-4" style={{ color: "hsl(var(--water-500))" }} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(var(--water-500))" }}>📸 Galería</p>
              </div>
              <h2 className="font-black text-3xl" style={{ color: "hsl(var(--water-800))" }}>Viví la experiencia</h2>
              <p className="text-sm mt-1" style={{ color: "hsl(var(--app-muted))" }}>Explorá cada rincón del parque acuático</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "hsl(var(--water-50))", color: "hsl(var(--water-600))", border: "1px solid hsl(var(--app-border))" }}>
                <Camera className="w-3 h-3" /> {MEDIA.filter(m => m.type === "image").length} fotos
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "hsl(var(--water-50))", color: "hsl(var(--water-600))", border: "1px solid hsl(var(--app-border))" }}>
                <Film className="w-3 h-3" /> {MEDIA.filter(m => m.type === "video").length} video
              </span>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-4 grid-rows-3 gap-3" style={{ height: 560 }}>
            {MEDIA.map((item, i) => (
              <BentoCard
                key={i}
                item={item}
                index={i}
                onClick={() => setLightboxIdx(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIdx !== null && lbItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)" }} onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-6 right-6 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }} onClick={() => setLightboxIdx(null)}>
            <X className="w-5 h-5 text-white" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); goTo(lightboxIdx - 1); }} className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); goTo(lightboxIdx + 1); }} className="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          <div className="max-w-5xl max-h-[80vh] w-full mx-8" onClick={(e) => e.stopPropagation()}>
            {lbItem.type === "video" ? (
              <div className="w-full aspect-video rounded-2xl overflow-hidden">
                <iframe src={lbItem.src} title={lbItem.title} allow="autoplay; fullscreen" className="w-full h-full" style={{ border: 0 }} />
              </div>
            ) : (
              <img src={lbItem.src} alt={lbItem.title} className="w-full h-full object-contain rounded-2xl" />
            )}
            <p className="text-center text-white font-bold mt-4">{lbItem.title}</p>
            <p className="text-center text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{lightboxIdx + 1} / {MEDIA.length}</p>
          </div>

          {/* Bottom thumbs */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {MEDIA.map((m, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }} className="w-14 h-10 rounded-lg overflow-hidden transition-all duration-300" style={{ outline: i === lightboxIdx ? "2px solid white" : "1px solid rgba(255,255,255,0.2)", opacity: i === lightboxIdx ? 1 : 0.4, transform: i === lightboxIdx ? "scale(1.15)" : "scale(1)" }}>
                <img src={m.thumb} alt={m.title} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
