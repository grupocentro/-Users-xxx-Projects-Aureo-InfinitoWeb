import { useNavigate } from "react-router-dom";
import {
  Users, Shield, UserCog, Briefcase, Lock, Settings,
  ArrowRight, Cpu, type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// =============================================================================
// Panel Sistemas — Dashboard inicial con 6 módulos placeholder
// =============================================================================
// Esta vista es la puerta de entrada al "Panel Sistemas" (admin-only).
// Los 6 módulos están listados pero ninguno tiene CRUD funcional todavía.
// Las rutas internas montan el mismo dashboard (no rompemos navegación al
// hacer click en items del sidebar).
// =============================================================================

interface ModuleCard {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  status: "active" | "planned";
  gradient: string;
  iconBg: string;
}

const MODULES: ModuleCard[] = [
  {
    title: "Usuarios",
    description: "Gestión de cuentas con acceso al sistema.",
    icon: Users,
    path: "/admin/sistemas/usuarios",
    status: "planned",
    gradient: "from-violet-500/20 to-violet-700/30",
    iconBg:   "from-violet-400 to-violet-600",
  },
  {
    title: "Roles",
    description: "Asignación y revisión de roles del sistema.",
    icon: Shield,
    path: "/admin/sistemas/roles",
    status: "planned",
    gradient: "from-indigo-500/20 to-indigo-700/30",
    iconBg:   "from-indigo-400 to-indigo-600",
  },
  {
    title: "Personal",
    description: "Operarios, supervisores y staff del parque.",
    icon: UserCog,
    path: "/admin/sistemas/personal",
    status: "planned",
    gradient: "from-fuchsia-500/20 to-fuchsia-700/30",
    iconBg:   "from-fuchsia-400 to-fuchsia-600",
  },
  {
    title: "Administración",
    description: "Configuración interna del negocio.",
    icon: Briefcase,
    path: "/admin/sistemas/administracion",
    status: "planned",
    gradient: "from-violet-500/20 to-indigo-700/30",
    iconBg:   "from-violet-500 to-indigo-700",
  },
  {
    title: "Seguridad",
    description: "Auditoría, accesos y políticas de seguridad.",
    icon: Lock,
    path: "/admin/sistemas/seguridad",
    status: "planned",
    gradient: "from-blue-500/20 to-violet-700/30",
    iconBg:   "from-blue-400 to-violet-600",
  },
  {
    title: "Configuración",
    description: "Parámetros generales del sistema.",
    icon: Settings,
    path: "/admin/sistemas/configuracion",
    status: "planned",
    gradient: "from-slate-500/20 to-indigo-700/30",
    iconBg:   "from-slate-400 to-indigo-600",
  },
];

export default function SistemasDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
            <Cpu className="h-3 w-3" /> Sistemas internos
          </div>
          <h1 className="text-3xl font-bold text-water-800">Panel Sistemas</h1>
          <p className="mt-1 max-w-2xl text-sm text-app-muted">
            Administración interna avanzada del parque: cuentas, roles, personal, seguridad y configuración. Los módulos están en preparación; cada uno se habilitará en una fase futura autorizada.
          </p>
        </div>
      </div>

      {/* Grid de módulos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <button
            key={m.path}
            type="button"
            onClick={() => navigate(m.path)}
            className="group relative overflow-hidden rounded-3xl border border-violet-100 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/10"
          >
            <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${m.gradient} blur-3xl transition-opacity duration-300 group-hover:opacity-90`} />
            <div className="relative">
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${m.iconBg} text-white shadow-lg`}>
                  <m.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-700">
                  Próximamente
                </span>
              </div>
              <h3 className="text-lg font-bold text-water-800">{m.title}</h3>
              <p className="mt-1 text-sm text-app-muted">{m.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 transition-transform duration-300 group-hover:translate-x-1">
                Abrir módulo <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <Card className="border-violet-100 bg-gradient-to-br from-violet-50/40 via-white to-white">
        <CardContent className="flex flex-col gap-1 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Nota</p>
          <p className="text-sm text-app-muted">
            La gestión de usuarios para acceder a la ticketera sigue disponible temporalmente en{" "}
            <button
              onClick={() => navigate("/admin/ticketera/usuarios")}
              className="font-medium text-violet-700 underline-offset-2 hover:underline"
            >
              /admin/ticketera/usuarios
            </button>
            . La migración a Sistemas se hará en una fase futura cuando se decida.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
