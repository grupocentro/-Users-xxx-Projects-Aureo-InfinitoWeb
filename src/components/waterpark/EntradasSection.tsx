import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Zap, Shield, Clock, ShoppingCart, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import entradasBg from "@/assets/entradas-bg.png";
import { fireAndForget } from "@/lib/analytics";

type TipoEntrada = {
  id: string;
  nombre: string;
  emoji: string | null;
  tag: string | null;
  features: { icon: string; text: string }[] | null;
  highlight: boolean | null;
  precio_semana: number;
  precio_finde: number;
  estado: string;
};

const INFO_CHIPS = [
  { icon: Clock, text: "10:00 a 20:00 hs" },
  { icon: Shield, text: "Seguridad certificada" },
  { icon: Zap, text: "Fast pass disponible" },
  { icon: Check, text: "Estacionamiento gratis" },
];

/* SVG scallop mask for the right stub */
function ScallopDivider() {
  return (
    <div className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-20" style={{ left: "65%", width: 28 }}>
      {/* Vertical dashed line */}
      <div className="absolute inset-y-4" style={{ width: 0, borderLeft: "2px dashed hsl(var(--water-400) / 0.3)" }} />
      {/* Scallop notches */}
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="rounded-full flex-shrink-0"
          style={{
            width: 14,
            height: 14,
            background: "hsl(var(--app-bg))",
            margin: "6px 0",
            boxShadow: "inset 0 1px 3px hsl(var(--water-400) / 0.15)",
          }}
        />
      ))}
    </div>
  );
}

/* Top/bottom scallop notches for horizontal tear */
function HorizontalScallop() {
  return (
    <div className="relative z-10 px-0 my-0">
      <div className="flex items-center">
        <div className="w-5 h-5 rounded-full flex-shrink-0 -ml-2.5" style={{ background: "hsl(var(--app-bg))" }} />
        <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: "hsl(var(--water-400) / 0.25)" }} />
        <div className="w-5 h-5 rounded-full flex-shrink-0 -mr-2.5" style={{ background: "hsl(var(--app-bg))" }} />
      </div>
    </div>
  );
}

/* Fake barcode SVG */
function Barcode({ className = "" }: { className?: string }) {
  const bars = [3,1,2,1,3,2,1,1,3,1,2,3,1,2,1,1,3,2,1,3,1,2,1,3,2,1,1,2,3,1,2,1,3,1,2];
  return (
    <svg className={className} viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {bars.map((w, i) => {
        const x = bars.slice(0, i).reduce((a, b) => a + b + 1, 0);
        return <rect key={i} x={x} y={0} width={w} height={28} rx={0.5} fill="hsl(var(--water-700))" opacity={0.6} />;
      })}
      <text x="70" y={32} textAnchor="middle" fontSize="5" fill="hsl(var(--water-600))" opacity={0.5} fontFamily="monospace">INF-2026-AQUAFUN</text>
    </svg>
  );
}

