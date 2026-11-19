import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Department } from '../types';
import { DepartmentLogo } from './DepartmentLogo';
import { SpaLink } from './SpaLink';
import { getSectorParentId, getUnitHref, isSector, splitOrgUnits } from '../utils/orgHelpers';

interface HeroOrbitVisualProps {
  departments?: Department[];
  onNavigate?: (path: string) => void;
  logoUrl?: string;
}

// Distinct opposite orbital speeds (degrees per second)
const INNER_DEG_PER_SEC = 16;   // CW (~22.5s per full revolution)
const OUTER_DEG_PER_SEC = -6.5; // CCW (~55.4s per full revolution, ~2.5x slower)

export const HeroOrbitVisual: React.FC<HeroOrbitVisualProps> = ({
  departments = [],
  onNavigate,
  logoUrl = '/drawing1.png'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRingRef = useRef<HTMLDivElement>(null);
  const innerRingRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const outerNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const innerNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const anglesRef = useRef({ inner: 0, outer: 0 });
  const isPausedRef = useRef(false);

  const [squareSize, setSquareSize] = useState(400);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    left: number;
    top: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const activeId = hoveredId || focusedId;
  const isPaused = isHovered || Boolean(activeId);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const publishedUnits = useMemo(
    () => departments.filter(d => d.published && !d.deletedAt),
    [departments]
  );
  const { departments: innerDepts, sectors: allPublishedSectors } = useMemo(
    () => splitOrgUnits(publishedUnits),
    [publishedUnits]
  );
  const publishedDeptIds = useMemo(
    () => new Set(innerDepts.map(d => d.id)),
    [innerDepts]
  );
  const outerSectors = useMemo(
    () =>
      allPublishedSectors.filter(sec => {
        const parentId = getSectorParentId(sec);
        return !sec.parentDepartmentId || publishedDeptIds.has(parentId);
      }),
    [allPublishedSectors, publishedDeptIds]
  );

  const activeUnitInfo = useMemo(() => {
    if (!activeId) return null;
    const sec = outerSectors.find(s => s.id === activeId);
    if (sec) {
      const parentDept = innerDepts.find(
        d => d.id === getSectorParentId(sec) && !isSector(d)
      );
      return {
        kind: 'sector' as const,
        unit: sec,
        parentDept: parentDept || null
      };
    }
    const dept = innerDepts.find(d => d.id === activeId);
    if (dept) {
      return {
        kind: 'department' as const,
        unit: dept,
        parentDept: null
      };
    }
    return null;
  }, [activeId, outerSectors, innerDepts]);

  const computeTooltipPosition = useCallback(() => {
    if (!activeId || !containerRef.current) {
      setTooltipPos(null);
      return;
    }
    const nodeEl =
      outerNodeRefs.current[activeId] || innerNodeRefs.current[activeId];
    if (!nodeEl) {
      setTooltipPos(null);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const nodeRect = nodeEl.getBoundingClientRect();
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 768;

    const tipWidth = tooltipRef.current?.offsetWidth || Math.min(236, viewportW - 24);
    const tipHeight = tooltipRef.current?.offsetHeight || 64;
    const edgeMargin = 12;

    const idealViewportCenterX = nodeRect.left + nodeRect.width / 2;
    const halfW = tipWidth / 2;
    const minCenterX = edgeMargin + halfW;
    const maxCenterX = Math.max(minCenterX, viewportW - edgeMargin - halfW);
    const clampedViewportCenterX = Math.min(maxCenterX, Math.max(minCenterX, idealViewportCenterX));

    const headerSafeTop = 76;
    const spaceAbove = nodeRect.top - headerSafeTop;
    const spaceBelow = viewportH - edgeMargin - nodeRect.bottom;
    const preferBottom = spaceAbove < tipHeight + 14 && spaceBelow > spaceAbove;

    const left = clampedViewportCenterX - containerRect.left;
    const top = preferBottom
      ? nodeRect.bottom - containerRect.top + 10
      : nodeRect.top - containerRect.top - 10;

    setTooltipPos({
      left,
      top,
      placement: preferBottom ? 'bottom' : 'top'
    });
  }, [activeId]);

  useLayoutEffect(() => {
    computeTooltipPosition();
  }, [computeTooltipPosition, activeUnitInfo]);

  useEffect(() => {
    if (!activeId) return;
    const raf = window.requestAnimationFrame(() => computeTooltipPosition());
    const onResize = () => computeTooltipPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
    };
  }, [activeId, computeTooltipPosition]);

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

  // Continuous 60fps requestAnimationFrame orbital revolution with pause-in-place
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTs) / 1000));
      lastTs = now;

      if (!isPausedRef.current) {
        anglesRef.current.inner = (anglesRef.current.inner + INNER_DEG_PER_SEC * dt) % 360;
        anglesRef.current.outer = (anglesRef.current.outer + OUTER_DEG_PER_SEC * dt) % 360;
      }

      const { inner, outer } = anglesRef.current;

      if (outerRingRef.current) {
        outerRingRef.current.style.transform = `rotate(${outer}deg)`;
      }
      const outerCounter = `rotate(${-outer}deg)`;
      for (const el of Object.values(outerNodeRefs.current)) {
        if (el) el.style.transform = outerCounter;
      }

      if (innerRingRef.current) {
        innerRingRef.current.style.transform = `rotate(${inner}deg)`;
      }
      const innerCounter = `rotate(${-inner}deg)`;
      for (const el of Object.values(innerNodeRefs.current)) {
        if (el) el.style.transform = innerCounter;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const S = squareSize;
  const emblemSize = Math.round(0.30 * S);
  const innerRingDiameter = Math.round(0.58 * S);
  const outerRingDiameter = Math.round(0.92 * S);

  // Uniform node sizing across inner departments and outer sectors (central emblem remains larger)
  const baseOuterNode = Math.max(32, Math.round(0.095 * S));
  const scaledOuterNode =
    outerSectors.length > 20
      ? Math.max(26, Math.round(baseOuterNode * (20 / outerSectors.length)))
      : baseOuterNode;
  const maxInnerChord =
    innerDepts.length > 1
      ? Math.floor(((Math.PI * innerRingDiameter) / innerDepts.length) * 0.84)
      : scaledOuterNode;
  const maxOuterChord =
    outerSectors.length > 1
      ? Math.floor(((Math.PI * outerRingDiameter) / outerSectors.length) * 0.84)
      : scaledOuterNode;

  const uniformNodeSize = Math.max(
    26,
    Math.min(scaledOuterNode, maxInnerChord, maxOuterChord)
  );
  const outerIconSize = Math.max(15, Math.round(uniformNodeSize * 0.5));

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
        className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[440px] lg:h-[440px] flex items-center justify-center select-none"
      >
        {/* Subtle ambient teal glow behind rings */}
        <div className="absolute w-3/4 h-3/4 rounded-full bg-[#17A491]/10 blur-3xl pointer-events-none" />

        {/* OUTER RING — RDD SECTORS (0.92 * S, CCW slower speed) */}
        <div
          ref={outerRingRef}
          className="absolute rounded-full pointer-events-none z-10"
          style={{
            width: `${outerRingDiameter}px`,
            height: `${outerRingDiameter}px`,
            border: '1px solid rgba(23, 164, 145, 0.22)',
            transformOrigin: 'center center',
            willChange: 'transform'
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
                    outerNodeRefs.current[sector.id] = el;
                  }}
                  style={{
                    transformOrigin: 'center center',
                    willChange: 'transform'
                  }}
                >
                  <SpaLink
                    href={getUnitHref(sector, publishedUnits)}
                    onNavigate={navigate}
                    onMouseEnter={() => setHoveredId(sector.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setFocusedId(sector.id)}
                    onBlur={() => setFocusedId(null)}
                    aria-label={sector.name}
                    className={`relative rounded-full flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer border ${
                      isHighlighted
                        ? 'scale-110 ring-2 ring-[#25CDB6] border-white/70 shadow-[0_0_20px_rgba(37,205,182,0.55)]'
                        : 'hover:scale-110 hover:ring-2 hover:ring-[#25CDB6]/70 hover:shadow-[0_0_16px_rgba(37,205,182,0.45)] border-white/20'
                    }`}
                    style={{
                      width: `${uniformNodeSize}px`,
                      height: `${uniformNodeSize}px`,
                      backgroundColor: dotBg,
                      color: dotFg
                    }}
                  >
                    <DepartmentLogo
                      department={{
                        ...sector,
                        colorHex: dotFg,
                        iconBgHex: dotBg
                      }}
                      size={uniformNodeSize}
                      fallbackMode="icon"
                      iconSize={outerIconSize}
                      showBorder={false}
                    />
                  </SpaLink>
                </div>
              </div>
            );
          })}
        </div>

        {/* INNER RING — DEPARTMENTS (0.58 * S, CW faster speed) */}
        <div
          ref={innerRingRef}
          className="absolute rounded-full pointer-events-none z-20"
          style={{
            width: `${innerRingDiameter}px`,
            height: `${innerRingDiameter}px`,
            border: '1px solid rgba(23, 164, 145, 0.22)',
            transformOrigin: 'center center',
            willChange: 'transform'
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
                    innerNodeRefs.current[dept.id] = el;
                  }}
                  style={{
                    transformOrigin: 'center center',
                    willChange: 'transform'
                  }}
                >
                  <SpaLink
                    href={getUnitHref(dept, publishedUnits)}
                    onNavigate={navigate}
                    onMouseEnter={() => setHoveredId(dept.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setFocusedId(dept.id)}
                    onBlur={() => setFocusedId(null)}
                    aria-label={dept.name}
                    className={`relative rounded-full flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer ${
                      isHighlighted
                        ? 'scale-110 ring-2 ring-[#25CDB6] shadow-[0_0_20px_rgba(37,205,182,0.55)]'
                        : 'hover:scale-110 hover:ring-2 hover:ring-[#25CDB6]/70 hover:shadow-[0_0_16px_rgba(37,205,182,0.45)]'
                    }`}
                    style={{
                      width: `${uniformNodeSize}px`,
                      height: `${uniformNodeSize}px`
                    }}
                  >
                    <DepartmentLogo
                      department={dept}
                      size={uniformNodeSize}
                      showBorder
                    />
                  </SpaLink>
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTRAL EMBLEM (0.30 * S — noticeably larger than orbiting nodes) */}
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

        {/* TOP-LEVEL VIEWPORT-CLAMPED HOVER TOOLTIP (Always above rings & central emblem) */}
        {activeUnitInfo && tooltipPos && (
          <div
            ref={tooltipRef}
            role="tooltip"
            className="absolute z-50 pointer-events-none w-max max-w-[min(240px,calc(100vw-24px))] rounded-xl bg-[#031D1C]/95 backdrop-blur-md border border-[#25CDB6]/55 px-3 py-2 shadow-2xl shadow-black/60"
            style={{
              left: `${tooltipPos.left}px`,
              top: `${tooltipPos.top}px`,
              transform:
                tooltipPos.placement === 'bottom'
                  ? 'translate(-50%, 0)'
                  : 'translate(-50%, -100%)'
            }}
          >
            <div className="flex items-start gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                  activeUnitInfo.kind === 'sector' ? 'bg-[#25CDB6]' : 'bg-[#CA7952]'
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#EDE9E0] leading-snug break-words">
                  {activeUnitInfo.unit.name}
                </div>
                {activeUnitInfo.kind === 'sector' ? (
                  <div className="text-[11px] font-medium text-[#25CDB6]/90 leading-snug mt-0.5 break-words">
                    {activeUnitInfo.parentDept
                      ? `Part of ${activeUnitInfo.parentDept.name}`
                      : 'Sector'}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#EDE9E0]/65 leading-snug mt-0.5">
                    Department
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

