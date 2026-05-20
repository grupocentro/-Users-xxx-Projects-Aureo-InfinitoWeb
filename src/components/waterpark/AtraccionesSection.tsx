import { useState, useRef, useEffect } from "react";
import { Heart, Star, ChevronRight, X, MapPin, Clock, Users, Zap, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import flamingoMascot from "@/assets/flamingo-mascot.png";
import WaterDroplets from "@/components/waterpark/WaterDroplets";

const BASE_URL = "https://infinitowaterpark.com/wp-content/uploads/2026/01/";

const GALLERY_PHOTOS = [
  { url: `${BASE_URL}Pileta-de-Olas.png`, caption: "Pileta de Olas", tag: "💧 Pileta principal" },
  { url: `${BASE_URL}4-scaled-1.jpeg`,    caption: "Toboganes",      tag: "🎢 Zona Aventura" },
  { url: `${BASE_URL}pile-central.png`,   caption: "Pileta Central", tag: "🏊 Pileta central" },
  { url: `${BASE_URL}Zona-lounge.png`,    caption: "Zona Lounge",    tag: "😎 Relax & Lounge" },
  { url: `${BASE_URL}5-scaled-1.jpeg`,    caption: "Río Lento",      tag: "🌊 Río Lento" },
];

// ─── NEON PHOTO GALLERY ─────────────────────────────────────────────────────
function NeonPhotoGallery() {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <div className="mt-10 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "hsl(var(--water-500))" }}>📸 Galería del parque</p>
          <h3 className="font-black text-xl" style={{ color: "hsl(var(--water-800))" }}>El parque en imágenes</h3>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "hsl(var(--water-50))", color: "hsl(var(--water-600))", border: "1px solid hsl(var(--app-border))" }}>{GALLERY_PHOTOS.length} fotos</span>
      </div>

      <div className="relative rounded-3xl overflow-hidden cursor-pointer group mb-3" style={{ height: 260 }} onClick={() => setLightbox(active)}>
        <div className="absolute inset-0 rounded-3xl pointer-events-none z-20 opacity-70 group-hover:opacity-100 transition-opacity duration-400" style={{ boxShadow: "inset 0 0 0 2px rgba(0,180,216,0.7), 0 0 28px rgba(0,180,216,0.45), 0 0 55px rgba(0,119,182,0.25)" }} />
        <img key={active} src={GALLERY_PHOTOS[active].url} alt={GALLERY_PHOTOS[active].caption} className="w-full h-full object-cover" style={{ transform: "scale(1.03)", transition: "transform 0.6s ease" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,10,50,0.8) 0%, transparent 55%)" }} />
        <div className="absolute top-3 left-3 z-10">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ background: "rgba(0,150,200,0.25)", backdropFilter: "blur(10px)", border: "1px solid rgba(0,180,216,0.5)", boxShadow: "0 0 10px rgba(0,180,216,0.3)" }}>{GALLERY_PHOTOS[active].tag}</span>
        </div>
        <div className="absolute left-0 right-0 h-px pointer-events-none z-10" style={{ top: "50%", background: "linear-gradient(to right, transparent, rgba(0,212,255,0.7), transparent)", boxShadow: "0 0 8px rgba(0,212,255,0.8)", animation: "neon-scan 3s ease-in-out infinite" }} />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <p className="font-black text-white text-lg">{GALLERY_PHOTOS[active].caption}</p>
          <p className="text-white/50 text-xs">Tocá para ampliar</p>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {GALLERY_PHOTOS.map((photo, i) => (
          <button key={i} onClick={() => setActive(i)} className="flex-shrink-0 relative rounded-xl overflow-hidden transition-all duration-300" style={{ width: 82, height: 62, outline: i === active ? "2px solid rgba(0,180,216,0.9)" : "2px solid transparent", boxShadow: i === active ? "0 0 14px rgba(0,180,216,0.7), 0 0 28px rgba(0,119,182,0.35)" : "none", transform: i === active ? "scale(1.07)" : "scale(1)" }}>
            <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
            {i !== active && <div className="absolute inset-0 bg-black/40" />}
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,5,20,0.95)", backdropFilter: "blur(20px)" }} onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl w-full rounded-3xl overflow-hidden" style={{ boxShadow: "0 0 0 2px rgba(0,180,216,0.6), 0 0 60px rgba(0,180,216,0.4), 0 0 120px rgba(0,119,182,0.3)" }} onClick={(e) => e.stopPropagation()}>
            <img src={GALLERY_PHOTOS[lightbox].url} alt={GALLERY_PHOTOS[lightbox].caption} className="w-full object-contain" style={{ maxHeight: "80vh" }} />
            <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: "linear-gradient(to top, rgba(0,5,20,0.95), transparent)" }}>
              <p className="font-black text-white text-xl">{GALLERY_PHOTOS[lightbox].caption}</p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--water-300))" }}>{GALLERY_PHOTOS[lightbox].tag}</p>
            </div>
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: "rgba(0,150,200,0.25)", border: "1px solid rgba(0,180,216,0.5)", boxShadow: "0 0 12px rgba(0,180,216,0.4)" }}><X className="w-5 h-5" /></button>
            <button onClick={() => setLightbox((lightbox - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: "rgba(0,150,200,0.25)", border: "1px solid rgba(0,180,216,0.5)" }}><ChevronRight className="w-5 h-5 rotate-180" /></button>
            <button onClick={() => setLightbox((lightbox + 1) % GALLERY_PHOTOS.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: "rgba(0,150,200,0.25)", border: "1px solid rgba(0,180,216,0.5)" }}><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

type Atraccion = {
  id: string;
  nombre: string;
  ubicacion: string | null;
  descripcion: string | null;
  tags: string[] | null;
  badge: string | null;
  rating: number | null;
  reviews: number | null;
  duracion: string | null;
  edad_min: number | null;
  intensidad: string | null;
  accent: string | null;
  imagen_url: string | null;
  orden: number | null;
};

type FilterKey = "todos" | "toboganes" | "piletas" | "relax" | "ninos";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos",     label: "Todos" },
  { key: "toboganes", label: "Toboganes" },
  { key: "piletas",   label: "Piletas" },
  { key: "relax",     label: "Río Lento" },
  { key: "ninos",     label: "Niños" },
];