/* Physical Ticket Card — Desktop */
function TicketCardDesktop({
  allFeatures,
  onBuy,
  hovered,
  setHovered,
}: {
  allFeatures: { icon: string; text: string }[];
  onBuy: () => void;
  hovered: boolean;
  setHovered: (v: boolean) => void;
}) {
  return (
    <div
      className="relative mx-auto max-w-5xl cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        filter: "drop-shadow(0 16px 48px hsl(var(--water-500) / 0.18))",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), filter 0.5s ease",
      }}
    >
      <div
        className="relative rounded-[24px] overflow-hidden"
        style={{
          background: "linear-gradient(165deg, hsl(var(--water-100)) 0%, hsl(var(--water-50)) 40%, hsl(195 80% 92%) 100%)",
          minHeight: 320,
        }}
      >
        <ScallopDivider />

        {/* ── LEFT: Ticket main body ── */}
        <div className="relative z-10" style={{ width: "65%", padding: "32px 40px 28px 40px" }}>
          {/* Logo + badge */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(var(--water-500) / 0.12)", border: "1px solid hsl(var(--water-400) / 0.2)" }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "hsl(var(--water-600))" }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "hsl(var(--water-500))" }}>Infinito Water Park</p>
              <p className="text-[9px] font-medium" style={{ color: "hsl(var(--water-400))" }}>Temporada 2025 / 2026</p>
            </div>
          </div>

          {/* Title */}
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "hsl(var(--water-500))" }}>ACCESO</p>
          <h3 className="font-black leading-none mb-4" style={{ fontSize: "clamp(2.2rem, 4vw, 3rem)", color: "hsl(var(--water-800))", letterSpacing: "-0.02em" }}>
            AQUA FUN
          </h3>

          {/* Price row */}
          <div className="flex items-end gap-4 mb-5">
            <div>
              <p className="font-black text-3xl leading-none mb-1" style={{ color: "hsl(var(--water-700))" }}>$71.991</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--water-400))" }}>o 9 cuotas sin interés de $7.999</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "hsl(var(--water-500) / 0.1)", border: "1px solid hsl(var(--water-400) / 0.2)" }}>
              <Users className="w-3 h-3" style={{ color: "hsl(var(--water-500))" }} />
              <span className="text-[10px] font-bold" style={{ color: "hsl(var(--water-600))" }}>Adultos y menores</span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {allFeatures.slice(0, 6).map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-2 py-2 px-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: "hsl(var(--water-200) / 0.5)", border: "1px solid hsl(var(--water-300) / 0.4)" }}
              >
                <span className="text-sm">{f.icon}</span>
                <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--water-700))" }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Barcode + CTA row */}
          <div className="flex items-end justify-between">
            <Barcode className="w-32 h-8 opacity-60" />
            <button
              onClick={onBuy}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm transition-all duration-300"
              style={{
                background: hovered
                  ? "linear-gradient(135deg, hsl(var(--water-600)), hsl(var(--water-700)))"
                  : "linear-gradient(135deg, hsl(var(--water-700)), hsl(var(--water-800)))",
                color: "white",
                boxShadow: hovered
                  ? "0 10px 32px hsl(var(--water-600) / 0.4)"
                  : "0 6px 20px hsl(var(--water-700) / 0.3)",
                transform: hovered ? "scale(1.04)" : "scale(1)",
              }}
            >
              <ShoppingCart className="w-4 h-4" /> Comprá online <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── RIGHT: Photo stub ── */}
        <div className="absolute top-0 right-0 bottom-0 z-10" style={{ width: "35%", paddingLeft: 20 }}>
          <div className="h-full w-full overflow-hidden rounded-r-[24px]">
            <img
              src={entradasBg}
              alt="Infinito Water Park"
              className="w-full h-full object-cover transition-transform duration-700"
              style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, hsl(var(--water-100)) 0%, transparent 25%)" }} />
            <div className="absolute bottom-0 inset-x-0" style={{ background: "linear-gradient(to top, hsl(var(--water-100) / 0.6) 0%, transparent 40%)" }} />
            {/* Rotated text like physical ticket */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
              style={{
                transform: "translate(-50%, -50%) rotate(-90deg)",
                fontSize: "clamp(1rem, 2vw, 1.4rem)",
                fontWeight: 900,
                letterSpacing: "0.3em",
                color: "rgba(255,255,255,0.7)",
                textShadow: "0 2px 12px rgba(0,0,0,0.3)",
                textTransform: "uppercase",
              }}
            >
              Aqua Fun Pass
            </div>
          </div>
        </div>

        {/* Decorative circles at edges */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: "hsl(var(--app-bg))" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-6 rounded-full" style={{ background: "hsl(var(--app-bg))" }} />
      </div>
    </div>
  );
}

