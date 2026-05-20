import { LayoutDashboard, Calendar, Droplets, Ticket, DollarSign, FileText, Users, QrCode, LogOut, ImageIcon, Sparkles } from "lucide-react";
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

export function AdminSidebar() {
  const { isAdmin, isAdminOrEditor } = useUserRole();
  const { signOut, user } = useAuth();

  const items = [
    ...(isAdminOrEditor ? [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard }] : []),
    ...(isAdminOrEditor ? [
      { title: "Eventos", url: "/admin/eventos", icon: Calendar },
      { title: "Atracciones", url: "/admin/atracciones", icon: Droplets },
      { title: "Actividades", url: "/admin/actividades", icon: Sparkles },
      { title: "Entradas", url: "/admin/entradas", icon: Ticket },
    ] : []),
    ...(isAdmin ? [{ title: "Ventas", url: "/admin/ventas", icon: DollarSign }] : []),
    ...(isAdminOrEditor ? [{ title: "Tickets", url: "/admin/tickets", icon: QrCode }] : []),
    ...(isAdminOrEditor ? [{ title: "Contenido", url: "/admin/contenido", icon: FileText }] : []),
    ...(isAdminOrEditor ? [{ title: "Hero Slides", url: "/admin/slides", icon: ImageIcon }] : []),
    ...(isAdmin ? [{ title: "Usuarios", url: "/admin/usuarios", icon: Users }] : []),
    ...((isAdmin) ? [{ title: "Escáner QR", url: "/staff/scanner", icon: QrCode }] : []),
  ];

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-3">
            🌊 Infinito Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
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
      <SidebarFooter className="p-4 border-t">
        <p className="text-xs text-muted-foreground truncate mb-2">{user?.email}</p>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