// ─── DETAIL DRAWER ─────────────────────────────────────────────────────────────
function DetailDrawer({ atraccion, onClose, onLike, liked }: { atraccion: Atraccion; onClose: () => void; onLike: () => void; liked: boolean }) {
  const navigate = useNavigate();
  const minAgeLabel = atraccion.edad_min ? (atraccion.edad_min > 0 ? `${atraccion.edad_min}+` : "Todos") : "Todos";

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: "rgba(2,62,138,0.4)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 rounded-t-[32px] lg:rounded-3xl overflow-hidden bg-white lg:max-w-3xl lg:w-full" style={{ maxHeight: "90svh", animation: "drawer-up 0.35s cubic-bezier(0.32,0.72,0,1)", boxShadow: "0 -8px 50px rgba(0,119,182,0.2)" }}>
        <div className="relative" style={{ height: 240, zIndex: 0 }}>
          <img src={atraccion.imagen_url || ''} alt={atraccion.nombre} className="w-full h-full object-cover lg:h-[320px]" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 30%, transparent 80%)" }} />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/50 lg:hidden" />
          <div className="absolute top-5 left-4 right-4 flex justify-between">
            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-white"><X className="w-5 h-5" style={{ color: "hsl(var(--water-700))" }} /></button>
            <button onClick={onLike} className="w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-white transition-transform active:scale-90"><Heart className="w-5 h-5" style={{ color: liked ? "#FF4B77" : "#9ca3af", fill: liked ? "#FF4B77" : "transparent" }} /></button>
          </div>
        </div>

        <div className="relative z-10 px-5 lg:px-8 pt-2 pb-8 overflow-y-auto bg-white -mt-3" style={{ maxHeight: "calc(90svh - 237px)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5" style={{ color: atraccion.accent || '#0077B6' }} /><span className="text-xs font-semibold" style={{ color: atraccion.accent || '#0077B6' }}>{atraccion.ubicacion}</span></div>
              <h2 className="font-black text-2xl" style={{ color: "hsl(var(--water-800))" }}>{atraccion.nombre}</h2>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /><span className="font-bold text-lg" style={{ color: "hsl(var(--water-800))" }}>{atraccion.rating}</span></div>
              <span className="text-xs" style={{ color: "hsl(var(--app-muted))" }}>{atraccion.reviews} reseñas</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { icon: Clock, label: "Duración", value: atraccion.duracion || '-' },
              { icon: Users, label: "Edad mín.", value: minAgeLabel },
              { icon: Zap, label: "Intensidad", value: atraccion.intensidad || '-' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl p-3 text-center" style={{ background: "hsl(var(--water-50))", border: "1px solid hsl(var(--app-border))" }}>
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(var(--water-500))" }} />
                <p className="font-black text-sm" style={{ color: "hsl(var(--water-800))" }}>{value}</p>
                <p className="text-xs" style={{ color: "hsl(var(--app-muted))" }}>{label}</p>
              </div>
            ))}
          </div>

          <p className="text-sm leading-relaxed mb-6" style={{ color: "hsl(var(--app-muted))" }}>{atraccion.descripcion}</p>

          <button onClick={() => { onClose(); navigate("/comprar"); }} className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95 shadow-lg" style={{ background: "linear-gradient(135deg, hsl(var(--water-800)), hsl(var(--water-600)))", boxShadow: "0 6px 24px hsl(var(--water-700) / 0.3)" }}>
            <ShoppingCart className="w-5 h-5" /> Comprar entradas
          </button>
        </div>
      </div>
    </>
  );
}

