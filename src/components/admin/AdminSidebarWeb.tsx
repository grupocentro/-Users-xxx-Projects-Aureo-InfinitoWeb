import {
  LayoutDashboard,
  FileText,
  ImageIcon,
  Newspaper,
  Tag,
  CalendarDays,
  Calendar,
  Droplets,
  Sparkles,
  LogOut,
  Waves,
  LineChart,
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

export function AdminSidebarWeb() {
  const { isAdminOrEditor } = useUserRole();
  const { signOut, user } = useAuth();

  if (!isAdminOrEditor) return null;

  const items = [
    { title: "Dashboard", url: "/admin/web", icon: LayoutDashboard, end: true },
    { title: "Analytics", url: "/admin/web/analytics", icon: LineChart },
    { title: "Contenido", url: "/admin/web/contenido", icon: FileText },
    { title: "Hero Slides", url: "/admin/web/slides", icon: ImageIcon },
    { title: "Noticias", url: "/admin/web/noticias", icon: Newspaper },
    { title: "Ofertas", url: "/admin/web/ofertas", icon: Tag },
    { title: "Calendario", url: "/admin/web/calendario", icon: CalendarDays },
    { title: "Eventos", url: "/admin/web/eventos", icon: Calendar },
    { title: "Atracciones", url: "/admin/web/atracciones", icon: Droplets },
    { title: "Actividades", url: "/admin/web/actividades", icon: Sparkles },
  ];

  return (
    <Sidebar className="border-r border-app-border bg-app-surface">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-water-400 to-water-600 p-2 shadow-sm">
                <Waves className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight text-water-700">Infinito Admin</span>
                <span className="text-[10px] uppercase tracking-wider text-app-muted">Panel Web</span>
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
