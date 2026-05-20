import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Droplets, Sparkles, Newspaper, Tag, ImageIcon, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CountState {
  eventos: number;
  atracciones: number;
  actividades: number;
  slides: number;
  noticias: number | null;
  ofertas: number | null;
  contenido: number | null;
}

export default function WebDashboard() {
  const [counts, setCounts] = useState<CountState>({
    eventos: 0,
    atracciones: 0,
    actividades: 0,
    slides: 0,
    noticias: null,
    ofertas: null,
    contenido: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      const headOpts = { count: "exact" as const, head: true };
      // Las tablas nuevas (noticias, ofertas) recién se crearon en Fase 0 y no están en types.ts.
      // Casteo con `as never` (mismo patrón que para qr_validaciones) para que TS no rompa.
      const [eventos, atracciones, actividades, slides, noticias, ofertas, contenido] = await Promise.all([
        supabase.from("eventos").select("id", headOpts),
        supabase.from("atracciones").select("id", headOpts),
        supabase.from("actividades").select("id", headOpts),
        supabase.from("hero_slides").select("id", headOpts),
        supabase.from("noticias" as never).select("id", headOpts),
        supabase.from("ofertas" as never).select("id", headOpts),
        supabase.from("contenido_web").select("id", headOpts),
      ]);

      setCounts({
        eventos: eventos.count ?? 0,
        atracciones: atracciones.count ?? 0,
        actividades: actividades.count ?? 0,
        slides: slides.count ?? 0,
        noticias: noticias.error ? null : noticias.count ?? 0,
        ofertas: ofertas.error ? null : ofertas.count ?? 0,
        contenido: contenido.error ? null : contenido.count ?? 0,
      });
      setLoading(false);
    };
    fetchCounts();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-water-600" />
      </div>
    );
  }

  const cards: Array<{ label: string; value: number | null; icon: typeof Calendar; gradient: string }> = [
    { label: "Eventos",     value: counts.eventos,     icon: Calendar,   gradient: "from-water-300 to-water-500" },
    { label: "Atracciones", value: counts.atracciones, icon: Droplets,   gradient: "from-water-400 to-water-600" },
    { label: "Actividades", value: counts.actividades, icon: Sparkles,   gradient: "from-water-300 to-water-500" },
    { label: "Hero Slides", value: counts.slides,      icon: ImageIcon,  gradient: "from-water-500 to-water-700" },
    { label: "Noticias",    value: counts.noticias,    icon: Newspaper,  gradient: "from-water-400 to-water-600" },
    { label: "Ofertas",     value: counts.ofertas,     icon: Tag,        gradient: "from-water-500 to-water-700" },
    { label: "Contenido",   value: counts.contenido,   icon: FileText,   gradient: "from-water-300 to-water-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-water-800">Panel Web</h1>
        <p className="mt-1 text-sm text-app-muted">
          Resumen del contenido público del sitio. Las métricas de visitas se habilitarán en la próxima fase.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="overflow-hidden border-water-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-app-muted">{c.label}</CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-sm`}>
                <c.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-water-800">
                {c.value === null ? <span className="text-base text-app-muted">—</span> : c.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
