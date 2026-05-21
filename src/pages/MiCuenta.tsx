import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Loader2, QrCode, User, ShoppingBag, LogOut, MessageCircle, ScanLine,
  Calendar, Ticket, ShieldCheck, Home, Store, Menu, Bell, ChevronRight,
  CreditCard, HelpCircle, MoreHorizontal, Sparkles, Copy, Users, Baby,
  LayoutDashboard, Mail, Phone, X, CheckCircle2, Clock,
} from "lucide-react";
import eventosHeroBg from "@/assets/eventos-hero-bg.jpg";
import infinitoLogo from "@/assets/infinito-logo.png";

// =============================================================================
// /mi-cuenta — Dashboard premium del cliente
// =============================================================================
// Layout responsive auténtico:
//   - Desktop ≥1024px : Sidebar fija + top nav público + contenido amplio
//   - Tablet  ≥768px  : Top nav + contenido a una columna respirada
//   - Mobile         : Header iOS + bottom navigation + cards swipeables
// Toda la lógica de datos (Supabase queries, signOut, perfil) se preserva.
// =============================================================================

type Profile = { nombre: string; apellido: string; email: string; whatsapp: string | null };
type Compra = {
  id: string;
  cantidad: number;
  total: number;
  estado_pago: string;
  created_at: string;
  fecha_visita: string | null;
  grupo_id: string | null;
  tipo_entrada_id: string | null;
  tipo_entrada: { nombre: string; emoji: string | null } | null;
};
type QR = {
  id: string;
  uuid_code: string;
  usado: boolean;
  usado_at: string | null;
  compra_id: string;
};

type Section = "resumen" | "mis-qr" | "mis-compras" | "perfil" | "metodos-pago" | "notificaciones" | "ayuda";

type SelectedQR = {
  qr: QR;
  tipo: string;          // "Adulto" | "Menor" | tipo crudo
  compra: Compra | undefined;
  posicion?: number;     // "1 de N" del mismo tipo
  total?: number;
};

const ARS = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

// Formatea grupo_id como GRP-XXXX-YYYY (usa 8 chars del UUID)
function formatGrupoId(grupoId: string | null, fallbackId: string): string {
  if (!grupoId) return `IND-${fallbackId.slice(0, 4)}-${fallbackId.slice(-4)}`.toUpperCase();
  const clean = grupoId.replace(/-/g, "");
  return `GRP-${clean.slice(0, 4)}-${clean.slice(-4)}`.toUpperCase();
}

