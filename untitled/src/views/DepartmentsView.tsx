import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Layers, Package, ChevronDown } from 'lucide-react';
import { EditableText } from '../components/EditableText';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { DepartmentLogo } from '../components/DepartmentLogo';
import { ScrollHierarchyTree } from '../components/ScrollHierarchyTree';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EmptyState } from '../components/EmptyState';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { Department, Project, Publication, Product, SiteContent } from '../types';
import { getUnitHref, isRddDepartment, splitOrgUnits } from '../utils/orgHelpers';
import { formatDepartmentCountText } from '../utils/numberToWords';
import { sanitizeSafeUrl } from '../shared/url';

interface DepartmentsViewProps {
  departments: Department[];
  projects?: Project[];
  publications?: Publication[];
  products?: Product[];
  content: SiteContent;
  onNavigate: (path: string) => void;
  loading?: boolean;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  moaLogoUrl?: string;
  rddLogoUrl?: string;
  siteName?: string;
}

interface RecentWorkItem {
  id: string;
  kind: 'project' | 'publication' | 'product';
  title: string;
  date: string;
  href: string;
  external?: boolean;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  departments,
  projects = [],
  publications = [],
  products = [],
  content: rawContent,
  onNavigate,
  loading = false,
  isEditMode = false,
  onUpdateContent = () => {},
  moaLogoUrl = '/drawing1.png',
  rddLogoUrl = '/5320.jpg',
  siteName = 'Masters Of All'
}) => {
  const { content } = useContent(rawContent);

  const [sectorsExpanded, setSectorsExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash === '#sectors';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncHash = () => {
      if (window.location.hash === '#sectors') {
        setSectorsExpanded(true);
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const publishedUnits = useMemo(
    () => departments.filter(d => d.published && !d.deletedAt),
    [departments]
  );

  // Ordered departments: non-RDD first in portal order, RDD always last
  const { departments: orderedDepartments, sectors } = useMemo(
    () => splitOrgUnits(publishedUnits),
    [publishedUnits]
  );

  const sectorIdsSet = useMemo(() => new Set(sectors.map(s => s.id)), [sectors]);

  const introTemplate = content.departments.rddIntro;
  const introText = formatDepartmentCountText(introTemplate, orderedDepartments.length);

  // Build up to 3 recent published items per department
  const recentWorkByDept = useMemo(() => {
    const map = new Map<string, RecentWorkItem[]>();

    orderedDepartments.forEach(dept => {
      const isRdd = isRddDepartment(dept);
      const matchesDept = (deptIds?: string[], secIds?: string[]) => {
        const dMatch = (deptIds || []).includes(dept.id);
        if (dMatch) return true;
        if (isRdd) {
          return (
            (secIds || []).some(id => sectorIdsSet.has(id)) ||
            (deptIds || []).some(id => sectorIdsSet.has(id))
          );
        }
        return false;
      };

      const items: RecentWorkItem[] = [];

      projects.forEach(p => {
        if (!p.deletedAt && matchesDept(p.departmentIds, p.sectorIds)) {
          items.push({
            id: `proj-${p.id}`,
            kind: 'project',
            title: p.title,
            date: (p.startDate || p.updatedAt || p.createdAt || '').slice(0, 10),
            href: `/projects/${p.slug}`
          });
        }
      });

      publications.forEach(pub => {
        if (!pub.deletedAt && matchesDept(pub.departmentIds, pub.sectorIds)) {
          const pdfHref = sanitizeSafeUrl(pub.pdfUrl) || '#';
          items.push({
            id: `pub-${pub.id}`,
            kind: 'publication',
            title: pub.title,
            date: (pub.publicationDate || pub.updatedAt || pub.createdAt || '').slice(0, 10),
            href: pdfHref,
            external: Boolean(pub.pdfUrl)
          });
        }
      });

      products.forEach(prod => {
        if (!prod.deletedAt && matchesDept(prod.departmentIds, prod.sectorIds)) {
          items.push({
            id: `prod-${prod.id}`,
            kind: 'product',
            title: prod.name,
            date: (prod.releaseDate || prod.updatedAt || prod.createdAt || '').slice(0, 10),
            href: `/products/${prod.slug}`
          });
        }
      });

      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      map.set(dept.id, items.slice(0, 3));
    });

    return map;
  }, [orderedDepartments, projects, publications, products, sectorIdsSet]);

  const scrollToDepartment = (slug: string) => {
    const target = document.getElementById(slug);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTreeUnitSelect = (unit: Department) => {
    if (unit.kind === 'sector') {
      onNavigate(getUnitHref(unit));
    } else {
      scrollToDepartment(unit.slug);
    }
  };

  return (
    <div className="min-h-screen">
      {/* 1. Header & 2. Organizational Hierarchy */}
      <AtmosphericBackground
        intensity="subtle"
        fadeToColor="transparent"
        className="pt-14 pb-12 lg:pt-20 lg:pb-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl mx-auto space-y-4 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#EDE9E0] tracking-tight text-center">
              <EditableText
                value={content.departments.heading || 'Departments'}
                fieldPath="departments.heading"
                label="Departments Page Heading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </h1>

            <div className="text-base sm:text-lg text-[#EDE9E0]/85 leading-relaxed max-w-2xl mx-auto text-center">
              <EditableText
                value={introTemplate}
                fieldPath="departments.rddIntro"
                label="Departments Introduction"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
                multiline
                as="p"
              >
                {introText}
              </EditableText>
            </div>
          </div>

          <ScrollHierarchyTree
            departments={publishedUnits}
            loading={loading}
            onSelectUnit={handleTreeUnitSelect}
            moaLogoUrl={moaLogoUrl}
            rddLogoUrl={rddLogoUrl}
            siteName={siteName}
          />

          {/* 3. Anchor navigation chips when >= 3 departments */}
          {orderedDepartments.length >= 3 && (
            <nav
              aria-label="Department sections"
              className="flex flex-wrap items-center justify-center gap-2.5 pt-2"
            >
              {orderedDepartments.map(dept => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => scrollToDepartment(dept.slug)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#031D1C]/85 border border-[#EDE9E0]/15 hover:border-[#25CDB6] text-xs sm:text-sm font-semibold text-[#EDE9E0] hover:text-[#25CDB6] transition-colors cursor-pointer"
                >
                  {dept.name}
                </button>
              ))}
            </nav>
          )}
        </div>
      </AtmosphericBackground>

      {/* 4. Full-width department sections (96px vertical spacing) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        {orderedDepartments.length === 0 ? (
          <EmptyState
            title="No departments published yet"
            description="Published organizational departments will appear here."
          />
        ) : (
          <div className="space-y-24">
            {orderedDepartments.map(dept => {
              const isRdd = isRddDepartment(dept);
              const deptWithLogo =
                isRdd && !dept.customLogoUrl
                  ? { ...dept, customLogoUrl: rddLogoUrl || '/5320.jpg' }
                  : dept;
              const recentItems = recentWorkByDept.get(dept.id) || [];
              const hasRecentWork = recentItems.length > 0;
              const description = (dept.introduction || dept.purpose || '').trim();

              return (
                <section
                  key={dept.id}
                  id={dept.slug}
                  className="scroll-mt-[96px] rounded-3xl bg-[#031D1C] border border-[#EDE9E0]/12 p-6 md:p-12 shadow-xl shadow-black/25 space-y-10"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* LEFT COLUMN: 5/12 when work exists, 12/12 full width when no work */}
                    <div
                      className={`${
                        hasRecentWork ? 'lg:col-span-5' : 'lg:col-span-12'
                      } space-y-5`}
                    >
                      <DepartmentLogo department={deptWithLogo} size={88} />

                      <div className="space-y-2">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight">
                          {dept.name}
                        </h2>
                        {dept.tagline && (
                          <p className="text-sm sm:text-base font-medium text-[#CA7952]">
                            {dept.tagline}
                          </p>
                        )}
                      </div>

                      {description && (
                        <p className="text-sm sm:text-base text-[#EDE9E0]/80 leading-relaxed max-w-[62ch]">
                          {description}
                        </p>
                      )}

                      <div className="pt-1">
                        <SpaLink
                          href={getUnitHref(dept)}
                          onNavigate={onNavigate}
                          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-sm transition-colors cursor-pointer"
                        >
                          <span>Open department</span>
                          <ArrowRight className="w-4 h-4" />
                        </SpaLink>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: 7/12 Latest work — hidden completely if zero published work */}
                    {hasRecentWork && (
                      <div className="lg:col-span-7 space-y-4">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-[#25CDB6]">
                          Latest work
                        </h3>
                        <div className="divide-y divide-[#EDE9E0]/10 rounded-2xl border border-[#EDE9E0]/10 bg-[#06302F]/50 overflow-hidden">
                          {recentItems.map(item => {
                            const TypeIcon =
                              item.kind === 'publication'
                                ? FileText
                                : item.kind === 'product'
                                  ? Package
                                  : Layers;

                            const inner = (
                              <div className="flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-white/[0.04] transition-colors">
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-[#031D1C] border border-white/10 flex items-center justify-center shrink-0 text-[#25CDB6]">
                                    <TypeIcon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-sm sm:text-base font-semibold text-[#EDE9E0] block truncate">
                                      {item.title}
                                    </span>
                                    <span className="text-xs text-[#EDE9E0]/65 capitalize">
                                      {item.kind}
                                      {item.date ? ` · ${item.date}` : ''}
                                    </span>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-[#EDE9E0]/55 shrink-0" />
                              </div>
                            );

                            return item.external ? (
                              <a
                                key={item.id}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                {inner}
                              </a>
                            ) : (
                              <SpaLink
                                key={item.id}
                                href={item.href}
                                onNavigate={onNavigate}
                                className="block cursor-pointer"
                              >
                                {inner}
                              </SpaLink>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RDD SPECIAL SECTION: Expandable Sectors Grid */}
                  {isRdd && sectors.length > 0 && (
                    <div id="sectors" className="scroll-mt-[96px] pt-8 border-t border-[#EDE9E0]/12 space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-lg sm:text-xl font-bold text-[#EDE9E0]">
                          Sectors &middot; {sectors.length}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSectorsExpanded(prev => !prev)}
                          aria-expanded={sectorsExpanded}
                          aria-controls="rdd-sectors-panel"
                          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#25CDB6]/40 bg-[#06302F] hover:bg-[#17A491]/15 text-sm font-semibold text-[#25CDB6] transition-colors cursor-pointer"
                        >
                          <span>{sectorsExpanded ? 'Hide sectors' : 'Explore sectors'}</span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-300 ${
                              sectorsExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <div
                        id="rdd-sectors-panel"
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                          sectorsExpanded
                            ? 'grid-rows-[1fr] opacity-100'
                            : 'grid-rows-[0fr] opacity-0'
                        }`}
                        aria-hidden={!sectorsExpanded}
                      >
                        <div className="overflow-hidden">
                          <div
                            className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[960px]:grid-cols-3 min-[1200px]:grid-cols-4 gap-4 pt-1"
                          >
                            {sectors.map(sector => (
                              <SpaLink
                                key={sector.id}
                                href={getUnitHref(sector)}
                                onNavigate={onNavigate}
                                tabIndex={sectorsExpanded ? 0 : -1}
                                className="group p-5 rounded-2xl bg-[#06302F]/80 border border-[#EDE9E0]/10 hover:border-[#25CDB6]/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow shrink-0 border border-white/10"
                                    style={{
                                      backgroundColor: sector.iconBgHex || '#FFFFFF',
                                      color: sector.colorHex || '#06302F'
                                    }}
                                  >
                                    <DepartmentIcon
                                      glyph={sector.iconGlyph}
                                      iconUrl={sector.iconUrl}
                                      size={22}
                                      color={sector.colorHex || '#06302F'}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors truncate">
                                      {sector.name}
                                    </h4>
                                    {sector.introduction && (
                                      <p className="text-xs text-[#EDE9E0]/70 line-clamp-1 mt-0.5">
                                        {sector.introduction}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                              </SpaLink>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
