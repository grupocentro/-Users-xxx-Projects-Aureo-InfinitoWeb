import { useState, useEffect, useRef } from "react";
import { Menu, X, UserCircle, LogIn, ScanLine, LayoutDashboard, ChevronDown, User, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuthModal } from "@/components/auth/AuthModal";
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isStaff, isAdmin, isAdminOrEditor } = useUserRole();
  const { openAuth } = useAuthModal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cierre del dropdown "Mi Cuenta" al click fuera + Escape.
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountMenuOpen]);

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

  const handleAccountAction = (action: "cuenta" | "perfil" | "logout") => {
    setAccountMenuOpen(false);
    if (action === "cuenta") {
      navigate("/mi-cuenta");
    } else if (action === "perfil") {
      navigate("/mi-cuenta?section=perfil");
    } else if (action === "logout") {
      void signOut().finally(() => navigate("/"));
    }
  };

  return (
    <>
      <style>{`
        @keyframes account-menu-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
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
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 relative group ${
                  scrolled
                    ? "text-water-700 hover:bg-water-50 hover:text-water-800"
                    : "text-white/90 hover:bg-white/15 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
            {PAGE_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => handlePageLink(link.path)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 relative group ${
                  scrolled
                    ? "text-water-700 hover:bg-water-50 hover:text-water-800"
                    : "text-white/90 hover:bg-white/15 hover:text-white"
                }`}
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
                      className={`ml-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                        scrolled
                          ? "text-water-700 hover:bg-water-50 hover:text-water-800"
                          : "text-white/90 hover:bg-white/15 hover:text-white"
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                  )}
                  {(isStaff || isAdmin) && (
                    <button
                      onClick={() => navigate("/staff/scanner")}
                      className={`ml-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                        scrolled
                          ? "text-water-700 hover:bg-water-50 hover:text-water-800"
                          : "text-white/90 hover:bg-white/15 hover:text-white"
                      }`}
                    >
                      <ScanLine className="w-4 h-4" /> Escanear QR
                    </button>
                  )}
                  {/* Mi Cuenta NO visible para staff QR puro (no es cliente) */}
                  {!(isStaff && !isAdmin) && (
                    <div ref={accountMenuRef} className="relative ml-2">
                      <button
                        type="button"
                        onClick={() => setAccountMenuOpen((o) => !o)}
                        aria-haspopup="menu"
                        aria-expanded={accountMenuOpen}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                          scrolled
                            ? `text-water-700 hover:bg-water-50 hover:text-water-800 ${accountMenuOpen ? "bg-water-50 text-water-800" : ""}`
                            : `text-white/90 hover:bg-white/15 hover:text-white ${accountMenuOpen ? "bg-white/15 text-white" : ""}`
                        }`}
                      >
                        <UserCircle className="w-4 h-4" />
                        Mi Cuenta
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${accountMenuOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Dropdown panel */}
                      {accountMenuOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full mt-2 w-56 origin-top-right z-[60]"
                          style={{ animation: "account-menu-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both" }}
                        >
                          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-[0_12px_40px_-8px_rgba(0,60,130,0.25)] backdrop-blur-xl">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleAccountAction("cuenta")}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-water-800 transition-colors hover:bg-water-50/80 hover:text-water-900"
                            >
                              <UserCircle className="h-4 w-4 text-water-600" />
                              Ir a mi cuenta
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleAccountAction("perfil")}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-water-800 transition-colors hover:bg-water-50/80 hover:text-water-900"
                            >
                              <User className="h-4 w-4 text-water-600" />
                              Perfil
                            </button>
                            <div className="my-0.5 mx-3 h-px bg-app-border/60" />
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleAccountAction("logout")}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50/80 hover:text-rose-700"
                            >
                              <LogOut className="h-4 w-4" />
                              Cerrar sesión
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => openAuth({ mode: "login", redirect: "/mi-cuenta" })}
                    className={`ml-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                      scrolled
                        ? "text-water-700 hover:bg-water-50 hover:text-water-800"
                        : "text-white/90 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <LogIn className="w-4 h-4" /> Iniciar sesión
                  </button>
                  <button
                    onClick={() => openAuth({ mode: "login", redirect: "/mi-cuenta" })}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                      scrolled
                        ? "text-water-700 hover:bg-water-50 hover:text-water-800"
                        : "text-white/90 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <UserCircle className="w-4 h-4" /> Mi Cuenta
                  </button>
                  <button
                    onClick={() => openAuth({ mode: "register", redirect: "/mi-cuenta" })}
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
                  onClick={() => { setIsOpen(false); openAuth({ mode: "login", redirect: "/mi-cuenta" }); }}
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
                  onClick={() => { setIsOpen(false); openAuth({ mode: "login", redirect: "/mi-cuenta" }); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-3.5 rounded-2xl font-bold text-base transition-all duration-200 hover:bg-blue-50"
                  style={{
                    color: "hsl(var(--water-800))",
                    opacity: isOpen ? 1 : 0,
                    transition: "opacity 0.3s ease 0.33s",
                  }}
                >
                  <UserCircle className="w-5 h-5" /> Mi Cuenta
                </button>
                <button
                  onClick={() => { setIsOpen(false); openAuth({ mode: "register", redirect: "/mi-cuenta" }); }}
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
