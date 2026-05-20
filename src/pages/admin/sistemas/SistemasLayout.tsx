import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminMode } from "@/hooks/useAdminMode";
import { AdminSidebarSistemas } from "@/components/admin/AdminSidebarSistemas";
import { AdminModeSwitcher } from "@/components/admin/AdminModeSwitcher";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function SistemasLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { setMode } = useAdminMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    // Panel Sistemas es admin-only. Editor y staff rebotan al selector.
    if (!isAdmin) {
      navigate("/admin/seleccionar");
      return;
    }
    setMode("sistemas");
  }, [user, isAdmin, authLoading, roleLoading, navigate, setMode]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-app-bg">
        <AdminSidebarSistemas />
        <main className="flex-1">
          <header className="flex h-14 items-center justify-between border-b border-app-border bg-app-surface/80 px-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="hidden text-sm font-medium text-violet-700 sm:inline">Panel Sistemas</span>
            </div>
            <AdminModeSwitcher current="sistemas" />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
