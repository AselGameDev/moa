import React, { useMemo, useState } from 'react';
import { Search, Package, ArrowRight } from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { EmptyState } from '../components/EmptyState';
import { CardGridSkeleton } from '../components/SkeletonLoader';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { sanitizeSafeUrl } from '../shared/url';
import { Product, Department, SiteContent } from '../types';
import { splitOrgUnits } from '../utils/orgHelpers';

interface ProductsViewProps {
  products: Product[];
  departments: Department[];
  content?: SiteContent;
  loading?: boolean;
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
}

const STAGE_CHIPS = ['All', 'Concept', 'In development', 'Released'] as const;

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
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

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

  const q = searchQuery.trim().toLowerCase();
  const sectorIdsSet = useMemo(() => new Set(sectorList.map(s => s.id)), [sectorList]);

  const activeProducts = useMemo(
    () => products.filter(p => !p.deletedAt),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return activeProducts.filter(prod => {
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        (prod.tagline || '').toLowerCase().includes(q) ||
        (prod.shortDescription || '').toLowerCase().includes(q) ||
        (prod.category || '').toLowerCase().includes(q) ||
        (prod.tags || []).some(t => t.toLowerCase().includes(q));

      const matchesStage =
        selectedStage === 'All' ||
        (prod.status || '').trim().toLowerCase() === selectedStage.toLowerCase();

      let matchesDept = true;
      if (selectedDeptId !== 'all') {
        const deptObj = deptMap.get(selectedDeptId);
        const deptIds = prod.departmentIds || [];
        const secIds = prod.sectorIds || [];
        if (deptObj?.isRdd || deptObj?.id === 'dept-rdd') {
          matchesDept =
            deptIds.includes(selectedDeptId) ||
            secIds.some(id => sectorIdsSet.has(id)) ||
            deptIds.some(id => sectorIdsSet.has(id));
        } else {
          matchesDept = deptIds.includes(selectedDeptId);
        }
      }

      return matchesSearch && matchesStage && matchesDept;
    });
  }, [activeProducts, q, selectedStage, selectedDeptId, deptMap, sectorIdsSet]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStage('All');
    setSelectedDeptId('all');
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pb-24 pt-8 sm:pt-12">
        {/* Toolbar: Search, Stage chips, Department selector */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/25 space-y-4">
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

            <div className="w-full lg:w-64 shrink-0">
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
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
            {STAGE_CHIPS.map(stage => {
              const active = selectedStage === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setSelectedStage(stage)}
                  className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#17A491] text-[#031D1C]'
                      : 'bg-white/5 text-[#EDE9E0]/75 hover:text-white'
                  }`}
                >
                  {stage}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid / Loading / Empty State */}
        {loading ? (
          <CardGridSkeleton count={6} />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title={
              activeProducts.length === 0
                ? content.products?.emptyTitle || 'No products released yet'
                : 'No matching products found'
            }
            description={
              activeProducts.length === 0
                ? content.products?.emptySubtitle ||
                  'Released tools, platforms, and systems will appear here once published.'
                : 'Try adjusting your search query, stage filter, or department selection.'
            }
            actionLabel={activeProducts.length > 0 ? 'Clear filters' : undefined}
            onAction={activeProducts.length > 0 ? resetFilters : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(prod => {
              const safeCover = sanitizeSafeUrl(prod.coverImage);
              const assignedDepts = (prod.departmentIds || [])
                .map(id => deptMap.get(id))
                .filter((d): d is Department => Boolean(d && d.kind !== 'sector'));

              return (
                <SpaLink
                  key={prod.id}
                  href={`/products/${prod.slug}`}
                  onNavigate={onNavigate}
                  className="group cursor-pointer rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#17A491]"
                >
                  <div>
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#0A3D3C] via-[#06302F] to-[#031D1C]">
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

                    <div className="p-6 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#17A491]/15 text-[#25CDB6] border border-[#17A491]/30">
                          {prod.status}
                        </span>
                        {prod.version && (
                          <span className="text-xs font-mono text-[#D0A873]">
                            v{prod.version}
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug">
                        {prod.name}
                      </h2>

                      {(prod.tagline || prod.shortDescription) && (
                        <p className="text-sm text-[#EDE9E0]/75 line-clamp-2 leading-relaxed">
                          {prod.tagline || prod.shortDescription}
                        </p>
                      )}

                      {assignedDepts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {assignedDepts.map(d => (
                            <span
                              key={d.id}
                              className="text-xs text-[#EDE9E0]/80 bg-[#06302F] px-2.5 py-0.5 rounded-md border border-[#EDE9E0]/12"
                            >
                              {d.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 pb-5 pt-3 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs">
                    <span className="text-[#EDE9E0]/65">
                      {prod.releaseDate ? prod.releaseDate.slice(0, 10) : prod.category || 'Product'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#25CDB6] font-semibold group-hover:translate-x-0.5 transition-transform">
                      <span>View details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </SpaLink>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
