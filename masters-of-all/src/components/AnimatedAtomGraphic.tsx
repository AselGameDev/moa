import React, { useEffect, useRef } from 'react';

interface AnimatedAtomGraphicProps {
  size?: number;
  className?: string;
}

const ORB_DEG_PER_SEC = 52; // Smooth ~6.9s revolution around the dashed orbit

export const AnimatedAtomGraphic: React.FC<AnimatedAtomGraphicProps> = ({
  size = 92,
  className = ''
}) => {
  const orbitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let angle = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTs) / 1000));
      lastTs = now;
      angle = (angle + ORB_DEG_PER_SEC * dt) % 360;
      if (orbitRef.current) {
        orbitRef.current.style.transform = `rotate(${angle}deg)`;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      className={`relative inline-block select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Concentric minimal orbital geometry: outer dashed ring + inner solid ring */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="rgba(37, 205, 182, 0.36)"
          strokeWidth="1"
          strokeDasharray="2 3.5"
        />
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="none"
          stroke="rgba(237, 233, 224, 0.18)"
          strokeWidth="1"
        />
      </svg>

      {/* Center glowing teal dot */}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[7px] h-[7px] rounded-full bg-[#25CDB6] shadow-[0_0_12px_2px_rgba(37,205,182,0.85)] pointer-events-none" />

      {/* Revolving glowing orange electron orb sitting on the r=44 outer dashed ring */}
      <div
        ref={orbitRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          transformOrigin: 'center center',
          willChange: 'transform'
        }}
      >
        <span
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#E38457] shadow-[0_0_12px_3px_rgba(227,132,87,0.75)]"
          style={{ top: '6%' }}
        />
      </div>
    </div>
  );
};
