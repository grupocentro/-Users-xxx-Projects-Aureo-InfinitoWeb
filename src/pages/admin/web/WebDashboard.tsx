import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar, Droplets, Sparkles, Newspaper, Tag, ImageIcon, FileText, CalendarDays,
  ArrowRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { MetricCard } from "@/components/admin/MetricCard";

// =============================================================================
// Tipos auxiliares
// =============================================================================
interface ProximosDia {
  id: string;
  fecha: string;
  etiqueta: string | null;
  color_hex: string | null;
}

interface Metrics {
  noticiasPublicadas: number;
  noticiasBorrador: number;
  ofertasActivasVigentes: number;
  ofertasTotal: number;
  eventosActivos: number;
  atraccionesActivas: number;
  actividadesActivas: number;
  slidesActivos: number;
  contenidosTotal: number;
  proximosDias: ProximosDia[];
}

const ZERO: Metrics = {
  noticiasPublicadas: 0,
  noticiasBorrador: 0,
  ofertasActivasVigentes: 0,
  ofertasTotal: 0,
  eventosActivos: 0,
  atraccionesActivas: 0,
  actividadesActivas: 0,
  slidesActivos: 0,
  contenidosTotal: 0,
  proximosDias: [],
};

export default function WebDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>(ZERO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(false);
    const headOpts = { count: "exact" as const, head: true };
    const todayIso = format(new Date(), "yyyy-MM-dd");

    try {
      const [
        noticiasPub, noticiasBor,
        ofertasAct, ofertasAll,
        eventos, atracciones, actividades, slides, contenidos,
        proximos,
      ] = await Promise.all([
        // Noticias publicadas
        supabase.from("noticias" as never).select("id", headOpts).eq("estado", "publicado"),
        // Noticias en borrador
        supabase.from("noticias" as never).select("id", headOpts).eq("estado", "borrador"),
        // Ofertas activas vigentes (estado='activa' y vigencia válida)
        // Se hace en JS: traemos las activas y filtramos por vigencia
        supabase.from("ofertas" as never).select("id, vigencia_desde, vigencia_hasta").eq("estado", "activa"),
        // Ofertas total
        supabase.from("ofertas" as never).select("id", headOpts),
        // Eventos activos
        supabase.from("eventos").select("id", headOpts).eq("estado", "activo"),
        // Atracciones activas
        supabase.from("atracciones").select("id", headOpts).eq("estado", "activo"),
        // Actividades activas
        supabase.from("actividades").select("id", headOpts).eq("estado", "activo"),
        // Hero slides activos
        supabase.from("hero_slides").select("id", headOpts).eq("activo", true),
        // Contenidos
        supabase.from("contenido_web").select("id", headOpts),
        // Próximos días especiales (los 5 más próximos, fecha >= hoy)
        supabase
          .from("calendario" as never)
          .select("id, fecha, etiqueta, color_hex")
          .gte("fecha", todayIso)
          .order("fecha", { ascending: true })
          .limit(5),
      ]);

      // Filtrar ofertas activas vigentes en JS
      const ofertasActivasData = (ofertasAct.data ?? []) as unknown as Array<{
        id: string; vigencia_desde: string | null; vigencia_hasta: string | null;
      }>;
      const ofertasActivasVigentes = ofertasActivasData.filter((o) => {
        if (o.vigencia_desde && o.vigencia_desde > todayIso) return false;
        if (o.vigencia_hasta && o.vigencia_hasta < todayIso) return false;
        return true;
      }).length;

      setMetrics({
        noticiasPublicadas:    noticiasPub.error ? 0 : noticiasPub.count ?? 0,
        noticiasBorrador:      noticiasBor.error ? 0 : noticiasBor.count ?? 0,
        ofertasActivasVigentes,
        ofertasTotal:          ofertasAll.error ? 0 : ofertasAll.count ?? 0,
        eventosActivos:        eventos.error ? 0 : eventos.count ?? 0,
        atraccionesActivas:    atracciones.error ? 0 : atracciones.count ?? 0,
        actividadesActivas:    actividades.error ? 0 : actividades.count ?? 0,
        slidesActivos:         slides.error ? 0 : slides.count ?? 0,
        contenidosTotal:       contenidos.error ? 0 : contenidos.count ?? 0,
        proximosDias:          proximos.error ? [] : (proximos.data ?? []) as unknown as ProximosDia[],
      });
    } catch (err) {
      console.error("WebDashboard error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <LoadingState message="Cargando panel web..." />;
  if (error)   return <ErrorState onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-water-800">Panel Web</h1>
        <p className="mt-1 text-sm text-app-muted">
          Resumen del contenido público del sitio. Las métricas de visitas se habilitarán en la próxima fase.
        </p>
      </div>

      {/* ============================ Contenido publicado ============================ */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Contenido publicado</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Noticias publicadas"
            value={metrics.noticiasPublicadas}
            icon={Newspaper}
            variant="success"
            hint={metrics.noticiasBorrador > 0 ? `${metrics.noticiasBorrador} en borrador` : undefined}
          />
          <MetricCard
            label="Ofertas vigentes"
            value={metrics.ofertasActivasVigentes}
            icon={Tag}
            variant="primary"
            hint={metrics.ofertasTotal > metrics.ofertasActivasVigentes ? `${metrics.ofertasTotal} totales` : undefined}
          />
          <MetricCard label="Eventos activos"   value={metrics.eventosActivos}   icon={Calendar}  variant="default" />
          <MetricCard label="Hero Slides"       value={metrics.slidesActivos}    icon={ImageIcon} variant="default" />
        </div>
      </section>

      {/* ============================ Catálogo ============================ */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Catálogo del parque</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Atracciones" value={metrics.atraccionesActivas} icon={Droplets}  variant="default" />
          <MetricCard label="Actividades" value={metrics.actividadesActivas} icon={Sparkles}  variant="default" />
          <MetricCard label="Contenido editable" value={metrics.contenidosTotal} icon={FileText} variant="default" />
          <MetricCard label="Días en calendario" value={metrics.proximosDias.length} icon={CalendarDays} variant="primary"
                      hint={metrics.proximosDias.length > 0 ? "Próximos especiales" : undefined} />
        </div>
      </section>

      {/* ============================ Próximos días + accesos rápidos ============================ */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-water-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-water-800">Próximos días especiales</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.proximosDias.length === 0 ? (
              <p className="py-4 text-center text-sm text-app-muted">
                No hay días especiales próximos en el calendario.
              </p>
            ) : (
              <ul className="space-y-2">
                {metrics.proximosDias.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-water-100 bg-white p-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-app-border"
                      style={{ backgroundColor: d.color_hex ?? "transparent" }}
                    />
                    <div className="grow">
                      <p className="text-sm font-medium text-water-800">
                        {format(parseISO(d.fecha + "T00:00:00"), "EEEE dd MMM yyyy", { locale: es })}
                      </p>
                      {d.etiqueta && <p className="text-xs text-app-muted">{d.etiqueta}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-1 rounded-xl"
              onClick={() => navigate("/admin/web/calendario")}
            >
              Ver calendario completo <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-water-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-water-800">Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Newspaper}    label="Editar noticias"    onClick={() => navigate("/admin/web/noticias")} />
              <QuickAction icon={Tag}          label="Editar ofertas"     onClick={() => navigate("/admin/web/ofertas")} />
              <QuickAction icon={Calendar}     label="Editar eventos"     onClick={() => navigate("/admin/web/eventos")} />
              <QuickAction icon={Droplets}     label="Editar atracciones" onClick={() => navigate("/admin/web/atracciones")} />
              <QuickAction icon={Sparkles}     label="Editar actividades" onClick={() => navigate("/admin/web/actividades")} />
              <QuickAction icon={ImageIcon}    label="Editar slides"      onClick={() => navigate("/admin/web/slides")} />
              <QuickAction icon={FileText}     label="Editar contenido"   onClick={() => navigate("/admin/web/contenido")} />
              <QuickAction icon={CalendarDays} label="Editar calendario"  onClick={() => navigate("/admin/web/calendario")} />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function QuickAction({
  icon: Icon, label, onClick,
}: { icon: typeof Newspaper; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 rounded-xl border border-water-100 bg-white px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-water-200 hover:shadow-sm"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-water-300 to-water-500 text-white shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium text-water-700 group-hover:text-water-800">{label}</span>
    </button>
  );
}
