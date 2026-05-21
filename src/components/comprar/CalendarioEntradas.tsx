import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// CalendarioEntradas — calendario público de selección de fecha para /comprar.
// =============================================================================
// Lee la tabla `calendario` para etiquetas, colores y precio_modificador.
// Distingue visualmente: día común / fin de semana / día especial / cerrado.
// Cualquier fecha futura es válida salvo que tenga etiqueta de cierre.
// =============================================================================

type TipoEntrada = {
  id: string;
  nombre: string;
  emoji: string | null;
  tag: string | null;
  features: unknown[];
  precio_semana: number;
  precio_finde: number;
  highlight: boolean | null;
};

type CalendarioRow = {
  fecha: string;            // YYYY-MM-DD
  etiqueta: string | null;
  color_hex: string | null;
  precio_modificador: number | string | null;
  nota: string | null;
};

export type CalendarioDayInfo = {
  isWeekend: boolean;
  etiqueta: string | null;
  colorHex: string | null;
  precioModificador: number | null; // ya parseado a number
  isClosed: boolean;
};

interface Props {
  /** Callback al seleccionar un día válido. Pasa info del día y la lista de entradas activas. */
  onSelectDate: (
    date: Date,
    entradas: TipoEntrada[],
    isWeekend: boolean,
    info: CalendarioDayInfo,
  ) => void;
  /** Fecha pre-seleccionada (para restaurar desde sessionStorage). */
  preselectedDate?: Date | null;
}

const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Operativa del parque: viernes/sábado/domingo cobran tarifa de fin de semana.
function isWeekendDay(day: number) {
  return day === 0 || day === 5 || day === 6;
}

