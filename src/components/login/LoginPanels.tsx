import { Ticket, AppWindow, Cpu } from "lucide-react";
import { LoginAccessCard } from "./LoginAccessCard";

// Contenedor de los tres paneles de login (Ticketera + Web + Sistemas).
// Se monta siempre, pero se le aplica blur + pointer-events-none mientras
// el PIN no esté validado.

interface PanelState {
  loading: boolean;
  error: string | null;
}

interface LoginPanelsProps {
  locked: boolean;
  ticketera: PanelState;
  web: PanelState;
  sistemas: PanelState;
  onTicketeraSubmit: (email: string, password: string) => void | Promise<void>;
  onWebSubmit:       (email: string, password: string) => void | Promise<void>;
  onSistemasSubmit:  (email: string, password: string) => void | Promise<void>;
}

export function LoginPanels({
  locked, ticketera, web, sistemas,
  onTicketeraSubmit, onWebSubmit, onSistemasSubmit,
}: LoginPanelsProps) {
  return (
    <div
      className={`grid w-full max-w-6xl grid-cols-1 gap-5 transition-all duration-500 md:grid-cols-2 lg:grid-cols-3
                  ${locked ? "pointer-events-none select-none scale-[0.99] blur-[8px] opacity-60" : "blur-0 opacity-100"}`}
      aria-hidden={locked}
    >
      <LoginAccessCard
        panel="ticketera"
        title="Panel Ticketera"
        description="Ventas, entradas, validaciones QR, reportes, cobros y operación diaria."
        icon={Ticket}
        footer="Acceso exclusivo para operadores del sistema de ticketera."
        disabled={locked}
        loading={ticketera.loading}
        error={ticketera.error}
        onSubmit={onTicketeraSubmit}
      />
      <LoginAccessCard
        panel="web"
        title="Panel Web"
        description="Contenido, imágenes, noticias, promociones, calendario y comunicación pública."
        icon={AppWindow}
        footer="Acceso exclusivo para administradores de contenido web."
        disabled={locked}
        loading={web.loading}
        error={web.error}
        onSubmit={onWebSubmit}
      />
      <LoginAccessCard
        panel="sistemas"
        title="Panel Sistemas"
        description="Sistemas internos, personal, administración, roles, permisos y gestión avanzada del parque."
        icon={Cpu}
        footer="Acceso exclusivo para administradores con permisos avanzados."
        disabled={locked}
        loading={sistemas.loading}
        error={sistemas.error}
        onSubmit={onSistemasSubmit}
      />
    </div>
  );
}
