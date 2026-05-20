import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type TipoEntrada = {
  id: string;
  nombre: string;
  emoji: string | null;
  tag: string | null;
  features: string[];
  precio_semana: number;
  precio_finde: number;
  highlight: boolean | null;
};

interface Props {
  onSelectDate: (date: Date, entradas: TipoEntrada[], isWeekend: boolean) => void;
}

const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function isWeekendDay(day: number) {
  return day === 0 || day === 5 || day === 6;
}

function formatPrice(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 });
}

export default function CalendarioEntradas({ onSelectDate }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [entradas, setEntradas] = useState<TipoEntrada[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchEntradas = async () => {
      const { data } = await supabase
        .from("tipos_entrada")
        .select("*")
        .eq("estado", "activo")
        .order("precio_semana", { ascending: true });
      if (data) {
        setEntradas(
          data.map((e) => ({
            ...e,
            features: Array.isArray(e.features) ? (e.features as string[]) : [],
          }))
        );
      }
    };
    fetchEntradas();
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

  // Only February 2026 is available for now
  const maxMonth = 1; // February (0-indexed)
  const maxYear = 2026;
  const canGoNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);

  const handleDayClick = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    if (date < today) return;
    setSelectedDate(date);
    const weekend = isWeekendDay(date.getDay());
    onSelectDate(date, entradas, weekend);
  };

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isAvailable = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    // Only available in February 2026 and from today onwards
    if (viewYear !== maxYear || viewMonth !== maxMonth) return false;
    return date >= today;
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();
  };

  return (
    <div className="w-full">
      {/* Title */}
      <h3 className="text-lg sm:text-xl font-black text-foreground mb-3 leading-snug">
        Elegí la fecha haciendo click en el día que te gustaría asistir
      </h3>

      {/* Hint */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3 text-sm">
        <span className="text-2xl">👍</span>
        <span className="text-foreground">
          Las fechas disponibles aparecen en{" "}
          <span className="bg-amber-400 text-foreground font-bold px-2 py-0.5 rounded-md text-xs">
            amarillo
          </span>
        </span>
      </div>

      {/* Month nav */}
      <div className="flex flex-col items-center mb-5">
        <h2 className="text-sm font-semibold text-foreground mb-2">
          {MONTHS_ES[viewMonth]} {viewYear}
        </h2>
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="font-bold text-sm h-10 px-4 rounded-xl border-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            disabled={!canGoNext}
            className="font-bold text-sm h-10 px-4 rounded-xl border-2"
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-[3px] sm:gap-1 mb-[3px] sm:mb-1">
        {DAYS_ES.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] sm:text-sm font-bold bg-foreground text-background rounded-md sm:rounded-lg py-1.5 sm:py-2 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-[3px] sm:gap-1">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const available = isAvailable(day);
          const weekend = isWeekendDay(new Date(viewYear, viewMonth, day).getDay());
          const price = available ? (weekend ? minPrice.finde : minPrice.semana) : 0;
          const sel = isSelected(day);
          const tod = isToday(day);

          return (
            <button
              key={day}
              disabled={!available}
              onClick={() => handleDayClick(day)}
              className={`
                relative rounded-md sm:rounded-lg flex flex-col items-center justify-center transition-all duration-150 text-center
                min-h-[44px] sm:min-h-[72px] p-0.5 sm:p-1
                ${available
                  ? sel
                    ? "bg-amber-500 text-foreground ring-2 ring-amber-600 shadow-lg scale-[1.05] z-10"
                    : "bg-amber-300/80 hover:bg-amber-400 text-foreground cursor-pointer hover:scale-[1.03]"
                  : "bg-muted/40 text-muted-foreground/50 cursor-default"
                }
                ${tod && !sel ? "ring-2 ring-primary" : ""}
              `}
            >
              <span className={`text-sm sm:text-lg font-bold leading-none ${sel ? "text-foreground" : ""}`}>
                {day}
              </span>
              {available && price > 0 && (
                <span className="text-[7px] sm:text-[10px] leading-tight mt-0.5 font-medium opacity-75">
                  Desde<br />{formatPrice(price)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
