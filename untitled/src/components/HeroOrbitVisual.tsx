import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Department } from '../types';
import { DepartmentIcon } from './DepartmentIcon';
import { DepartmentLogo } from './DepartmentLogo';
import { SpaLink } from './SpaLink';
import { getUnitHref, splitOrgUnits } from '../utils/orgHelpers';

interface HeroOrbitVisualProps {
  departments?: Department[];
  onNavigate?: (path: string) => void;
  logoUrl?: string;
}

const INNER_REV_SECONDS = 70; // CW 70s/rev
const OUTER_REV_SECONDS = 110; // CCW 110s/rev

export const HeroOrbitVisual: React.FC<HeroOrbitVisualProps> = ({
  departments = [],
  onNavigate,
  logoUrl = '/drawing1.png'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRingRef = useRef<HTMLDivElement>(null);
  const outerRingRef = useRef<HTMLDivElement>(null);
  const innerBallRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outerBallRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [squareSize, setSquareSize] = useState(400);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const innerAngleRef = useRef(0);
  const outerAngleRef = useRef(0);
  const isPausedRef = useRef(false);
  isPausedRef.current = isHovered || Boolean(hoveredId || focusedId);

  const publishedUnits = useMemo(
    () => departments.filter(d => d.published && !d.deletedAt),
    [departments]
  );
  const { departments: innerDepts, sectors: outerSectors } = useMemo(
    () => splitOrgUnits(publishedUnits),
    [publishedUnits]
  );

  // Measure S (square visual side)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateSize = () => {
      const w = el.clientWidth;
      if (w > 0) setSquareSize(w);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Watch prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Dual ring rotation animation loop (CW 70s, CCW 110s, linear, upright counter-rotation)
  useEffect(() => {
    if (reducedMotion) {
      innerAngleRef.current = 0;
      outerAngleRef.current = 0;
      if (innerRingRef.current) innerRingRef.current.style.transform = 'rotate(0deg)';
      if (outerRingRef.current) outerRingRef.current.style.transform = 'rotate(0deg)';
      innerBallRefs.current.forEach(el => {
        if (el) el.style.transform = 'rotate(0deg)';
      });
      outerBallRefs.current.forEach(el => {
        if (el) el.style.transform = 'rotate(0deg)';
      });
      return;
    }

    let animId: number;
    let lastTime = performance.now();
    const innerSpeed = 360 / INNER_REV_SECONDS; // deg/s CW
    const outerSpeed = -360 / OUTER_REV_SECONDS; // deg/s CCW

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!isPausedRef.current) {
        innerAngleRef.current = (innerAngleRef.current + delta * innerSpeed) % 360;
        outerAngleRef.current = (outerAngleRef.current + delta * outerSpeed) % 360;

        if (innerRingRef.current) {
          innerRingRef.current.style.transform = `rotate(${innerAngleRef.current}deg)`;
        }
        if (outerRingRef.current) {
          outerRingRef.current.style.transform = `rotate(${outerAngleRef.current}deg)`;
        }

        for (let i = 0; i < innerBallRefs.current.length; i++) {
          const el = innerBallRefs.current[i];
          if (el) {
            el.style.transform = `rotate(${-innerAngleRef.current}deg)`;
          }
        }
        for (let i = 0; i < outerBallRefs.current.length; i++) {
          const el = outerBallRefs.current[i];
          if (el) {
            el.style.transform = `rotate(${-outerAngleRef.current}deg)`;
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [reducedMotion, innerDepts.length, outerSectors.length]);

  const S = squareSize;
  const emblemSize = Math.round(0.30 * S);
  const innerRingDiameter = Math.round(0.58 * S);
  const outerRingDiameter = Math.round(0.92 * S);

  // Inner ring ball sizing: 0.14 * S (min 44px; >8 depts shrinks down to 36px, zero overlap)
  const rawInnerBall = Math.max(44, Math.round(0.14 * S));
  const scaledInnerBall =
    innerDepts.length > 8
      ? Math.max(36, Math.round(rawInnerBall * (8 / innerDepts.length)))
      : rawInnerBall;
  const maxInnerChord =
    innerDepts.length > 1
      ? Math.floor(((Math.PI * innerRingDiameter) / innerDepts.length) * 0.84)
      : scaledInnerBall;
  const innerBallSize = Math.max(
    innerDepts.length > 8 ? 36 : Math.min(44, maxInnerChord),
    Math.min(scaledInnerBall, maxInnerChord)
  );

  // Outer ring ball sizing: 0.09 * S (min 32px; >20 sectors shrinks down to 24px, icon ~half min 16px)
  const rawOuterBall = Math.max(32, Math.round(0.09 * S));
  const scaledOuterBall =
    outerSectors.length > 20
      ? Math.max(24, Math.round(rawOuterBall * (20 / outerSectors.length)))
      : rawOuterBall;
  const maxOuterChord =
    outerSectors.length > 1
      ? Math.floor(((Math.PI * outerRingDiameter) / outerSectors.length) * 0.84)
      : scaledOuterBall;
  const outerBallSize = Math.max(
    outerSectors.length > 20 ? 24 : Math.min(32, maxOuterChord),
    Math.min(scaledOuterBall, maxOuterChord)
  );
  const outerIconSize = Math.max(16, Math.round(outerBallSize * 0.5));

  const navigate = (path: string) => {
    onNavigate?.(path);
  };

  return (
    <div className="w-full flex items-center justify-center overflow-visible py-4">
      <div
        ref={containerRef}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => {
          setIsHovered(false);
          setHoveredId(null);
        }}
        className="relative w-[310px] h-[310px] sm:w-[400px] sm:h-[400px] lg:w-[440px] lg:h-[440px] flex items-center justify-center select-none"
      >
        {/* Subtle ambient teal glow behind rings */}
        <div className="absolute w-3/4 h-3/4 rounded-full bg-[#17A491]/10 blur-3xl pointer-events-none" />

        {/* OUTER RING — RDD SECTORS (0.92 * S, CCW 110s) */}
        <div
          ref={outerRingRef}
          className="absolute rounded-full pointer-events-none z-10"
          style={{
            width: `${outerRingDiameter}px`,
            height: `${outerRingDiameter}px`,
            border: '1px solid rgba(23, 164, 145, 0.18)',
            willChange: reducedMotion ? 'auto' : 'transform'
          }}
        >
          {outerSectors.map((sector, idx) => {
            const count = Math.max(1, outerSectors.length);
            const angleDeg = (idx / count) * 360 - 90;
            const angleRad = (angleDeg * Math.PI) / 180;
            const leftPct = 50 + 50 * Math.cos(angleRad);
            const topPct = 50 + 50 * Math.sin(angleRad);
            const isHighlighted = hoveredId === sector.id || focusedId === sector.id;
            const dotBg = sector.iconBgHex || '#FFFFFF';
            const dotFg = sector.colorHex || '#06302F';

            return (
              <div
                key={sector.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  zIndex: isHighlighted ? 40 : 20,
                  transition: 'left 600ms ease, top 600ms ease'
                }}
              >
                <div
                  ref={el => {
                    outerBallRefs.current[idx] = el;
                  }}
                  style={{ willChange: reducedMotion ? 'auto' : 'transform' }}
                >
                  <SpaLink
                    href={getUnitHref(sector)}
                    onNavigate={navigate}
                    onMouseEnter={() => setHoveredId(sector.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setFocusedId(sector.id)}
                    onBlur={() => setFocusedId(null)}
                    aria-label={sector.name}
                    className={`relative rounded-full flex items-center justify-center transition-transform duration-200 shadow-lg cursor-pointer border ${
                      isHighlighted
                        ? 'scale-115 ring-2 ring-[#25CDB6] border-white/60 shadow-[0_0_16px_rgba(37,205,182,0.55)]'
                        : 'hover:scale-110 border-white/20'
                    }`}
                    style={{
                      width: `${outerBallSize}px`,
                      height: `${outerBallSize}px`,
                      backgroundColor: dotBg,
                      color: dotFg
                    }}
                  >
                    <DepartmentIcon
                      glyph={sector.iconGlyph}
                      iconUrl={sector.iconUrl}
                      size={outerIconSize}
                      color={dotFg}
                    />

                    {isHighlighted && (
                      <span
                        role="tooltip"
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#031D1C]/95 backdrop-blur-md border border-[#25CDB6]/50 text-[#EDE9E0] text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#25CDB6]" />
                        <span>{sector.name}</span>
                      </span>
                    )}
                  </SpaLink>
                </div>
              </div>
            );
          })}
        </div>

        {/* INNER RING — DEPARTMENTS (0.58 * S, CW 70s) */}
        <div
          ref={innerRingRef}
          className="absolute rounded-full pointer-events-none z-20"
          style={{
            width: `${innerRingDiameter}px`,
            height: `${innerRingDiameter}px`,
            border: '1px solid rgba(23, 164, 145, 0.18)',
            willChange: reducedMotion ? 'auto' : 'transform'
          }}
        >
          {innerDepts.map((dept, idx) => {
            const count = Math.max(1, innerDepts.length);
            const angleDeg = (idx / count) * 360 - 90;
            const angleRad = (angleDeg * Math.PI) / 180;
            const leftPct = 50 + 50 * Math.cos(angleRad);
            const topPct = 50 + 50 * Math.sin(angleRad);
            const isHighlighted = hoveredId === dept.id || focusedId === dept.id;

            return (
              <div
                key={dept.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  zIndex: isHighlighted ? 40 : 25,
                  transition: 'left 600ms ease, top 600ms ease'
                }}
              >
                <div
                  ref={el => {
                    innerBallRefs.current[idx] = el;
                  }}
                  style={{ willChange: reducedMotion ? 'auto' : 'transform' }}
                >
                  <SpaLink
                    href={getUnitHref(dept)}
                    onNavigate={navigate}
                    onMouseEnter={() => setHoveredId(dept.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setFocusedId(dept.id)}
                    onBlur={() => setFocusedId(null)}
                    aria-label={dept.name}
                    className={`relative rounded-full flex items-center justify-center transition-transform duration-200 shadow-xl cursor-pointer ${
                      isHighlighted
                        ? 'scale-115 ring-2 ring-[#25CDB6] shadow-[0_0_18px_rgba(37,205,182,0.55)]'
                        : 'hover:scale-110'
                    }`}
                    style={{
                      width: `${innerBallSize}px`,
                      height: `${innerBallSize}px`
                    }}
                  >
                    <DepartmentLogo
                      department={dept}
                      size={innerBallSize}
                      showBorder
                    />

                    {isHighlighted && (
                      <span
                        role="tooltip"
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#031D1C]/95 backdrop-blur-md border border-[#25CDB6]/50 text-[#EDE9E0] text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#CA7952]" />
                        <span>{dept.name}</span>
                      </span>
                    )}
                  </SpaLink>
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTRAL EMBLEM (0.30 * S) */}
        <SpaLink
          href="/departments"
          onNavigate={navigate}
          className="relative z-30 rounded-full p-[3px] border-2 border-[#D0A873]/75 shadow-[0_0_36px_rgba(6,48,47,0.9)] bg-[#06302F] overflow-hidden flex items-center justify-center cursor-pointer group/center hover:scale-105 transition-transform duration-300 pointer-events-auto"
          style={{
            width: `${emblemSize}px`,
            height: `${emblemSize}px`
          }}
          aria-label="Masters Of All — View all departments"
        >
          <div className="w-full h-full rounded-full border border-[#D0A873]/45 p-0.5 flex items-center justify-center relative overflow-hidden bg-[#06302F]">
            <img
              src={logoUrl || '/drawing1.png'}
              alt="Masters Of All"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </SpaLink>
      </div>
    </div>
  );
};
