import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Department } from '../types';
import { DepartmentIcon } from './DepartmentIcon';
import { SpaLink } from './SpaLink';

interface HeroOrbitVisualProps {
  departments?: Department[];
  onNavigate?: (path: string) => void;
  logoUrl?: string;
}

export const HeroOrbitVisual: React.FC<HeroOrbitVisualProps> = ({
  departments = [],
  onNavigate,
  logoUrl = '/drawing1.png'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const counterRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isHovered, setIsHovered] = useState(false);
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const [focusedDept, setFocusedDept] = useState<string | null>(null);

  const angleRef = useRef(0);
  const speedRef = useRef(10);
  const isPausedRef = useRef(false);
  isPausedRef.current = isHovered || Boolean(hoveredDept || focusedDept);

  const tiltRef = useRef({ rotateX: 0, rotateY: 0, shiftX: 0, shiftY: 0 });
  const targetTiltRef = useRef({ rotateX: 0, rotateY: 0, shiftX: 0, shiftY: 0 });

  const activeList = departments.filter(d => d.published && !d.deletedAt);
  const count = activeList.length;

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const targetSpeed = isPausedRef.current ? 0 : 10;
      speedRef.current += (targetSpeed - speedRef.current) * Math.min(1, delta * 12);

      if (Math.abs(speedRef.current) > 0.001) {
        angleRef.current = (angleRef.current + delta * speedRef.current) % 360;

        if (ringRef.current) {
          ringRef.current.style.transform = `rotate(${angleRef.current}deg)`;
        }

        for (let i = 0; i < counterRefs.current.length; i++) {
          const el = counterRefs.current[i];
          if (el) {
            el.style.transform = `rotate(${-angleRef.current}deg)`;
          }
        }
      }

      const lerp = Math.min(1, delta * 10);
      tiltRef.current.rotateX += (targetTiltRef.current.rotateX - tiltRef.current.rotateX) * lerp;
      tiltRef.current.rotateY += (targetTiltRef.current.rotateY - tiltRef.current.rotateY) * lerp;
      tiltRef.current.shiftX += (targetTiltRef.current.shiftX - tiltRef.current.shiftX) * lerp;
      tiltRef.current.shiftY += (targetTiltRef.current.shiftY - tiltRef.current.shiftY) * lerp;

      if (stageRef.current) {
        stageRef.current.style.transform = `perspective(1000px) translate3d(${tiltRef.current.shiftX}px, ${tiltRef.current.shiftY}px, 0) rotateX(${tiltRef.current.rotateX}deg) rotateY(${tiltRef.current.rotateY}deg)`;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [count]);

  const handlePointerMove = useCallback(() => {
    targetTiltRef.current = {
      rotateX: 0,
      rotateY: 0,
      shiftX: 0,
      shiftY: 0
    };
  }, []);

  const handlePointerEnter = () => {
    setIsHovered(true);
    targetTiltRef.current = { rotateX: 0, rotateY: 0, shiftX: 0, shiftY: 0 };
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setHoveredDept(null);
    targetTiltRef.current = { rotateX: 0, rotateY: 0, shiftX: 0, shiftY: 0 };
  };

  const navigate = (path: string) => {
    onNavigate?.(path);
  };

  const compactNodes = count > 10;

  return (
    <div className="w-full flex items-center justify-center overflow-visible py-4">
      <div
        ref={containerRef}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        className="relative w-[340px] h-[340px] sm:w-[410px] sm:h-[410px] lg:w-[460px] lg:h-[460px] flex items-center justify-center"
      >
        <div
          ref={stageRef}
          className="absolute inset-0 flex items-center justify-center scale-[0.84] sm:scale-95 lg:scale-100 origin-center will-change-transform"
        >
          <div className="absolute w-72 h-72 rounded-full bg-[#17A491]/15 blur-3xl pointer-events-none" />

          <div
            className="absolute w-[400px] h-[210px] rounded-[50%] border border-[#17A491]/25 pointer-events-none"
            style={{ transform: 'rotate(55deg)' }}
          />
          <div
            className="absolute w-[400px] h-[210px] rounded-[50%] border border-[#25CDB6]/25 pointer-events-none"
            style={{ transform: 'rotate(-55deg)' }}
          />

          <div className="absolute w-[420px] h-[420px] rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute w-[290px] h-[290px] rounded-full border border-dashed border-[#17A491]/15 pointer-events-none" />

          <div
            className="absolute w-[385px] h-[385px] rounded-full z-10 pointer-events-auto"
            title={isHovered ? 'Revolving paused · Move mouse away to resume' : 'Revolving atom · Hover to pause and inspect'}
          />

          <div
            ref={ringRef}
            className="absolute w-[370px] h-[370px] rounded-full border border-[#17A491]/40 pointer-events-none z-20"
            style={{ willChange: 'transform' }}
          >
            <div className="absolute inset-0 rounded-full border border-dashed border-[#25CDB6]/20" />

            {activeList.map((dept, idx) => {
              const angleDeg = (idx / Math.max(1, count)) * 360 - 90;
              const angleRad = (angleDeg * Math.PI) / 180;
              const radius = count > 12 && idx % 2 === 1 ? 152 : 185;
              const center = 185;
              const x = center + radius * Math.cos(angleRad);
              const y = center + radius * Math.sin(angleRad);

              const isItemHovered = hoveredDept === dept.id;
              const isItemFocused = focusedDept === dept.id;
              const dotBg = dept.iconBgHex || '#FFFFFF';
              const dotFg = dept.colorHex || '#06302F';

              return (
                <div
                  key={dept.id || idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30 transition-all duration-300"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`
                  }}
                >
                  <div
                    ref={el => {
                      counterRefs.current[idx] = el;
                    }}
                    style={{ willChange: 'transform' }}
                  >
                    <SpaLink
                      href={`/departments/${dept.slug}`}
                      onNavigate={navigate}
                      onClick={e => {
                        e.stopPropagation();
                      }}
                      onMouseEnter={() => setHoveredDept(dept.id)}
                      onMouseLeave={() => setHoveredDept(null)}
                      onFocus={() => setFocusedDept(dept.id)}
                      onBlur={() => setFocusedDept(null)}
                      aria-label={`View department: ${dept.name}`}
                      className={`relative ${
                        compactNodes ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8 sm:w-9 sm:h-9'
                      } rounded-full flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer border ${
                        isItemHovered
                          ? 'scale-120 ring-2 ring-[#25CDB6] shadow-[0_0_20px_rgba(37,205,182,0.8)]'
                          : 'hover:scale-110 border-white/20'
                      }`}
                      style={{
                        backgroundColor: dotBg,
                        color: dotFg
                      }}
                    >
                      <DepartmentIcon
                        glyph={dept.iconGlyph}
                        iconUrl={dept.iconUrl}
                        size={compactNodes ? 15 : 18}
                        color={dotFg}
                      />

                      {(isItemHovered || isItemFocused) && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#031D1C]/95 backdrop-blur-md border border-[#25CDB6]/50 text-white text-[11px] font-semibold px-3 py-1 rounded-lg shadow-2xl whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#25CDB6]" />
                          <span>{dept.name}</span>
                        </div>
                      )}
                    </SpaLink>
                  </div>
                </div>
              );
            })}
          </div>

          <SpaLink
            href="/departments"
            onNavigate={navigate}
            className="relative z-30 w-44 h-44 sm:w-48 sm:h-48 rounded-full p-[4px] border-2 border-[#D0A873]/70 shadow-[0_0_40px_rgba(6,48,47,0.9)] bg-[#06302F] overflow-hidden flex items-center justify-center cursor-pointer group/center hover:scale-102 transition-all duration-300 pointer-events-auto"
            aria-label="View all departments in Masters Of All"
            title="Masters of All · Central Hub"
          >
            <div className="w-full h-full rounded-full border border-[#D0A873]/50 p-1 flex items-center justify-center relative overflow-hidden bg-[#06302F]">
              <img
                src={logoUrl || '/drawing1.png'}
                alt="Masters of All"
                className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover/center:scale-105"
              />
              <div className="absolute inset-0 bg-[#17A491]/15 opacity-0 group-hover/center:opacity-100 transition-opacity rounded-full pointer-events-none" />
            </div>
          </SpaLink>
        </div>
      </div>
    </div>
  );
};
