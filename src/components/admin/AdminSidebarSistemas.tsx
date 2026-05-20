import {
  LayoutDashboard, Users, Shield, UserCog, Briefcase,
  Lock, Settings, LogOut, Cpu,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AdminSidebarSistemas() {
  const { isAdmin } = useUserRole();
  const { signOut, user } = useAuth();

  // Panel Sistemas es admin-only. Editor y staff no entran acá.
  if (!isAdmin) return null;

  const items = [
    { title: "Dashboard",       url: "/admin/sistemas",                icon: LayoutDashboard, end: true },
    { title: "Usuarios",        url: "/admin/sistemas/usuarios",       icon: Users },
    { title: "Roles",           url: "/admin/sistemas/roles",          icon: Shield },
    { title: "Personal",        url: "/admin/sistemas/personal",       icon: UserCog },
    { title: "Administración",  url: "/admin/sistemas/administracion", icon: Briefcase },
    { title: "Seguridad",       url: "/admin/sistemas/seguridad",      icon: Lock },
    { title: "Configuración",   url: "/admin/sistemas/configuracion",  icon: Settings },
  ];

  return (
    <Sidebar className="border-r border-app-border bg-app-surface">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 p-2 shadow-sm">
                <Cpu className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight text-water-700">Infinito Admin</span>
                <span className="text-[10px] uppercase tracking-wider text-app-muted">Panel Sistemas</span>
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
                      className="hover:bg-violet-50"
                      activeClassName="bg-violet-100 text-violet-700 font-medium"
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
