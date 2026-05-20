import { MapPin, Clock, Car, Navigation, ParkingCircle } from "lucide-react";
import { fireAndForget } from "@/lib/analytics";

const CHIPS = [
  { icon: Clock,         label: "Abierto: 10 – 20 hs" },
  { icon: MapPin,        label: "Córdoba, AR" },
  { icon: Car,           label: "Acceso por Circunvalación" },
  { icon: ParkingCircle, label: "Estacionamiento gratis" },
];

const HORARIOS = [
  { dia: "Lunes – Viernes", hora: "10:00 – 20:00" },
  { dia: "Sábados",         hora: "09:00 – 21:00" },
  { dia: "Domingos",        hora: "09:00 – 21:00" },
];

const MAPS_URL = "https://www.google.com/maps/place/Balneario+Infinito/@-31.1882,-64.1695,15z";
const MAPS_EMBED = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3404.0!2d-64.1695!3d-31.1882!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDExJzE3LjUiUyA2NMKwMTAnMTAuMiJX!5e0!3m2!1ses!2sar!4v1708000000000!5m2!1ses!2sar";

/* ── Tech corner helper ── */
function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = "absolute w-6 h-6";
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: -2, left: -2, borderTop: "2px solid", borderLeft: "2px solid", borderTopLeftRadius: 8 },
    tr: { top: -2, right: -2, borderTop: "2px solid", borderRight: "2px solid", borderTopRightRadius: 8 },
    bl: { bottom: -2, left: -2, borderBottom: "2px solid", borderLeft: "2px solid", borderBottomLeftRadius: 8 },
    br: { bottom: -2, right: -2, borderBottom: "2px solid", borderRight: "2px solid", borderBottomRightRadius: 8 },
  };
  return (
    <div
      className={base}
      style={{ ...styles[pos], borderColor: "hsl(var(--water-300))" }}
    />
  );
}