function shortCode(code: string) {
  return `${code.slice(0, 8)}…${code.slice(-4)}`;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function MiCuenta() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isStaff, isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [qrs, setQrs] = useState<QR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [saving, setSaving] = useState(false);
  // section inicial respeta ?section=perfil|mis-qr|... del query string (deep-link
  // desde el dropdown "Mi Cuenta" del navbar).
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection: Section = (() => {
    const s = searchParams.get("section") as Section | null;
    return s && ["resumen", "mis-qr", "mis-compras", "perfil", "metodos-pago", "notificaciones", "ayuda"].includes(s) ? s : "resumen";
  })();
  const [section, setSection] = useState<Section>(initialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<SelectedQR | null>(null);

  // Si el usuario navega entre secciones desde el dropdown del navbar, sincronizar
  // el query param sin recargar (permite back/forward + compartir links).
  useEffect(() => {
    const current = searchParams.get("section");
    if (section === "resumen" && current) {
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      setSearchParams(next, { replace: true });
    } else if (section !== "resumen" && current !== section) {
      const next = new URLSearchParams(searchParams);
      next.set("section", section);
      setSearchParams(next, { replace: true });
    }
  }, [section, searchParams, setSearchParams]);

  const openQR = (qr: QR, tipo: string, compra: Compra | undefined, posicion?: number, total?: number) =>
    setSelectedQR({ qr, tipo, compra, posicion, total });

  // -------------------------------------------------------------------------
  // Fetch de datos — robusto: timeout, try/catch/finally, fail-open
  // -------------------------------------------------------------------------
  // Reglas:
  //  - El spinner sale en cuanto authLoading/roleLoading terminan y se intenta
  //    fetch (success o error) — nunca queda colgado.
  //  - Si profile falla (no existe el row), seguimos: usamos email del auth.
  //  - Si compras/qrs fallan, mostramos cuenta vacía + opción de reintentar.
  //  - Timeout duro de 10s: si Supabase nunca responde, mostramos error.
  useEffect(() => {
    // Esperar a que auth+role terminen de cargar.
    if (authLoading || roleLoading) return;

    // Sin sesión → al login.
    if (!user) {
      navigate("/cliente/login?redirect=/mi-cuenta", { replace: true });
      return;
    }

    // Staff QR puro → al scanner.
    if (isStaff && !isAdmin) {
      navigate("/staff/scanner", { replace: true });
      return;
    }

    let cancelled = false;
    const timeoutMs = 10_000;
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setError("No pudimos cargar tu cuenta. Verificá tu conexión e intentá de nuevo.");
        setLoading(false);
      }
    }, timeoutMs);

    const fetchData = async () => {
      try {
        // Profile + compras en paralelo. .maybeSingle() para no romper si no existe row.
        const [profileRes, comprasRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("nombre, apellido, email, whatsapp")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("compras")
            .select("id, cantidad, total, estado_pago, created_at, fecha_visita, grupo_id, tipo_entrada_id, tipo_entrada:tipos_entrada(nombre, emoji)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        // Profile: si no existe row, usar fallback con datos del auth.
        if (profileRes.data) {
          setProfile(profileRes.data);
        } else {
          if (profileRes.error) console.warn("MiCuenta: profile no se pudo leer:", profileRes.error.message);
          // Fallback: derivar de auth.user — la UI sigue funcionando.
          const meta = (user.user_metadata ?? {}) as { nombre?: string; apellido?: string; whatsapp?: string };
          setProfile({
            nombre: meta.nombre ?? "",
            apellido: meta.apellido ?? "",
            email: user.email ?? "",
            whatsapp: meta.whatsapp ?? null,
          });
        }

        // Compras: si falla, dejamos array vacío y seguimos.
        const comprasData = comprasRes.error ? [] : ((comprasRes.data ?? []) as unknown as Compra[]);
        if (comprasRes.error) console.warn("MiCuenta: compras no se pudieron leer:", comprasRes.error.message);
        setCompras(comprasData);

        // QRs sólo si hay compras.
        const comprasIds = comprasData.map((c) => c.id);
        if (comprasIds.length > 0) {
          const { data: qrsData, error: qrsErr } = await supabase
            .from("codigos_qr")
            .select("id, uuid_code, usado, usado_at, compra_id")
            .in("compra_id", comprasIds)
            .order("created_at", { ascending: false });

          if (cancelled) return;
          if (qrsErr) console.warn("MiCuenta: qrs no se pudieron leer:", qrsErr.message);
          setQrs(qrsData ?? []);
        } else {
          setQrs([]);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Error inesperado";
        console.error("MiCuenta: fallo cargando datos:", msg);
        setError(`No pudimos cargar tu cuenta: ${msg}`);
      } finally {
        // Crucial: el spinner SIEMPRE se apaga, haya success o fallo.
        if (!cancelled) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [user?.id, authLoading, roleLoading, isStaff, isAdmin, retryToken, navigate]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryToken((t) => t + 1);
  };

  // -------------------------------------------------------------------------
  // Datos derivados para los KPIs / resumen
  // -------------------------------------------------------------------------
  const derived = useMemo(() => {
    const comprasAprobadas = compras.filter((c) => c.estado_pago === "aprobado");
    const qrsActivos = qrs.filter((q) => !q.usado);

    // Próxima visita: fecha_visita futura más próxima
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechasFuturas = comprasAprobadas
      .map((c) => c.fecha_visita)
      .filter((f): f is string => !!f && new Date(f + "T00:00:00") >= hoy)
      .sort();
    const proximaVisita = fechasFuturas[0] ?? null;

    // Conteo por tipo de entrada (adultos / menores)
    const cantidadPorTipo = new Map<string, number>();
    for (const c of comprasAprobadas) {
      const nombre = c.tipo_entrada?.nombre ?? "Otro";
      cantidadPorTipo.set(nombre, (cantidadPorTipo.get(nombre) ?? 0) + c.cantidad);
    }
    const adultos = cantidadPorTipo.get("Mayores") ?? 0;
    const menores = cantidadPorTipo.get("Menores") ?? 0;

    // Total entradas (suma de cantidad de compras aprobadas)
    const totalEntradas = comprasAprobadas.reduce((s, c) => s + c.cantidad, 0);

    // Código reserva del próximo grupo (primer compra con grupo_id o id directo)
    const compraConGrupo = comprasAprobadas.find((c) => !!c.grupo_id) ?? comprasAprobadas[0];
    const codigoReserva = compraConGrupo
      ? formatGrupoId(compraConGrupo.grupo_id, compraConGrupo.id)
      : null;

    return {
      qrsActivos,
      proximaVisita,
      adultos,
      menores,
      totalEntradas,
      codigoReserva,
      compras: comprasAprobadas,
    };
  }, [compras, qrs]);

  // -------------------------------------------------------------------------
  // Handler: guardar perfil (preserva lógica original)
  // -------------------------------------------------------------------------
  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nombre: profile.nombre, apellido: profile.apellido, whatsapp: profile.whatsapp })
      .eq("id", user.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil actualizado ✅" });
    setSaving(false);
  };

  const handleNavigation = (sec: Section) => {
    setSection(sec);
    setMobileMenuOpen(false);
    // Scroll al top en mobile
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // -------------------------------------------------------------------------
  // Error state — nunca queda colgado el spinner.
  // -------------------------------------------------------------------------
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-water-50 via-white to-water-100 px-4">
        <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
            <X className="h-7 w-7 text-rose-600" />
          </div>
          <h2 className="text-xl font-black text-water-800">No pudimos cargar tu cuenta</h2>
          <p className="mt-2 text-sm text-app-muted">{error}</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Button
              onClick={handleRetry}
              className="h-11 rounded-2xl bg-gradient-to-r from-water-700 to-water-500 font-bold text-white"
            >
              Reintentar
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="h-11 rounded-2xl border-2 font-bold"
            >
              Volver al inicio
            </Button>
            <Button
              variant="ghost"
              onClick={async () => { await signOut(); navigate("/"); }}
              className="h-11 rounded-2xl font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="mr-1.5 h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Loading state premium
  // -------------------------------------------------------------------------
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-water-50 via-white to-water-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-water-600" />
          <p className="text-sm text-app-muted">Cargando tu cuenta...</p>
        </div>
      </div>
    );
  }

  const firstName = profile?.nombre?.split(" ")[0] || "Visitante";
  const fullName = `${profile?.nombre ?? ""} ${profile?.apellido ?? ""}`.trim() || "Visitante";
  const initials = (profile?.nombre?.[0] || "?") + (profile?.apellido?.[0] || "");

  // ─── Sidebar items ──────────────────────────────────────────────────────
  const navItems: { id: Section; label: string; icon: typeof QrCode; badge?: string }[] = [
    { id: "resumen",        label: "Resumen",         icon: LayoutDashboard },
    { id: "mis-qr",         label: "Mis QR",          icon: QrCode, badge: derived.qrsActivos.length > 0 ? String(derived.qrsActivos.length) : undefined },
    { id: "mis-compras",    label: "Mis Compras",     icon: ShoppingBag },
    { id: "perfil",         label: "Perfil",          icon: User },
    { id: "metodos-pago",   label: "Métodos de pago", icon: CreditCard },
    { id: "notificaciones", label: "Notificaciones",  icon: Bell },
    { id: "ayuda",          label: "Ayuda y soporte", icon: HelpCircle },
  ];

  return (
    <>
      <style>{`
        @keyframes mc-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mc-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .mc-stagger > * { animation: mc-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .mc-stagger > *:nth-child(1) { animation-delay: 0.05s; }
        .mc-stagger > *:nth-child(2) { animation-delay: 0.1s; }
        .mc-stagger > *:nth-child(3) { animation-delay: 0.15s; }
        .mc-stagger > *:nth-child(4) { animation-delay: 0.2s; }
        .mc-stagger > *:nth-child(5) { animation-delay: 0.25s; }
        .mc-stagger > *:nth-child(6) { animation-delay: 0.3s; }
        .mc-glow-green { box-shadow: 0 0 0 1px rgba(16,185,129,0.18), 0 8px 28px -8px rgba(16,185,129,0.35); }
        .mc-no-scrollbar::-webkit-scrollbar { display: none; }
        .mc-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-water-50/50 pb-24 lg:pb-0">
        {/* ═════════════════════════════════════════════════════════════════
            HEADER MOBILE (oculto en lg+)
            ═════════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-30 border-b border-app-border bg-white/85 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <img src={infinitoLogo} alt="Infinito" className="h-7 w-7" />
              <span className="font-black text-water-800 leading-none">INFINITO</span>
              <span className="text-[8px] tracking-[0.2em] text-water-500 font-bold leading-none">WATER PARK</span>
            </button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-water-50 text-water-700">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex h-full flex-col">
                  <div className="border-b border-app-border bg-gradient-to-br from-water-50 to-white p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-water-500 to-water-700 text-white font-black shadow-md">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-water-800">{fullName}</p>
                        <p className="truncate text-xs text-app-muted">{profile?.email}</p>
                      </div>
                    </div>
                  </div>
                  <nav className="flex-1 overflow-y-auto p-3">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = section === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                            active ? "bg-water-100 text-water-800" : "text-app-muted hover:bg-water-50/60 hover:text-water-700"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className="rounded-full bg-water-200 px-1.5 py-0.5 text-[10px] font-bold text-water-800">{item.badge}</span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                  <div className="border-t border-app-border p-3">
                    <Button variant="ghost" className="w-full justify-start gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={signOut}>
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* ═════════════════════════════════════════════════════════════════
            HEADER DESKTOP (oculto en mobile)
            ═════════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-30 hidden border-b border-app-border bg-white/85 backdrop-blur-xl lg:block">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
              <img src={infinitoLogo} alt="Infinito" className="h-9 w-9" />
              <div className="leading-none">
                <p className="font-black text-water-800">INFINITO</p>
                <p className="text-[9px] tracking-[0.22em] text-water-500 font-bold mt-0.5">WATER PARK</p>
              </div>
            </button>
            <nav className="flex items-center gap-1">
              <button onClick={() => navigate("/")}            className="rounded-xl px-3 py-2 text-sm font-medium text-app-muted hover:bg-water-50 hover:text-water-700">Inicio</button>
              <button onClick={() => navigate("/#atracciones")} className="rounded-xl px-3 py-2 text-sm font-medium text-app-muted hover:bg-water-50 hover:text-water-700">Atracciones</button>
              <button onClick={() => navigate("/comprar")}      className="rounded-xl px-3 py-2 text-sm font-medium text-app-muted hover:bg-water-50 hover:text-water-700">Entradas</button>
              <button onClick={() => navigate("/eventos")}      className="rounded-xl px-3 py-2 text-sm font-medium text-app-muted hover:bg-water-50 hover:text-water-700">Eventos</button>
              <span className="relative rounded-xl bg-water-50 px-3 py-2 text-sm font-bold text-water-700">
                Mi Cuenta
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-water-600" />
              </span>
            </nav>
            <div className="flex items-center gap-2">
              <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-water-50 text-water-700 hover:bg-water-100">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-water-500 to-water-700 text-white text-xs font-black shadow-md">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* ═════════════════════════════════════════════════════════════════
            LAYOUT PRINCIPAL: sidebar (desktop) + contenido
            ═════════════════════════════════════════════════════════════════ */}
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
          {/* ─── Sidebar DESKTOP ───────────────────────────────────────── */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Perfil card */}
              <div className="rounded-2xl border border-app-border bg-white/80 p-5 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-water-500 to-water-700 text-white text-lg font-black shadow-md">
                    {initials}
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-water-800">{fullName}</p>
                    <p className="truncate text-xs text-app-muted">{profile?.email}</p>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="rounded-2xl border border-app-border bg-white/80 p-2 shadow-sm backdrop-blur-md">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "bg-gradient-to-r from-water-100 to-water-50 text-water-800 shadow-sm"
                          : "text-app-muted hover:bg-water-50/60 hover:text-water-700"
                      }`}
                    >
                      {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-water-600" />}
                      <Icon className={`h-4 w-4 ${active ? "text-water-700" : ""}`} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-water-200 text-water-800" : "bg-water-100 text-water-700"}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2 rounded-2xl border border-rose-200/60 bg-white/80 px-4 py-2.5 text-sm font-bold text-rose-600 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50 backdrop-blur-md"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          </aside>

          {/* ─── Contenido principal ──────────────────────────────────── */}
          <main className="flex-1 min-w-0 space-y-5 mc-stagger">
            {section === "resumen" && (
              <ResumenSection
                firstName={firstName}
                derived={derived}
                qrs={qrs}
                compras={compras}
                isStaff={isStaff}
                isAdmin={isAdmin}
                onGo={(s) => setSection(s)}
                onNavigate={navigate}
                onOpenQR={openQR}
              />
            )}

            {section === "mis-qr" && (
              <MisQRSection qrs={qrs} compras={compras} navigate={navigate} onOpenQR={openQR} />
            )}

            {section === "mis-compras" && (
              <MisComprasSection compras={compras} qrs={qrs} navigate={navigate} />
            )}

            {section === "perfil" && (
              <PerfilSection
                profile={profile}
                setProfile={setProfile}
                saving={saving}
                onSave={handleSaveProfile}
              />
            )}

            {section === "metodos-pago" && (
              <PlaceholderSection
                icon={CreditCard}
                title="Métodos de pago"
                description="Próximamente vas a poder guardar tarjetas y elegir tu método preferido. Por ahora, los pagos se realizan vía MercadoPago al confirmar cada compra."
              />
            )}

            {section === "notificaciones" && (
              <PlaceholderSection
                icon={Bell}
                title="Notificaciones"
                description="Pronto vas a recibir avisos de eventos, promociones y confirmaciones de compra directamente acá. Mientras tanto, te llegan por email."
              />
            )}

            {section === "ayuda" && (
              <AyudaSection />
            )}
          </main>
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            DIALOG: QR AMPLIADO
            ═════════════════════════════════════════════════════════════════ */}
        <QRViewerDialog
          selected={selectedQR}
          onClose={() => setSelectedQR(null)}
          ownerName={fullName}
        />

        {/* ═════════════════════════════════════════════════════════════════
            BOTTOM NAVIGATION MOBILE
            ═════════════════════════════════════════════════════════════════ */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-app-border bg-white/90 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
            {[
              { icon: Home,         label: "Inicio",    onClick: () => navigate("/"),         active: false },
              { icon: Ticket,       label: "Entradas",  onClick: () => navigate("/comprar"),  active: false },
              { icon: User,         label: "Mi Cuenta", onClick: () => setSection("resumen"), active: true },
              { icon: Store,        label: "Tienda",    onClick: () => toast({ title: "Próximamente", description: "Tienda en desarrollo." }), active: false },
              { icon: MoreHorizontal, label: "Más",     onClick: () => setMobileMenuOpen(true), active: false },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <button key={i} onClick={item.onClick} className="flex flex-col items-center gap-1 px-3 py-1.5">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    item.active ? "bg-water-100 text-water-700 shadow-sm" : "text-app-muted"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`text-[10px] font-bold ${item.active ? "text-water-700" : "text-app-muted"}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}

// =============================================================================
// SECCIÓN: RESUMEN
// =============================================================================
function ResumenSection({
  firstName, derived, qrs, compras, isStaff, isAdmin, onGo, onNavigate, onOpenQR,
}: {
  firstName: string;
  derived: ReturnType<typeof useMemo>;
  qrs: QR[];
  compras: Compra[];
  isStaff: boolean;
  isAdmin: boolean;
  onGo: (s: Section) => void;
  onNavigate: (path: string) => void;
  onOpenQR: (qr: QR, tipo: string, compra: Compra | undefined, posicion?: number, total?: number) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = derived as any;
  const nextDate = d.proximaVisita ? new Date(d.proximaVisita + "T00:00:00") : null;
  const dayNumber = nextDate ? nextDate.getDate() : null;
  const monthShort = nextDate ? nextDate.toLocaleDateString("es-AR", { month: "short" }).toUpperCase().replace(".", "") : null;
  const weekday = nextDate ? nextDate.toLocaleDateString("es-AR", { weekday: "long" }) : null;

  return (
    <>
      {/* ── Header de saludo ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-black text-water-800 sm:text-4xl">
          Hola, {firstName} <span className="inline-block animate-bounce" style={{ animationDuration: "2.5s" }}>👋</span>
        </h1>
        <p className="mt-1 text-sm text-app-muted sm:text-base">
          Aquí tienes un resumen de tu cuenta {compras.length > 0 ? "y tus entradas" : ""}
        </p>
      </div>

      {/* ── Acceso staff/admin (preservado) ─────────────────────────── */}
      {(isStaff || isAdmin) && (
        <button
          onClick={() => onNavigate("/staff/scanner")}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-water-50 p-4 transition-all hover:border-violet-300 hover:shadow-md"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-water-600 text-white shadow-sm">
              <ScanLine className="h-5 w-5" />
            </span>
            <span className="text-left">
              <p className="text-sm font-bold text-water-800">Panel de operador</p>
              <p className="text-xs text-app-muted">Acceder al escáner QR</p>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-water-600" />
        </button>
      )}

      {/* ── Hero banner premium ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl shadow-lg" style={{ aspectRatio: "16 / 5" }}>
        <img src={eventosHeroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(110deg, hsl(var(--water-800) / 0.92) 0%, hsl(var(--water-600) / 0.82) 45%, hsl(var(--water-500) / 0.55) 75%, transparent 100%)",
        }} />
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        {/* Símbolo infinito decorativo */}
        <svg
          className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 opacity-15 sm:block"
          width="140" height="60" viewBox="0 0 140 60" fill="none"
        >
          <path d="M20 30 Q20 10 40 10 T70 30 Q70 50 90 50 T120 30 Q120 10 100 10 T70 30 Q70 50 50 50 T20 30 Z"
                stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>

        <div className="relative flex h-full flex-col justify-center p-6 sm:p-8">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Gracias por elegir
          </p>
          <h2 className="mt-1 font-black text-white leading-tight" style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.4rem)", textShadow: "0 2px 14px rgba(0,0,0,0.35)" }}>
            Infinito Water Park
          </h2>
          <p className="mt-1 text-sm text-white/85 sm:text-base">
            ¡Prepárate para vivir un día inolvidable!
          </p>
        </div>
      </div>

      {/* ── 4 KPIs premium ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Calendar}
          tone="water"
          label="Próxima visita"
          mainNode={
            nextDate ? (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-water-800 leading-none">{dayNumber}</span>
                <div className="leading-tight">
                  <p className="capitalize text-sm font-semibold text-water-700">{weekday}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-water-500">{monthShort}</p>
                </div>
              </div>
            ) : (
              <span className="text-base font-bold text-app-muted">Sin visitas programadas</span>
            )
          }
          cta={d.qrsActivos.length > 0 ? { label: "Ver detalle", onClick: () => onGo("mis-qr") } : undefined}
        />
        <KpiCard
          icon={Ticket}
          tone="violet"
          label="Entradas activas"
          mainNode={
            <div>
              <p className="text-4xl font-black text-water-800 leading-none">{d.qrsActivos.length}</p>
              <p className="mt-1 text-xs text-app-muted">Entradas</p>
            </div>
          }
          cta={d.qrsActivos.length > 0 ? { label: "Ver mis QR", onClick: () => onGo("mis-qr") } : undefined}
        />
        <KpiCard
          icon={ShoppingBag}
          tone="amber"
          label="Compras realizadas"
          mainNode={
            <div>
              <p className="text-4xl font-black text-water-800 leading-none">{compras.length}</p>
              <p className="mt-1 text-xs text-app-muted">Total</p>
            </div>
          }
          cta={compras.length > 0 ? { label: "Ver historial", onClick: () => onGo("mis-compras") } : undefined}
        />
        <KpiCard
          icon={ShieldCheck}
          tone="emerald"
          label="Estado de cuenta"
          mainNode={
            <div>
              <p className="text-2xl font-black text-emerald-600 leading-tight">Todo al día</p>
              <p className="mt-1 text-xs text-app-muted">¡Gracias!</p>
            </div>
          }
        />
      </div>

      {/* ── Mis QR activos ──────────────────────────────────────────── */}
      {d.qrsActivos.length > 0 ? (
        <div className="rounded-3xl border border-app-border bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-water-800 sm:text-xl">Mis QR activos</h3>
              <p className="text-xs text-app-muted sm:text-sm">Muestra estos códigos en el ingreso al parque</p>
            </div>
            <button
              onClick={() => {
                const codes = d.qrsActivos.slice(0, 4).map((q: QR) => q.uuid_code).join("\n");
                const msg = encodeURIComponent(`🎟️ Mis entradas Infinito Water Park\n\n${codes}\n\n¡Nos vemos! 🌊`);
                window.open(`https://wa.me/?text=${msg}`, "_blank");
              }}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Enviar por WhatsApp
            </button>
          </div>

          {/* Grid responsive: scroll horizontal mobile, grid desktop */}
          <div className="-mx-5 overflow-x-auto px-5 mc-no-scrollbar sm:mx-0 sm:px-0">
            <div className="flex gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {d.qrsActivos.slice(0, 8).map((qr: QR, idx: number) => {
                const compra = compras.find((c) => c.id === qr.compra_id);
                const tipoNombre = compra?.tipo_entrada?.nombre ?? "Entrada";
                const sameTipo = d.qrsActivos.filter((q: QR) => {
                  const c2 = compras.find((cc) => cc.id === q.compra_id);
                  return c2?.tipo_entrada?.nombre === tipoNombre;
                });
                const posicion = sameTipo.findIndex((q: QR) => q.id === qr.id) + 1;
                return (
                  <QRCard
                    key={qr.id}
                    qr={qr}
                    tipo={tipoNombre}
                    posicion={posicion}
                    total={sameTipo.length}
                    delay={idx * 60}
                    onClick={() => onOpenQR(qr, tipoNombre, compra, posicion, sameTipo.length)}
                  />
                );
              })}
            </div>
          </div>

          {/* CTA WhatsApp mobile */}
          <button
            onClick={() => {
              const codes = d.qrsActivos.slice(0, 4).map((q: QR) => q.uuid_code).join("\n");
              const msg = encodeURIComponent(`🎟️ Mis entradas Infinito Water Park\n\n${codes}\n\n¡Nos vemos! 🌊`);
              window.open(`https://wa.me/?text=${msg}`, "_blank");
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 sm:hidden"
          >
            <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
          </button>
        </div>
      ) : (
        <EmptyQRBlock onNavigate={onNavigate} />
      )}

      {/* ── Resumen totales (4 entradas / 2 adultos / 2 menores / código reserva) ──── */}
      {d.totalEntradas > 0 && (
        <div className="rounded-3xl border border-app-border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ResumenItem icon={Ticket}  label="Entradas totales" value={d.totalEntradas} tone="water" />
            <ResumenItem icon={User}    label="Adultos"          value={d.adultos}       tone="violet" />
            <ResumenItem icon={Baby}    label="Menores"          value={d.menores}       tone="emerald" />
            <ResumenCodeItem code={d.codigoReserva} />
          </div>
        </div>
      )}

      {/* ── Historial breve ─────────────────────────────────────────── */}
      {compras.length > 0 && (
        <div className="rounded-3xl border border-app-border bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-water-800">Historial de compras</h3>
            <button onClick={() => onGo("mis-compras")} className="text-xs font-bold text-water-700 hover:underline">Ver todas →</button>
          </div>
          <HistorialTabla compras={compras.slice(0, 3)} />
        </div>
      )}
    </>
  );
}

