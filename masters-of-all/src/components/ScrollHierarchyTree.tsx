import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { Department } from '../types';
import { DepartmentLogo } from './DepartmentLogo';
import { SpaLink } from './SpaLink';
import { HierarchyTreeSkeleton } from './SkeletonLoader';
import { getSectorParentId, getUnitHref, isRddDepartment, splitOrgUnits } from '../utils/orgHelpers';

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

const MOA_SIZE = 132;
const DEPT_SIZE = 112;
const SECTOR_SIZE = 88;

const ROW1_HEIGHT = MOA_SIZE + 58; // MoA circle + label
const ROW1_TO_ROW2_GAP = 96;
const ROW2_HEIGHT = DEPT_SIZE + 70; // Dept circle + label
const ROW2_TO_TIER1_GAP = 104;
const TIER_ROW_HEIGHT = SECTOR_SIZE + 60; // Sector circle + label
const TIER1_TO_TIER2_GAP = 96;

// Stage timings (seconds) — top-to-bottom cascade
const T_MOA = 0;
const T_UPPER_LINES = 0.36;
const T_DEPTS = 0.86;
const T_SUB_LINES = 1.34;
const T_SECTORS_T1 = 1.84;
const T_SECTORS_T2 = 2.16;

interface PositionedDeptNode {
  unit: Department;
  isRdd: boolean;
  x: number;
  spatialIdx: number;
  sectors: Department[];
  tier: 0 | 1 | 2;
}