// ─── FALLBACK IMAGES for when DB has fewer items ────────────────────────────
const FALLBACK_ATTRACTIONS: Atraccion[] = [
  { id: "f1", nombre: "Kamikaze", ubicacion: "Zona Extrema", descripcion: "Caída libre desde 20 metros de altura. Solo para valientes.", tags: ["toboganes"], badge: "⚡ Extremo", rating: 4.9, reviews: 320, duracion: "30 seg", edad_min: 14, intensidad: "Extrema", accent: "#e63946", imagen_url: `${BASE_URL}4-scaled-1.jpeg`, orden: 10 },
  { id: "f2", nombre: "Río Aventura", ubicacion: "Zona Central", descripcion: "Recorrido de 400m por un río con corrientes y cascadas.", tags: ["relax"], badge: "🌊 Relax", rating: 4.7, reviews: 280, duracion: "15 min", edad_min: 0, intensidad: "Baja", accent: "#0096c7", imagen_url: `${BASE_URL}5-scaled-1.jpeg`, orden: 11 },
  { id: "f3", nombre: "Splash Kids", ubicacion: "Zona Niños", descripcion: "Área exclusiva con juegos de agua para los más chicos.", tags: ["ninos"], badge: "👶 Kids", rating: 4.8, reviews: 190, duracion: "Libre", edad_min: 0, intensidad: "Baja", accent: "#f4a261", imagen_url: `${BASE_URL}pile-central.png`, orden: 12 },
  { id: "f4", nombre: "Tornado", ubicacion: "Zona Aventura", descripcion: "Tobogán tipo embudo con giros de 360°.", tags: ["toboganes"], badge: "🌀 Nuevo", rating: 4.6, reviews: 150, duracion: "45 seg", edad_min: 12, intensidad: "Alta", accent: "#6a4c93", imagen_url: `${BASE_URL}Zona-lounge.png`, orden: 13 },
  { id: "f5", nombre: "Cascada Infinita", ubicacion: "Zona Lounge", descripcion: "Pileta infinita con borde de cascada y vista panorámica.", tags: ["piletas"], badge: "✨ Premium", rating: 4.9, reviews: 410, duracion: "Libre", edad_min: 0, intensidad: "Media", accent: "#2a9d8f", imagen_url: `${BASE_URL}Pileta-de-Olas.png`, orden: 14 },
];

