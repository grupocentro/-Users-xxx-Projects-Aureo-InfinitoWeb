import { useState } from "react";

const WA_URL =
  "https://api.whatsapp.com/send?phone=543512041301&text=Hola!%20Quiero%20info%20sobre%20Infinito%20Water%20Park";

export default function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-5 flex items-center gap-3">
      {/* Tooltip */}
      <div
        className="hidden sm:block px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap pointer-events-none transition-all duration-300 shadow-lg"
        style={{
          background: "white",
          border: "1px solid hsl(var(--app-border))",
          color: "hsl(var(--water-800))",
          boxShadow: "0 4px 20px rgba(0,119,182,0.15)",
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateX(0) scale(1)" : "translateX(8px) scale(0.95)",
        }}
      >
        💬 ¡Consultanos!
      </div>

      {/* Button */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center justify-center rounded-full transition-transform duration-300"
        style={{
          width: 56,
          height: 56,
          background: "#25D366",
          boxShadow: "0 6px 24px rgba(37,211,102,0.45)",
          transform: hovered ? "scale(1.1)" : "scale(1)",
        }}
      >
        {/* Pulse rings */}
        <span className="absolute inset-0 rounded-full" style={{ background: "rgba(37,211,102,0.35)", animation: "wa-ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
        <span className="absolute inset-0 rounded-full" style={{ background: "rgba(37,211,102,0.2)",  animation: "wa-ping 2s cubic-bezier(0,0,0.2,1) 0.7s infinite" }} />

        {/* Icon */}
        <svg viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28, position: "relative", zIndex: 1 }}>
          <path d="M16 1.5C8.004 1.5 1.5 8.004 1.5 16c0 2.56.67 5.065 1.944 7.27L1.5 30.5l7.468-1.92A14.44 14.44 0 0016 30.5c7.996 0 14.5-6.504 14.5-14.5S23.996 1.5 16 1.5zm0 26.6a12.1 12.1 0 01-6.164-1.688l-.442-.262-4.432 1.14 1.176-4.313-.288-.457A12.1 12.1 0 013.9 16C3.9 9.325 9.325 3.9 16 3.9S28.1 9.325 28.1 16 22.675 28.1 16 28.1zm6.63-9.016c-.364-.182-2.148-1.059-2.48-1.18-.333-.12-.575-.181-.817.182-.242.364-.936 1.18-1.148 1.422-.21.242-.423.272-.787.09-.364-.181-1.536-.565-2.924-1.802-1.08-.963-1.81-2.152-2.022-2.516-.21-.364-.022-.56.16-.74.163-.163.363-.424.544-.636.181-.212.242-.364.362-.606.122-.242.061-.454-.03-.636-.091-.182-.817-1.968-1.12-2.694-.295-.707-.594-.61-.817-.622l-.697-.012c-.242 0-.635.09-.967.454s-1.27 1.24-1.27 3.024c0 1.784 1.3 3.51 1.48 3.752.182.242 2.558 3.907 6.2 5.477.867.374 1.543.598 2.07.765.87.277 1.663.238 2.288.145.698-.105 2.148-.878 2.45-1.725.303-.847.303-1.573.212-1.725-.09-.151-.333-.242-.697-.424z" />
        </svg>
      </a>
    </div>
  );
}
