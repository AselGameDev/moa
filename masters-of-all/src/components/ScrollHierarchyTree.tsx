import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Department } from '../types';
import { DepartmentIcon } from './DepartmentIcon';
import { DepartmentLogo } from './DepartmentLogo';
import { SpaLink } from './SpaLink';
import { HierarchyTreeSkeleton } from './SkeletonLoader';
import { getUnitHref, splitOrgUnits } from '../utils/orgHelpers';

interface ScrollHierarchyTreeProps {
  departments: Department[];
  onNavigate?: (path: string) => void;
  onSelectDepartment?: (slug: string) => void;
  onSelectUnit?: (unit: Department) => void;
  loading?: boolean;
  moaLogoUrl?: string;
  rddLogoUrl?: string;
  siteName?: string;
  animateReady?: boolean;
}

const MIN_DEPT_SPACING = 176;
const MAX_DEPT_SPACING = 248;
const MIN_SECTOR_SPACING = 136;
const MAX_SECTOR_SPACING = 166;
const ROW1_TO_ROW2_GAP = 120;
const ROW2_TO_ROW3_GAP = 148;

const MOA_SIZE = 100;
const RDD_SIZE = 92;
const DEPT_SIZE = 84;
const SECTOR_SIZE = 72;

export const ScrollHierarchyTree: React.FC<ScrollHierarchyTreeProps> = ({
  departments,
  onNavigate,
  onSelectDepartment,
  onSelectUnit,
  loading = false,
  moaLogoUrl = '/drawing1.png',
  rddLogoUrl = '',
  siteName = 'Masters Of All',
  animateReady = true
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1320);
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(w);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleUnits = useMemo(
    () => departments.filter(d => d.published && !d.deletedAt && d.showInTree !== false),
    [departments]
  );

  const { nonRddDepartments, rddDepartment, sectors } = useMemo(
    () => splitOrgUnits(visibleUnits),
    [visibleUnits]
  );

  // Alternate non-RDD departments outward from RDD in center:
  // 1st extra dept LEFT (-1), 2nd RIGHT (+1), 3rd further LEFT (-2), 4th further RIGHT (+2), ...
  const deptSlots = useMemo(() => {
    const left: Department[] = [];
    const right: Department[] = [];
    nonRddDepartments.forEach((dept, idx) => {
      if (idx % 2 === 0) {
        left.unshift(dept);
      } else {
        right.push(dept);
      }
    });

    if (rddDepartment) {
      const combined = [...left, rddDepartment, ...right];
      const rddIdx = left.length;
      return combined.map((unit, idx) => ({
        unit,
        offset: idx - rddIdx,
        isRdd: idx === rddIdx
      }));
    }

    const combined = [...left, ...right];
    const mid = (combined.length - 1) / 2;
    return combined.map((unit, idx) => ({
      unit,
      offset: idx - mid,
      isRdd: false
    }));
  }, [nonRddDepartments, rddDepartment]);

  const handleDepartmentLinkClick = (e: React.MouseEvent, unit: Department) => {
    e.preventDefault();
    if (onSelectUnit) {
      onSelectUnit(unit);
      return;
    }
    if (onSelectDepartment) {
      onSelectDepartment(unit.slug);
      return;
    }
    const target = document.getElementById(unit.slug);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return <HierarchyTreeSkeleton />;
  }

  // Responsive edge-to-edge geometry for desktop (>= 1024px)
  const deptLeftSpan = deptSlots.reduce((min, s) => Math.min(min, s.offset), 0);
  const deptRightSpan = deptSlots.reduce((max, s) => Math.max(max, s.offset), 0);
  const maxDeptAbsOffset = Math.max(Math.abs(deptLeftSpan), Math.abs(deptRightSpan));
  const sectorHalfSpan = sectors.length > 1 ? (sectors.length - 1) / 2 : 0;

  const usableWidth = Math.max(960, Math.min(1380, containerWidth));

  // Stretch node spacing gracefully across full container width so desktop has zero awkward side gaps
  const deptSpacing =
    maxDeptAbsOffset > 0
      ? Math.max(
          MIN_DEPT_SPACING,
          Math.min(MAX_DEPT_SPACING, Math.floor((usableWidth - 200) / (maxDeptAbsOffset * 2)))
        )
      : MIN_DEPT_SPACING;

  const sectorSpacing =
    sectorHalfSpan > 0
      ? Math.max(
          MIN_SECTOR_SPACING,
          Math.min(MAX_SECTOR_SPACING, Math.floor((usableWidth - 160) / (sectorHalfSpan * 2)))
        )
      : MIN_SECTOR_SPACING;

  const minHalfNeeded = Math.max(
    maxDeptAbsOffset * deptSpacing + 96,
    sectorHalfSpan * sectorSpacing + 80,
    220
  );
  const minRequiredWidth = Math.ceil(minHalfNeeded * 2);
  const naturalWidth = Math.max(usableWidth, minRequiredWidth);
  const centerX = naturalWidth / 2;

  const scale =
    minRequiredWidth > containerWidth
      ? Math.max(0.75, Math.min(1, containerWidth / minRequiredWidth))
      : 1;
  const scaledWidth = Math.ceil(naturalWidth * scale);

  const deptPositions = deptSlots.map((slot, spatialIdx) => ({
    ...slot,
    spatialIdx,
    x: centerX + slot.offset * deptSpacing
  }));
  const rddSlot = deptPositions.find(s => s.isRdd);
  const rddCenterX = rddSlot ? rddSlot.x : centerX;

  const sectorPositions = sectors.map((sector, spatialIdx) => {
    const offset = spatialIdx - (sectors.length - 1) / 2;
    return {
      sector,
      spatialIdx,
      x: rddCenterX + offset * sectorSpacing
    };
  });

  const row1Height = MOA_SIZE + 54;
  const row2Height = RDD_SIZE + 58;
  const row3Height = SECTOR_SIZE + 56;
  const showSectorsRow = sectors.length > 0 && Boolean(rddDepartment);

  const naturalHeight =
    row1Height +
    (deptPositions.length > 0 ? ROW1_TO_ROW2_GAP + row2Height : 0) +
    (showSectorsRow ? ROW2_TO_ROW3_GAP + row3Height : 0);

  const hoveredIsSector = Boolean(hoveredUnitId && sectors.some(s => s.id === hoveredUnitId));

  // Highlighted upstream branch renders on top
  const sortedDeptPaths = [...deptPositions].sort((a, b) => {
    const aActive = hoveredUnitId === a.unit.id || (hoveredIsSector && a.isRdd) ? 1 : 0;
    const bActive = hoveredUnitId === b.unit.id || (hoveredIsSector && b.isRdd) ? 1 : 0;
    return aActive - bActive;
  });

  const sortedSectorPaths = [...sectorPositions].sort((a, b) => {
    const aActive = hoveredUnitId === a.sector.id ? 1 : 0;
    const bActive = hoveredUnitId === b.sector.id ? 1 : 0;
    return aActive - bActive;
  });

  const mobileOrderedDepts = useMemo(() => {
    return rddDepartment ? [...nonRddDepartments, rddDepartment] : nonRddDepartments;
  }, [nonRddDepartments, rddDepartment]);

  return (
    <div ref={outerRef} className="w-full max-w-[1380px] mx-auto py-4">
      {/* DESKTOP >= 1024px: Open-Canvas Architectural Org Tree with Top-Down Choreography */}
      <div className="hidden lg:block w-full overflow-x-auto no-scrollbar">
        <div
          className="relative mx-auto px-4 py-4"
          style={{
            width: `${Math.max(scaledWidth, Math.min(containerWidth, 1380))}px`
          }}
        >
          <div
            className="mx-auto relative z-10"
            style={{
              width: `${scaledWidth}px`,
              height: `${Math.ceil(naturalHeight * scale)}px`
            }}
          >
            <div
              style={{
                width: `${naturalWidth}px`,
                height: `${naturalHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
              }}
              className="relative"
            >
              {/* Stage 1: Root Masters Of All Core */}
              <motion.div
                className="flex flex-col items-center relative"
                style={{ height: `${row1Height}px` }}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.82, y: -10 }}
                animate={
                  prefersReducedMotion || animateReady
                    ? { opacity: 1, scale: 1, y: 0 }
                    : { opacity: 0, scale: 0.82, y: -10 }
                }
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <SpaLink
                  href="/about"
                  onNavigate={path => (onNavigate ? onNavigate(path) : undefined)}
                  className="group relative flex flex-col items-center text-center focus:outline-none cursor-pointer"
                >
                  {!prefersReducedMotion && (
                    <motion.div
                      aria-hidden="true"
                      className="absolute top-0 rounded-full border border-[#25CDB6]/30 pointer-events-none"
                      style={{ width: `${MOA_SIZE}px`, height: `${MOA_SIZE}px` }}
                      animate={{ scale: [1, 1.32, 1], opacity: [0.45, 0, 0.45] }}
                      transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <div
                    className="relative z-10 rounded-full overflow-hidden shadow-2xl border-2 border-[#D0A873]/80 bg-[#06302F] p-1 shrink-0 group-hover:ring-2 group-hover:ring-[#25CDB6] transition-shadow"
                    style={{ width: `${MOA_SIZE}px`, height: `${MOA_SIZE}px` }}
                  >
                    <img
                      src={moaLogoUrl || '/drawing1.png'}
                      alt={siteName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="mt-2.5 text-[14px] font-bold tracking-tight text-[#EDE9E0] group-hover:text-[#25CDB6] text-center max-w-[180px] leading-snug transition-colors">
                    {siteName}
                  </span>
                </SpaLink>
              </motion.div>

              {/* Stage 2: Animated Connectors Row 1 -> Row 2 */}
              {deptPositions.length > 0 && (
                <div
                  className="relative w-full"
                  style={{ height: `${ROW1_TO_ROW2_GAP}px` }}
                >
                  <svg
                    width={naturalWidth}
                    height={ROW1_TO_ROW2_GAP}
                    viewBox={`0 0 ${naturalWidth} ${ROW1_TO_ROW2_GAP}`}
                    className="w-full h-full overflow-visible pointer-events-none"
                  >
                    {/* Root Junction Terminal */}
                    <circle cx={centerX} cy={2} r={3.5} fill="#CA7952" />

                    {sortedDeptPaths.map(({ unit, x, isRdd, spatialIdx }) => {
                      const isActiveBranch =
                        hoveredUnitId === unit.id || (hoveredIsSector && isRdd);
                      const isDimmed = Boolean(hoveredUnitId) && !isActiveBranch;
                      const pathD = `M ${centerX},2 C ${centerX},${ROW1_TO_ROW2_GAP * 0.56} ${x},${ROW1_TO_ROW2_GAP * 0.44} ${x},${ROW1_TO_ROW2_GAP - 2}`;

                      return (
                        <g key={`conn-moa-${unit.id}`}>
                          <motion.path
                            d={pathD}
                            fill="none"
                            stroke={isActiveBranch ? '#25CDB6' : '#CA7952'}
                            strokeWidth={isActiveBranch ? 2.75 : 1.75}
                            strokeLinecap="round"
                            initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0.2 }}
                            animate={
                              prefersReducedMotion || animateReady
                                ? {
                                    pathLength: 1,
                                    opacity: isDimmed ? 0.32 : 0.92
                                  }
                                : { pathLength: 0, opacity: 0.2 }
                            }
                            transition={{
                              pathLength: {
                                duration: 0.48,
                                delay: animateReady ? 0.26 + spatialIdx * 0.06 : 0,
                                ease: [0.16, 1, 0.3, 1]
                              },
                              opacity: { duration: 0.22 }
                            }}
                            style={{
                              filter: isActiveBranch
                                ? 'drop-shadow(0 0 8px rgba(37, 205, 182, 0.65))'
                                : 'none',
                              transition: 'stroke 180ms ease, stroke-width 180ms ease, filter 180ms ease'
                            }}
                          />
                          {isActiveBranch && !prefersReducedMotion && (
                            <motion.path
                              d={pathD}
                              fill="none"
                              stroke="#5EEAD4"
                              strokeWidth={2.75}
                              strokeLinecap="round"
                              strokeDasharray="10 14"
                              initial={{ strokeDashoffset: 48 }}
                              animate={{ strokeDashoffset: [48, 0] }}
                              transition={{ duration: 1.05, repeat: Infinity, ease: 'linear' }}
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Row 2: Primary Departments (Popping sequentially as branches arrive) */}
              {deptPositions.length > 0 && (
                <div
                  className="relative w-full"
                  style={{ height: `${row2Height}px` }}
                >
                  {deptPositions.map(({ unit, x, isRdd, spatialIdx }) => {
                    const nodeSize = isRdd ? RDD_SIZE : DEPT_SIZE;
                    const unitWithLogo =
                      isRdd && unit.customLogoUrl === undefined
                        ? { ...unit, customLogoUrl: rddLogoUrl }
                        : unit;
                    const isDirectlyHovered = hoveredUnitId === unit.id;
                    const isUpstreamHub = hoveredIsSector && isRdd;
                    const isActiveNode = isDirectlyHovered || isUpstreamHub;
                    const isNodeDimmed = Boolean(hoveredUnitId) && !isActiveNode;

                    return (
                      <div
                        key={unit.id}
                        className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${x}px`, width: `${deptSpacing - 8}px` }}
                      >
                        <motion.div
                          initial={
                            prefersReducedMotion
                              ? false
                              : { opacity: 0, scale: 0.78, y: -12 }
                          }
                          animate={
                            prefersReducedMotion || animateReady
                              ? { opacity: 1, scale: 1, y: 0 }
                              : { opacity: 0, scale: 0.78, y: -12 }
                          }
                          transition={{
                            duration: 0.38,
                            delay: animateReady ? 0.54 + spatialIdx * 0.06 : 0,
                            ease: [0.16, 1, 0.3, 1]
                          }}
                        >
                          <motion.a
                            href={`#${unit.slug}`}
                            onClick={e => handleDepartmentLinkClick(e, unit)}
                            onMouseEnter={() => setHoveredUnitId(unit.id)}
                            onMouseLeave={() => setHoveredUnitId(null)}
                            onFocus={() => setHoveredUnitId(unit.id)}
                            onBlur={() => setHoveredUnitId(null)}
                            animate={{
                              opacity: isNodeDimmed ? 0.35 : 1,
                              scale: isDirectlyHovered ? 1.06 : 1,
                              y: isDirectlyHovered ? -4 : 0
                            }}
                            transition={{
                              opacity: { duration: 0.18 },
                              scale: { type: 'spring', stiffness: 320, damping: 24 },
                              y: { type: 'spring', stiffness: 320, damping: 24 }
                            }}
                            className="group flex flex-col items-center text-center focus:outline-none cursor-pointer rounded-2xl p-1"
                          >
                            <div
                              className={`flex items-center justify-center shrink-0 rounded-full transition-shadow duration-200 ${
                                isActiveNode
                                  ? 'ring-2 ring-[#25CDB6] shadow-[0_0_22px_rgba(37,205,182,0.55)]'
                                  : isRdd
                                    ? 'ring-2 ring-[#25CDB6]/45 shadow-lg shadow-[#17A491]/20'
                                    : 'shadow-lg shadow-black/30'
                              }`}
                              style={{ width: `${nodeSize}px`, height: `${nodeSize}px` }}
                            >
                              <DepartmentLogo
                                department={unitWithLogo}
                                size={nodeSize}
                                showBorder
                              />
                            </div>
                            <span
                              className={`mt-2.5 text-[14px] font-semibold transition-colors text-center leading-snug max-w-[166px] break-words ${
                                isActiveNode ? 'text-[#25CDB6]' : 'text-[#EDE9E0] group-hover:text-[#25CDB6]'
                              }`}
                            >
                              {unit.name}
                            </span>
                          </motion.a>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stage 3: Top-to-Bottom Animated Connectors Row 2 (RDD) -> Row 3 (Sectors) */}
              {showSectorsRow && (
                <div
                  className="relative w-full"
                  style={{ height: `${ROW2_TO_ROW3_GAP}px` }}
                >
                  <svg
                    width={naturalWidth}
                    height={ROW2_TO_ROW3_GAP}
                    viewBox={`0 0 ${naturalWidth} ${ROW2_TO_ROW3_GAP}`}
                    className="w-full h-full overflow-visible pointer-events-none"
                  >
                    <circle cx={rddCenterX} cy={2} r={3.5} fill="#25CDB6" />

                    {sortedSectorPaths.map(({ sector, x, spatialIdx }) => {
                      const isActiveBranch = hoveredUnitId === sector.id;
                      const isDimmed = Boolean(hoveredUnitId) && !isActiveBranch;
                      const pathD = `M ${rddCenterX},2 C ${rddCenterX},${ROW2_TO_ROW3_GAP * 0.56} ${x},${ROW2_TO_ROW3_GAP * 0.44} ${x},${ROW2_TO_ROW3_GAP - 2}`;

                      return (
                        <g key={`conn-rdd-${sector.id}`}>
                          <motion.path
                            d={pathD}
                            fill="none"
                            stroke={isActiveBranch ? '#25CDB6' : '#CA7952'}
                            strokeWidth={isActiveBranch ? 2.75 : 1.65}
                            strokeLinecap="round"
                            initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0.2 }}
                            animate={
                              prefersReducedMotion || animateReady
                                ? {
                                    pathLength: 1,
                                    opacity: isDimmed ? 0.32 : 0.9
                                  }
                                : { pathLength: 0, opacity: 0.2 }
                            }
                            transition={{
                              pathLength: {
                                duration: 0.46,
                                delay: animateReady ? 0.84 + spatialIdx * 0.045 : 0,
                                ease: [0.16, 1, 0.3, 1]
                              },
                              opacity: { duration: 0.2 }
                            }}
                            style={{
                              filter: isActiveBranch
                                ? 'drop-shadow(0 0 8px rgba(37, 205, 182, 0.65))'
                                : 'none',
                              transition: 'stroke 180ms ease, stroke-width 180ms ease, filter 180ms ease'
                            }}
                          />
                          {isActiveBranch && !prefersReducedMotion && (
                            <motion.path
                              d={pathD}
                              fill="none"
                              stroke="#5EEAD4"
                              strokeWidth={2.75}
                              strokeLinecap="round"
                              strokeDasharray="10 14"
                              initial={{ strokeDashoffset: 48 }}
                              animate={{ strokeDashoffset: [48, 0] }}
                              transition={{ duration: 1.05, repeat: Infinity, ease: 'linear' }}
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Row 3: RDD Sectors (Sequential Top-to-Bottom Cascade Left -> Right) */}
              {showSectorsRow && (
                <div
                  className="relative w-full"
                  style={{ height: `${row3Height}px` }}
                >
                  {sectorPositions.map(({ sector, x, spatialIdx }) => {
                    const isActiveNode = hoveredUnitId === sector.id;
                    const isNodeDimmed = Boolean(hoveredUnitId) && !isActiveNode;

                    return (
                      <div
                        key={sector.id}
                        className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                        style={{ left: `${x}px`, width: `${sectorSpacing - 6}px` }}
                      >
                        <motion.div
                          initial={
                            prefersReducedMotion
                              ? false
                              : { opacity: 0, scale: 0.78, y: -12 }
                          }
                          animate={
                            prefersReducedMotion || animateReady
                              ? { opacity: 1, scale: 1, y: 0 }
                              : { opacity: 0, scale: 0.78, y: -12 }
                          }
                          transition={{
                            duration: 0.34,
                            delay: animateReady ? 1.12 + spatialIdx * 0.05 : 0,
                            ease: [0.16, 1, 0.3, 1]
                          }}
                        >
                          <motion.div
                            animate={{
                              opacity: isNodeDimmed ? 0.35 : 1,
                              scale: isActiveNode ? 1.06 : 1,
                              y: isActiveNode ? -4 : 0
                            }}
                            transition={{
                              opacity: { duration: 0.18 },
                              scale: { type: 'spring', stiffness: 320, damping: 24 },
                              y: { type: 'spring', stiffness: 320, damping: 24 }
                            }}
                          >
                            <SpaLink
                              href={getUnitHref(sector)}
                              onNavigate={path => {
                                if (onSelectUnit) onSelectUnit(sector);
                                else if (onNavigate) onNavigate(path);
                              }}
                              onMouseEnter={() => setHoveredUnitId(sector.id)}
                              onMouseLeave={() => setHoveredUnitId(null)}
                              onFocus={() => setHoveredUnitId(sector.id)}
                              onBlur={() => setHoveredUnitId(null)}
                              className="group flex flex-col items-center text-center focus:outline-none cursor-pointer rounded-2xl p-1"
                            >
                              <div
                                className={`rounded-full flex items-center justify-center shadow-lg border shrink-0 transition-shadow duration-200 ${
                                  isActiveNode
                                    ? 'ring-2 ring-[#25CDB6] border-white/60 shadow-[0_0_20px_rgba(37,205,182,0.6)]'
                                    : 'border-white/15 group-hover:ring-2 group-hover:ring-[#25CDB6]/70'
                                }`}
                                style={{
                                  width: `${SECTOR_SIZE}px`,
                                  height: `${SECTOR_SIZE}px`,
                                  backgroundColor: sector.iconBgHex || '#FFFFFF',
                                  color: sector.colorHex || '#06302F'
                                }}
                              >
                                <DepartmentIcon
                                  glyph={sector.iconGlyph}
                                  iconUrl={sector.iconUrl}
                                  size={30}
                                  color={sector.colorHex || '#06302F'}
                                />
                              </div>
                              <span
                                className={`mt-2.5 text-[14px] font-semibold transition-colors text-center leading-snug max-w-[132px] break-words ${
                                  isActiveNode ? 'text-[#25CDB6]' : 'text-[#EDE9E0]/90 group-hover:text-[#25CDB6]'
                                }`}
                              >
                                {sector.name}
                              </span>
                            </SpaLink>
                          </motion.div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE & TABLET (< 1024px): Vertical Hierarchy + 2-Column Sector Grid under RDD */}
      <div className="lg:hidden flex flex-col items-center max-w-md mx-auto px-4">
        <SpaLink
          href="/about"
          onNavigate={path => (onNavigate ? onNavigate(path) : undefined)}
          className="group flex flex-col items-center text-center focus:outline-none cursor-pointer"
        >
          <div className="w-[88px] h-[88px] rounded-full overflow-hidden shadow-xl border-2 border-[#D0A873]/70 bg-[#06302F] p-1">
            <img
              src={moaLogoUrl || '/drawing1.png'}
              alt={siteName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="mt-2 text-[14px] font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] text-center leading-snug">
            {siteName}
          </span>
        </SpaLink>

        {visibleUnits.length > 0 && (
          <div className="w-[1.5px] h-7 bg-[#CA7952] my-1.5" aria-hidden="true" />
        )}

        <div className="w-full flex flex-col items-center">
          {mobileOrderedDepts.map((dept, index) => {
            const isRdd = dept.id === rddDepartment?.id;
            const nodeSize = isRdd ? RDD_SIZE : DEPT_SIZE;
            const logoDept =
              isRdd && dept.customLogoUrl === undefined
                ? { ...dept, customLogoUrl: rddLogoUrl }
                : dept;

            return (
              <React.Fragment key={dept.id}>
                {index > 0 && (
                  <div className="w-[1.5px] h-5 bg-[#CA7952]" aria-hidden="true" />
                )}

                <motion.a
                  href={`#${dept.slug}`}
                  onClick={e => handleDepartmentLinkClick(e, dept)}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`w-full flex flex-col items-center p-3.5 rounded-2xl bg-[#031D1C]/85 border transition-colors cursor-pointer ${
                    isRdd
                      ? 'border-[#25CDB6]/35 hover:border-[#25CDB6]'
                      : 'border-[#EDE9E0]/10 hover:border-[#25CDB6]/50'
                  }`}
                >
                  <div className={isRdd ? 'rounded-full ring-2 ring-[#25CDB6]/40' : ''}>
                    <DepartmentLogo department={logoDept} size={nodeSize} showBorder />
                  </div>
                  <span className="mt-2 text-[14px] font-semibold text-[#EDE9E0] text-center leading-snug break-words">
                    {dept.name}
                  </span>
                </motion.a>

                {isRdd && sectors.length > 0 && (
                  <>
                    <div className="w-[1.5px] h-5 bg-[#CA7952]" aria-hidden="true" />
                    <div className="w-full grid grid-cols-2 gap-3">
                      {sectors.map((sector, sIdx) => (
                        <motion.div
                          key={sector.id}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.15 }}
                          transition={{ duration: 0.26, delay: sIdx * 0.035 }}
                        >
                          <SpaLink
                            href={getUnitHref(sector)}
                            onNavigate={path => {
                              if (onSelectUnit) onSelectUnit(sector);
                              else if (onNavigate) onNavigate(path);
                            }}
                            className="flex flex-col items-center text-center p-3 rounded-2xl bg-[#031D1C]/85 border border-[#EDE9E0]/10 hover:border-[#25CDB6]/50 transition-colors cursor-pointer h-full"
                          >
                            <div
                              className="w-[64px] h-[64px] rounded-full flex items-center justify-center shadow border border-white/15 shrink-0"
                              style={{
                                backgroundColor: sector.iconBgHex || '#FFFFFF',
                                color: sector.colorHex || '#06302F'
                              }}
                            >
                              <DepartmentIcon
                                glyph={sector.iconGlyph}
                                iconUrl={sector.iconUrl}
                                size={28}
                                color={sector.colorHex || '#06302F'}
                              />
                            </div>
                            <span className="mt-2 text-[13px] sm:text-[14px] font-semibold text-[#EDE9E0] leading-snug break-words">
                              {sector.name}
                            </span>
                          </SpaLink>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
