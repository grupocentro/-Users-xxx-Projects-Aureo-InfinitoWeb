import { Phone, MapPin, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import infinitoLogoWhite from "@/assets/infinito-logo-white.png";

const WA_URL =
  "https://api.whatsapp.com/send?phone=543512041301&text=Hola!%20Quiero%20info%20sobre%20Infinito%20Water%20Park";

const NAV = [
  { label: "Inicio",      href: "#hero" },
  { label: "Atracciones", href: "#atracciones" },
  { label: "Entradas",    href: "#entradas" },
  { label: "Eventos",     href: "#eventos" },
  { label: "Contacto",    href: "#contacto" },
];

export default function Footer() {
  const handleLink = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      id="contacto"
      style={{
        background: "linear-gradient(160deg, hsl(var(--water-800)) 0%, hsl(var(--water-900)) 100%)",
        borderTop: "4px solid hsl(var(--water-400))",
      }}
    >
      <div className="max-w-lg lg:max-w-6xl mx-auto px-5 lg:px-12 py-14">
        {/* Brand - Desktop: horizontal, Mobile: centered */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between items-center text-center lg:text-left mb-10">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-3 lg:gap-5">
             <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={infinitoLogoWhite} alt="Infinito" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-white leading-none">INFINITO</h2>
              <p className="text-white/40 text-xs tracking-widest mt-0.5">WATER PARK</p>
              <p className="text-white/50 text-sm mt-3 max-w-xs leading-relaxed">
                El parque acuático más emocionante de Córdoba. Toboganes, pileta de olas y eventos únicos.
              </p>
            </div>
          </div>

          {/* Socials */}
          <div className="flex gap-3 mt-5 lg:mt-0">
            {[
              { icon: Instagram, href: "https://www.instagram.com/infinitowaterparkcba", label: "Instagram" },
              { icon: Youtube,   href: "https://youtube.com",                            label: "YouTube" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 hover:scale-110"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Icon className="w-5 h-5 text-white/70" />
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: "2rem" }} />

        {/* Nav + Contact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Navegación</p>
            <ul className="flex flex-col gap-2.5">
              {NAV.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleLink(link.href)}
                    className="text-white/60 hover:text-white text-sm transition-colors font-medium text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Contacto</p>
            <div className="flex flex-col gap-3">
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--water-300))" }} />
                <span className="text-white/60 group-hover:text-white text-sm transition-colors">+54 351 204-1301</span>
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--water-300))" }} />
                <span className="text-white/60 text-sm leading-relaxed">Av. Circunvalación<br />Córdoba, Argentina</span>
              </div>
            </div>

            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
              style={{ background: "hsl(var(--water-500))", boxShadow: "0 4px 16px hsl(var(--water-500) / 0.3)" }}
            >
              💬 Escribinos
            </a>
          </div>
        </div>

        {/* Legal links */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-6">
          {[
            { label: "Aviso Legal", to: "/aviso-legal" },
            { label: "Reglamento", to: "/reglamento" },
            { label: "FAQ", to: "/preguntas-frecuentes" },
            { label: "Términos", to: "/terminos-y-condiciones" },
            { label: "Privacidad", to: "/politicas-de-privacidad" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-white/35 hover:text-white/60 text-xs transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: "1.5rem" }} />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/25">
          <p>© 2025 Infinito Water Park. Todos los derechos reservados.</p>
          <p>Córdoba, Argentina 🇦🇷</p>
        </div>
      </div>
    </footer>
  );
}
