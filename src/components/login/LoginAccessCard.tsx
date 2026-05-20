import { useState, type FormEvent } from "react";
import { Eye, EyeOff, ArrowRight, Loader2, type LucideIcon } from "lucide-react";

// Tarjeta de login de uno de los dos paneles (Web o Ticketera).
// Es un dumb component: dispara onSubmit(email, password) y muestra error/loading.

export interface LoginAccessCardProps {
  panel: "ticketera" | "web" | "sistemas";
  title: string;
  description: string;
  icon: LucideIcon;
  footer: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onSubmit: (email: string, password: string) => void | Promise<void>;
}

// Mapeo de colores por panel. Cada uno tiene su acento dominante:
//  - ticketera: azul profundo / azul eléctrico (water palette)
//  - web:       turquesa / verde agua (teal-emerald)
//  - sistemas:  violeta / índigo / azul tecnológico
const THEME = {
  ticketera: {
    gradient: "from-water-500 via-water-600 to-water-800",
    glow:     "from-water-400/40 via-water-500/30 to-water-700/30",
    ring:     "ring-water-400/30",
    buttonBg: "bg-gradient-to-r from-water-500 to-water-700 hover:from-water-600 hover:to-water-800",
    iconBg:   "from-water-400 to-water-600",
  },
  web: {
    gradient: "from-teal-500 via-emerald-500 to-emerald-700",
    glow:     "from-teal-300/40 via-emerald-400/30 to-emerald-600/30",
    ring:     "ring-emerald-400/30",
    buttonBg: "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700",
    iconBg:   "from-teal-400 to-emerald-600",
  },
  sistemas: {
    gradient: "from-violet-500 via-violet-600 to-indigo-800",
    glow:     "from-violet-300/40 via-indigo-400/30 to-indigo-600/30",
    ring:     "ring-violet-400/30",
    buttonBg: "bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700",
    iconBg:   "from-violet-400 to-indigo-600",
  },
} as const;

export function LoginAccessCard({
  panel, title, description, icon: Icon, footer, disabled, loading, error, onSubmit,
}: LoginAccessCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const t = THEME[panel];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!disabled && email && password) {
      void onSubmit(email.trim(), password);
    }
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border border-white/15 bg-slate-900/40 p-6 sm:p-7
                  backdrop-blur-xl transition-all ${disabled ? "pointer-events-none select-none" : ""}`}
      aria-disabled={disabled}
    >
      {/* Glow decorativo */}
      <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${t.glow} blur-3xl`} />
      {/* Acento inferior */}
      <div className={`pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${t.gradient} opacity-60`} />

      <div className="relative flex flex-col items-center text-center">
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${t.iconBg} shadow-lg ring-2 ${t.ring}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white sm:text-2xl">{title}</h3>
        <p className="mt-1 max-w-xs text-sm text-water-100/70">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="relative mt-6 space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={`${panel}-email`} className="text-[10px] font-semibold uppercase tracking-wider text-water-100/60">
            Email
          </label>
          <input
            id={`${panel}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={disabled}
            placeholder="tu@email.com"
            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30
                       outline-none transition-colors focus:border-water-400/60 focus:bg-white/10 focus:ring-2 focus:ring-water-400/30
                       disabled:opacity-50"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${panel}-password`} className="text-[10px] font-semibold uppercase tracking-wider text-water-100/60">
            Contraseña
          </label>
          <div className="relative">
            <input
              id={`${panel}-password`}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={disabled}
              placeholder="••••••••"
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 pr-10 text-sm text-white placeholder:text-white/30
                         outline-none transition-colors focus:border-water-400/60 focus:bg-white/10 focus:ring-2 focus:ring-water-400/30
                         disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-water-300"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-center text-xs font-medium text-rose-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled || loading || !email || !password}
          className={`mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white
                      shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100
                      ${t.buttonBg}`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Ingresando...
            </>
          ) : (
            <>
              Iniciar sesión <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="relative mt-5 text-center text-[11px] text-water-100/50">
        {footer}
      </p>
    </div>
  );
}
