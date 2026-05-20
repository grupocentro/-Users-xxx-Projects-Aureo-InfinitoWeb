import { useEffect, useState } from "react";

interface Droplet {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  blur: number;
}

export default function WaterDroplets() {
  const [droplets, setDroplets] = useState<Droplet[]>([]);

  useEffect(() => {
    const drops: Droplet[] = Array.from({ length: 9 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 2 + Math.random() * 8,
      duration: 18 + Math.random() * 20,
      delay: Math.random() * 15,
      opacity: 0.08 + Math.random() * 0.15,
      blur: 1 + Math.random() * 2,
    }));
    setDroplets(drops);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
      {droplets.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            filter: `blur(${d.blur}px)`,
            background: `radial-gradient(circle at 30% 30%, hsl(var(--water-200) / 0.9), hsl(var(--water-500) / 0.4) 60%, transparent 100%)`,
            borderRadius: "50%",
            animation: `droplet-fall ${d.duration}s linear ${d.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes droplet-fall {
          0% {
            top: -5%;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 105%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
