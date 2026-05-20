import {
  LayoutDashboard,
  DollarSign,
  QrCode,
  Ticket,
  ScanLine,
  ShieldCheck,
  FileBarChart,
  Users,
  LogOut,
  Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AdminSidebarSistema() {
  const { isAdmin } = useUserRole();
  const { signOut, user } = useAuth();

  // Modo Sistema es admin-only para gestión completa.
  // El staff/control_entradas usa /staff/scanner directo, no entra acá.
  if (!isAdmin) return null;

  const items = [
    { title: "Dashboard", url: "/admin/sistema", icon: LayoutDashboard, end: true },
    { title: "Ventas", url: "/admin/sistema/ventas", icon: DollarSign },
    { title: "Tickets QR", url: "/admin/sistema/tickets", icon: QrCode },
    { title: "Tipos de entrada", url: "/admin/sistema/entradas", icon: Ticket },
    { title: "Scanner", url: "/staff/scanner", icon: ScanLine },
    { title: "Validaciones", url: "/admin/sistema/validaciones", icon: ShieldCheck },
    { title: "Reportes", url: "/admin/sistema/reportes", icon: FileBarChart },
    { title: "Usuarios", url: "/admin/sistema/usuarios", icon: Users },
  ];

  return (
    <Sidebar className="border-r border-app-border bg-app-surface">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-water-600 to-water-800 p-2 shadow-sm">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight text-water-700">Infinito Admin</span>
                <span className="text-[10px] uppercase tracking-wider text-app-muted">Panel Ticketera</span>
              </div>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="hover:bg-water-50"
                      activeClassName="bg-water-100 text-water-700 font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-app-border p-4">
        <p className="mb-2 truncate text-xs text-app-muted">{user?.email}</p>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
