import { useState, type ReactNode } from "react";
import {
  ExternalLink, ArrowUpRight, Phone, Sparkles, Users, ShieldCheck, Gauge,
  Lock, Activity, Cpu, Radio, type LucideIcon,
} from "lucide-react";
import eventosHeroBg from "@/assets/eventos-hero-bg.jpg";
import infinitoLogoWhite from "@/assets/infinito-logo-white.png";

// =============================================================================
// Panel Sistemas — HUB premium SaaS enterprise
// =============================================================================
// Grid 3×2 con 6 sistemas: 1 activo real (Call Center) + 5 placeholders.
// Estilo: ecosistema operativo del parque, paleta water + violet + grafito.
// =============================================================================

interface SystemDef {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  /** Tono de acento de la card (clases tailwind aproximadas) */
  accentFrom: string;
  accentTo: string;
  /** Color hex del glow (sin alpha) */
  glow: string;
}

interface ActiveSystem extends SystemDef {
  status: "active";
  url: string;
  bannerPublic?: string;
}

interface DevSystem extends SystemDef {
  status: "dev";
  /** Si true, usa el banner visual destacado tipo "heatmap analítico" en vez del genérico */
  featured?: boolean;
}

type System = ActiveSystem | DevSystem;

const SYSTEMS: System[] = [
  // ── 1. ACTIVO REAL ────────────────────────────────────────────────────────
  {
    key: "call-center",
    title: "Sistema de Call Center",
    subtitle: "Gestión de llamadas por WhatsApp",
    description: "Centro operativo de atención, llamadas y contactos del parque.",
    icon: Phone,
    accentFrom: "from-water-500",
    accentTo: "to-water-700",
    glow: "rgba(0, 150, 200, 0.45)",
    status: "active",
    url: "https://sistemasinfinito.online",
    bannerPublic: "/call-center-banner.png",
  },
  // ── 2–6. PLACEHOLDERS PREMIUM ────────────────────────────────────────────
  {
    key: "demografico",
    title: "Sistema de Control Demográfico",
    subtitle: "Análisis de movimiento y comportamiento",
    description: "Control en tiempo real del flujo de personas, puntos calientes, recorridos, estadísticas de juegos más visitados y zonas de concentración.",
    icon: Activity,
    accentFrom: "from-violet-500",
    accentTo: "to-blue-600",
    glow: "rgba(124, 92, 246, 0.45)",
    status: "dev",
    featured: true,
  },
  {
    key: "eventos",
    title: "Gestión Inteligente de Eventos",
    subtitle: "Producción, lineup y operativo",
    description: "Planificación y ejecución de eventos del calendario.",
    icon: Sparkles,
    accentFrom: "from-fuchsia-500",
    accentTo: "to-fuchsia-700",
    glow: "rgba(217, 70, 239, 0.35)",
    status: "dev",
  },
  {
    key: "rrhh",
    title: "Plataforma de RRHH",
    subtitle: "Equipos, turnos y nómina",
    description: "Gestión del personal del parque y operativos.",
    icon: Users,
    accentFrom: "from-violet-500",
    accentTo: "to-violet-700",
    glow: "rgba(139, 92, 246, 0.35)",
    status: "dev",
  },
  {
    key: "seguridad",
    title: "Centro de Seguridad",
    subtitle: "Auditoría, accesos y monitoreo",
    description: "Vigilancia digital y políticas internas.",
    icon: ShieldCheck,
    accentFrom: "from-blue-500",
    accentTo: "to-blue-700",
    glow: "rgba(59, 130, 246, 0.35)",
    status: "dev",
  },
  {
    key: "control",
    title: "Control Operativo General",
    subtitle: "Mission control del parque",
    description: "KPIs cruzados, alertas y comando central.",
    icon: Gauge,
    accentFrom: "from-emerald-500",
    accentTo: "to-emerald-700",
    glow: "rgba(16, 185, 129, 0.35)",
    status: "dev",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Métricas del header
// ──────────────────────────────────────────────────────────────────────────────
function MetricChip({
  icon, label, value, dotColor, pulse,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  dotColor: string;
  pulse?: boolean;
}) {
  return (
    <div className="group inline-flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-2 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: dotColor, opacity: 0.35 }}
        />
        <span
          className="relative h-2 w-2 rounded-full"
          style={{
            background: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
            animation: pulse ? "metric-pulse 2.2s ease-in-out infinite" : "none",
          }}
        />
      </span>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-bold text-water-800">{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Card del sistema ACTIVO (Call Center) — banner + body
// ──────────────────────────────────────────────────────────────────────────────
function ActiveSystemCard({ system }: { system: ActiveSystem }) {
  const [imgError, setImgError] = useState(false);
  const Icon = system.icon;
  const hasCustomBanner = !!system.bannerPublic && !imgError;

  return (
    <a
      href={system.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-water-200/70 bg-white shadow-[0_4px_24px_-8px_rgba(0,119,182,0.18)] transition-all duration-500 hover:-translate-y-1 hover:border-water-300 hover:shadow-[0_20px_60px_-15px_rgba(0,119,182,0.35)]"
      style={{
        // Glow base que se intensifica en hover via :hover en clase de abajo
      }}
    >
      {/* Glow exterior animado (hover) */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at top, ${system.glow}, transparent 70%)`,
        }}
      />

      {/* ── Banner ─────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 8" }}>
        {/* Capa 1: fondo acuático fallback */}
        <img
          src={eventosHeroBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Capa 2: overlay premium azul/turquesa */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--water-800) / 0.82) 0%, hsl(var(--water-600) / 0.70) 55%, hsl(var(--water-500) / 0.55) 100%)",
          }}
        />
        {/* Capa 3: imagen propia si existe */}
        {hasCustomBanner && (
          <img
            src={system.bannerPublic}
            alt={system.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
        {/* Capa 4: shimmer sutil al hover */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)",
            backgroundSize: "220% 100%",
            animation: "shimmer-premium 3.5s linear infinite",
          }}
        />
        {/* Capa 5: gradient inferior para legibilidad de texto */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Top-left: brand + status */}
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-md">
              <img src={infinitoLogoWhite} alt="Infinito" className="h-5 w-5 object-contain" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
              Infinito Water Park
            </p>
          </div>
          {/* Status pill ONLINE */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2.5 py-1 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-70" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300" style={{ boxShadow: "0 0 8px #6ee7b7" }} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">ONLINE</span>
          </div>
        </div>

        {/* Bottom: title + subtitle */}
        <div className="absolute inset-x-5 bottom-5">
          <h3
            className="font-black leading-tight text-white"
            style={{ fontSize: "clamp(1.45rem, 2vw, 1.85rem)", textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}
          >
            {system.title}
          </h3>
          <p
            className="mt-1 text-sm font-medium text-white/85"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}
          >
            {system.subtitle}
          </p>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col gap-4 p-5 sm:p-6">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            <Activity className="h-2.5 w-2.5" /> Activo
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-water-200 bg-water-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-water-700">
            <Radio className="h-2.5 w-2.5" /> Sistema independiente
          </span>
        </div>

        {/* Descripción + dominio */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-water-50 text-water-600 ring-1 ring-water-200">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-app-muted">{system.description}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-water-700">
              <ExternalLink className="h-3 w-3" /> {system.url.replace(/^https?:\/\//, "")}
            </p>
          </div>
        </div>

        {/* CTA */}
        <span
          className="mt-auto inline-flex items-center justify-center gap-2 self-stretch rounded-2xl bg-gradient-to-br from-water-700 to-water-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 group-hover:scale-[1.02] group-hover:brightness-110"
          style={{ boxShadow: `0 8px 28px ${system.glow}` }}
        >
          Abrir sistema <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </a>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Card placeholder (En desarrollo) — bloqueada, glass + blur, lock icon
// ──────────────────────────────────────────────────────────────────────────────
function DevSystemCard({ system }: { system: DevSystem }) {
  const Icon = system.icon;
  const isFeatured = !!system.featured;
  return (
    <div
      role="group"
      aria-disabled="true"
      className={`group relative flex h-full select-none flex-col overflow-hidden rounded-3xl border bg-gradient-to-br shadow-sm transition-all duration-500 hover:-translate-y-0.5 ${
        isFeatured
          ? "border-violet-200/80 from-violet-50/60 via-white to-blue-50/40 hover:border-violet-300/90"
          : "border-slate-200/70 from-slate-50 via-white to-slate-100/60 hover:border-slate-300/80"
      }`}
    >
      {/* Glow al hover (más fuerte si featured) */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at top, ${
            isFeatured ? system.glow : system.glow.replace(/0\.\d+\)/, "0.15)")
          }, transparent 70%)`,
        }}
      />

      {/* ── Banner ────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 8" }}>
        {isFeatured ? (
          // ─── Banner HEATMAP ANALÍTICO (Sistema de Control Demográfico) ───
          <>
            {/* Base oscura violeta-azul (mapa nocturno) */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, hsl(240 30% 18%) 0%, hsl(230 40% 22%) 55%, hsl(220 45% 26%) 100%)",
              }}
            />
            {/* Grid tecnológico fino */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Heatmap: 6 manchas de calor distribuidas */}
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 320 160">
              <defs>
                <radialGradient id="hot-red" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(239,68,68,0.85)" />
                  <stop offset="60%" stopColor="rgba(239,68,68,0.18)" />
                  <stop offset="100%" stopColor="rgba(239,68,68,0)" />
                </radialGradient>
                <radialGradient id="hot-amber" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(251,191,36,0.75)" />
                  <stop offset="60%" stopColor="rgba(251,191,36,0.15)" />
                  <stop offset="100%" stopColor="rgba(251,191,36,0)" />
                </radialGradient>
                <radialGradient id="hot-green" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.7)" />
                  <stop offset="60%" stopColor="rgba(34,197,94,0.12)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0)" />
                </radialGradient>
              </defs>
              {/* Hotspot rojo (alto flujo) */}
              <circle cx="80"  cy="55"  r="42" fill="url(#hot-red)" />
              <circle cx="245" cy="100" r="38" fill="url(#hot-red)" />
              {/* Hotspots amarillos (flujo medio) */}
              <circle cx="170" cy="38"  r="34" fill="url(#hot-amber)" />
              <circle cx="55"  cy="120" r="30" fill="url(#hot-amber)" />
              {/* Hotspots verdes (flujo bajo / zona tranquila) */}
              <circle cx="200" cy="135" r="28" fill="url(#hot-green)" />
              <circle cx="290" cy="40"  r="24" fill="url(#hot-green)" />

              {/* Rutas curvas (recorridos del público) */}
              <path
                d="M 20 80 Q 90 30 160 60 T 300 90"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1"
                strokeDasharray="3 3"
                fill="none"
              />
              <path
                d="M 30 130 Q 120 100 200 130 T 310 120"
                stroke="rgba(167,139,250,0.4)"
                strokeWidth="1"
                strokeDasharray="2 4"
                fill="none"
              />

              {/* Dots de "personas" — pequeños puntos blancos dispersos */}
              {[
                [70, 60], [85, 50], [78, 65], [175, 42], [165, 35], [180, 45],
                [248, 95], [240, 105], [255, 105], [55, 118], [62, 125], [205, 132],
                [295, 38], [148, 88], [110, 75], [220, 70], [40, 95], [275, 70],
              ].map(([cx, cy], i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="1.2"
                  fill="rgba(255,255,255,0.85)"
                />
              ))}
            </svg>
            {/* Glow del sistema (violet-blue) */}
            <div
              className="absolute inset-0 opacity-50"
              style={{ background: `radial-gradient(circle at 70% 30%, ${system.glow}, transparent 55%)` }}
            />

            {/* Métricas mini esquina superior izq */}
            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live heatmap
            </div>

            {/* Icono Activity central con badge "vista previa" */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/25 backdrop-blur-md">
                <Icon className="h-6 w-6 text-white/85" />
              </div>
            </div>

            {/* Status pill */}
            <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/20 px-2.5 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" style={{ boxShadow: "0 0 6px #fcd34d" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">En desarrollo</span>
            </div>
          </>
        ) : (
          // ─── Banner default genérico (resto de placeholders) ───
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, hsl(220 15% 28%) 0%, hsl(220 12% 38%) 55%, hsl(220 10% 48%) 100%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "linear-gradient(115deg, transparent 0%, transparent 49.5%, rgba(255,255,255,0.08) 50%, transparent 50.5%, transparent 100%)",
                backgroundSize: "60px 60px",
              }}
            />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${system.glow}, transparent 60%)`,
              }}
            />
            <div className="absolute inset-0 backdrop-blur-[1px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md">
                <Lock className="h-6 w-6 text-white/75" />
              </div>
            </div>
            <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" style={{ boxShadow: "0 0 6px #fcd34d" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">En desarrollo</span>
            </div>
          </>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className={`flex items-start gap-3 ${isFeatured ? "" : "opacity-70"}`}>
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 ${
              isFeatured
                ? "bg-violet-100 text-violet-700 ring-violet-200"
                : "bg-slate-100 text-slate-500 ring-slate-200"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-base font-bold ${isFeatured ? "text-water-800" : "text-slate-700"}`}>
              {system.title}
            </h3>
            <p className={`mt-0.5 text-xs font-medium ${isFeatured ? "text-violet-700" : "text-slate-500"}`}>
              {system.subtitle}
            </p>
          </div>
        </div>

        <p className={`text-sm ${isFeatured ? "text-app-muted" : "text-slate-500"}`}>{system.description}</p>

        {/* CTA bloqueado */}
        <span
          className={`mt-auto inline-flex items-center justify-center gap-2 self-stretch rounded-2xl border border-dashed px-5 py-3 text-sm font-semibold ${
            isFeatured
              ? "border-violet-300 bg-violet-50/60 text-violet-700"
              : "border-slate-300 bg-slate-50/80 text-slate-500"
          }`}
        >
          <Lock className="h-3.5 w-3.5" /> Próximamente
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────────────────────────
export default function SistemasDashboard() {
  const activeCount = SYSTEMS.filter((s) => s.status === "active").length;
  const devCount = SYSTEMS.filter((s) => s.status === "dev").length;

  return (
    <>
      <style>{`
        @keyframes shimmer-premium {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes metric-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
        @keyframes sistemas-reveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="relative space-y-8" style={{ animation: "sistemas-reveal 0.5s ease-out" }}>
        {/* Glows ambientales del fondo del panel */}
        <div className="pointer-events-none absolute -top-20 -right-20 -z-10 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-32 -z-10 h-80 w-80 rounded-full bg-water-200/30 blur-3xl" />

        {/* ── HEADER PREMIUM ──────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/30 to-water-50/40 px-6 py-7 shadow-sm sm:px-8 sm:py-9">
          {/* Glow accent del header */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-violet-300/30 to-water-300/30 blur-3xl" />
          {/* Dotted grid sutil */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--water-700)) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-violet-400 opacity-70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-violet-500" />
              </span>
              Ecosistema Infinito
            </div>

            <h1 className="text-3xl font-black leading-tight text-water-800 sm:text-4xl">
              Panel de Sistemas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-app-muted sm:text-base">
              Centro operativo de plataformas internas, automatizaciones y herramientas
              conectadas al ecosistema Infinito Water Park.
            </p>

            {/* Métricas */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <MetricChip
                icon={<Activity className="h-3 w-3" />}
                label="Sistemas activos"
                value={String(activeCount)}
                dotColor="#10b981"
                pulse
              />
              <MetricChip
                icon={<Cpu className="h-3 w-3" />}
                label="En desarrollo"
                value={String(devCount)}
                dotColor="#f59e0b"
              />
              <MetricChip
                icon={<Radio className="h-3 w-3" />}
                label="Estado general"
                value="Online"
                dotColor="#06b6d4"
                pulse
              />
            </div>
          </div>
        </header>

        {/* ── GRID DE SISTEMAS ────────────────────────────────────── */}
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SYSTEMS.map((s) =>
            s.status === "active" ? (
              <ActiveSystemCard key={s.key} system={s} />
            ) : (
              <DevSystemCard key={s.key} system={s} />
            )
          )}
        </section>

        {/* ── Nota inferior ───────────────────────────────────────── */}
        <footer className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/40 via-white to-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Nota</p>
          <p className="mt-1 text-sm text-app-muted">
            Los sistemas en desarrollo se irán habilitando en fases futuras autorizadas.
            Cuando un nuevo sistema entre en producción, va a aparecer como{" "}
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Activo
            </span>
            {" "}en este panel.
          </p>
        </footer>
      </div>
    </>
  );
}
