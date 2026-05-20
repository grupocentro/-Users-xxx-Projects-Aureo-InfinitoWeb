import { Delete } from "lucide-react";

// Teclado numérico premium 3x4.
// onDigit: agrega un dígito.
// onBackspace: borra el último.
// onClear: limpia todo.

interface NumericKeypadProps {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
}

const ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export function NumericKeypad({ onDigit, onBackspace, onClear, disabled }: NumericKeypadProps) {
  const baseKey =
    "h-12 sm:h-14 rounded-2xl border border-white/10 bg-white/5 text-white font-semibold text-lg sm:text-xl " +
    "backdrop-blur-sm transition-all active:scale-[0.97] hover:bg-white/10 disabled:opacity-40 disabled:active:scale-100";

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3" role="group" aria-label="Teclado numérico">
      {ROWS.flatMap((row) =>
        row.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDigit(d)}
            disabled={disabled}
            className={baseKey}
            aria-label={`Dígito ${d}`}
          >
            {d}
          </button>
        )),
      )}
      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        className={`${baseKey} text-xs uppercase tracking-wider text-water-200`}
        aria-label="Limpiar"
      >
        Limpiar
      </button>
      <button
        type="button"
        onClick={() => onDigit("0")}
        disabled={disabled}
        className={baseKey}
        aria-label="Dígito 0"
      >
        0
      </button>
      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        className={`${baseKey} flex items-center justify-center`}
        aria-label="Borrar último dígito"
      >
        <Delete className="h-5 w-5" />
      </button>
    </div>
  );
}
