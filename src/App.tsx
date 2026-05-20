import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Página principal: eager para que el primer paint del sitio sea instantáneo.
import Index from "./pages/Index";

// Resto del sitio: lazy para que cada bundle se cargue sólo cuando se navega allí.
const Eventos          = lazy(() => import("./pages/Eventos"));
const Login            = lazy(() => import("./pages/Login"));
const Registro         = lazy(() => import("./pages/Registro"));
const ResetPassword    = lazy(() => import("./pages/ResetPassword"));
const Comprar          = lazy(() => import("./pages/Comprar"));
const CompraExitosa    = lazy(() => import("./pages/CompraExitosa"));
const MiCuenta         = lazy(() => import("./pages/MiCuenta"));

// Admin
const AdminSelector    = lazy(() => import("./pages/admin/AdminSelector"));
const WebLayout        = lazy(() => import("./pages/admin/web/WebLayout"));
const SistemaLayout    = lazy(() => import("./pages/admin/sistema/SistemaLayout"));
const WebDashboard     = lazy(() => import("./pages/admin/web/WebDashboard"));
const SistemaDashboard = lazy(() => import("./pages/admin/sistema/SistemaDashboard"));
const AdminEventos     = lazy(() => import("./pages/admin/AdminEventos"));
const AdminAtracciones = lazy(() => import("./pages/admin/AdminAtracciones"));
const AdminSlides      = lazy(() => import("./pages/admin/AdminSlides"));
const AdminActividades = lazy(() => import("./pages/admin/AdminActividades"));
const AdminEntradas    = lazy(() => import("./pages/admin/AdminEntradas"));
const AdminVentas      = lazy(() => import("./pages/admin/AdminVentas"));
const AdminContenido   = lazy(() => import("./pages/admin/AdminContenido"));
const AdminUsuarios    = lazy(() => import("./pages/admin/AdminUsuarios"));
const AdminTickets     = lazy(() => import("./pages/admin/AdminTickets"));
const Noticias         = lazy(() => import("./pages/admin/web/Noticias"));
const Ofertas          = lazy(() => import("./pages/admin/web/Ofertas"));
const Calendario       = lazy(() => import("./pages/admin/web/Calendario"));
const Analytics        = lazy(() => import("./pages/admin/web/Analytics"));
const Validaciones     = lazy(() => import("./pages/admin/sistema/Validaciones"));
const Reportes         = lazy(() => import("./pages/admin/sistema/Reportes"));

// Staff
const Scanner          = lazy(() => import("./pages/staff/Scanner"));

// Errores y legales
const NotFound              = lazy(() => import("./pages/NotFound"));
const AvisoLegal            = lazy(() => import("./pages/legal/AvisoLegal"));
const Reglamento            = lazy(() => import("./pages/legal/Reglamento"));
const PreguntasFrecuentes   = lazy(() => import("./pages/legal/PreguntasFrecuentes"));
const TerminosCondiciones   = lazy(() => import("./pages/legal/TerminosCondiciones"));
const PoliticasPrivacidad   = lazy(() => import("./pages/legal/PoliticasPrivacidad"));

const queryClient = new QueryClient();

// Fallback simple mientras se descarga el chunk de la ruta.
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg">
      <Loader2 className="h-7 w-7 animate-spin text-water-500" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Index />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/comprar" element={<Comprar />} />
            <Route path="/compra-exitosa" element={<CompraExitosa />} />
            <Route path="/mi-cuenta" element={<MiCuenta />} />

            {/* Admin: selector intermedio */}
            <Route path="/admin/seleccionar" element={<AdminSelector />} />

            {/* Admin Modo Web */}
            <Route path="/admin/web" element={<WebLayout />}>
              <Route index element={<WebDashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="contenido" element={<AdminContenido />} />
              <Route path="slides" element={<AdminSlides />} />
              <Route path="noticias" element={<Noticias />} />
              <Route path="ofertas" element={<Ofertas />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="eventos" element={<AdminEventos />} />
              <Route path="atracciones" element={<AdminAtracciones />} />
              <Route path="actividades" element={<AdminActividades />} />
            </Route>

            {/* Admin Modo Sistema */}
            <Route path="/admin/sistema" element={<SistemaLayout />}>
              <Route index element={<SistemaDashboard />} />
              <Route path="ventas" element={<AdminVentas />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="entradas" element={<AdminEntradas />} />
              <Route path="validaciones" element={<Validaciones />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
            </Route>

            {/* Rutas legacy → redirect a estructura nueva */}
            <Route path="/admin" element={<Navigate to="/admin/seleccionar" replace />} />
            <Route path="/admin/eventos" element={<Navigate to="/admin/web/eventos" replace />} />
            <Route path="/admin/atracciones" element={<Navigate to="/admin/web/atracciones" replace />} />
            <Route path="/admin/actividades" element={<Navigate to="/admin/web/actividades" replace />} />
            <Route path="/admin/slides" element={<Navigate to="/admin/web/slides" replace />} />
            <Route path="/admin/contenido" element={<Navigate to="/admin/web/contenido" replace />} />
            <Route path="/admin/ventas" element={<Navigate to="/admin/sistema/ventas" replace />} />
            <Route path="/admin/tickets" element={<Navigate to="/admin/sistema/tickets" replace />} />
            <Route path="/admin/entradas" element={<Navigate to="/admin/sistema/entradas" replace />} />
            <Route path="/admin/usuarios" element={<Navigate to="/admin/sistema/usuarios" replace />} />

            {/* Scanner (no cambia) */}
            <Route path="/staff/scanner" element={<Scanner />} />

            {/* Legales */}
            <Route path="/aviso-legal" element={<AvisoLegal />} />
            <Route path="/reglamento" element={<Reglamento />} />
            <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
            <Route path="/terminos-y-condiciones" element={<TerminosCondiciones />} />
            <Route path="/politicas-de-privacidad" element={<PoliticasPrivacidad />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
