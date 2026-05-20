import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { presetRange, type DateRange, type DateRangePreset } from "@/lib/date-range";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const setPreset = (preset: string | undefined) => {
    if (!preset) return;
    onChange(presetRange(preset as DateRangePreset));
  };

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className ?? ""}`}>
      <div>
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Período</Label>
        <ToggleGroup
          type="single"
          value={value.preset}
          onValueChange={setPreset}
          className="mt-1.5 rounded-xl border border-app-border bg-white p-1"
        >
          <ToggleGroupItem value="today"  size="sm" className="rounded-lg text-xs">Hoy</ToggleGroupItem>
          <ToggleGroupItem value="7d"     size="sm" className="rounded-lg text-xs">7 días</ToggleGroupItem>
          <ToggleGroupItem value="30d"    size="sm" className="rounded-lg text-xs">30 días</ToggleGroupItem>
          <ToggleGroupItem value="month"  size="sm" className="rounded-lg text-xs">Mes</ToggleGroupItem>
          <ToggleGroupItem value="custom" size="sm" className="rounded-lg text-xs gap-1">
            <CalendarIcon className="h-3 w-3" /> Custom
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {value.preset === "custom" && (
        <>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Desde</Label>
            <Input
              type="date"
              value={value.from ?? ""}
              onChange={(e) => onChange({ ...value, from: e.target.value || null })}
              className="mt-1.5 h-9 w-[150px] rounded-xl"
            />
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Hasta</Label>
            <Input
              type="date"
              value={value.to ?? ""}
              onChange={(e) => onChange({ ...value, to: e.target.value || null })}
              className="mt-1.5 h-9 w-[150px] rounded-xl"
            />
          </div>
        </>
      )}

      {(value.from || value.to) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ preset: "custom", from: null, to: null })}
          className="gap-1 text-xs text-app-muted hover:text-water-700"
        >
          <X className="h-3 w-3" /> Limpiar
        </Button>
      )}
    </div>
  );
}
