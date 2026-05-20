// 6 casilleros visuales para el PIN.
// Es presentación pura: rellena/vacía las celdas según `value`.
// El PIN nunca se muestra en texto plano (cada celda es un punto).

interface PinInputProps {
  value: string;
  length?: number;
  hasError?: boolean;
}

export function PinInput({ value, length = 6, hasError = false }: PinInputProps) {
  const cells = Array.from({ length }, (_, i) => i < value.length);
  return (
    <div className="flex justify-center gap-2.5 sm:gap-3" aria-label="Pin de acceso">
      {cells.map((filled, i) => (
        <div
          key={i}
          className={`h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-2xl border-2 transition-all
            ${hasError
              ? "border-rose-400/60 bg-rose-500/10"
              : filled
                ? "border-water-300/70 bg-water-400/15 ring-2 ring-water-400/30"
                : "border-white/15 bg-white/5"
            }`}
        >
          {filled && (
            <span
              className={`h-3 w-3 rounded-full ${hasError ? "bg-rose-300" : "bg-water-200"}`}
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  );
}