export default function EntradasSection() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState<TipoEntrada[]>([]);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("tipos_entrada")
      .select("*")
      .eq("estado", "activo")
      .neq("nombre", "Eventos")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const parsed = data.map(d => ({
            ...d,
            features: Array.isArray(d.features) ? d.features as { icon: string; text: string }[] : [],
          }));
          setPlanes(parsed);
        }
      });
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.05, rootMargin: "200px" });
    obs.observe(el);
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => { obs.disconnect(); clearTimeout(timer); };
  }, []);

  if (planes.length === 0) return null;

  const allFeatures: { icon: string; text: string }[] = [];
  const seenTexts = new Set<string>();
  planes.forEach(p => {
    (p.features || []).forEach(f => {
      if (!seenTexts.has(f.text)) {
        seenTexts.add(f.text);
        allFeatures.push(f);
      }
    });
  });

  return (
    <section id="entradas" ref={sectionRef} className="relative overflow-hidden" style={{ background: "hsl(var(--app-bg))" }}>
      <div className="hidden lg:block" style={{ background: "linear-gradient(90deg, transparent 0%, transparent 40%, hsl(var(--water-400)) 60%, hsl(var(--water-500)) 80%, hsl(var(--water-300)) 100%)", height: 4 }} />
      <div className="lg:hidden" style={{ background: "linear-gradient(90deg, hsl(var(--water-300)), hsl(var(--water-500)), hsl(var(--water-300)))", height: 4 }} />

      <div className="max-w-lg lg:max-w-6xl mx-auto px-4 pt-8 pb-10 relative z-10">
        <div className="mb-6" style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(16px)", transition: "all 0.6s ease" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "hsl(var(--water-500))" }}>🎟️ Temporada 2025/2026</p>
          <h2 className="font-black text-xl lg:text-3xl" style={{ color: "hsl(var(--water-800))" }}>Entradas y Precios</h2>
        </div>

        {/* ── MOBILE LAYOUT ── */}
        <div className="lg:hidden" style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "all 0.6s ease 0.2s" }}>
          <div className="relative" style={{ filter: "drop-shadow(0 10px 30px hsl(var(--water-500) / 0.18))" }}>
            <div
              className="rounded-[20px] overflow-hidden relative"
              style={{
                background: "linear-gradient(165deg, hsl(var(--water-100)) 0%, hsl(var(--water-50)) 40%, hsl(195 80% 92%) 100%)",
              }}
            >
              {/* ── TOP: Photo stub with scallop bottom ── */}
              <div className="relative overflow-hidden" style={{ height: 160 }}>
                <img src={entradasBg} alt="Infinito Water Park" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(var(--water-100)) 5%, transparent 50%)" }} />
                {/* Rotated watermark text */}
                <div
                  className="absolute top-1/2 right-4 -translate-y-1/2"
                  style={{
                    transform: "translateY(-50%) rotate(-90deg)",
                    fontSize: "0.7rem",
                    fontWeight: 900,
                    letterSpacing: "0.25em",
                    color: "rgba(255,255,255,0.5)",
                    textShadow: "0 1px 8px rgba(0,0,0,0.25)",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Aqua Fun Pass
                </div>
              </div>

              {/* Horizontal scallop tear line */}
              <div className="relative z-10 -mt-0.5">
                <div className="flex items-center justify-center gap-0 px-0">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 -ml-2.5" style={{ background: "hsl(var(--app-bg))" }} />
                  <div className="flex-1 flex items-center justify-between px-1">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div
                        key={i}
                        className="rounded-full flex-shrink-0"
                        style={{
                          width: 10,
                          height: 10,
                          background: "hsl(var(--app-bg))",
                          boxShadow: "inset 0 1px 2px hsl(var(--water-400) / 0.12)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="w-5 h-5 rounded-full flex-shrink-0 -mr-2.5" style={{ background: "hsl(var(--app-bg))" }} />
                </div>
              </div>

              {/* ── BOTTOM: Ticket body ── */}
              <div className="px-5 pt-3 pb-5">
                {/* Logo + season */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "hsl(var(--water-500) / 0.1)", border: "1px solid hsl(var(--water-400) / 0.2)" }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--water-600))" }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "hsl(var(--water-500))" }}>Infinito Water Park</p>
                    <p className="text-[8px] font-medium" style={{ color: "hsl(var(--water-400))" }}>Temporada 2025 / 2026</p>
                  </div>
                </div>

                {/* Title */}
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: "hsl(var(--water-500))" }}>ACCESO</p>
                <h3 className="font-black text-3xl leading-none mb-3" style={{ color: "hsl(var(--water-800))", letterSpacing: "-0.02em" }}>
                  AQUA FUN
                </h3>

                {/* Price */}
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="font-black text-2xl leading-none mb-0.5" style={{ color: "hsl(var(--water-700))" }}>$71.991</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--water-400))" }}>o 9 cuotas s/int. de $7.999</p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "hsl(var(--water-500) / 0.08)", border: "1px solid hsl(var(--water-400) / 0.15)" }}>
                    <Users className="w-3 h-3" style={{ color: "hsl(var(--water-500))" }} />
                    <span className="text-[9px] font-bold" style={{ color: "hsl(var(--water-600))" }}>Adultos y menores</span>
                  </div>
                </div>

                {/* Features compact grid */}
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {allFeatures.slice(0, 6).map((f) => (
                    <div
                      key={f.text}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                      style={{ background: "hsl(var(--water-200) / 0.45)", border: "1px solid hsl(var(--water-300) / 0.3)" }}
                    >
                      <span className="text-xs">{f.icon}</span>
                      <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--water-700))" }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => { fireAndForget("comprar_entrada_click", { element_label: "Entradas mobile CTA" }); navigate("/comprar"); }}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--water-700)), hsl(var(--water-800)))",
                    color: "white",
                    boxShadow: "0 6px 20px hsl(var(--water-700) / 0.35)",
                  }}
                >
                  <ShoppingCart className="w-4 h-4" /> Comprá tu entrada <ChevronRight className="w-4 h-4" />
                </button>

                {/* Barcode + note */}
                <div className="flex items-center justify-between mt-3">
                  <Barcode className="w-24 h-6 opacity-50" />
                  <p className="text-[9px] font-semibold" style={{ color: "hsl(var(--water-400) / 0.5)" }}>*O en boletería</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info chips mobile */}
          <div className="grid grid-cols-2 gap-2 mt-4" style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)", transition: "all 0.6s ease 0.4s" }}>
            {INFO_CHIPS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 p-2.5 rounded-xl bg-white" style={{ border: "1px solid hsl(var(--app-border))", boxShadow: "0 1px 4px hsl(var(--water-500) / 0.05)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--water-50))" }}><Icon className="w-3.5 h-3.5" style={{ color: "hsl(var(--water-500))" }} /></div>
                <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--water-800))" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── DESKTOP LAYOUT ── */}
        <div className="hidden lg:block" style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "all 0.8s ease 0.2s" }}>
          <TicketCardDesktop
            allFeatures={allFeatures}
            onBuy={() => { fireAndForget("comprar_entrada_click", { element_label: "Entradas desktop CTA" }); navigate("/comprar"); }}
            hovered={hovered}
            setHovered={setHovered}
          />

          {/* Info chips desktop */}
          <div className="grid grid-cols-4 gap-3 mt-8 max-w-5xl mx-auto" style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)", transition: "all 0.6s ease 0.5s" }}>
            {INFO_CHIPS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 p-3 rounded-xl bg-white transition-all duration-300 hover:shadow-md hover:-translate-y-0.5" style={{ border: "1px solid hsl(var(--app-border))", boxShadow: "0 1px 4px hsl(var(--water-500) / 0.05)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--water-50))" }}><Icon className="w-4 h-4" style={{ color: "hsl(var(--water-500))" }} /></div>
                <span className="text-xs font-semibold" style={{ color: "hsl(var(--water-800))" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