// =============================================================================
// SECCIÓN: MIS QR
// =============================================================================
function MisQRSection({ qrs, compras, navigate, onOpenQR }: {
  qrs: QR[];
  compras: Compra[];
  navigate: (p: string) => void;
  onOpenQR: (qr: QR, tipo: string, compra: Compra | undefined, posicion?: number, total?: number) => void;
}) {
  const qrsActivos = qrs.filter((q) => !q.usado);
  const qrsUsados = qrs.filter((q) => q.usado);

  return (
    <>
      <div>
        <h1 className="text-3xl font-black text-water-800">Mis QR</h1>
        <p className="mt-1 text-sm text-app-muted">Todas las entradas asociadas a tu cuenta.</p>
      </div>

      {qrsActivos.length === 0 && qrsUsados.length === 0 ? (
        <EmptyQRBlock onNavigate={navigate} />
      ) : (
        <>
          {qrsActivos.length > 0 && (
            <div className="rounded-3xl border border-app-border bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-water-800">Activos · {qrsActivos.length}</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Válidos</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {qrsActivos.map((qr, idx) => {
                  const compra = compras.find((c) => c.id === qr.compra_id);
                  const tipo = compra?.tipo_entrada?.nombre ?? "Entrada";
                  return (
                    <QRCardLarge
                      key={qr.id}
                      qr={qr}
                      tipo={tipo}
                      compra={compra}
                      delay={idx * 60}
                      onClick={() => onOpenQR(qr, tipo, compra)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {qrsUsados.length > 0 && (
            <div className="rounded-3xl border border-app-border bg-white p-5 sm:p-6 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-water-800">Ya utilizados · {qrsUsados.length}</h3>
              <div className="space-y-2">
                {qrsUsados.map((qr) => {
                  const compra = compras.find((c) => c.id === qr.compra_id);
                  const tipo = compra?.tipo_entrada?.nombre ?? "Entrada";
                  return (
                    <button
                      key={qr.id}
                      onClick={() => onOpenQR(qr, tipo, compra)}
                      className="flex w-full items-center justify-between rounded-xl border border-app-border px-4 py-3 text-left opacity-70 transition-colors hover:bg-water-50/40 hover:opacity-100"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-water-800">{compra?.tipo_entrada?.emoji ?? "🎟️"} {tipo}</p>
                        <p className="font-mono text-[11px] text-app-muted">{shortCode(qr.uuid_code)}</p>
                      </div>
                      <span className="text-xs text-app-muted">
                        {qr.usado_at ? new Date(qr.usado_at).toLocaleDateString("es-AR") : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// =============================================================================
// SECCIÓN: MIS COMPRAS
// =============================================================================
function MisComprasSection({ compras, qrs, navigate }: { compras: Compra[]; qrs: QR[]; navigate: (p: string) => void }) {
  return (
    <>
      <div>
        <h1 className="text-3xl font-black text-water-800">Mis Compras</h1>
        <p className="mt-1 text-sm text-app-muted">Historial completo de tus operaciones.</p>
      </div>

      {compras.length === 0 ? (
        <div className="rounded-3xl border border-app-border bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-water-50">
            <ShoppingBag className="h-7 w-7 text-water-500" />
          </div>
          <p className="font-bold text-water-800">Aún no realizaste compras</p>
          <p className="mt-1 text-sm text-app-muted">Conseguí tu entrada al parque más épico</p>
          <Button className="mt-4 rounded-2xl" onClick={() => navigate("/comprar")}>Comprar entradas</Button>
        </div>
      ) : (
        <div className="rounded-3xl border border-app-border bg-white shadow-sm">
          <HistorialTabla compras={compras} qrsByCompra={qrs} expanded />
        </div>
      )}
    </>
  );
}

// =============================================================================
// SECCIÓN: PERFIL (form original preservado, estilizado premium)
// =============================================================================
function PerfilSection({
  profile, setProfile, saving, onSave,
}: {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <div>
        <h1 className="text-3xl font-black text-water-800">Perfil</h1>
        <p className="mt-1 text-sm text-app-muted">Tus datos personales y de contacto.</p>
      </div>
      <div className="rounded-3xl border border-app-border bg-white p-5 sm:p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-water-700">Nombre</Label>
            <Input
              value={profile?.nombre || ""}
              onChange={(e) => setProfile((p) => p ? { ...p, nombre: e.target.value } : p)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-water-700">Apellido</Label>
            <Input
              value={profile?.apellido || ""}
              onChange={(e) => setProfile((p) => p ? { ...p, apellido: e.target.value } : p)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-water-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
              <Input value={profile?.email || ""} disabled className="h-11 rounded-xl pl-9" />
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-water-700">WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
              <Input
                value={profile?.whatsapp || ""}
                onChange={(e) => setProfile((p) => p ? { ...p, whatsapp: e.target.value } : p)}
                placeholder="+54 9 11 1234-5678"
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>
        </div>
        <Button onClick={onSave} disabled={saving} className="mt-5 h-11 rounded-2xl bg-gradient-to-r from-water-700 to-water-500 px-6 font-bold text-white">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </>
  );
}

// =============================================================================
// SECCIÓN: PLACEHOLDER (Métodos de pago, Notificaciones)
// =============================================================================
function PlaceholderSection({ icon: Icon, title, description }: { icon: typeof QrCode; title: string; description: string }) {
  return (
    <>
      <div>
        <h1 className="text-3xl font-black text-water-800">{title}</h1>
      </div>
      <div className="rounded-3xl border border-app-border bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-water-100 to-water-200">
          <Icon className="h-8 w-8 text-water-600" />
        </div>
        <p className="text-lg font-bold text-water-800">Próximamente</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-app-muted">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
          <Sparkles className="h-3 w-3" /> En desarrollo
        </span>
      </div>
    </>
  );
}

// =============================================================================
// SECCIÓN: AYUDA
// =============================================================================
function AyudaSection() {
  const faqs = [
    { q: "¿Cómo uso mi QR para ingresar?", a: "Mostrá el QR desde tu cuenta en la entrada del parque. El operador lo escanea con el sistema oficial y te da acceso." },
    { q: "¿Puedo cambiar la fecha de mi visita?", a: "Las entradas son por fecha definida en el momento de la compra. Si necesitás reagendar, contactanos por WhatsApp." },
    { q: "¿Y si pierdo el código QR?", a: "Tu QR vive en tu cuenta — siempre podés volver a esta página para verlo. No se pierde." },
    { q: "¿Aceptan reintegros?", a: "Consultar políticas vigentes con nuestro equipo. Los reintegros se evalúan caso por caso." },
  ];
  return (
    <>
      <div>
        <h1 className="text-3xl font-black text-water-800">Ayuda y soporte</h1>
        <p className="mt-1 text-sm text-app-muted">Preguntas frecuentes y canales de contacto.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="https://api.whatsapp.com/send?phone=543512041301&text=Hola!%20Necesito%20ayuda%20con%20mi%20cuenta%20Infinito"
          target="_blank" rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm hover:border-emerald-300"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-water-800">WhatsApp</p>
            <p className="text-xs text-app-muted">Respuesta rápida</p>
          </div>
          <ChevronRight className="h-4 w-4 text-app-muted transition-transform group-hover:translate-x-1" />
        </a>
        <a href="mailto:hola@infinitowaterpark.com" className="group flex items-center gap-4 rounded-2xl border border-water-200 bg-gradient-to-br from-water-50 to-white p-5 shadow-sm hover:border-water-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-water-500 text-white shadow-md">
            <Mail className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-water-800">Email</p>
            <p className="truncate text-xs text-app-muted">hola@infinitowaterpark.com</p>
          </div>
          <ChevronRight className="h-4 w-4 text-app-muted transition-transform group-hover:translate-x-1" />
        </a>
      </div>

      <div className="rounded-3xl border border-app-border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-water-800">Preguntas frecuentes</h3>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="group rounded-xl border border-app-border bg-white open:border-water-300">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-bold text-water-800">
                {f.q}
                <ChevronRight className="h-4 w-4 text-app-muted transition-transform group-open:rotate-90" />
              </summary>
              <p className="px-4 pb-3 text-sm text-app-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================
function KpiCard({
  icon: Icon, tone, label, mainNode, cta,
}: {
  icon: typeof QrCode;
  tone: "water" | "violet" | "emerald" | "amber";
  label: string;
  mainNode: React.ReactNode;
  cta?: { label: string; onClick: () => void };
}) {
  const toneClasses = {
    water:   { bg: "bg-water-50",   text: "text-water-600",   border: "border-water-200/60",   ctaBg: "bg-water-50 hover:bg-water-100 text-water-700" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-200/60",  ctaBg: "bg-violet-50 hover:bg-violet-100 text-violet-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200/60", ctaBg: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200/60",   ctaBg: "bg-amber-50 hover:bg-amber-100 text-amber-700" },
  }[tone];

  return (
    <div className={`flex flex-col rounded-2xl border ${toneClasses.border} bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5`}>
      <div className="mb-2 flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${toneClasses.text}`}>{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses.bg} ${toneClasses.text}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="flex-1">{mainNode}</div>
      {cta && (
        <button
          onClick={cta.onClick}
          className={`mt-3 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${toneClasses.ctaBg}`}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

function QRCard({ qr, tipo, posicion, total, delay, onClick }: { qr: QR; tipo: string; posicion: number; total: number; delay: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[200px] flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-app-border bg-white p-4 text-left transition-all hover:-translate-y-1 hover:shadow-md hover:border-water-300 active:scale-[0.98] mc-glow-green sm:w-auto"
      style={{ animation: `mc-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both ${delay}ms` }}
    >
      <div className="flex w-full items-center justify-between">
        <span className="rounded-full bg-water-50 px-2 py-0.5 text-[10px] font-bold text-water-700">{tipo === "Mayores" ? "Adulto" : tipo === "Menores" ? "Menor" : tipo}</span>
        <span className="text-[10px] font-medium text-app-muted">{posicion} de {total}</span>
      </div>
      <div className="relative my-1 rounded-xl bg-white p-2 ring-1 ring-water-200">
        <QRCodeSVG value={qr.uuid_code} size={120} level="H" />
      </div>
      <p className="font-mono text-[11px] text-app-muted">{shortCode(qr.uuid_code)}</p>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Activo
      </span>
    </button>
  );
}

function QRCardLarge({ qr, tipo, compra, delay, onClick }: { qr: QR; tipo: string; compra: Compra | undefined; delay: number; onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(qr.uuid_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const handleWhats = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = encodeURIComponent(`🎟️ Mi entrada Infinito Water Park\n\nCódigo: ${qr.uuid_code}\n\nMostrame este código en el ingreso. 🌊`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full overflow-hidden rounded-2xl border border-app-border bg-white text-left shadow-sm mc-glow-green transition-all hover:-translate-y-1 hover:border-water-300 hover:shadow-md active:scale-[0.99]"
      style={{ animation: `mc-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both ${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-water-100 bg-gradient-to-br from-water-50 to-white px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-water-800">{tipo === "Mayores" ? "Adulto" : tipo === "Menores" ? "Menor" : tipo}</p>
          {compra?.fecha_visita && (
            <p className="text-[10px] text-app-muted">
              {new Date(compra.fecha_visita + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activo
        </span>
      </div>
      <div className="flex justify-center p-5">
        <QRCodeSVG value={qr.uuid_code} size={170} level="H" />
      </div>
      <div className="border-t border-app-border bg-water-50/30 px-4 py-3">
        <p className="text-center font-mono text-[11px] text-app-muted">{shortCode(qr.uuid_code)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span onClick={handleCopy} role="button" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-water-300 bg-white px-3 py-2 text-xs font-bold text-water-700 hover:bg-water-50 cursor-pointer">
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado!" : "Copiar"}
          </span>
          <span onClick={handleWhats} role="button" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 cursor-pointer">
            <MessageCircle className="h-3.5 w-3.5" /> Enviar
          </span>
        </div>
      </div>
    </button>
  );
}

function ResumenItem({ icon: Icon, label, value, tone }: { icon: typeof QrCode; label: string; value: number | string; tone: "water" | "violet" | "emerald" }) {
  const toneClasses = {
    water:   { bg: "bg-water-50",   text: "text-water-600" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  }[tone];
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClasses.bg} ${toneClasses.text}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-black text-water-800 leading-none">{value}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-app-muted">{label}</p>
      </div>
    </div>
  );
}

function ResumenCodeItem({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-app-muted">Código de reserva</p>
        <p className="font-mono text-base font-black text-water-800">{code}</p>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-border bg-white text-water-600 hover:bg-water-50"
        title={copied ? "Copiado!" : "Copiar"}
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

function HistorialTabla({ compras, qrsByCompra, expanded }: { compras: Compra[]; qrsByCompra?: QR[]; expanded?: boolean }) {
  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      aprobado:        "bg-emerald-100 text-emerald-700 border-emerald-200",
      pendiente:       "bg-amber-100  text-amber-700  border-amber-200",
      rechazado:       "bg-rose-100   text-rose-700   border-rose-200",
      payment_mismatch:"bg-yellow-100 text-yellow-700 border-yellow-200",
    };
    const label: Record<string, string> = {
      aprobado: "Aprobada",
      pendiente: "Pendiente",
      rechazado: "Rechazada",
      payment_mismatch: "En revisión",
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles[estado] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
        {estado === "aprobado" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        {label[estado] ?? estado}
      </span>
    );
  };

  return (
    <>
      {/* Header desktop */}
      <div className={`hidden ${expanded ? "lg:grid" : "lg:grid"} grid-cols-[1.2fr_2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-app-muted ${expanded ? "border-b" : ""}`}>
        <span>Fecha</span><span>Compra</span><span>Entradas</span><span className="text-right">Total</span><span>Estado</span><span></span>
      </div>
      <div className={`space-y-1.5 ${expanded ? "p-3" : ""}`}>
        {compras.map((c) => {
          const codigo = formatGrupoId(c.grupo_id, c.id);
          const qrsDeCompra = qrsByCompra?.filter((q) => q.compra_id === c.id) ?? [];
          return (
            <div key={c.id} className={`rounded-xl border border-app-border ${expanded ? "" : "border-transparent hover:border-app-border"} px-4 py-3 transition-colors hover:bg-water-50/40 ${expanded ? "lg:grid lg:grid-cols-[1.2fr_2fr_1fr_1fr_1fr_auto] lg:gap-3 lg:items-center" : ""}`}>
              <div className="lg:order-1">
                <p className="text-sm font-medium text-water-800">{new Date(c.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</p>
                <p className="text-[10px] text-app-muted">{new Date(c.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="mt-1.5 lg:mt-0 lg:order-2">
                <p className="font-mono text-xs font-bold text-water-700">{codigo}</p>
              </div>
              <div className="mt-1.5 lg:mt-0 lg:order-3 text-sm">
                {c.cantidad} × {c.tipo_entrada?.nombre ?? "Entrada"}
              </div>
              <div className="mt-1.5 lg:mt-0 lg:order-4 lg:text-right text-sm font-bold text-water-800">{ARS(c.total)}</div>
              <div className="mt-1.5 lg:mt-0 lg:order-5">{estadoBadge(c.estado_pago)}</div>
              {expanded && qrsDeCompra.length > 0 && (
                <div className="mt-2 lg:mt-0 lg:order-6 lg:text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-water-50 px-2 py-0.5 text-[10px] font-bold text-water-700">
                    <QrCode className="h-2.5 w-2.5" /> {qrsDeCompra.filter((q) => !q.usado).length}/{qrsDeCompra.length}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function EmptyQRBlock({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="rounded-3xl border border-app-border bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-water-50">
        <QrCode className="h-7 w-7 text-water-500" />
      </div>
      <p className="font-bold text-water-800">No tenés códigos QR activos</p>
      <p className="mt-1 text-sm text-app-muted">Conseguí tu entrada al parque más épico</p>
      <Button className="mt-4 rounded-2xl bg-gradient-to-r from-water-700 to-water-500" onClick={() => onNavigate("/comprar")}>
        Comprar entradas
      </Button>
    </div>
  );
}

// =============================================================================
// QRViewerDialog — modal premium con QR ampliado
// =============================================================================
function QRViewerDialog({
  selected, onClose, ownerName,
}: {
  selected: SelectedQR | null;
  onClose: () => void;
  ownerName: string;
}) {
  const [copied, setCopied] = useState(false);

  // Reset estado de "copiado" al abrir/cerrar
  useEffect(() => { if (!selected) setCopied(false); }, [selected]);

  if (!selected) return null;
  const { qr, tipo, compra, posicion, total } = selected;
  const isUsed = qr.usado;
  const tipoDisplay = tipo === "Mayores" ? "Adulto" : tipo === "Menores" ? "Menor" : tipo;

  const handleCopy = () => {
    navigator.clipboard.writeText(qr.uuid_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleWhats = () => {
    const msg = encodeURIComponent(
      `🎟️ Mi entrada Infinito Water Park\n\n` +
      `Tipo: ${tipoDisplay}${posicion && total ? ` (${posicion} de ${total})` : ""}\n` +
      (compra?.fecha_visita ? `Fecha: ${new Date(compra.fecha_visita + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}\n` : "") +
      `Código: ${qr.uuid_code}\n\n` +
      `Mostrame este código en el ingreso al parque. 🌊`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <Dialog open={!!selected} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="
          p-0 overflow-hidden border-0
          max-w-md w-[calc(100vw-1rem)]
          sm:max-w-md sm:w-auto
          lg:max-w-lg
          rounded-3xl
          flex flex-col
          max-h-[92dvh]
          gap-0
        "
      >
        {/* ── Header con gradient (flex-shrink-0, compacto en mobile) ──── */}
        <div className={`relative flex-shrink-0 px-5 py-3.5 text-white sm:px-6 sm:py-5 ${
          isUsed
            ? "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700"
            : "bg-gradient-to-br from-water-600 via-water-700 to-water-800"
        }`}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                Infinito Water Park
              </p>
              <h2 className="mt-0.5 text-lg font-black leading-tight sm:text-2xl">
                {tipoDisplay}{posicion && total ? ` · ${posicion} de ${total}` : ""}
              </h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-white/80">{ownerName}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {isUsed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-100 ring-1 ring-rose-300/40 backdrop-blur-md">
                  <Clock className="h-3 w-3" /> Usado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-300/40 backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-70" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  </span>
                  Activo
                </span>
              )}
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-md hover:bg-white/25"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Zona scrollable (QR + Info + Código) ──────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* QR centrado — responsive con clamp */}
        <div className="flex flex-col items-center bg-gradient-to-b from-white to-water-50/30 px-5 pt-4 pb-3 sm:px-8 sm:pt-6 sm:pb-4">
          <div className={`relative rounded-3xl bg-white p-3 ring-2 ${isUsed ? "ring-slate-200" : "ring-water-200"} shadow-md sm:p-5`}>
            {/* Esquinas decorativas tipo boarding pass */}
            <div className="pointer-events-none absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-water-50" />
            <div className="pointer-events-none absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-water-50" />

            <div
              className={`relative ${isUsed ? "opacity-50" : ""}`}
              style={{ width: "clamp(220px, 68vw, 300px)" }}
            >
              <QRCodeSVG
                value={qr.uuid_code}
                size={300}
                level="H"
                className="block h-auto w-full"
              />
              {isUsed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="-rotate-12 rounded-xl border-4 border-rose-400 bg-white/90 px-4 py-2">
                    <span className="text-2xl font-black text-rose-500">USADO</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mensaje contextual — más compacto en mobile */}
          <p className={`mt-2.5 text-center text-xs font-medium sm:mt-4 sm:text-sm ${isUsed ? "text-slate-500" : "text-water-700"}`}>
            {isUsed ? (
              <>Este código ya fue utilizado. Tu acceso ya quedó registrado.</>
            ) : (
              <><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Mostrá este código en el ingreso al parque.</>
            )}
          </p>
        </div>

        {/* ── Info y código (más compacto en mobile) ───────────────── */}
        <div className="space-y-2 border-t border-app-border bg-white px-5 py-3 sm:space-y-2.5 sm:px-8 sm:py-4">
          {compra?.fecha_visita && (
            <InfoLine
              icon={Calendar}
              label="Fecha de visita"
              value={
                <span className="capitalize">
                  {new Date(compra.fecha_visita + "T12:00:00").toLocaleDateString("es-AR", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </span>
              }
            />
          )}
          <InfoLine icon={Ticket} label="Tipo de entrada" value={tipoDisplay} />
          <InfoLine icon={User}   label="Visitante"        value={ownerName} />
          {isUsed && qr.usado_at && (
            <InfoLine
              icon={Clock}
              label="Acceso registrado"
              value={new Date(qr.usado_at).toLocaleString("es-AR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
              tone="rose"
            />
          )}

          {/* Código completo + copiar (card más baja en mobile) */}
          <div className="rounded-xl border border-app-border bg-water-50/40 px-3 py-2 sm:rounded-2xl sm:py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted">Código</p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <code className="truncate font-mono text-[10px] text-water-800 sm:text-xs">
                {qr.uuid_code}
              </code>
              <button
                onClick={handleCopy}
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-water-300 bg-white px-2 py-1 text-[10px] font-bold text-water-700 hover:bg-water-50"
              >
                <Copy className="h-3 w-3" /> {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        </div>

        </div>{/* ── /scrollable ──────────────────────────────────────── */}

        {/* ── CTAs sticky footer con safe-area ──────────────────────── */}
        <div className="flex-shrink-0 grid grid-cols-2 gap-2 border-t border-app-border bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-8 sm:pb-5">
          <Button
            variant="outline"
            className="h-11 rounded-2xl border-2 font-bold"
            onClick={onClose}
          >
            Cerrar
          </Button>
          <Button
            onClick={handleWhats}
            disabled={isUsed}
            className="h-11 rounded-2xl bg-emerald-500 font-bold text-white shadow-md hover:bg-emerald-600 disabled:opacity-50"
          >
            <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar por WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoLine({
  icon: Icon, label, value, tone = "water",
}: {
  icon: typeof QrCode;
  label: string;
  value: React.ReactNode;
  tone?: "water" | "rose";
}) {
  const iconClass = tone === "rose" ? "bg-rose-50 text-rose-600" : "bg-water-50 text-water-600";
  const textClass = tone === "rose" ? "text-rose-700" : "text-water-800";
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{label}</p>
        <p className={`text-sm font-bold ${textClass}`}>{value}</p>
      </div>
    </div>
  );
}
