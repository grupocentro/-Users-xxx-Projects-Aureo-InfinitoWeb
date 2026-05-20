import { useState, useEffect } from "react";
import { Home, Waves, Ticket, Star, Map } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const SCROLL_ITEMS = [
  { id: "hero",        label: "Inicio",      icon: Home,   href: "#hero" },
  { id: "atracciones", label: "Atracciones", icon: Waves,  href: "#atracciones" },
  { id: "entradas",    label: "Entradas",    icon: Ticket, href: "#entradas" },
  { id: "mapa",        label: "Mapa",        icon: Map,    href: "#mapa" },
];

const PAGE_ITEM = { id: "eventos", label: "Eventos", icon: Star, path: "/eventos" };

export default function BottomNav() {
  const [active, setActive] = useState("hero");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/eventos") {
      setActive("eventos");
      return;
    }
    const observers: IntersectionObserver[] = [];
    SCROLL_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActive(id); },
        { threshold: 0.35 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [location.pathname]);

  const scrollTo = (href: string, id: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }), 300);
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
    setActive(id);
  };

  const ALL_ITEMS = [...SCROLL_ITEMS.slice(0, 2), PAGE_ITEM, ...SCROLL_ITEMS.slice(2)];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid hsl(var(--app-border))",
        boxShadow: "0 -4px 24px rgba(0,119,182,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch h-[60px]">
        {ALL_ITEMS.map((item) => {
          const isActive = active === item.id;
          const isPage = 'path' in item;
          return (
            <button
              key={item.id}
              onClick={() => isPage ? (navigate((item as any).path), setActive(item.id)) : scrollTo((item as any).href, item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200"
            >
              {isActive && (
                <span
                  className="absolute top-1.5 w-1 h-1 rounded-full"
                  style={{ background: "hsl(var(--water-600))" }}
                />
              )}
              <item.icon
                className="w-[22px] h-[22px] transition-all duration-200"
                style={{
                  color: isActive ? "hsl(var(--water-600))" : "hsl(var(--app-muted))",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
              />
              <span
                className="text-[10px] font-semibold leading-none transition-colors duration-200"
                style={{ color: isActive ? "hsl(var(--water-600))" : "hsl(var(--app-muted))" }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
