import React, { useEffect, useState, useRef } from 'react';

interface AtmosphericBackgroundProps {
  intensity?: 'full' | 'subtle';
  fadeToColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export const AtmosphericBackground: React.FC<AtmosphericBackgroundProps> = ({
  intensity = 'full',
  fadeToColor = '#EDE9E0',
  className = '',
  children
}) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      mediaQuery.removeEventListener('change', handler);
      observer.disconnect();
    };
  }, []);

  // 16 curated mint particles drifting upward
  const particles = [
    { id: 1, left: '12%', size: 3, delay: 0, duration: 18, opacity: 0.35 },
    { id: 2, left: '28%', size: 2.5, delay: 4, duration: 22, opacity: 0.25 },
    { id: 3, left: '42%', size: 3.5, delay: 2, duration: 20, opacity: 0.3 },
    { id: 4, left: '55%', size: 2, delay: 7, duration: 25, opacity: 0.2 },
    { id: 5, left: '68%', size: 4, delay: 3, duration: 19, opacity: 0.35 },
    { id: 6, left: '82%', size: 2.5, delay: 6, duration: 24, opacity: 0.25 },
    { id: 7, left: '19%', size: 3, delay: 9, duration: 21, opacity: 0.2 },
    { id: 8, left: '34%', size: 2, delay: 1, duration: 23, opacity: 0.3 },
    { id: 9, left: '49%', size: 3.5, delay: 8, duration: 20, opacity: 0.25 },
    { id: 10, left: '63%', size: 2.5, delay: 5, duration: 26, opacity: 0.2 },
    { id: 11, left: '77%', size: 3, delay: 11, duration: 18, opacity: 0.3 },
    { id: 12, left: '90%', size: 2, delay: 3, duration: 22, opacity: 0.2 },
    { id: 13, left: '8%', size: 2.5, delay: 12, duration: 24, opacity: 0.25 },
    { id: 14, left: '23%', size: 3, delay: 7, duration: 21, opacity: 0.2 },
    { id: 15, left: '72%', size: 2, delay: 10, duration: 25, opacity: 0.25 },
    { id: 16, left: '86%', size: 3.5, delay: 2, duration: 19, opacity: 0.3 }
  ];

  return (
    <div ref={containerRef} className={`relative overflow-hidden w-full ${className}`}>
      {/* 1. Base Layer & Gradients:
          - Deep teal #06302F background
          - Vignette dark edge #041f1e
          - Soft radial glow of #17A491 at ~12% opacity behind right/center orbit area
          - Faint terracotta glow #CA7952 at ~8% in the lower left
      */}
      <div className="absolute inset-0 bg-[#06302F] pointer-events-none" />

      {/* Dark vignette on outer perimeter */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 45%, #041f1e 100%)',
          opacity: 0.85
        }}
      />

      {/* Primary Teal #17A491 Radial Glow behind the orbit (top-right / center-right) */}
      <div
        className="absolute -top-[10%] -right-[5%] w-[65vw] h-[65vw] max-w-[800px] max-h-[800px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(23,164,145,0.14) 0%, rgba(23,164,145,0.05) 50%, transparent 75%)',
          filter: 'blur(60px)'
        }}
      />

      {/* Faint Terracotta Glow in Lower Left */}
      <div
        className="absolute -bottom-[15%] -left-[10%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(202,121,82,0.09) 0%, rgba(202,121,82,0.02) 60%, transparent 80%)',
          filter: 'blur(70px)'
        }}
      />

      {/* 2. Topographic / Contour Lines Pattern drifting very slowly (6–8% opacity) */}
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden ${
          !reducedMotion && isVisible ? 'animate-drift-slow' : ''
        }`}
        style={{ opacity: intensity === 'full' ? 0.07 : 0.04 }}
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          className="w-full h-full scale-110"
          fill="none"
          stroke="#25CDB6"
          strokeWidth="1.2"
        >
          <path d="M-100,120 C250,90 400,260 720,200 C1040,140 1200,280 1600,210" />
          <path d="M-100,240 C280,210 420,380 750,320 C1080,260 1220,400 1600,330" />
          <path d="M-100,360 C300,330 460,500 780,440 C1100,380 1260,520 1600,450" />
          <path d="M-100,480 C320,450 500,620 810,560 C1120,500 1300,640 1600,570" />
          <path d="M-100,600 C340,570 540,740 840,680 C1140,620 1340,760 1600,690" />
          <path d="M-100,720 C360,690 580,860 870,800 C1160,740 1380,880 1600,810" />
          <path d="M300,-50 C450,250 250,550 500,800 C650,950 850,900 1100,950" stroke="#CA7952" strokeWidth="0.9" />
          <path d="M600,-50 C750,250 550,550 800,800 C950,950 1150,900 1400,950" stroke="#CA7952" strokeWidth="0.9" />
        </svg>
      </div>

      {/* 3. Dotted Terracotta Rotating Arcs (Slowly rotating) */}
      {intensity === 'full' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div
            className={`w-[750px] h-[750px] rounded-full border border-dotted border-[#CA7952]/20 pointer-events-none ${
              !reducedMotion && isVisible ? 'animate-spin-slow' : ''
            }`}
          />
          <div
            className={`absolute w-[950px] h-[950px] rounded-full border border-dashed border-[#17A491]/15 pointer-events-none ${
              !reducedMotion && isVisible ? 'animate-spin-reverse-slow' : ''
            }`}
          />
        </div>
      )}

      {/* 4. Upward Drifting Mint Particles (<= 16 particles, stopped off-screen or if reduced motion) */}
      {!reducedMotion && isVisible && intensity === 'full' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map(p => (
            <span
              key={p.id}
              className="absolute rounded-full bg-[#25CDB6] shadow-[0_0_6px_#25CDB6]"
              style={{
                left: p.left,
                bottom: '-20px',
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animation: `driftUp ${p.duration}s linear infinite`,
                animationDelay: `${p.delay}s`
              }}
            />
          ))}
        </div>
      )}

      {/* 5. Fine Film-Grain Overlay (4-6% opacity) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Foreground Content */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center">
        {children}
      </div>

      {/* Embedded CSS animations for drift and particles */}
      <style>{`
        @keyframes driftUp {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.35;
          }
          90% {
            opacity: 0.25;
          }
          100% {
            transform: translateY(-850px) translateX(25px);
            opacity: 0;
          }
        }
        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spinReverseSlow {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        @keyframes driftContour {
          0% {
            transform: scale(1.05) translate(0px, 0px);
          }
          50% {
            transform: scale(1.08) translate(15px, -12px);
          }
          100% {
            transform: scale(1.05) translate(0px, 0px);
          }
        }
        .animate-spin-slow {
          animation: spinSlow 65s linear infinite;
        }
        .animate-spin-reverse-slow {
          animation: spinReverseSlow 85s linear infinite;
        }
        .animate-drift-slow {
          animation: driftContour 28s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
