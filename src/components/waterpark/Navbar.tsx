import { useState, useEffect } from "react";
import { Menu, X, UserCircle, LogIn, ScanLine, LayoutDashboard } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import infinitoLogo from "@/assets/infinito-logo.png";
import flamingoMenu from "@/assets/flamingo-menu.png";

const SCROLL_LINKS = [
  { label: "Inicio",      href: "#hero" },
  { label: "Atracciones", href: "#atracciones" },
  { label: "Entradas",    href: "#entradas" },
  { label: "Mapa",        href: "#mapa" },
];

const PAGE_LINKS = [
  { label: "Eventos", path: "/eventos" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isStaff, isAdmin, isAdminOrEditor } = useUserRole();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleScrollLink = (href: string) => {
    setIsOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }), 300);
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePageLink = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-400"
        style={{
          background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid hsl(var(--app-border))" : "none",
          boxShadow: scrolled ? "0 4px 24px rgba(0,119,182,0.08)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => handleScrollLink("#hero")} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 flex-shrink-0 overflow-hidden">
              <img src={infinitoLogo} alt="Infinito" className="w-full h-full object-contain" />
            </div>
            <span
              className="font-black text-sm tracking-tight leading-none"
              style={{ color: scrolled ? "hsl(var(--water-800))" : "#fff" }}
            >
              Infinito Water Park
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {SCROLL_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleScrollLink(link.href)}
                className="px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-blue-50 relative group"
                style={{ color: scrolled ? "hsl(var(--water-700))" : "rgba(255,255,255,0.85)" }}
              >
                {link.label}
              </button>
            ))}
            {PAGE_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => handlePageLink(link.path)}
                className="px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-blue-50 relative group"
                style={{ color: scrolled ? "hsl(var(--water-700))" : "rgba(255,255,255,0.85)" }}
              >
                {link.label}
              </button>
            ))}
            {!authLoading && (
              user ? (
                <>
                  {isAdminOrEditor && (
                    <button
                      onClick={() => navigate("/admin")}
                      className="ml-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-blue-50 flex items-center gap-1.5"
                      style={{ color: scrolled ? "hsl(var(--water-700))" : "rgba(255,255,255,0.85)" }}
                    >
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                  )}
                  {(isStaff || isAdmin) && (
                    <button
                      onClick={() => navigate("/staff/scanner")}
                      className="ml-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-blue-50 flex items-center gap-1.5"
                      style={{ color: scrolled ? "hsl(var(--water-700))" : "rgba(255,255,255,0.85)" }}
                    >
                      <ScanLine className="w-4 h-4" /> Escanear QR
                    </button>
                  )}
                  {/* Mi Cuenta NO visible para staff QR puro (no es cliente) */}
                  {!(isStaff && !isAdmin) && (
                    <button
                      onClick={() => navigate("/mi-cuenta")}
                      className="ml-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-blue-50 flex items-center gap-1.5"
                      style={{ color: scrolled ? "hsl(var(--water-700))" : "rgba(255,255,255,0.85)" }}
                    >
                      <UserCircle className="w-4 h-4" /> Mi Cuenta
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/cliente/login")}
                    className="ml-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-blue-50 flex items-center gap-1.5"
                    style={{ color: scrolled ? "hsl(var(--water-700))" : "rgba(255,255,255,0.85)" }}
                  >
                    <LogIn className="w-4 h-4" /> Iniciar sesión
                  </button>
                  <button
                    onClick={() => navigate("/cliente/registro")}
                    className="ml-1 px-5 py-2 rounded-xl text-sm font-black text-white transition-all hover:scale-105 hover:brightness-110"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--water-600)), hsl(var(--water-400)))",
                      boxShadow: "0 4px 14px hsl(var(--water-600) / 0.3)",
                    }}
                  >
                    Registrarse
                  </button>
                </>
              )
            )}
            <button
              onClick={() => navigate("/comprar")}
              className="ml-3 px-5 py-2 rounded-xl text-sm font-black text-white transition-all hover:scale-105 hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, hsl(var(--water-600)), hsl(var(--water-400)))",
                boxShadow: "0 4px 14px hsl(var(--water-600) / 0.3)",
              }}
            >
              Comprá entradas
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: scrolled ? "hsl(var(--water-700))" : "white", background: scrolled ? "hsl(var(--water-50))" : "rgba(255,255,255,0.15)" }}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile side drawer */}
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 md:hidden transition-all duration-300"
          style={{
            background: "rgba(2,30,80,0.4)",
            backdropFilter: "blur(4px)",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
          }}
          onClick={() => setIsOpen(false)}
        />

        {/* Drawer panel from right */}
        <div
          className="fixed top-0 right-0 bottom-0 z-50 md:hidden flex flex-col overflow-hidden"
          style={{
            width: 280,
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(24px)",
            boxShadow: "-8px 0 40px rgba(0,60,130,0.15)",
            transform: isOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          {/* Flamingo background - behind everything */}
          <div className="absolute bottom-0 -right-10 pointer-events-none z-0 flex items-end justify-end" style={{ width: 220 }}>
            <img src={flamingoMenu} alt="" className="w-full h-auto" />
          </div>
          {/* Drawer header */}
          <div
            className="flex items-center justify-between px-5 py-5"
            style={{ borderBottom: "1px solid hsl(var(--app-border))" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={infinitoLogo} alt="Infinito" className="w-full h-full object-contain" />
              </div>
              <div className="leading-none">
                <p className="font-black text-xs" style={{ color: "hsl(var(--water-800))" }}>Infinito Water Park</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "hsl(var(--water-50))", color: "hsl(var(--water-700))" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 relative z-10">
            {SCROLL_LINKS.map((link, i) => (
              <button
                key={link.href}
                onClick={() => handleScrollLink(link.href)}
                className="relative z-10 flex items-center w-full text-left px-4 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 hover:bg-blue-50"
                style={{
                  color: "hsl(var(--water-800))",
                  transform: isOpen ? "translateX(0)" : "translateX(20px)",
                  opacity: isOpen ? 1 : 0,
                  transition: `transform 0.3s ease ${0.05 + i * 0.05}s, opacity 0.3s ease ${0.05 + i * 0.05}s, background 0.2s`,
                }}
              >
                {link.label}
              </button>
            ))}
            {PAGE_LINKS.map((link, i) => (
              <button
                key={link.path}
                onClick={() => handlePageLink(link.path)}
                className="flex items-center w-full text-left px-4 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 hover:bg-blue-50"
                style={{
                  color: "hsl(var(--water-800))",
                  transform: isOpen ? "translateX(0)" : "translateX(20px)",
                  opacity: isOpen ? 1 : 0,
                  transition: `transform 0.3s ease ${0.05 + (SCROLL_LINKS.length + i) * 0.05}s, opacity 0.3s ease ${0.05 + (SCROLL_LINKS.length + i) * 0.05}s, background 0.2s`,
                }}
              >
                {link.label}
              </button>
            ))}
            {/* Auth links */}
            {!authLoading && !user && (
              <>
                <button
                  onClick={() => handlePageLink("/cliente/login")}
                  className="flex items-center gap-2 w-full text-left px-4 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 hover:bg-blue-50"
                  style={{
                    color: "hsl(var(--water-800))",
                    opacity: isOpen ? 1 : 0,
                    transition: "opacity 0.3s ease 0.3s",
                  }}
                >
                  <LogIn className="w-5 h-5" /> Iniciar sesión
                </button>
                <button
                  onClick={() => handlePageLink("/cliente/registro")}
                  className="flex items-center gap-2 w-full text-left px-4 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 hover:bg-blue-50"
                  style={{
                    color: "hsl(var(--water-600))",
                    opacity: isOpen ? 1 : 0,
                    transition: "opacity 0.3s ease 0.35s",
                  }}
                >
                  <UserCircle className="w-5 h-5" /> Registrarse
                </button>
              </>
            )}
            {!authLoading && user && (
              <>
                {isAdminOrEditor && (
                  <button
                    onClick={() => handlePageLink("/admin")}
                    className="flex items-center gap-2 w-full text-left px-4 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 hover:bg-blue-50"
                    style={{
                      color: "hsl(var(--water-600))",
                      opacity: isOpen ? 1 : 0,
                      transition: "opacity 0.3s ease 0.25s",
                    }}
                  >
                    <LayoutDashboard className="w-5 h-5" /> Dashboard
                  </button>
                )}
                {(isStaff || isAdmin) && (
                  <button
                    onClick={() => handlePageLink("/staff/scanner")}
                    className="flex items-center gap-2 w-full text-left px-4 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 hover:bg-blue-50"
                    style={{
                      color: "hsl(var(--water-600))",
                      opacity: isOpen ? 1 : 0,
                      transition: "opacity 0.3s ease 0.3s",
                    }}
                  >
                    <ScanLine className="w-5 h-5" /> Escanear QR
                  </button>
                )}
                {/* Mi Cuenta oculto para staff QR puro */}
                {!(isStaff && !isAdmin) && (
                  <button
                    onClick={() => handlePageLink("/mi-cuenta")}
                    className="flex items-center gap-2 w-full text-left px-4 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 hover:bg-blue-50"
                    style={{
                      color: "hsl(var(--water-800))",
                      opacity: isOpen ? 1 : 0,
                      transition: "opacity 0.3s ease 0.35s",
                    }}
                  >
                    <UserCircle className="w-5 h-5" /> Mi Cuenta
                  </button>
                )}
              </>
            )}
          </nav>


          {/* CTA at bottom */}
          <div className="px-4 pb-8 pt-2">
            <button
              onClick={() => { setIsOpen(false); navigate("/comprar"); }}
              className="flex items-center justify-center w-full px-6 py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(var(--water-700)), hsl(var(--water-500)))",
                boxShadow: "0 4px 20px hsl(var(--water-600) / 0.35)",
                opacity: isOpen ? 1 : 0,
                transition: "opacity 0.3s ease 0.28s",
              }}
            >
              🎟️ Comprá tus entradas
            </button>
          </div>
        </div>
      </>
    </>
  );
}
