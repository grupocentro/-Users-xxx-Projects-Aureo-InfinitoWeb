import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, FileText, Activity, ChevronDown } from "lucide-react";
import { useAdminMode, type AdminMode } from "@/hooks/useAdminMode";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MODE_META: Record<AdminMode, { label: string; description: string; icon: typeof FileText }> = {
  web:     { label: "Panel Web",       description: "Contenido público del sitio", icon: FileText },
  sistema: { label: "Panel Ticketera", description: "Ventas, QR y operación",       icon: Activity },
};

export function AdminModeSwitcher({ current }: { current: AdminMode }) {
  const navigate = useNavigate();
  const { setMode } = useAdminMode();
  const { isAdmin, isAdminOrEditor } = useUserRole();

  const CurrentIcon = MODE_META[current].icon;
  const canSwitchToSistema = isAdmin;
  const canSwitchToWeb = isAdminOrEditor;

  const switchTo = (next: AdminMode) => {
    if (next === current) return;
    setMode(next);
    navigate(next === "web" ? "/admin/web" : "/admin/sistema");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm hover:bg-water-50"
        >
          <CurrentIcon className="h-4 w-4 text-water-600" />
          <span className="font-medium text-water-700">{MODE_META[current].label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-app-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-app-muted">
          Cambiar de modo
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canSwitchToWeb && (
          <DropdownMenuItem
            disabled={current === "web"}
            onClick={() => switchTo("web")}
            className="flex items-start gap-3 py-3"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-water-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Panel Web</span>
              <span className="text-xs text-app-muted">Contenido público del sitio</span>
            </div>
          </DropdownMenuItem>
        )}
        {canSwitchToSistema && (
          <DropdownMenuItem
            disabled={current === "sistema"}
            onClick={() => switchTo("sistema")}
            className="flex items-start gap-3 py-3"
          >
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-water-700" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Panel Ticketera</span>
              <span className="text-xs text-app-muted">Ventas, QR y operación</span>
            </div>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/admin/seleccionar")} className="gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          <span className="text-sm">Volver al selector</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