export default function MapaSection() {
  return (
    <section
      id="mapa"
      className="relative overflow-hidden py-20 px-4"
      style={{
        background: "linear-gradient(160deg, hsl(var(--water-900)) 0%, hsl(var(--water-800)) 60%, hsl(var(--water-700)) 100%)",
      }}
    >
      {/* ── Tech grid background ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--water-400) / 0.07) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--water-400) / 0.07) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Floating particles ── */}
      {[
        { w: 80, h: 80, top: "10%", left: "5%",  delay: "0s",   dur: "8s"  },
        { w: 50, h: 50, top: "30%", left: "88%", delay: "1.5s", dur: "10s" },
        { w: 35, h: 35, top: "65%", left: "12%", delay: "3s",   dur: "7s"  },
        { w: 60, h: 60, top: "80%", left: "75%", delay: "0.8s", dur: "9s"  },
        { w: 25, h: 25, top: "50%", left: "45%", delay: "4s",   dur: "6s"  },
        { w: 45, h: 45, top: "15%", left: "60%", delay: "2s",   dur: "11s" },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.w, height: p.h,
            top: p.top, left: p.left,
            background: i % 2 === 0
              ? "hsl(var(--water-400) / 0.12)"
              : "hsl(var(--water-300) / 0.08)",
            animation: `float-particle ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}

      <div className="relative z-10 max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-xs font-bold uppercase tracking-widest"
            style={{ background: "hsl(var(--water-400) / 0.15)", border: "1px solid hsl(var(--water-400) / 0.3)", color: "hsl(var(--water-300))" }}>
            <MapPin className="w-3.5 h-3.5" />
            Cómo llegar
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            Encontranos en <span style={{ color: "hsl(var(--water-300))" }}>Córdoba</span>
          </h2>
          <p className="text-sm" style={{ color: "hsl(var(--water-200) / 0.7)" }}>
            Balneario Infinito · Acceso fácil por Circunvalación
          </p>
        </div>

        {/* ── Map container with glow + scan ── */}
        <div className="relative mb-6" style={{ borderRadius: 24 }}>
          {/* Glow ring */}
          <div
            className="absolute -inset-1 rounded-3xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, hsl(var(--water-400) / 0.4), hsl(var(--water-600) / 0.2), hsl(var(--water-400) / 0.4))",
              filter: "blur(8px)",
            }}
          />

          {/* Map frame */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: 22,
              border: "2px solid hsl(var(--water-400) / 0.5)",
              boxShadow: "0 0 0 1px hsl(var(--water-400)/0.15), 0 0 60px hsl(var(--water-400)/0.12), inset 0 0 40px hsl(var(--water-800)/0.4)",
              height: 380,
            }}
          >
            {/* Scan line */}
            <div
              className="absolute left-0 right-0 h-0.5 z-10 pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(var(--water-300) / 0.8), transparent)",
                animation: "map-scan 4s ease-in-out infinite",
                top: 0,
              }}
            />

            {/* Tech corners */}
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />

            {/* iframe */}
            <iframe
              src={MAPS_EMBED}
              width="100%"
              height="100%"
              style={{
                border: 0,
                display: "block",
                filter: "saturate(0.75) contrast(1.1) hue-rotate(185deg) brightness(0.85)",
              }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa Infinito Water Park"
            />

            {/* Location ping overlay */}
            <div
              className="absolute pointer-events-none z-20"
              style={{ top: "46%", left: "51%", transform: "translate(-50%, -50%)" }}
            >
              <div className="relative flex items-center justify-center w-8 h-8">
                <div
                  className="absolute w-8 h-8 rounded-full"
                  style={{
                    background: "hsl(var(--water-400) / 0.3)",
                    animation: "location-ping 1.8s ease-out infinite",
                  }}
                />
                <div
                  className="absolute w-8 h-8 rounded-full"
                  style={{
                    background: "hsl(var(--water-400) / 0.2)",
                    animation: "location-ping 1.8s ease-out infinite",
                    animationDelay: "0.6s",
                  }}
                />
                <div
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ background: "hsl(var(--water-400))", boxShadow: "0 0 12px hsl(var(--water-300))" }}
                />
              </div>
            </div>

            {/* Bottom gradient overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10"
              style={{ background: "linear-gradient(to top, hsl(var(--water-900) / 0.4), transparent)" }}
            />
          </div>
        </div>

        {/* ── Chips ── */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 mb-8 scrollbar-none">
          {CHIPS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white whitespace-nowrap"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.13)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--water-300))" }} />
              {label}
            </div>
          ))}
        </div>

        {/* ── Info cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

          {/* Card Dirección */}
          <div
            className="p-6 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "hsl(var(--water-400) / 0.2)",
                  border: "1px solid hsl(var(--water-400) / 0.35)",
                  boxShadow: "0 0 20px hsl(var(--water-400) / 0.2)",
                }}
              >
                <MapPin className="w-5 h-5" style={{ color: "hsl(var(--water-300))" }} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--water-300))" }}>Dirección</p>
                <p className="text-white font-black text-base leading-tight">Córdoba, Argentina</p>
              </div>
            </div>
            <p className="text-sm mb-1" style={{ color: "hsl(var(--water-200) / 0.7)" }}>
              Acceso por Av. Circunvalación
            </p>
            <p className="text-xs mb-5" style={{ color: "hsl(var(--water-200) / 0.45)" }}>
              Balneario Infinito — Barrio Ituzaingó
            </p>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => fireAndForget("mapa_click", { element_label: "Mapa info card" })}
              className="flex items-center gap-2 w-full justify-center py-3 rounded-2xl text-sm font-black text-white transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, hsl(var(--water-600)), hsl(var(--water-400)))",
                boxShadow: "0 4px 20px hsl(var(--water-600) / 0.35)",
              }}
            >
              <Navigation className="w-4 h-4" />
              Cómo llegar →
            </a>
          </div>

          {/* Card Horarios */}
          <div
            className="p-6 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "hsl(var(--water-400) / 0.2)",
                  border: "1px solid hsl(var(--water-400) / 0.35)",
                  boxShadow: "0 0 20px hsl(var(--water-400) / 0.2)",
                }}
              >
                <Clock className="w-5 h-5" style={{ color: "hsl(var(--water-300))" }} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--water-300))" }}>Horarios</p>
                <p className="text-white font-black text-base leading-tight">Todos los días</p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              {HORARIOS.map(({ dia, hora }) => (
                <div key={dia} className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "hsl(var(--water-200) / 0.65)" }}>{dia}</span>
                  <span className="text-sm font-bold text-white">{hora}</span>
                </div>
              ))}
            </div>
            <div
              className="text-center py-2 rounded-xl text-xs font-black uppercase tracking-wider"
              style={{
                background: "linear-gradient(135deg, hsl(var(--water-600) / 0.35), hsl(var(--water-400) / 0.35))",
                border: "1px solid hsl(var(--water-400) / 0.25)",
                color: "hsl(var(--water-200))",
              }}
            >
              🌊 Temporada 2025 / 2026
            </div>
          </div>
        </div>

        {/* ── CTA principal ── */}
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => fireAndForget("mapa_click", { element_label: "Mapa CTA principal" })}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-white font-black text-base transition-all hover:brightness-110 hover:scale-[1.01]"
          style={{
            background: "linear-gradient(135deg, hsl(var(--water-700)), hsl(var(--water-500)), hsl(var(--water-400)))",
            boxShadow: "0 8px 32px hsl(var(--water-600) / 0.4), 0 0 0 1px hsl(var(--water-400) / 0.2)",
          }}
        >
          <Navigation className="w-5 h-5" />
          Abrir en Google Maps
          <span style={{ opacity: 0.7 }}>→</span>
        </a>

      </div>
    </section>
  );
}
