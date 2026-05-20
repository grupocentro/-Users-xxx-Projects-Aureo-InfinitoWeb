import { ArrowLeft, Waves } from "lucide-react";
import { Link } from "react-router-dom";

interface LegalLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "linear-gradient(160deg, hsl(var(--water-800)) 0%, hsl(var(--water-900)) 100%)",
          borderColor: "hsl(var(--water-700))",
        }}
      >
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(var(--water-400))" }}
            >
              <Waves className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm">INFINITO</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-black text-foreground mb-8">{title}</h1>
        <div className="prose prose-sm max-w-none text-foreground/80 leading-relaxed [&_strong]:text-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h5]:text-base [&_h5]:font-semibold [&_h6]:text-base [&_h6]:font-semibold [&_a]:text-accent [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
          {children}
        </div>
      </main>
    </div>
  );
}