// ─── CIRCULAR INTERACTIVE MODULE (DESKTOP) ─────────────────────────────────
function CircularModule({ cards: rawCards, onOpen, onLike, likedIds, activeFilter, setActiveFilter }: { cards: Atraccion[]; onOpen: (card: Atraccion) => void; onLike: (id: string) => void; likedIds: Set<string>; activeFilter: FilterKey; setActiveFilter: (f: FilterKey) => void }) {
  // Ensure at least 8 items for a full-looking wheel
  const cards = rawCards.length >= 8 ? rawCards : [...rawCards, ...FALLBACK_ATTRACTIONS].slice(0, Math.max(rawCards.length, 10));

  const [activeIdx, setActiveIdx] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [paused, setPaused] = useState(false);
  const navigate = useNavigate();

  const total = cards.length;
  const active = cards[activeIdx] || cards[0];

  // Auto-rotate every 3 seconds, pause on hover
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % total);
    }, 3000);
    return () => clearInterval(interval);
  }, [total, paused]);

  // Update rotation when activeIdx changes
  useEffect(() => {
    const anglePerItem = 360 / total;
    setRotation(-activeIdx * anglePerItem);
  }, [activeIdx, total]);

  if (!active) return null;

  const RADIUS_X = 420;
  const RADIUS_Y = 380;
  const CENTER_SIZE = 520;
  const THUMB_SIZE = 75;
  const CIRCLE_CENTER_X = 0;
  const CIRCLE_CENTER_Y = 440;

  return (
    <div className="relative flex items-center w-full" style={{ minHeight: 880 }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Flamingo mascot - right side, touching bottom */}
      <img
        src={flamingoMascot}
        alt="Flamingo mascota"
        className="absolute bottom-0 pointer-events-none select-none z-10 hidden 2xl:block"
        style={{ height: '100%', width: 'auto', right: '0%' }}
      />
      {/* Left: half-circle layout - clipped */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 600, height: 880 }}>
        {/* Outer decorative ring */}
        <div
          className="absolute"
          style={{
            width: (RADIUS_X + 30) * 2,
            height: (RADIUS_Y + 30) * 2,
            left: CIRCLE_CENTER_X - (RADIUS_X + 30),
            top: CIRCLE_CENTER_Y - (RADIUS_Y + 30),
            borderRadius: "50%",
            border: "4px solid hsl(var(--water-600))",
            boxShadow: "0 0 40px hsl(var(--water-500) / 0.2), inset 0 0 40px hsl(var(--water-500) / 0.1)",
          }}
        />

        {/* Inner decorative ring */}
        <div
          className="absolute"
          style={{
            width: (RADIUS_X - 10) * 2,
            height: (RADIUS_Y - 10) * 2,
            left: CIRCLE_CENTER_X - (RADIUS_X - 10),
            top: CIRCLE_CENTER_Y - (RADIUS_Y - 10),
            borderRadius: "50%",
            border: "2px dashed hsl(var(--water-300) / 0.4)",
          }}
        />

        {/* Center: large active image */}
        <div
          className="absolute rounded-full overflow-hidden transition-all duration-700"
          style={{
            width: CENTER_SIZE,
            height: CENTER_SIZE,
            left: CIRCLE_CENTER_X - CENTER_SIZE / 2,
            top: CIRCLE_CENTER_Y - CENTER_SIZE / 2,
            boxShadow: "0 0 0 5px hsl(var(--water-600)), 0 0 60px hsl(var(--water-500) / 0.3), 0 20px 80px rgba(0,60,130,0.4)",
          }}
        >
          <img
            src={active.imagen_url || ''}
            alt={active.nombre}
            className="w-full h-full object-cover transition-all duration-700"
            key={active.id}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,62,138,0.6) 0%, transparent 50%)" }} />
        </div>

        {/* Orbiting thumbnails - elliptical */}
        {cards.map((card, i) => {
          const anglePerItem = 360 / total;
          const baseAngle = anglePerItem * i + rotation;
          const rad = (baseAngle * Math.PI) / 180;
          const x = CIRCLE_CENTER_X + (RADIUS_X + 45) * Math.cos(rad);
          const y = CIRCLE_CENTER_Y + (RADIUS_Y + 45) * Math.sin(rad);
          const isActive = i === activeIdx;

          // Only show thumbnails on the visible (right) half
          if (x < -THUMB_SIZE) return null;

          const size = isActive ? Math.round(THUMB_SIZE * 1.5) : THUMB_SIZE;

          return (
            <button
              key={card.id}
              className="absolute transition-all duration-700 ease-in-out overflow-hidden group"
              style={{
                width: size,
                height: size,
                left: x - size / 2,
                top: y - size / 2,
                borderRadius: 12,
                border: isActive ? "3px solid hsl(var(--water-400))" : "2.5px solid hsl(var(--water-300) / 0.6)",
                boxShadow: isActive
                  ? "0 0 20px hsl(var(--water-500) / 0.5), 0 4px 16px rgba(0,60,130,0.3)"
                  : "0 4px 12px rgba(0,60,130,0.15)",
                zIndex: isActive ? 10 : 2,
              }}
              onClick={() => setActiveIdx(i)}
            >
              <img
                src={card.imagen_url || ''}
                alt={card.nombre}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              {!isActive && <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-all duration-300" />}
            </button>
          );
        })}
      </div>

      {/* Right: title + filters + active card info */}
      <div className="flex-1 max-w-lg pl-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--water-500))" }}>🌊 Infinito Water Park</p>
          <h2 className="font-black text-4xl mb-3" style={{ color: "hsl(var(--water-800))" }}>Nuestras atracciones</h2>
          {active.imagen_url && (
            <img
              src={active.imagen_url}
              alt={active.nombre}
              className="w-full h-44 rounded-2xl object-cover transition-all duration-500"
              style={{ border: "2px solid hsl(var(--water-300))", boxShadow: "0 4px 16px rgba(0,60,130,0.15)" }}
              key={active.id + '-banner'}
            />
          )}
        </div>
        
        <h3
          className="font-black text-4xl leading-tight mb-3 transition-all duration-500"
          style={{ color: "hsl(var(--water-800))" }}
          key={active.id}
        >
          {active.nombre}
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" style={{ color: active.accent || "hsl(var(--water-500))" }} />
            <span className="text-sm font-medium" style={{ color: "hsl(var(--app-muted))" }}>{active.ubicacion}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-sm" style={{ color: "hsl(var(--water-800))" }}>{active.rating}</span>
            <span className="text-xs" style={{ color: "hsl(var(--app-muted))" }}>({active.reviews})</span>
          </div>
        </div>
        <p className="text-base leading-relaxed mb-6" style={{ color: "hsl(var(--app-muted))" }}>
          {active.descripcion}
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Duración", value: active.duracion || '-' },
            { label: "Intensidad", value: active.intensidad || '-' },
            { label: "Edad mín.", value: active.edad_min ? `${active.edad_min}+` : "Todos" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl p-3 text-center" style={{ background: "hsl(var(--water-50))", border: "1px solid hsl(var(--app-border))" }}>
              <p className="font-black text-sm" style={{ color: "hsl(var(--water-800))" }}>{value}</p>
              <p className="text-xs" style={{ color: "hsl(var(--app-muted))" }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/comprar")}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-white text-sm transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, hsl(var(--water-800)), hsl(var(--water-600)))",
              boxShadow: "0 6px 24px hsl(var(--water-700) / 0.3)",
            }}
          >
            <ShoppingCart className="w-4 h-4" /> Comprar entradas
          </button>
          <button
            onClick={() => onOpen(active)}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all hover:scale-105"
            style={{
              background: "hsl(var(--water-50))",
              color: "hsl(var(--water-700))",
              border: "1.5px solid hsl(var(--app-border))",
            }}
          >
            Ver detalle <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation dots */}
        <div className="flex items-center gap-2 mt-8">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIdx ? 24 : 8,
                height: 8,
                background: i === activeIdx ? "hsl(var(--water-600))" : "hsl(var(--water-200))",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CARD STACK (MOBILE) ──────────────────────────────────────────────────────
