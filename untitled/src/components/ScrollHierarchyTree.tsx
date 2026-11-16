import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Department } from '../types';
import { DepartmentIcon } from './DepartmentIcon';
import { DepartmentLogo } from './DepartmentLogo';
import { SpaLink } from './SpaLink';
import { HierarchyTreeSkeleton } from './SkeletonLoader';
import { getUnitHref, splitOrgUnits } from '../utils/orgHelpers';

interface ScrollHierarchyTreeProps {
  departments: Department[];
  onSelectDepartment?: (slug: string) => void;
  onSelectUnit?: (unit: Department) => void;
  loading?: boolean;
  moaLogoUrl?: string;
  rddLogoUrl?: string;
  siteName?: string;
}

const MIN_CENTER_DISTANCE = 168;
const ROW1_TO_ROW2_GAP = 120;
const ROW2_TO_ROW3_GAP = 140;
const MOA_SIZE = 72;
const DEPT_SIZE = 64;
const RDD_SIZE = 72;
const SECTOR_SIZE = 52;

export const ScrollHierarchyTree: React.FC<ScrollHierarchyTreeProps> = ({
  departments,
  onSelectDepartment,
  onSelectUnit,
  loading = false,
  moaLogoUrl = '/drawing1.png',
  rddLogoUrl = '/5320.jpg',
  siteName = 'Masters Of All'
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

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
  // 1st left, 2nd right, 3rd further left, 4th further right...
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

  const handleUnitClick = (unit: Department) => {
    if (onSelectUnit) {
      onSelectUnit(unit);
      return;
    }
    if (onSelectDepartment) {
      onSelectDepartment(unit.slug);
    }
  };

  if (loading) {
    return <HierarchyTreeSkeleton />;
  }

  // Geometry calculation for desktop (>= 1024px)
  const deptLeftSpan = deptSlots.reduce((min, s) => Math.min(min, s.offset), 0);
  const deptRightSpan = deptSlots.reduce((max, s) => Math.max(max, s.offset), 0);
  const maxDeptAbsOffset = Math.max(Math.abs(deptLeftSpan), Math.abs(deptRightSpan));
  const sectorHalfSpan = sectors.length > 1 ? (sectors.length - 1) / 2 : 0;

  const sidePadding = 96;
  const maxHalfExtent = Math.max(maxDeptAbsOffset, sectorHalfSpan) * MIN_CENTER_DISTANCE + sidePadding;
  const naturalWidth = Math.max(880, Math.round(maxHalfExtent * 2));
  const centerX = naturalWidth / 2;

  const scale = Math.max(0.75, Math.min(1, containerWidth / naturalWidth));
  const scaledWidth = naturalWidth * scale;

  // Compute node X centers
  const deptPositions = deptSlots.map(slot => ({
    ...slot,
    x: centerX + slot.offset * MIN_CENTER_DISTANCE
  }));
  const rddSlot = deptPositions.find(s => s.isRdd);
  const rddCenterX = rddSlot ? rddSlot.x : centerX;

  const sectorPositions = sectors.map((sector, idx) => {
    const offset = idx - (sectors.length - 1) / 2;
    return {
      sector,
      x: rddCenterX + offset * MIN_CENTER_DISTANCE
    };
  });

  // Node box heights for vertical positioning (icon + 13px 2-line name)
  const row1Height = MOA_SIZE + 38;
  const row2Height = RDD_SIZE + 46;
  const row3Height = SECTOR_SIZE + 46;
  const showSectorsRow = sectors.length > 0 && Boolean(rddDepartment);

  const naturalHeight =
    row1Height +
    (deptPositions.length > 0 ? ROW1_TO_ROW2_GAP + row2Height : 0) +
    (showSectorsRow ? ROW2_TO_ROW3_GAP + row3Height : 0);

  return (
    <div ref={outerRef} className="w-full max-w-[1200px] mx-auto py-4">
      {/* DESKTOP >= 1024px: Horizontal Organizational Hierarchy Tree */}
      <div className="hidden lg:block w-full overflow-x-auto no-scrollbar">
        <div
          className="mx-auto relative"
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
            {/* Row 1: Masters Of All (72px) */}
            <div
              className="flex flex-col items-center"
              style={{ height: `${row1Height}px` }}
            >
              <div
                className="rounded-full overflow-hidden shadow-2xl border-2 border-[#D0A873]/65 bg-[#06302F] p-1 shrink-0"
                style={{ width: `${MOA_SIZE}px`, height: `${MOA_SIZE}px` }}
              >
                <img
                  src={moaLogoUrl || '/drawing1.png'}
                  alt={siteName}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="mt-2.5 text-[13px] font-bold tracking-tight text-[#EDE9E0] text-center line-clamp-2 max-w-[152px] leading-snug">
                {siteName}
              </span>
            </div>

            {/* Connectors: Row 1 -> Row 2 (120px vertical spacing, 1.5px copper SVG cubic curves) */}
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
                  {deptPositions.map(({ unit, x }) => (
                    <path
                      key={`conn-moa-${unit.id}`}
                      d={`M ${centerX},0 C ${centerX},${ROW1_TO_ROW2_GAP * 0.55} ${x},${ROW1_TO_ROW2_GAP * 0.45} ${x},${ROW1_TO_ROW2_GAP}`}
                      fill="none"
                      stroke="#CA7952"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
              </div>
            )}

            {/* Row 2: All Departments (RDD 72px centered, others 64px alternating outward) */}
            {deptPositions.length > 0 && (
              <div
                className="relative w-full"
                style={{ height: `${row2Height}px` }}
              >
                {deptPositions.map(({ unit, x, isRdd }) => {
                  const nodeSize = isRdd ? RDD_SIZE : DEPT_SIZE;
                  const unitWithLogo =
                    isRdd && !unit.customLogoUrl
                      ? { ...unit, customLogoUrl: rddLogoUrl || '/5320.jpg' }
                      : unit;

                  return (
                    <div
                      key={unit.id}
                      className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${x}px`, width: '154px' }}
                    >
                      <button
                        type="button"
                        onClick={() => handleUnitClick(unit)}
                        className="group flex flex-col items-center text-center focus:outline-none cursor-pointer rounded-2xl p-1 transition-transform hover:-translate-y-0.5"
                      >
                        <div
                          className={`flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                            isRdd ? 'ring-2 ring-[#25CDB6]/50 rounded-full' : ''
                          }`}
                          style={{ width: `${nodeSize}px`, height: `${nodeSize}px` }}
                        >
                          <DepartmentLogo
                            department={unitWithLogo}
                            size={nodeSize}
                            showBorder
                          />
                        </div>
                        <span className="mt-2.5 text-[13px] font-semibold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors text-center line-clamp-2 leading-snug max-w-[148px]">
                          {unit.name}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Connectors: Row 2 (RDD) -> Row 3 (140px vertical spacing, 1.5px copper SVG cubic curves) */}
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
                  {sectorPositions.map(({ sector, x }) => (
                    <path
                      key={`conn-rdd-${sector.id}`}
                      d={`M ${rddCenterX},0 C ${rddCenterX},${ROW2_TO_ROW3_GAP * 0.55} ${x},${ROW2_TO_ROW3_GAP * 0.45} ${x},${ROW2_TO_ROW3_GAP}`}
                      fill="none"
                      stroke="#CA7952"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
              </div>
            )}

            {/* Row 3: RDD's Sectors (52px) */}
            {showSectorsRow && (
              <div
                className="relative w-full"
                style={{ height: `${row3Height}px` }}
              >
                {sectorPositions.map(({ sector, x }) => (
                  <div
                    key={sector.id}
                    className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${x}px`, width: '152px' }}
                  >
                    <SpaLink
                      href={getUnitHref(sector)}
                      onNavigate={() => handleUnitClick(sector)}
                      className="group flex flex-col items-center text-center focus:outline-none cursor-pointer rounded-2xl p-1 transition-transform hover:-translate-y-0.5"
                    >
                      <div
                        className="rounded-full flex items-center justify-center shadow-lg border border-white/15 shrink-0 transition-transform duration-200 group-hover:scale-105"
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
                          size={24}
                          color={sector.colorHex || '#06302F'}
                        />
                      </div>
                      <span className="mt-2.5 text-[13px] font-semibold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors text-center line-clamp-2 leading-snug max-w-[144px]">
                        {sector.name}
                      </span>
                    </SpaLink>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE & TABLET (< 1024px): Vertical Hierarchy + 2-Column Sector Grid under RDD */}
      <div className="lg:hidden flex flex-col items-center max-w-md mx-auto px-4">
        {/* Masters Of All */}
        <div className="flex flex-col items-center">
          <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-xl border-2 border-[#D0A873]/65 bg-[#06302F] p-1">
            <img
              src={moaLogoUrl || '/drawing1.png'}
              alt={siteName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="mt-2 text-[13px] font-bold text-[#EDE9E0] text-center">
            {siteName}
          </span>
        </div>

        {/* Vertical Copper Spine */}
        {visibleUnits.length > 0 && (
          <div className="w-[1.5px] h-8 bg-[#CA7952] my-1.5" aria-hidden="true" />
        )}

        {/* Stacked Non-RDD Departments + RDD */}
        <div className="w-full space-y-3">
          {nonRddDepartments.map(dept => (
            <button
              key={dept.id}
              type="button"
              onClick={() => handleUnitClick(dept)}
              className="w-full flex flex-col items-center p-3 rounded-2xl bg-[#031D1C]/80 border border-[#EDE9E0]/10 hover:border-[#25CDB6]/50 transition-colors cursor-pointer"
            >
              <DepartmentLogo department={dept} size={64} />
              <span className="mt-2 text-[13px] font-semibold text-[#EDE9E0] text-center line-clamp-2 leading-snug">
                {dept.name}
              </span>
            </button>
          ))}

          {rddDepartment && (
            <div className="flex flex-col items-center space-y-4">
              {nonRddDepartments.length > 0 && (
                <div className="w-[1.5px] h-5 bg-[#CA7952]" aria-hidden="true" />
              )}

              <button
                type="button"
                onClick={() => handleUnitClick(rddDepartment)}
                className="w-full flex flex-col items-center p-3.5 rounded-2xl bg-[#031D1C] border border-[#25CDB6]/30 hover:border-[#25CDB6] transition-colors cursor-pointer"
              >
                <div className="rounded-full ring-2 ring-[#25CDB6]/40">
                  <DepartmentLogo
                    department={
                      rddDepartment.customLogoUrl
                        ? rddDepartment
                        : { ...rddDepartment, customLogoUrl: rddLogoUrl || '/5320.jpg' }
                    }
                    size={72}
                  />
                </div>
                <span className="mt-2 text-[13px] font-bold text-[#EDE9E0] text-center line-clamp-2 leading-snug">
                  {rddDepartment.name}
                </span>
              </button>

              {sectors.length > 0 && (
                <>
                  <div className="w-[1.5px] h-5 bg-[#CA7952]" aria-hidden="true" />
                  <div className="w-full grid grid-cols-2 gap-3">
                    {sectors.map(sector => (
                      <SpaLink
                        key={sector.id}
                        href={getUnitHref(sector)}
                        onNavigate={() => handleUnitClick(sector)}
                        className="flex flex-col items-center text-center p-3 rounded-2xl bg-[#031D1C]/85 border border-[#EDE9E0]/10 hover:border-[#25CDB6]/50 transition-colors cursor-pointer"
                      >
                        <div
                          className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow border border-white/15 shrink-0"
                          style={{
                            backgroundColor: sector.iconBgHex || '#FFFFFF',
                            color: sector.colorHex || '#06302F'
                          }}
                        >
                          <DepartmentIcon
                            glyph={sector.iconGlyph}
                            iconUrl={sector.iconUrl}
                            size={24}
                            color={sector.colorHex || '#06302F'}
                          />
                        </div>
                        <span className="mt-2 text-[13px] font-semibold text-[#EDE9E0] line-clamp-2 leading-snug">
                          {sector.name}
                        </span>
                      </SpaLink>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
