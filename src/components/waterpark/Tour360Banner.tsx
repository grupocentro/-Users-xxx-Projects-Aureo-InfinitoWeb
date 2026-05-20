import tour360Img from "@/assets/tour360-banner.jpg";

const Tour360Banner = () => {
  return (
    <section className="relative w-full py-10 px-4 md:px-8 bg-gradient-to-b from-water-900 to-water-800 overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-water-400/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* "Muy Pronto" badge */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-water-400 to-water-500 text-white font-bold text-[10px] md:text-xs uppercase tracking-widest px-3 py-1 rounded-full shadow-lg animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
            🚀 Muy Pronto
          </span>
        </div>

        {/* Banner image */}
        <div className="relative rounded-2xl overflow-hidden border-4 border-white/20 shadow-[0_0_40px_rgba(56,189,248,0.25)] hover:shadow-[0_0_60px_rgba(56,189,248,0.4)] transition-shadow duration-500 group">
          <img
            src={tour360Img}
            alt="Recorré el parque en Tour 360°"
            className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700"
            loading="lazy"
          />
          {/* Overlay shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        <p className="text-center text-water-200 text-sm md:text-base mt-4 font-medium tracking-wide">
          Una experiencia inmersiva para conocer el parque antes de visitarlo ✨
        </p>
      </div>
    </section>
  );
};

export default Tour360Banner;
