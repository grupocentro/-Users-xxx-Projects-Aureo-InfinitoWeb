import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useAdminMode } from "@/hooks/useAdminMode";
import { AdminSidebarWeb } from "@/components/admin/AdminSidebarWeb";
import { AdminModeSwitcher } from "@/components/admin/AdminModeSwitcher";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function WebLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdminOrEditor, loading: roleLoading } = useUserRole();
  const { setMode } = useAdminMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (!isAdminOrEditor) {
      navigate("/");
      return;
    }
    // Persistimos el modo al entrar para que el selector recuerde la elección.
    setMode("web");
  }, [user, isAdminOrEditor, authLoading, roleLoading, navigate, setMode]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-water-600" />
      </div>
    );
  }

  if (!user || !isAdminOrEditor) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-app-bg">
        <AdminSidebarWeb />
        <main className="flex-1">
          <header className="flex h-14 items-center justify-between border-b border-app-border bg-app-surface/80 px-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="hidden text-sm font-medium text-water-700 sm:inline">Panel Web</span>
            </div>
            <AdminModeSwitcher current="web" />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