function formatPrice(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fechaYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Si la etiqueta contiene cualquiera de estos substrings, el día queda bloqueado.
const CLOSED_KEYWORDS = ["cerrad", "agotad", "no disp", "cancelad"];
function isClosedByEtiqueta(etiqueta: string | null): boolean {
  if (!etiqueta) return false;
  const lower = etiqueta.toLowerCase();
  return CLOSED_KEYWORDS.some((k) => lower.includes(k));
}

export default function CalendarioEntradas({ onSelectDate, preselectedDate }: Props) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewMonth, setViewMonth] = useState(preselectedDate?.getMonth() ?? today.getMonth());
  const [viewYear, setViewYear] = useState(preselectedDate?.getFullYear() ?? today.getFullYear());
  const [entradas, setEntradas] = useState<TipoEntrada[]>([]);
  const [calendarioMap, setCalendarioMap] = useState<Map<string, CalendarioRow>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(preselectedDate ?? null);

  // Carga inicial: tipos_entrada + calendario (días especiales/cerrados).
  useEffect(() => {
    (async () => {
      const [tiposRes, calRes] = await Promise.all([
        supabase
          .from("tipos_entrada")
          .select("*")
          .eq("estado", "activo")
          .order("precio_semana", { ascending: true }),
        supabase
          .from("calendario" as never)
          .select("fecha, etiqueta, color_hex, precio_modificador, nota"),
      ]);

      if (tiposRes.data) {
        setEntradas(
          tiposRes.data.map((e) => ({
            ...e,
            features: Array.isArray(e.features) ? e.features : [],
          }))
        );
      }
      if (calRes.data) {
        const rows = calRes.data as unknown as CalendarioRow[];
        const map = new Map<string, CalendarioRow>();
        for (const r of rows) map.set(r.fecha, r);
        setCalendarioMap(map);
      }
    })();
  }, []);

  const minPrice = useMemo(() => {
    if (entradas.length === 0) return { semana: 0, finde: 0 };
    return {
      semana: Math.min(...entradas.map((e) => e.precio_semana)),
      finde: Math.min(...entradas.map((e) => e.precio_finde)),
    };
  }, [entradas]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewMonth, viewYear]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  // Día seleccionable: cualquier fecha futura (>= hoy) que no esté cerrada por etiqueta.
  const getDayInfo = (day: number): CalendarioDayInfo & { available: boolean; date: Date; basePrice: number } => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    const ymd = fechaYMD(date);
    const cal = calendarioMap.get(ymd);
    const weekend = isWeekendDay(date.getDay());
    const closed = isClosedByEtiqueta(cal?.etiqueta ?? null);
    const inPast = date < today;
    const modificador = cal?.precio_modificador !== null && cal?.precio_modificador !== undefined
      ? Number(cal.precio_modificador)
      : null;
    const base = weekend ? minPrice.finde : minPrice.semana;
    const withModifier = modificador !== null && Number.isFinite(modificador)
      ? Math.round(base * (1 + modificador / 100))
      : base;
    return {
      date,
      available: !inPast && !closed,
      isWeekend: weekend,
      etiqueta: cal?.etiqueta ?? null,
      colorHex: cal?.color_hex ?? null,
      precioModificador: modificador,
      isClosed: closed,
      basePrice: withModifier,
    };
  };

  const handleDayClick = (day: number) => {
    const info = getDayInfo(day);
    if (!info.available) return;
    setSelectedDate(info.date);
    onSelectDate(info.date, entradas, info.isWeekend, {
      isWeekend: info.isWeekend,
      etiqueta: info.etiqueta,
      colorHex: info.colorHex,
      precioModificador: info.precioModificador,
      isClosed: info.isClosed,
    });
  };

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate()
      && viewMonth === selectedDate.getMonth()
      && viewYear === selectedDate.getFullYear();
  };

  return (
    <div className="w-full">
      {/* Title */}
      <h3 className="text-lg sm:text-xl font-black text-foreground mb-1 leading-snug">
        Elegí tu fecha de visita
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Tocá un día disponible para ver el precio del día.
      </p>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 mb-5 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-water-200 bg-water-50 px-2.5 py-1 text-water-700">
          <span className="h-2 w-2 rounded-full bg-water-400" /> Día común
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Fin de semana
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-fuchsia-700">
          <Sparkles className="h-2.5 w-2.5" /> Día especial
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-500">
          <Lock className="h-2.5 w-2.5" /> Cerrado
        </span>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="font-bold text-sm h-9 px-3 rounded-xl border-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm sm:text-base font-bold text-foreground capitalize">
          {MONTHS_ES[viewMonth]} {viewYear}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={nextMonth}
          className="font-bold text-sm h-9 px-3 rounded-xl border-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-[3px] sm:gap-1 mb-[3px] sm:mb-1">
        {DAYS_ES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] sm:text-xs font-bold bg-foreground text-background rounded-md sm:rounded-lg py-1.5 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-[3px] sm:gap-1">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const info = getDayInfo(day);
          const sel = isSelected(day);
          const tod = isToday(day);
          const isSpecial = !info.isClosed && (info.etiqueta || info.precioModificador !== null);

          // Estilo base por estado
          let bg: string;
          let textColor: string;
          let ring: string;
          let cursor: string;

          if (!info.available) {
            // Pasado o cerrado
            bg = "bg-slate-100";
            textColor = "text-slate-400";
            ring = "";
            cursor = "cursor-not-allowed";
          } else if (sel) {
            bg = "bg-water-700";
            textColor = "text-white";
            ring = "ring-2 ring-water-300";
            cursor = "cursor-pointer";
          } else if (isSpecial && info.colorHex) {
            bg = ""; // se setea inline
            textColor = "text-white";
            ring = "";
            cursor = "cursor-pointer hover:brightness-110";
          } else if (isSpecial) {
            bg = "bg-fuchsia-100";
            textColor = "text-fuchsia-900";
            ring = "";
            cursor = "cursor-pointer hover:bg-fuchsia-200";
          } else if (info.isWeekend) {
            bg = "bg-amber-200/80";
            textColor = "text-amber-900";
            ring = "";
            cursor = "cursor-pointer hover:bg-amber-300";
          } else {
            bg = "bg-water-100";
            textColor = "text-water-900";
            ring = "";
            cursor = "cursor-pointer hover:bg-water-200";
          }

          const inlineBg = isSpecial && info.colorHex && !sel ? { background: info.colorHex } : undefined;

          return (
            <button
              key={day}
              disabled={!info.available}
              onClick={() => handleDayClick(day)}
              title={info.etiqueta || ""}
              style={inlineBg}
              className={`
                relative rounded-md sm:rounded-lg flex flex-col items-center justify-center transition-all duration-150 text-center
                min-h-[48px] sm:min-h-[64px] p-0.5 sm:p-1
                ${bg} ${textColor} ${ring} ${cursor}
                ${tod && !sel ? "outline outline-2 outline-water-500" : ""}
              `}
            >
              <span className="text-sm sm:text-base font-bold leading-none">{day}</span>
              {info.available && info.basePrice > 0 && !info.isClosed && (
                <span className="text-[8px] sm:text-[10px] leading-tight mt-0.5 font-medium opacity-85">
                  {formatPrice(info.basePrice)}
                </span>
              )}
              {info.isClosed && (
                <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-slate-400" />
              )}
              {isSpecial && !info.isClosed && !sel && (
                <Sparkles className="absolute right-1 top-1 h-2.5 w-2.5 opacity-70" />
              )}
            </button>
          );
        })}
      </div>

      {/* Nota inferior */}
      <p className="mt-4 text-[11px] text-muted-foreground">
        Los precios mostrados son los más bajos disponibles del día.
        El precio definitivo se calcula al seleccionar entradas.
      </p>
    </div>
  );
}
