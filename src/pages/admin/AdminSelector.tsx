import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Activity, Cpu,
  ArrowRight, ShieldAlert, LogOut, Waves, Lock,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminMode } from "@/hooks/useAdminMode";
import { Button } from "@/components/ui/button";

// Card data — facilita renderizar las 3 cards con la misma plantilla
interface CardSpec {
  id: "web" | "ticketera" | "sistemas";
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  cta: string;
  iconGradient: string;
  glowGradient: string;
}

export default function AdminSelector() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, isAdminOrEditor, isStaff, loading: roleLoading } = useUserRole();
  const { setMode } = useAdminMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate("/sistemas"); return; }
    // Staff (control_entradas) salta directo a scanner.
    if (isStaff && !isAdmin) { navigate("/staff/scanner"); return; }
    // Sin ningún rol válido: vuelta al home.
    if (!isAdmin && !isAdminOrEditor) navigate("/");
  }, [user, isAdmin, isAdminOrEditor, isStaff, authLoading, roleLoading, navigate]);

  const goTo = (mode: "web" | "ticketera" | "sistemas") => {
    if (mode === "web" && !isAdminOrEditor) return;
    if (mode === "ticketera" && !isAdmin) return;
    if (mode === "sistemas" && !isAdmin) return;
    setMode(mode);
    navigate(mode === "web" ? "/admin/web" : mode === "ticketera" ? "/admin/ticketera" : "/admin/sistemas");
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-water-600" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isAdminOrEditor)) return null;

  const cards: CardSpec[] = [
    {
      id: "web",
      title: "Panel Web",
      description: "Administrá el contenido público del parque: imágenes, noticias, promociones, eventos, atracciones y comunicación visual.",
      icon: FileText,
      enabled: isAdminOrEditor,
      cta: "Ingresar al Panel Web",
      iconGradient: "from-water-300 to-water-500",
      glowGradient: "from-water-200 to-water-400",
    },
    {
      id: "ticketera",
      title: "Panel Ticketera",
      description: "Controlá ventas, entradas, QR, validaciones, reportes, cobros y operación diaria del parque.",
      icon: Activity,
      enabled: isAdmin,
      cta: "Ingresar al Panel Ticketera",
      iconGradient: "from-water-600 to-water-800",
      glowGradient: "from-water-500 to-water-800",
    },
    {
      id: "sistemas",
      title: "Panel Sistemas",
      description: "Sistemas internos, personal, administración, roles, permisos y gestión avanzada del parque.",
      icon: Cpu,
      enabled: isAdmin,
      cta: "Ingresar al Panel Sistemas",
      iconGradient: "from-violet-500 to-indigo-700",
      glowGradient: "from-violet-400 to-indigo-700",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-water-50 via-app-bg to-water-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-water-200/40 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-water-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-water-400 to-water-700 p-2.5 shadow-lg shadow-water-500/30">
              <Waves className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold text-water-800">Infinito Water Park</span>
              <span className="text-xs text-app-muted">Panel administrativo</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="rounded-full text-app-muted hover:bg-white/60 hover:text-water-700"
          >
            <LogOut className="mr-1.5 h-4 w-4" /> Salir
          </Button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
          <div className="mb-10 max-w-2xl text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-water-600">Bienvenido</p>
            <h1 className="mb-3 text-3xl font-bold text-water-800 sm:text-4xl">
              ¿Con qué panel querés trabajar hoy?
            </h1>
            <p className="text-base text-app-muted">
              Elegí el modo según la tarea. Podés cambiar de panel en cualquier momento desde el menú superior.
            </p>
          </div>

          <div className="grid w-full max-w-6xl gap-5 lg:grid-cols-3">
            {cards.map((c) => (
              c.enabled ? (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goTo(c.id)}
                  className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-7 text-left shadow-xl shadow-water-500/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-water-500/20"
                >
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${c.glowGradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`} />
                  <div className="relative">
                    <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${c.iconGradient} shadow-lg shadow-water-400/40`}>
                      <c.icon className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-water-800">{c.title}</h2>
                    <p className="mb-6 text-sm leading-relaxed text-app-muted">{c.description}</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-water-600 transition-transform duration-300 group-hover:translate-x-1">
                      {c.cta} <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ) : (
                <div
                  key={c.id}
                  aria-disabled
                  className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/40 p-7 text-left opacity-70 backdrop-blur-xl"
                >
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-water-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-water-700">
                    <ShieldAlert className="h-3 w-3" />
                    Solo admin
                  </div>
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-app-muted/50 to-app-muted/70">
                    <Lock className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-app-muted">{c.title}</h2>
                  <p className="mb-6 text-sm leading-relaxed text-app-muted">{c.description}</p>
                  <div className="text-xs text-app-muted">
                    Tu rol actual no tiene permisos para este panel. Pedí acceso a un administrador.
                  </div>
                </div>
              )
            ))}
          </div>

          <p className="mt-10 text-xs text-app-muted">
            Conectado como <span className="font-medium text-water-700">{user.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