const CARD_ROTATIONS = [-8, -4, 0, 4, 8];

function CardStack({ cards, onOpen, onLike, likedIds }: { cards: Atraccion[]; onOpen: (card: Atraccion) => void; onLike: (id: string) => void; likedIds: Set<string> }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startTime = useRef(0);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const animFrame = useRef<number>(0);

  useEffect(() => { setActiveIdx(0); setDragDelta(0); }, [cards]);

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= cards.length || idx === activeIdx) return;
    setTransitioning(true);
    setDragDelta(0);
    setTimeout(() => { setActiveIdx(idx); setTransitioning(false); }, 250);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    lastX.current = e.touches[0].clientX;
    startTime.current = Date.now();
    velocity.current = 0;
    setIsDragging(true);
    cancelAnimationFrame(animFrame.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    velocity.current = currentX - lastX.current;
    lastX.current = currentX;
    setDragDelta(currentX - startX.current);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const swipeVelocity = Math.abs(velocity.current);
    const threshold = swipeVelocity > 3 ? 20 : 50;

    if (dragDelta < -threshold) {
      goTo(activeIdx + 1);
    } else if (dragDelta > threshold) {
      goTo(activeIdx - 1);
    } else {
      setDragDelta(0);
    }
  };

  return (
    <div className="relative w-full" style={{ height: 420, touchAction: "pan-y", willChange: "transform" }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {cards.map((card, i) => {
        const offset = (i - activeIdx + cards.length) % cards.length;
        if (offset > 3) return null;
        const isActive = offset === 0;
        const scale = isActive ? 1 : 1 - offset * 0.055;
        const ty = isActive ? 0 : offset * 18;
        const rotate = isActive ? 0 : CARD_ROTATIONS[offset] ?? 0;
        const zIndex = 20 - offset;
        const opacity = offset > 2 ? 0 : isActive ? (transitioning ? 0 : 1) : 0.85 - offset * 0.15;
        const blur = offset > 0 ? offset * 1.5 : 0;
        const dragX = isActive ? dragDelta * 1.1 : offset === 1 ? dragDelta * 0.15 : 0;
        const dragRotate = isActive ? dragDelta * 0.03 : 0;

        return (
          <div key={card.id} className="absolute inset-x-0 mx-auto cursor-pointer select-none" style={{ width: "100%", maxWidth: 340, height: 390, left: "50%", transform: `translateX(calc(-50% + ${dragX}px)) translateY(${ty}px) scale(${scale}) rotate(${rotate + dragRotate}deg)`, transformOrigin: "bottom center", zIndex, opacity, filter: blur > 0 ? `blur(${blur}px)` : "none", transition: isDragging ? "transform 0.05s linear" : "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)", padding: 5, background: "white", borderRadius: 28, boxShadow: isActive ? "0 28px 70px rgba(0,60,130,0.3)" : "0 10px 35px rgba(0,60,130,0.15)", willChange: "transform" }}
            onClick={isActive && Math.abs(dragDelta) < 8 ? () => onOpen(card) : !isActive ? () => goTo(i) : undefined}>
            <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 24 }}>
              <img src={card.imagen_url || ''} alt={card.nombre} className="absolute inset-0 w-full h-full object-cover" draggable={false} style={{ transition: "opacity 0.35s ease, transform 0.55s ease", opacity: transitioning && isActive ? 0 : 1, transform: isActive ? "scale(1)" : "scale(1.04)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,62,138,0.92) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)" }} />

              {isActive && (
                <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90" style={{ background: "rgba(255,255,255,0.95)" }} onClick={(e) => { e.stopPropagation(); onLike(card.id); }}>
                  <Heart className="w-5 h-5 transition-colors" style={{ color: likedIds.has(card.id) ? "#FF4B77" : "#9ca3af", fill: likedIds.has(card.id) ? "#FF4B77" : "transparent" }} />
                </button>
              )}

              {isActive && (
                <div className="absolute top-4 left-4" style={{ opacity: transitioning ? 0 : 1, transition: "opacity 0.25s ease" }}>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>{card.badge}</span>
                </div>
              )}

              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-10" style={{ opacity: transitioning ? 0 : 1, transform: transitioning ? "translateY(8px)" : "translateY(0)", transition: "opacity 0.3s ease, transform 0.3s ease" }}>
                  <p className="text-xs opacity-60 flex items-center gap-1 mb-0.5"><MapPin className="w-3 h-3" />{card.ubicacion}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="font-black text-xl leading-tight">{card.nombre}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-sm">{card.rating}</span>
                        <span className="text-white/50 text-xs">({card.reviews})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}>Ver más <ChevronRight className="w-3 h-3" /></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1.5">
        {cards.map((_, i) => <button key={i} onClick={() => goTo(i)} className="rounded-full transition-all duration-300" style={{ width: i === activeIdx ? 18 : 6, height: 6, background: i === activeIdx ? "hsl(var(--water-600))" : "hsl(var(--water-200))" }} />)}
      </div>
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function AtraccionesSection() {
  const [atracciones, setAtracciones] = useState<Atraccion[]>([]);
  const [actividades, setActividades] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("todos");
  const [selectedCard, setSelectedCard] = useState<Atraccion | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from("atracciones")
      .select("*")
      .eq("estado", "activo")
      .order("orden", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setAtracciones(data.map(a => ({
            ...a,
            tags: Array.isArray(a.tags) ? a.tags as string[] : [],
          })));
        }
      });
    supabase
      .from("actividades")
      .select("*")
      .eq("estado", "activo")
      .order("orden", { ascending: true })
      .then(({ data }) => {
        if (data) setActividades(data);
      });
  }, []);

  const filtered = activeFilter === "todos" ? atracciones : atracciones.filter((a) => a.tags?.includes(activeFilter));

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (atracciones.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes drawer-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <section id="atracciones" className="relative" style={{ background: "hsl(var(--app-bg))" }}>
        <WaterDroplets />
        {/* Wave divider on desktop */}
        <div className="hidden lg:block absolute -top-20 left-0 right-0 z-10 pointer-events-none" style={{ height: 80 }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-full" style={{ filter: "drop-shadow(0 -4px 12px rgba(0,119,182,0.15))" }}>
            <path
              d="M0,40 C160,80 320,0 480,40 C640,80 800,0 960,40 C1120,80 1280,0 1440,40 L1440,80 L0,80 Z"
              fill="hsl(204 60% 97%)"
            />
          </svg>
        </div>
        {/* Mobile gradient bar */}
        <div className="lg:hidden" style={{ background: "linear-gradient(160deg, hsl(var(--water-800)) 0%, hsl(var(--water-600)) 55%, hsl(var(--water-400)) 100%)", height: 6 }} />

        {/* ── MOBILE LAYOUT ── */}
        <div className="lg:hidden max-w-lg mx-auto px-4 pt-10 pb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "hsl(var(--water-500))" }}>🌊 Infinito Water Park</p>
              <h2 className="font-black text-xl" style={{ color: "hsl(var(--water-800))" }}>Nuestras atracciones</h2>
            </div>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "hsl(var(--water-50))", color: "hsl(var(--water-600))", border: "1px solid hsl(var(--app-border))" }}>{filtered.length} disponibles</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <button key={f.key} onClick={() => setActiveFilter(f.key)} className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all duration-250 whitespace-nowrap" style={{ background: isActive ? "hsl(var(--water-800))" : "white", color: isActive ? "white" : "hsl(var(--app-muted))", border: isActive ? "none" : "1px solid hsl(var(--app-border))", transform: isActive ? "scale(1.04)" : "scale(1)", boxShadow: isActive ? "0 4px 14px hsl(var(--water-800) / 0.25)" : "0 1px 3px rgba(0,119,182,0.06)" }}>
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="mb-14">
            <CardStack cards={filtered} onOpen={setSelectedCard} onLike={toggleLike} likedIds={likedIds} />
          </div>

          <div className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base" style={{ color: "hsl(var(--water-800))" }}>Próximas actividades</h3>
              <button className="text-xs font-bold" style={{ color: "hsl(var(--water-500))" }}>Ver todos</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
              {actividades.slice(0, 4).map((a) => (
                <button key={a.id} className="flex-shrink-0 bg-white text-left transition-all active:scale-[0.97]" style={{ width: 185, borderRadius: 20, boxShadow: "0 2px 16px rgba(0,60,130,0.09)", border: "1.5px solid hsl(var(--app-border))", overflow: "hidden" }}>
                  <div style={{ height: 130, position: "relative", overflow: "hidden", borderRadius: "18px 18px 0 0" }}>
                    <img src={a.imagen_url || ''} alt={a.nombre} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs mb-0.5 font-medium" style={{ color: "hsl(var(--app-muted))" }}>{a.ubicacion}</p>
                    <p className="font-black text-sm leading-tight mb-1.5" style={{ color: "hsl(var(--water-900))" }}>{a.nombre}</p>
                    <p className="text-xs mb-2.5" style={{ color: "hsl(var(--app-muted))" }}>{a.duracion} · {a.intensidad}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-bold" style={{ color: "hsl(var(--water-800))" }}>{a.rating}</span>
                        <span className="text-xs underline" style={{ color: "hsl(var(--app-muted))" }}>{a.reviews} reseñas</span>
                      </div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--water-800))" }}><ChevronRight className="w-3.5 h-3.5 text-white" /></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <NeonPhotoGallery />
        </div>

        {/* ── DESKTOP LAYOUT: Circular Module ── */}
        <div className="hidden lg:block pt-16 overflow-hidden">
          <CircularModule cards={filtered} onOpen={setSelectedCard} onLike={toggleLike} likedIds={likedIds} activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        </div>
      </section>


      {selectedCard && (
        <DetailDrawer
          atraccion={selectedCard}
          onClose={() => setSelectedCard(null)}
          onLike={() => toggleLike(selectedCard.id)}
          liked={likedIds.has(selectedCard.id)}
        />
      )}
    </>
  );
}
