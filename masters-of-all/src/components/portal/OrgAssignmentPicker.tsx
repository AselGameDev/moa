import React, { useMemo, useState } from 'react';
import { Building, Check, Layers, Search, X } from 'lucide-react';
import { Department } from '../../types';
import { getSectorParentId, splitOrgUnits } from '../../utils/orgHelpers';
import { DepartmentIcon } from '../DepartmentIcon';

interface OrgAssignmentPickerProps {
  departments: Department[];
  selectedDepartmentIds: string[];
  selectedSectorIds: string[];
  onChangeDepartments: (nextIds: string[]) => void;
  onChangeSectors: (nextIds: string[]) => void;
  onlyPublished?: boolean;
}

export const OrgAssignmentPicker: React.FC<OrgAssignmentPickerProps> = ({
  departments,
  selectedDepartmentIds,
  selectedSectorIds,
  onChangeDepartments,
  onChangeSectors,
  onlyPublished = false
}) => {
  const [deptQuery, setDeptQuery] = useState('');
  const [sectorQuery, setSectorQuery] = useState('');

  const { departments: deptUnits, sectors: sectorUnits } = useMemo(() => {
    const active = departments.filter(d => !d.deletedAt && (!onlyPublished || d.published));
    return splitOrgUnits(active);
  }, [departments, onlyPublished]);

  const availableSectors = useMemo(() => {
    const selectedSet = new Set(selectedDepartmentIds);
    return sectorUnits.filter(s => selectedSet.has(getSectorParentId(s)));
  }, [sectorUnits, selectedDepartmentIds]);

  const deptMap = useMemo(() => {
    const map = new Map<string, Department>();
    deptUnits.forEach(d => map.set(d.id, d));
    return map;
  }, [deptUnits]);

  const filteredDepts = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    if (!q) return deptUnits;
    return deptUnits.filter(
      d =>
        d.name.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        (d.tagline && d.tagline.toLowerCase().includes(q))
    );
  }, [deptUnits, deptQuery]);

  const filteredSectors = useMemo(() => {
    const q = sectorQuery.trim().toLowerCase();
    if (!q) return availableSectors;
    return availableSectors.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q)
    );
  }, [availableSectors, sectorQuery]);

  const toggleDepartment = (dept: Department) => {
    const exists = selectedDepartmentIds.includes(dept.id);
    const next = exists
      ? selectedDepartmentIds.filter(id => id !== dept.id)
      : [...selectedDepartmentIds, dept.id];
    onChangeDepartments(next);

    if (exists && selectedSectorIds.length > 0) {
      const childSectorIdsToRemove = new Set(
        sectorUnits.filter(s => getSectorParentId(s) === dept.id).map(s => s.id)
      );
      if (childSectorIdsToRemove.size > 0) {
        onChangeSectors(selectedSectorIds.filter(id => !childSectorIdsToRemove.has(id)));
      }
    }
  };

  const toggleSector = (sectorId: string) => {
    const exists = selectedSectorIds.includes(sectorId);
    const next = exists
      ? selectedSectorIds.filter(id => id !== sectorId)
      : [...selectedSectorIds, sectorId];
    onChangeSectors(next);
  };

  return (
    <div className="space-y-4">
      {/* Department Multi-Select */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-[#EDE9E0]/85 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#25CDB6]" />
            <span>Departments ({selectedDepartmentIds.length})</span>
          </label>
          {selectedDepartmentIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChangeDepartments([]);
                if (selectedSectorIds.length > 0) onChangeSectors([]);
              }}
              className="text-[11px] text-[#EDE9E0]/60 hover:text-white cursor-pointer"
            >
              Clear selection
            </button>
          )}
        </div>

        {/* Selected Chips */}
        {selectedDepartmentIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedDepartmentIds.map(id => {
              const found = deptUnits.find(d => d.id === id);
              if (!found) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#17A491]/15 border border-[#25CDB6]/40 text-[11px] font-semibold text-[#25CDB6]"
                >
                  <span>{found.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleDepartment(found)}
                    aria-label={`Remove ${found.name}`}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="rounded-xl bg-[#06302F] border border-white/10 overflow-hidden">
          <div className="relative border-b border-white/10">
            <Search className="w-3.5 h-3.5 text-[#EDE9E0]/45 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={deptQuery}
              onChange={e => setDeptQuery(e.target.value)}
              placeholder="Search departments..."
              className="w-full bg-transparent pl-8 pr-3 py-2 text-xs text-[#EDE9E0] placeholder-[#EDE9E0]/40 focus:outline-none"
            />
          </div>

          <div className="max-h-48 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredDepts.length === 0 ? (
              <p className="col-span-full py-3 text-center text-xs text-[#EDE9E0]/50">
                No departments match &ldquo;{deptQuery}&rdquo;.
              </p>
            ) : (
              filteredDepts.map(dept => {
                const selected = selectedDepartmentIds.includes(dept.id);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#17A491]/20 border border-[#25CDB6]/50 text-[#25CDB6] font-semibold'
                        : 'bg-white/[0.02] border border-transparent text-[#EDE9E0]/80 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{dept.name}</span>
                    {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Conditional Department Sectors Multi-Select */}
      {availableSectors.length > 0 && (
        <div className="space-y-2 p-3.5 rounded-2xl bg-[#031D1C]/80 border border-[#25CDB6]/25">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-[#25CDB6] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Sectors ({selectedSectorIds.length})</span>
            </label>
            {selectedSectorIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeSectors([])}
                className="text-[11px] text-[#EDE9E0]/60 hover:text-white cursor-pointer"
              >
                Clear sectors
              </button>
            )}
          </div>

          {selectedSectorIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedSectorIds.map(id => {
                const found = sectorUnits.find(s => s.id === id);
                if (!found) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D0A873]/15 border border-[#D0A873]/40 text-[11px] font-semibold text-[#D0A873]"
                  >
                    <span>{found.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSector(id)}
                      aria-label={`Remove ${found.name}`}
                      className="hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="rounded-xl bg-[#06302F] border border-white/10 overflow-hidden">
            <div className="relative border-b border-white/10">
              <Search className="w-3.5 h-3.5 text-[#EDE9E0]/45 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sectorQuery}
                onChange={e => setSectorQuery(e.target.value)}
                placeholder="Search sectors..."
                className="w-full bg-transparent pl-8 pr-3 py-2 text-xs text-[#EDE9E0] placeholder-[#EDE9E0]/40 focus:outline-none"
              />
            </div>

            <div className="max-h-48 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredSectors.length === 0 ? (
                <p className="col-span-full py-3 text-center text-xs text-[#EDE9E0]/50">
                  No sectors match &ldquo;{sectorQuery}&rdquo;.
                </p>
              ) : (
                filteredSectors.map(sector => {
                  const selected = selectedSectorIds.includes(sector.id);
                  const parentDept = deptMap.get(getSectorParentId(sector));
                  return (
                    <button
                      key={sector.id}
                      type="button"
                      onClick={() => toggleSector(sector.id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#D0A873]/20 border border-[#D0A873]/50 text-[#D0A873] font-semibold'
                          : 'bg-white/[0.02] border border-transparent text-[#EDE9E0]/80 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <DepartmentIcon
                          glyph={sector.iconGlyph}
                          iconUrl={sector.iconUrl}
                          size={14}
                          color={sector.colorHex}
                        />
                        <span className="truncate">{sector.name}</span>
                        {selectedDepartmentIds.length > 1 && parentDept && (
                          <span className="text-[10px] opacity-60 shrink-0 truncate max-w-[70px]">
                            ({parentDept.shortName || parentDept.name})
                          </span>
                        )}
                      </span>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