interface PositionedSectorNode {
  sector: Department;
  parentUnit: Department;
  parentX: number;
  parentIsRdd: boolean;
  x: number;
  y: number;
  tier: 1 | 2;
  spatialIdx: number;
}

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
  const [availableWidth, setAvailableWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.max(760, Math.min(1680, window.innerWidth - 64));
    }
    return 1400;
  });
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);
  const [treeStarted, setTreeStarted] = useState(false);

  // Measure container width synchronously & on resize for smooth dynamic scaling
  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 0) setAvailableWidth(w);
  }, [loading]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setAvailableWidth(w);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // Trigger top-to-bottom cascade after paint once data + splash screen are ready
  useEffect(() => {
    if (loading || !animateReady) {
      setTreeStarted(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setTreeStarted(true);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loading, animateReady]);

  const visibleUnits = useMemo(
    () => departments.filter(d => d.published && !d.deletedAt && d.showInTree !== false),
    [departments]
  );

  const { departments: orderedDepts, sectors } = useMemo(
    () => splitOrgUnits(visibleUnits),
    [visibleUnits]
  );

  // Keep RDD centered whenever there is an odd number of departments;
  // only leave RDD off-center (Portal order) when there is an even number of departments.
  const displayDepts = useMemo(() => {
    const count = orderedDepts.length;
    if (count <= 1 || count % 2 === 0) return orderedDepts;
    const rddIdx = orderedDepts.findIndex(isRddDepartment);
    if (rddIdx === -1) return orderedDepts;
    const rddUnit = orderedDepts[rddIdx];
    const others = orderedDepts.filter((_, idx) => idx !== rddIdx);
    const mid = Math.floor(count / 2);
    return [...others.slice(0, mid), rddUnit, ...others.slice(mid)];
  }, [orderedDepts]);

  const sectorsByParentId = useMemo(() => {
    const map = new Map<string, Department[]>();
    const validDeptIds = new Set(displayDepts.map(d => d.id));
    for (const sector of sectors) {
      const pid = getSectorParentId(sector);
      if (!validDeptIds.has(pid)) continue;
      const list = map.get(pid) || [];
      list.push(sector);
      map.set(pid, list);
    }
    return map;
  }, [displayDepts, sectors]);

  const handleUnitClick = (e: React.MouseEvent, unit: Department) => {
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

  // Wide, balanced architectural tree solver:
  // - Centers RDD strictly below MoA when department count is odd
  // - Spreads left and right wings generously across available horizontal space
  // - Keeps large circles, bold icons, and crisp lines without tiny downscaling
  const layout = useMemo(() => {
    const count = displayDepts.length;
    const totalSectorCount = displayDepts.reduce(
      (sum, u) => sum + (sectorsByParentId.get(u.id)?.length || 0),
      0
    );

    const DESIGN_WIDTH = 1520;
    const sectorSpacing = totalSectorCount > 12 ? 142 : 154;
    const deptHalfW = 104;
    const baseDeptGap = count <= 3 ? 132 : 96;
    const tier1GroupGap = count <= 3 ? 112 : 84;

    // Estimate width if every sector fan is placed on Tier 1 side-by-side
    const estimatedAllTier1Width = displayDepts.reduce((acc, u, idx) => {
      const c = sectorsByParentId.get(u.id)?.length || 0;
      const fanW = c > 0 ? (c - 1) * sectorSpacing + 152 : deptHalfW * 2;
      return acc + Math.max(deptHalfW * 2, fanW) + (idx > 0 ? tier1GroupGap : 0);
    }, 0);

    const maxPreferredTier1Width = DESIGN_WIDTH;
    const deptsWithSectors = displayDepts.filter(u => (sectorsByParentId.get(u.id)?.length || 0) > 0);
    const shouldPushLargestToTier2 =
      estimatedAllTier1Width > maxPreferredTier1Width && deptsWithSectors.length > 1;

    let pushDeptId: string | null = null;
    if (shouldPushLargestToTier2) {
      const centerIdx = count % 2 === 1 ? Math.floor(count / 2) : -1;
      const centerDept = centerIdx >= 0 ? displayDepts[centerIdx] : null;
      const centerSectorsCount = centerDept ? (sectorsByParentId.get(centerDept.id)?.length || 0) : 0;

      if (centerDept && isRddDepartment(centerDept) && centerSectorsCount >= 3) {
        pushDeptId = centerDept.id;
      } else {
        let maxCount = 0;
        displayDepts.forEach(u => {
          const c = sectorsByParentId.get(u.id)?.length || 0;
          if (c > maxCount) {
            maxCount = c;
            pushDeptId = u.id;
          }
        });
      }
    }

    const slotMeta = displayDepts.map(unit => {
      const isRdd = isRddDepartment(unit);
      const childSectors = sectorsByParentId.get(unit.id) || [];
      let tier: 0 | 1 | 2 = 0;
      if (childSectors.length > 0) {
        tier = pushDeptId && unit.id === pushDeptId ? 2 : 1;
      }
      const fanHalfW =
        childSectors.length > 0
          ? ((childSectors.length - 1) * sectorSpacing) / 2 + 76
          : 0;
      const upperHalfExtent =
        tier === 1
          ? Math.max(deptHalfW, fanHalfW)
          : tier === 2
            ? Math.max(deptHalfW, 56)
            : deptHalfW;

      return {
        unit,
        isRdd,
        childSectors,
        tier,
        deptHalfW,
        fanHalfW,
        upperHalfExtent
      };
    });

    const rawX = new Array<number>(count).fill(0);
    const hasExactCenterRdd =
      count > 1 &&
      count % 2 === 1 &&
      isRddDepartment(displayDepts[Math.floor(count / 2)]);

    if (hasExactCenterRdd) {
      const mid = Math.floor(count / 2);
      rawX[mid] = 0;

      // Place left departments outward from center
      for (let i = mid - 1; i >= 0; i--) {
        const inner = slotMeta[i + 1];
        const curr = slotMeta[i];
        const gap = inner.tier === 1 || curr.tier === 1 ? tier1GroupGap : baseDeptGap;
        rawX[i] = rawX[i + 1] - inner.upperHalfExtent - gap - curr.upperHalfExtent;
      }

      // Place right departments outward from center
      for (let i = mid + 1; i < count; i++) {
        const inner = slotMeta[i - 1];
        const curr = slotMeta[i];
        const gap = inner.tier === 1 || curr.tier === 1 ? tier1GroupGap : baseDeptGap;
        rawX[i] = rawX[i - 1] + inner.upperHalfExtent + gap + curr.upperHalfExtent;
      }

      // Make corresponding left/right slots equidistant from center RDD so curves mirror cleanly
      for (let k = 1; k <= mid; k++) {
        const symDist = Math.max(Math.abs(rawX[mid - k]), Math.abs(rawX[mid + k]));
        rawX[mid - k] = -symDist;
        rawX[mid + k] = symDist;
      }

      // Stretch left & right wings symmetrically so MoA -> Center RDD stays vertical
      // while outer wings fill the generous wide horizontal viewport space
      let wingOuterExt = 0;
      for (let i = 0; i < count; i++) {
        const maxHalf = Math.max(slotMeta[i].deptHalfW, slotMeta[i].fanHalfW);
        wingOuterExt = Math.max(wingOuterExt, Math.abs(rawX[i]) + maxHalf);
      }

      const desiredHalfSpan = (DESIGN_WIDTH - 48) / 2;
      if (wingOuterExt < desiredHalfSpan && count >= 3) {
        const extraWing = Math.min(260, desiredHalfSpan - wingOuterExt);
        const stepsEachSide = mid;
        for (let i = 0; i < mid; i++) {
          const weight = (mid - i) / stepsEachSide;
          rawX[i] -= extraWing * weight;
        }
        for (let i = mid + 1; i < count; i++) {
          const weight = (i - mid) / stepsEachSide;
          rawX[i] += extraWing * weight;
        }
      }
    } else {
      for (let i = 1; i < count; i++) {
        const a = slotMeta[i - 1];
        const b = slotMeta[i];
        const eitherHasTier1Fan = a.tier === 1 || b.tier === 1;
        const padding = eitherHasTier1Fan ? tier1GroupGap : baseDeptGap;
        rawX[i] = rawX[i - 1] + a.upperHalfExtent + padding + b.upperHalfExtent;
      }

      // Widen gaps cleanly inside the full-screen reference frame
      if (count >= 2) {
        let minE = Infinity;
        let maxE = -Infinity;
        slotMeta.forEach((meta, i) => {
          const maxHalf = Math.max(meta.deptHalfW, meta.fanHalfW);
          minE = Math.min(minE, rawX[i] - maxHalf);
          maxE = Math.max(maxE, rawX[i] + maxHalf);
        });
        const naturalSpan = maxE - minE;
        const desiredSpan = DESIGN_WIDTH - 48;
        if (naturalSpan < desiredSpan) {
          const extraGap = Math.min(240, (desiredSpan - naturalSpan) / (count - 1));
          for (let i = 1; i < count; i++) {
            rawX[i] += extraGap * i;
          }
        }
      }
    }

    let minEdge = -120;
    let maxEdge = 120;
    if (count > 0) {
      minEdge = Infinity;
      maxEdge = -Infinity;
      slotMeta.forEach((meta, i) => {
        const x = rawX[i];
        const maxHalf = Math.max(meta.deptHalfW, meta.fanHalfW);
        minEdge = Math.min(minEdge, x - maxHalf);
        maxEdge = Math.max(maxEdge, x + maxHalf);
      });
    }

    const contentSpan = maxEdge - minEdge;
    const canvasWidth = Math.max(1080, Math.ceil(contentSpan + 48));
    // Keep MoA centered over x=0 when center RDD is anchored at 0; otherwise center bounding box
    const shiftX = hasExactCenterRdd
      ? canvasWidth / 2
      : canvasWidth / 2 - (minEdge + maxEdge) / 2;

    // If center RDD had asymmetric wings, ensure canvasWidth covers both sides around canvasWidth/2
    const finalCanvasWidth = hasExactCenterRdd
      ? Math.max(canvasWidth, Math.ceil(Math.max(-minEdge, maxEdge) * 2 + 48))
      : canvasWidth;
    const finalShiftX = hasExactCenterRdd ? finalCanvasWidth / 2 : shiftX;

    const moaY = 0;
    const row2Top = ROW1_HEIGHT + ROW1_TO_ROW2_GAP;
    const tier1Top = row2Top + ROW2_HEIGHT + ROW2_TO_TIER1_GAP;
    const hasTier1 = slotMeta.some(m => m.tier === 1);
    const hasTier2 = slotMeta.some(m => m.tier === 2);

    const tier2Top = hasTier1
      ? tier1Top + TIER_ROW_HEIGHT + TIER1_TO_TIER2_GAP
      : tier1Top;

    const canvasHeight = hasTier2
      ? tier2Top + TIER_ROW_HEIGHT + 20
      : hasTier1
        ? tier1Top + TIER_ROW_HEIGHT + 20
        : count > 0
          ? row2Top + ROW2_HEIGHT + 20
          : ROW1_HEIGHT + 20;

    const moaCenterX = finalCanvasWidth / 2;

    const deptNodes: PositionedDeptNode[] = slotMeta.map((meta, idx) => ({
      unit: meta.unit,
      isRdd: meta.isRdd,
      x: rawX[idx] + finalShiftX,
      spatialIdx: idx,
      sectors: meta.childSectors,
      tier: meta.tier
    }));

    const sectorNodes: PositionedSectorNode[] = [];
    deptNodes.forEach(dNode => {
      if (dNode.tier === 0 || dNode.sectors.length === 0) return;
      const yTop = dNode.tier === 1 ? tier1Top : tier2Top;
      const total = dNode.sectors.length;
      dNode.sectors.forEach((sec, sIdx) => {
        const offset = sIdx - (total - 1) / 2;
        sectorNodes.push({
          sector: sec,
          parentUnit: dNode.unit,
          parentX: dNode.x,
          parentIsRdd: dNode.isRdd,
          x: dNode.x + offset * sectorSpacing,
          y: yTop,
          tier: dNode.tier as 1 | 2,
          spatialIdx: sIdx
        });
      });
    });

    return {
      canvasWidth: finalCanvasWidth,
      canvasHeight,
      moaY,
      moaCenterX,
      row2Top,
      tier1Top,
      tier2Top,
      hasTier1,
      hasTier2,
      deptNodes,
      sectorNodes
    };
  }, [displayDepts, sectorsByParentId]);

  const scale =
    layout.canvasWidth > availableWidth
      ? Math.max(0.45, Math.min(1, availableWidth / layout.canvasWidth))
      : 1;

  const hoveredUnit = useMemo(
    () => visibleUnits.find(u => u.id === hoveredUnitId) || null,
    [visibleUnits, hoveredUnitId]
  );
  const hoveredParentId = hoveredUnit && hoveredUnit.kind === 'sector'
    ? getSectorParentId(hoveredUnit)
    : null;

  const isDeptHighlighted = (deptId: string) =>
    hoveredUnitId === deptId || hoveredParentId === deptId;

  const isSectorHighlighted = (sec: PositionedSectorNode) =>
    hoveredUnitId === sec.sector.id || hoveredUnitId === sec.parentUnit.id;

  const sortedDeptNodesForSvg = useMemo(
    () =>
      [...layout.deptNodes].sort((a, b) => {
        const aA = isDeptHighlighted(a.unit.id) ? 1 : 0;
        const bA = isDeptHighlighted(b.unit.id) ? 1 : 0;
        return aA - bA;
      }),
    [layout.deptNodes, hoveredUnitId, hoveredParentId]
  );

  const sortedSectorNodesForSvg = useMemo(
    () =>
      [...layout.sectorNodes].sort((a, b) => {
        const aA = isSectorHighlighted(a) ? 1 : 0;
        const bA = isSectorHighlighted(b) ? 1 : 0;
        return aA - bA;
      }),
    [layout.sectorNodes, hoveredUnitId]
  );

  if (loading) {
    return (
      <div className="w-full max-w-[1720px] mx-auto py-4">
        <HierarchyTreeSkeleton />
      </div>
    );
  }

  const moaBottomY = ROW1_HEIGHT - 4;
  const row2CenterTopY = layout.row2Top + 2;
  const row2BranchOriginY = layout.row2Top + ROW2_HEIGHT - 4;

  return (
    <div ref={outerRef} className="w-full max-w-[1720px] mx-auto px-2 sm:px-4 py-2">
      {/* DESKTOP & TABLET (>= 768px): Wide, Bold Multi-Department Hierarchy Canvas */}
      <div className="hidden md:block w-full select-none">
        <div
          className="relative w-full overflow-visible"
          style={{ height: `${Math.ceil(layout.canvasHeight * scale)}px` }}
        >
          <div
            className="absolute top-0 left-1/2"
            style={{
              width: `${layout.canvasWidth}px`,
              height: `${layout.canvasHeight}px`,
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: 'top center'
            }}
          >
            {/* FULL CANVAS SVG CONNECTOR LAYER */}
            <svg
              width={layout.canvasWidth}
              height={layout.canvasHeight}
              viewBox={`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`}
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
            >
              {/* STAGE 2: Upper Branch Lines (MoA Root -> Departments) */}
              {sortedDeptNodesForSvg.map(({ unit, x, spatialIdx }) => {
                const active = isDeptHighlighted(unit.id);
                const dimmed = Boolean(hoveredUnitId) && !active;
                const midY1 = moaBottomY + ROW1_TO_ROW2_GAP * 0.56;
                const midY2 = moaBottomY + ROW1_TO_ROW2_GAP * 0.44;
                const d = `M ${layout.moaCenterX},${moaBottomY} C ${layout.moaCenterX},${midY1} ${x},${midY2} ${x},${row2CenterTopY}`;

                return (
                  <g key={`conn-moa-${unit.id}`}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={active ? '#25CDB6' : '#CA7952'}
                      strokeWidth={active ? 3.75 : 2.75}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={
                        treeStarted
                          ? { pathLength: 1, opacity: dimmed ? 0.28 : 0.94 }
                          : { pathLength: 0, opacity: 0 }
                      }
                      transition={{
                        pathLength: {
                          duration: 0.5,
                          delay: treeStarted ? T_UPPER_LINES + spatialIdx * 0.035 : 0,
                          ease: [0.22, 1, 0.36, 1]
                        },
                        opacity: {
                          duration: 0.2,
                          delay: treeStarted ? T_UPPER_LINES + spatialIdx * 0.035 : 0
                        }
                      }}
                      style={{
                        filter: active ? 'drop-shadow(0 0 8px rgba(37, 205, 182, 0.65))' : 'none'
                      }}
                    />
                    {active && (
                      <motion.path
                        d={d}
                        fill="none"
                        stroke="#5EEAD4"
                        strokeWidth={3.75}
                        strokeLinecap="round"
                        strokeDasharray="10 14"
                        initial={{ strokeDashoffset: 48 }}
                        animate={{ strokeDashoffset: [48, 0] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </g>
                );
              })}

              {/* STAGE 4: Sub-Branch Lines (Each Department -> Its Sectors) */}
              {sortedSectorNodesForSvg.map(secNode => {
                const active = isSectorHighlighted(secNode);
                const dimmed = Boolean(hoveredUnitId) && !active;
                const y0 = row2BranchOriginY;
                const y1 = secNode.y + 2;
                let d: string;

                if (secNode.tier === 2 && layout.hasTier1) {
                  const span = y1 - y0;
                  const dx = secNode.x - secNode.parentX;
                  if (Math.abs(dx) < 1) {
                    d = `M ${secNode.parentX},${y0} L ${secNode.x},${y1}`;
                  } else {
                    const c1X = secNode.parentX;
                    const c1Y = y0 + span * 0.80;
                    const c2X = secNode.x;
                    const c2Y = y0 + span * 0.74;
                    d = `M ${secNode.parentX},${y0} C ${c1X},${c1Y} ${c2X},${c2Y} ${secNode.x},${y1}`;
                  }
                } else {
                  const span = y1 - y0;
                  const c1Y = y0 + span * 0.56;
                  const c2Y = y0 + span * 0.44;
                  d = `M ${secNode.parentX},${y0} C ${secNode.parentX},${c1Y} ${secNode.x},${c2Y} ${secNode.x},${y1}`;
                }

                const drawDuration = secNode.tier === 2 ? 0.62 : 0.5;

                return (
                  <g key={`conn-sub-${secNode.sector.id}`}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={active ? '#25CDB6' : '#CA7952'}
                      strokeWidth={active ? 3.75 : 2.5}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={
                        treeStarted
                          ? { pathLength: 1, opacity: dimmed ? 0.28 : 0.92 }
                          : { pathLength: 0, opacity: 0 }
                      }
                      transition={{
                        pathLength: {
                          duration: drawDuration,
                          delay: treeStarted ? T_SUB_LINES + secNode.spatialIdx * 0.03 : 0,
                          ease: [0.22, 1, 0.36, 1]
                        },
                        opacity: {
                          duration: 0.2,
                          delay: treeStarted ? T_SUB_LINES + secNode.spatialIdx * 0.03 : 0
                        }
                      }}
                      style={{
                        filter: active ? 'drop-shadow(0 0 8px rgba(37, 205, 182, 0.65))' : 'none'
                      }}
                    />
                    {active && (
                      <motion.path
                        d={d}
                        fill="none"
                        stroke="#5EEAD4"
                        strokeWidth={3.75}
                        strokeLinecap="round"
                        strokeDasharray="10 14"
                        initial={{ strokeDashoffset: 48 }}
                        animate={{ strokeDashoffset: [48, 0] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </g>
                );
              })}
              {/* MoA Root Stem Anchor (rendered on top of branch endpoints) */}
              {layout.deptNodes.length > 0 && (
                <motion.circle
                  cx={layout.moaCenterX}
                  cy={moaBottomY}
                  r={5.5}
                  fill={hoveredUnitId ? '#25CDB6' : '#CA7952'}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={treeStarted ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{ duration: 0.22, delay: treeStarted ? T_UPPER_LINES - 0.04 : 0 }}
                />
              )}

              {/* Parent Department Stem Anchors (consistent orange by default, cyan when active, rendered above branch endpoints) */}
              {layout.deptNodes
                .filter(d => d.tier > 0)
                .map(d => {
                  const active = isDeptHighlighted(d.unit.id);
                  const dimmed = Boolean(hoveredUnitId) && !active;
                  return (
                    <motion.circle
                      key={`origin-dot-${d.unit.id}`}
                      cx={d.x}
                      cy={row2BranchOriginY}
                      r={5}
                      fill={active ? '#25CDB6' : '#CA7952'}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={
                        treeStarted
                          ? { scale: 1, opacity: dimmed ? 0.28 : 1 }
                          : { scale: 0, opacity: 0 }
                      }
                      transition={{
                        scale: { duration: 0.22, delay: treeStarted ? T_SUB_LINES - 0.04 : 0 },
                        opacity: { duration: 0.2, delay: treeStarted ? T_SUB_LINES - 0.04 : 0 }
                      }}
                    />
                  );
                })}
            </svg>

            {/* STAGE 1: MoA Root Circle */}
            <div
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${layout.moaCenterX}px`, top: `${layout.moaY}px` }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.2, y: -16 }}
                animate={
                  treeStarted
                    ? { opacity: 1, scale: 1, y: 0 }
                    : { opacity: 0, scale: 0.2, y: -16 }
                }
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: T_MOA }}
              >
                <SpaLink
                  href="/about"
                  onNavigate={path => (onNavigate ? onNavigate(path) : undefined)}
                  className="group relative flex flex-col items-center text-center focus:outline-none cursor-pointer"
                >
                  <motion.div
                    aria-hidden="true"
                    className="absolute top-0 rounded-full border border-[#25CDB6]/35 pointer-events-none"
                    style={{ width: `${MOA_SIZE}px`, height: `${MOA_SIZE}px` }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.45, 0, 0.45] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div
                    className="relative z-10 rounded-full overflow-hidden shadow-2xl border-2 border-[#D0A873]/85 bg-[#06302F] p-1 shrink-0 group-hover:ring-2 group-hover:ring-[#25CDB6] transition-shadow"
                    style={{ width: `${MOA_SIZE}px`, height: `${MOA_SIZE}px` }}
                  >
                    <img
                      src={moaLogoUrl || '/drawing1.png'}
                      alt={siteName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <span className="mt-3 text-base font-bold tracking-tight text-[#EDE9E0] group-hover:text-[#25CDB6] text-center max-w-[220px] leading-snug transition-colors">
                    {siteName}
                  </span>
                </SpaLink>
              </motion.div>
            </div>

            {/* STAGE 3: Row 2 Departments */}
            {layout.deptNodes.map(({ unit, x, isRdd, spatialIdx }) => {
              const unitWithLogo =
                isRdd && unit.customLogoUrl === undefined
                  ? { ...unit, customLogoUrl: rddLogoUrl }
                  : unit;
              const directlyHovered = hoveredUnitId === unit.id;
              const active = isDeptHighlighted(unit.id);
              const dimmed = Boolean(hoveredUnitId) && !active;

              return (
                <div
                  key={unit.id}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${x}px`, top: `${layout.row2Top}px`, width: '204px' }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.2, y: -16 }}
                    animate={
                      treeStarted
                        ? { opacity: 1, scale: 1, y: 0 }
                        : { opacity: 0, scale: 0.2, y: -16 }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 265,
                      damping: 19,
                      delay: treeStarted ? T_DEPTS + spatialIdx * 0.045 : 0
                    }}
                  >
                    <motion.a
                      href={`#${unit.slug}`}
                      onClick={e => handleUnitClick(e, unit)}
                      onMouseEnter={() => setHoveredUnitId(unit.id)}
                      onMouseLeave={() => setHoveredUnitId(null)}
                      onFocus={() => setHoveredUnitId(unit.id)}
                      onBlur={() => setHoveredUnitId(null)}
                      animate={{
                        opacity: dimmed ? 0.35 : 1,
                        scale: directlyHovered ? 1.07 : 1,
                        y: directlyHovered ? -4 : 0
                      }}
                      transition={{
                        opacity: { duration: 0.18 },
                        scale: { type: 'spring', stiffness: 320, damping: 22 },
                        y: { type: 'spring', stiffness: 320, damping: 22 }
                      }}
                      className="group flex flex-col items-center text-center focus:outline-none cursor-pointer rounded-2xl p-1"
                    >
                      <div
                        className={`flex items-center justify-center shrink-0 rounded-full transition-shadow duration-200 ${
                          active
                            ? 'ring-2 ring-[#25CDB6] shadow-[0_0_24px_rgba(37,205,182,0.55)]'
                            : isRdd
                              ? 'ring-2 ring-[#25CDB6]/45 shadow-lg shadow-[#17A491]/20'
                              : 'shadow-lg shadow-black/30'
                        }`}
                        style={{ width: `${DEPT_SIZE}px`, height: `${DEPT_SIZE}px` }}
                      >
                        <DepartmentLogo
                          department={unitWithLogo}
                          size={DEPT_SIZE}
                          showBorder
                        />
                      </div>
                      <span
                        className={`mt-3 text-[15px] lg:text-base font-semibold transition-colors text-center leading-snug max-w-[196px] break-words ${
                          active
                            ? 'text-[#25CDB6]'
                            : 'text-[#EDE9E0] group-hover:text-[#25CDB6]'
                        }`}
                      >
                        {unit.name}
                      </span>
                    </motion.a>
                  </motion.div>
                </div>
              );
            })}

            {/* STAGE 5: All Sectors */}
            {layout.sectorNodes.map(secNode => {
              const { sector, x, y, tier, spatialIdx } = secNode;
              const directlyHovered = hoveredUnitId === sector.id;
              const active = isSectorHighlighted(secNode);
              const dimmed = Boolean(hoveredUnitId) && !active;
              const baseDelay = tier === 2 ? T_SECTORS_T2 : T_SECTORS_T1;

              return (
                <div
                  key={sector.id}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${x}px`, top: `${y}px`, width: '148px' }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.2, y: -14 }}
                    animate={
                      treeStarted
                        ? { opacity: 1, scale: 1, y: 0 }
                        : { opacity: 0, scale: 0.2, y: -14 }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 265,
                      damping: 19,
                      delay: treeStarted ? baseDelay + spatialIdx * 0.035 : 0
                    }}
                  >
                    <motion.div
                      animate={{
                        opacity: dimmed ? 0.35 : 1,
                        scale: directlyHovered ? 1.07 : 1,
                        y: directlyHovered ? -4 : 0
                      }}
                      transition={{
                        opacity: { duration: 0.18 },
                        scale: { type: 'spring', stiffness: 320, damping: 22 },
                        y: { type: 'spring', stiffness: 320, damping: 22 }
                      }}
                    >
                      <SpaLink
                        href={getUnitHref(sector, visibleUnits)}
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
                          className={`rounded-full flex items-center justify-center shadow-lg shrink-0 transition-shadow duration-200 ${
                            active
                              ? 'ring-2 ring-[#25CDB6] shadow-[0_0_20px_rgba(37,205,182,0.6)]'
                              : 'group-hover:ring-2 group-hover:ring-[#25CDB6]/70'
                          }`}
                          style={{
                            width: `${SECTOR_SIZE}px`,
                            height: `${SECTOR_SIZE}px`
                          }}
                        >
                          <DepartmentLogo
                            department={sector}
                            size={SECTOR_SIZE}
                            fallbackMode="icon"
                            iconSize={38}
                            showBorder
                          />
                        </div>
                        <span
                          className={`mt-2.5 text-[13px] lg:text-[13.5px] font-semibold transition-colors text-center leading-snug max-w-[138px] break-words ${
                            active
                              ? 'text-[#25CDB6]'
                              : 'text-[#EDE9E0]/90 group-hover:text-[#25CDB6]'
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
        </div>
      </div>

      {/* MOBILE (< 768px): Clean Hierarchical List for Organization, Departments & Sectors */}
      <div className="md:hidden max-w-lg mx-auto px-3 sm:px-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={treeStarted ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: T_MOA }}
        >
          <SpaLink
            href="/about"
            onNavigate={path => (onNavigate ? onNavigate(path) : undefined)}
            className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#031D1C]/90 border border-[#D0A873]/40 hover:border-[#25CDB6]/60 transition-colors shadow-lg cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#D0A873]/70 bg-[#06302F] p-0.5 shrink-0">
                <img
                  src={moaLogoUrl || '/drawing1.png'}
                  alt={siteName}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] block truncate transition-colors">
                  {siteName}
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#D0A873]/80 block">
                  Organization Overview
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#EDE9E0]/50 group-hover:text-[#25CDB6] shrink-0 transition-colors" />
          </SpaLink>
        </motion.div>

        <ul className="space-y-2.5" aria-label="Departments and sectors list">
          {orderedDepts.map((dept, index) => {
            const isRdd = isRddDepartment(dept);
            const logoDept =
              isRdd && dept.customLogoUrl === undefined
                ? { ...dept, customLogoUrl: rddLogoUrl }
                : dept;
            const deptSectors = sectorsByParentId.get(dept.id) || [];

            return (
              <motion.li
                key={dept.id}
                initial={{ opacity: 0, y: 10 }}
                animate={treeStarted ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{
                  duration: 0.35,
                  ease: [0.16, 1, 0.3, 1],
                  delay: treeStarted ? 0.15 + index * 0.05 : 0
                }}
                className="space-y-1.5"
              >
                <a
                  href={`#${dept.slug}`}
                  onClick={e => handleUnitClick(e, dept)}
                  className={`group flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl bg-[#031D1C]/85 border transition-colors cursor-pointer min-h-[56px] ${
                    isRdd
                      ? 'border-[#25CDB6]/35 hover:border-[#25CDB6]'
                      : 'border-[#EDE9E0]/10 hover:border-[#25CDB6]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`shrink-0 ${isRdd ? 'rounded-full ring-2 ring-[#25CDB6]/40' : ''}`}>
                      <DepartmentLogo department={logoDept} size={42} showBorder />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-[#EDE9E0] group-hover:text-[#25CDB6] block leading-snug break-words transition-colors">
                        {dept.name}
                      </span>
                      <span className="text-[11px] text-[#EDE9E0]/55 block mt-0.5">
                        {deptSectors.length > 0
                          ? `Department · ${deptSectors.length} ${deptSectors.length === 1 ? 'sector' : 'sectors'}`
                          : 'Department'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#EDE9E0]/45 group-hover:text-[#25CDB6] shrink-0 transition-colors" />
                </a>

                {deptSectors.length > 0 && (
                  <ul
                    className="ml-5 pl-3 border-l-2 border-[#25CDB6]/25 space-y-1.5"
                    aria-label={`${dept.name} sectors`}
                  >
                    {deptSectors.map(sector => (
                      <li key={sector.id}>
                        <SpaLink
                          href={getUnitHref(sector, visibleUnits)}
                          onNavigate={path => {
                            if (onSelectUnit) onSelectUnit(sector);
                            else if (onNavigate) onNavigate(path);
                          }}
                          className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#031D1C]/70 border border-[#EDE9E0]/10 hover:border-[#25CDB6]/45 transition-colors cursor-pointer min-h-[48px]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <DepartmentLogo
                              department={sector}
                              size={34}
                              fallbackMode="icon"
                              iconSize={16}
                              showBorder
                            />
                            <div className="min-w-0">
                              <span className="text-[13px] font-medium text-[#EDE9E0]/95 group-hover:text-[#25CDB6] block leading-snug break-words transition-colors">
                                {sector.name}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/40 group-hover:text-[#25CDB6] shrink-0 transition-colors" />
                        </SpaLink>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
