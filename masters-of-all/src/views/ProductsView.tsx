import React, { useEffect, useMemo, useState } from 'react';
import { Search, Package } from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { AnimatedAtomGraphic } from '../components/AnimatedAtomGraphic';
import { EditableText } from '../components/EditableText';
import { EmptyState } from '../components/EmptyState';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { sanitizeSafeUrl } from '../shared/url';
import { Product, Department, SiteContent } from '../types';
import { isRddDepartment, splitOrgUnits } from '../utils/orgHelpers';

interface ProductsViewProps {
  products: Product[];
  departments: Department[];
  content?: SiteContent;
  loading?: boolean;
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  departments,
  content: rawContent,
  loading = false,
  onNavigate,
  isEditMode = false,
  onUpdateContent = () => {}
}) => {
  const { content } = useContent(rawContent);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');

  const activeUnits = useMemo(
    () => departments.filter(d => d.published && !d.deletedAt),
    [departments]
  );
  const { departments: deptList, sectors: sectorList } = useMemo(
    () => splitOrgUnits(activeUnits),
    [activeUnits]
  );

  const deptMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach(d => map.set(d.id, d));
    return map;
  }, [departments]);

  const selectedDeptObj =
    selectedDeptId !== 'all' ? deptMap.get(selectedDeptId) : undefined;
  const isRddSelected = Boolean(selectedDeptObj && isRddDepartment(selectedDeptObj));

  useEffect(() => {
    if (!isRddSelected && selectedSectorId !== 'all') {
      setSelectedSectorId('all');
    }
  }, [isRddSelected, selectedSectorId]);

  const q = searchQuery.trim().toLowerCase();
  const sectorIdsSet = useMemo(() => new Set(sectorList.map(s => s.id)), [sectorList]);

  const activeProducts = useMemo(
    () => products.filter(p => !p.deletedAt),
    [products]
  );

  const statusOptions = useMemo(() => {
    const set = new Set<string>(['Concept', 'In development', 'Released']);
    activeProducts.forEach(p => {
      if (p.status) set.add(p.status);
    });
    return Array.from(set);
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter(prod => {
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        (prod.tagline || '').toLowerCase().includes(q) ||
        (prod.shortDescription || '').toLowerCase().includes(q) ||
        (prod.category || '').toLowerCase().includes(q) ||
        (prod.tags || []).some(t => t.toLowerCase().includes(q));

      const matchesStatus =
        selectedStatus === 'all' ||
        (prod.status || '').trim().toLowerCase() === selectedStatus.trim().toLowerCase();

      let matchesDept = true;
      if (selectedDeptId !== 'all') {
        const deptIds = prod.departmentIds || [];
        const secIds = prod.sectorIds || [];
        if (isRddSelected) {
          if (selectedSectorId !== 'all') {
            matchesDept = secIds.includes(selectedSectorId) || deptIds.includes(selectedSectorId);
          } else {
            matchesDept =
              deptIds.includes(selectedDeptId) ||
              secIds.some(id => sectorIdsSet.has(id)) ||
              deptIds.some(id => sectorIdsSet.has(id));
          }
        } else {
          matchesDept = deptIds.includes(selectedDeptId);
        }
      }

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [
    activeProducts,
    q,
    selectedStatus,
    selectedDeptId,
    selectedSectorId,
    isRddSelected,
    sectorIdsSet
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedDeptId('all');
    setSelectedSectorId('all');
  };

  return (
    <div className="min-h-screen">
      {/* Editable Header */}
      <AtmosphericBackground
        intensity="subtle"
        fadeToColor="transparent"
        className="pt-14 pb-10 lg:pt-20 lg:pb-12 border-b border-[#EDE9E0]/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
              <EditableText
                value={content.products?.heading || 'Products'}
                fieldPath="products.heading"
                label="Products Heading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </h1>
            <div className="text-base sm:text-lg text-[#EDE9E0]/85 leading-relaxed">
              <EditableText
                value={
                  content.products?.subtext ||
                  'Software, tools, hardware platforms, and applied systems built across Masters Of All.'
                }
                fieldPath="products.subtext"
                label="Products Subtext"
                multiline
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </div>
          </div>
        </div>
      </AtmosphericBackground>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10 pb-24 pt-8 sm:pt-12">
        {/* Filter Bar matching ProjectsView 1:1 (1. Search, 2. Department, 3. Sector when RDD, 4. Status) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/25">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#EDE9E0]/55 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={content.products?.searchPlaceholder || 'Search products…'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search products"
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/15 text-sm text-[#EDE9E0] placeholder:text-[#EDE9E0]/50 focus:outline-none focus:border-[#25CDB6]"
              />
            </div>

            <div className="w-full lg:w-56 shrink-0">
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                aria-label="Filter by department"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/15 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
              >
                <option value="all">All departments</option>
                {deptList.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {isRddSelected && sectorList.length > 0 && (
              <div className="w-full lg:w-56 shrink-0">
                <select
                  value={selectedSectorId}
                  onChange={e => setSelectedSectorId(e.target.value)}
                  aria-label="Filter by RDD sector"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#06302F] border border-[#25CDB6]/40 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
                >
                  <option value="all">All RDD sectors</option>
                  {sectorList.map(sector => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full lg:w-48 shrink-0">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                aria-label="Filter by status"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/15 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
              >
                <option value="all">All statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grid / Loading / Empty State */}
        {loading ? (
          <div
            className="text-center py-20 px-6 rounded-2xl bg-[#031D1C] border border-white/10 w-full shadow-xl shadow-black/25"
            aria-label="Loading products"
          >
            <div className="flex items-center justify-center mx-auto mb-5">
              <AnimatedAtomGraphic size={92} />
            </div>
            <p className="text-sm font-medium text-[#EDE9E0]/75">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            customVisual={<AnimatedAtomGraphic size={92} />}
            maxWidthClass="w-full"
            className="py-16 sm:py-20 shadow-xl shadow-black/25"
            title={
              activeProducts.length === 0
                ? content.products?.emptyTitle || 'No products released yet'
                : 'No matching products found'
            }
            description={
              activeProducts.length === 0
                ? content.products?.emptySubtitle ||
                  'Released tools, platforms, and systems will appear here once published.'
                : 'Try adjusting your search query, department, or status filter.'
            }
            actionLabel={activeProducts.length > 0 ? 'Clear filters' : undefined}
            onAction={activeProducts.length > 0 ? resetFilters : undefined}
          />
        ) : (
          <section className="space-y-6">
            <div className="flex items-center gap-2.5">
              <Package className="w-5 h-5 text-[#25CDB6]" />
              <h2 className="text-2xl font-extrabold text-[#EDE9E0] tracking-tight">
                {content.products?.heading || 'Products'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(prod => {
                const safeCover = sanitizeSafeUrl(prod.coverImage);
                const assignedUnits = (prod.departmentIds || [])
                  .map(id => deptMap.get(id))
                  .filter(Boolean) as Department[];
                const assignedSectors = [
                  ...(prod.sectorIds || []).map(id => deptMap.get(id)),
                  ...assignedUnits.filter(u => u.kind === 'sector')
                ].filter((u, idx, arr): u is Department =>
                  Boolean(u && arr.findIndex(x => x?.id === u.id) === idx)
                );
                const assignedDepts = assignedUnits.filter(u => u.kind !== 'sector');

                return (
                  <SpaLink
                    key={prod.id}
                    href={`/products/${prod.slug}`}
                    onNavigate={onNavigate}
                    className="group cursor-pointer rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#17A491]"
                  >
                    <div>
                      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#0A3D3C] via-[#06302F] to-[#031D1C] border-b border-[#EDE9E0]/10">
                        {safeCover ? (
                          <img
                            src={safeCover}
                            alt={prod.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-40">
                            <Package className="w-10 h-10 text-[#25CDB6]" />
                          </div>
                        )}
                      </div>

                      <div className="p-6 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold text-[#25CDB6]">
                            <Package className="w-3.5 h-3.5 shrink-0" />
                            <span>{prod.category || 'Product'}</span>
                          </span>
                          {prod.version && (
                            <span className="text-[11px] font-mono text-[#D0A873]">
                              v{prod.version}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug">
                          {prod.name}
                        </h3>

                        {(assignedDepts.length > 0 || assignedSectors.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {assignedDepts.map(d => (
                              <span
                                key={d.id}
                                className="text-xs text-[#EDE9E0]/85 bg-[#06302F] px-2.5 py-0.5 rounded-md border border-[#EDE9E0]/12"
                              >
                                {d.name}
                              </span>
                            ))}
                            {assignedSectors.map(s => (
                              <span
                                key={s.id}
                                className="text-xs text-[#CA7952] bg-[#06302F] px-2.5 py-0.5 rounded-md border border-[#CA7952]/30"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {(prod.tagline || prod.shortDescription) && (
                          <p className="text-sm text-[#EDE9E0]/75 line-clamp-2 leading-relaxed">
                            {prod.tagline || prod.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-6 pb-5 pt-3 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#25CDB6]">{prod.status}</span>
                      {prod.releaseDate && (
                        <span className="text-[#EDE9E0]/65 font-mono tabular-nums">
                          {prod.releaseDate.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </SpaLink>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
