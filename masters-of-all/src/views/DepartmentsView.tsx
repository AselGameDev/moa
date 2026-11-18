import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { EditableText } from '../components/EditableText';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { ScrollHierarchyTree } from '../components/ScrollHierarchyTree';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EmptyState } from '../components/EmptyState';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { Department, Project, Publication, Product, SiteContent } from '../types';
import { getInitials, getUnitHref, isRddDepartment, splitOrgUnits } from '../utils/orgHelpers';
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
  onUpdateDepartment?: (departmentId: string, patch: Partial<Department>) => void;
  moaLogoUrl?: string;
  rddLogoUrl?: string;
  siteName?: string;
  animateTreeReady?: boolean;
}

interface RecentWorkItem {
  id: string;
  kind: 'project' | 'publication' | 'product';
  badge: string;
  label: string;
  title: string;
  date: string;
  href: string;
  external?: boolean;
}

interface DepartmentSummaryData {
  projectCount: number;
  publicationCount: number;
  productCount: number;
  previewItems: RecentWorkItem[];
}

function getEmblemMonogram(name: string, isRdd?: boolean): string {
  if (isRdd) return 'RDD';
  const deptLetterMatch = name.trim().match(/^department\s+([a-z0-9]+)$/i);
  if (deptLetterMatch) {
    return deptLetterMatch[1].slice(0, 3).toUpperCase();
  }
  return getInitials(name).slice(0, 3);
}

const DepartmentVisualPanel: React.FC<{
  department: Department;
  logoSrc: string;
}> = ({ department, logoSrc }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoSrc]);

  if (logoSrc && !imgError) {
    return (
      <div className="relative w-full h-full min-h-[280px] sm:min-h-[340px] lg:min-h-full overflow-hidden bg-[#042423]">
        <img
          src={logoSrc}
          alt={department.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          onLoad={e => {
            if (e.currentTarget.naturalWidth === 0) {
              setImgError(true);
            }
          }}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03] select-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#031D1C]/50 via-transparent to-[#031D1C]/20 pointer-events-none"
        />
      </div>
    );
  }

  const monogram = getEmblemMonogram(department.name, isRddDepartment(department));
  const fontSize = monogram.length <= 1 ? 88 : monogram.length === 2 ? 64 : 46;

  return (
    <div className="relative w-full h-full min-h-[280px] lg:min-h-full flex items-center justify-center p-8 overflow-hidden select-none">
      {/* Subtle atmospheric glow */}
      <div
        aria-hidden="true"
        className="absolute w-72 h-72 rounded-full bg-[#17A491]/10 blur-3xl pointer-events-none"
      />
      <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
        {/* Outer concentric ring */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-[#25CDB6]/14 transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {/* Inner concentric ring */}
        <div
          aria-hidden="true"
          className="absolute inset-10 sm:inset-12 rounded-full border border-[#25CDB6]/24 transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <svg
          viewBox="0 0 160 160"
          className="relative z-10 w-36 h-36 sm:w-40 sm:h-40"
          aria-hidden="true"
        >
          <text
            x="80"
            y="84"
            textAnchor="middle"
            dominantBaseline="central"
            fill="transparent"
            stroke="#17A491"
            strokeWidth="2.4"
            strokeLinejoin="round"
            style={{
              fontFamily: 'inherit',
              fontWeight: 800,
              fontSize: `${fontSize}px`,
              letterSpacing: '-0.02em'
            }}
          >
            {monogram}
          </text>
        </svg>
      </div>
    </div>
  );
};

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
  onUpdateDepartment = () => {},
  moaLogoUrl = '/drawing1.png',
  rddLogoUrl = '',
  siteName = 'Masters Of All',
  animateTreeReady = true
}) => {
  const { content } = useContent(rawContent);
  const prefersReducedMotion = useReducedMotion();

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
  const {
    departments: orderedDepartments,
    rddDepartment,
    sectors
  } = useMemo(() => splitOrgUnits(publishedUnits), [publishedUnits]);

  const sectorIdsSet = useMemo(() => new Set(sectors.map(s => s.id)), [sectors]);

  const introTemplate = content.departments.rddIntro;
  const introText = formatDepartmentCountText(introTemplate, orderedDepartments.length);

  // Build stats and up to 2 recent work preview items per department
  const deptSummaries = useMemo(() => {
    const map = new Map<string, DepartmentSummaryData>();

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

      let projectCount = 0;
      let publicationCount = 0;
      let productCount = 0;
      const items: RecentWorkItem[] = [];

      projects.forEach(p => {
        if (!p.deletedAt && matchesDept(p.departmentIds, p.sectorIds)) {
          projectCount += 1;
          items.push({
            id: `proj-${p.id}`,
            kind: 'project',
            badge: 'P',
            label: 'Project',
            title: p.title,
            date: (p.startDate || p.updatedAt || p.createdAt || '').slice(0, 10),
            href: `/projects/${p.slug}`
          });
        }
      });

      publications.forEach(pub => {
        if (!pub.deletedAt && matchesDept(pub.departmentIds, pub.sectorIds)) {
          publicationCount += 1;
          const pdfHref = sanitizeSafeUrl(pub.pdfUrl) || '#';
          items.push({
            id: `pub-${pub.id}`,
            kind: 'publication',
            badge: 'U',
            label: 'Publication',
            title: pub.title,
            date: (pub.publicationDate || pub.updatedAt || pub.createdAt || '').slice(0, 10),
            href: pdfHref,
            external: Boolean(pub.pdfUrl)
          });
        }
      });

      products.forEach(prod => {
        if (!prod.deletedAt && matchesDept(prod.departmentIds, prod.sectorIds)) {
          productCount += 1;
          items.push({
            id: `prod-${prod.id}`,
            kind: 'product',
            badge: 'Pr',
            label: 'Product',
            title: prod.name,
            date: (prod.releaseDate || prod.updatedAt || prod.createdAt || '').slice(0, 10),
            href: `/products/${prod.slug}`
          });
        }
      });

      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      map.set(dept.id, {
        projectCount,
        publicationCount,
        productCount,
        previewItems: items.slice(0, 2)
      });
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

  const exploreLabel = content.departments.exploreButtonLabel || 'Open department';
  const directoryHeading = content.departments.directoryTitleTemplate || 'Departments';

  return (
    <div className="min-h-screen">
      {/* 1. Header & 2. Open-Canvas Animated Organizational Hierarchy Tree */}
      <AtmosphericBackground
        intensity="subtle"
        fadeToColor="transparent"
        className="scroll-mt-sticky pt-10 pb-12 sm:pt-14 sm:pb-16"
      >
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto space-y-4 text-center"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#EDE9E0] tracking-tight leading-[1.15] text-center text-balance">
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
          </motion.div>

          <ScrollHierarchyTree
            departments={publishedUnits}
            loading={loading}
            animateReady={animateTreeReady}
            onNavigate={onNavigate}
            onSelectUnit={handleTreeUnitSelect}
            moaLogoUrl={moaLogoUrl}
            rddLogoUrl={rddLogoUrl}
            siteName={siteName}
          />
        </div>
      </AtmosphericBackground>

      {/* 3. Alternating 2-Column Editorial Division Showcase Cards */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/10 pt-14 sm:pt-16 pb-24 space-y-12">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
          <EditableText
            value={directoryHeading}
            fieldPath="departments.directoryTitleTemplate"
            label="Departments Section Heading"
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </h2>

        {orderedDepartments.length === 0 ? (
          <EmptyState
            title="No departments published yet"
            description="Published organizational departments will appear here."
          />
        ) : (
          <div className="space-y-8">
            {orderedDepartments.map((dept, index) => {
              const isRdd = dept.id === rddDepartment?.id;
              const isEven = index % 2 === 0;
              const rawLogoCandidate =
                dept.customLogoUrl ||
                dept.heroImage ||
                dept.iconUrl ||
                (isRdd && dept.customLogoUrl === undefined ? rddLogoUrl : '') ||
                '';
              const emblemLogoSrc = sanitizeSafeUrl(rawLogoCandidate);

              const summary = deptSummaries.get(dept.id) || {
                projectCount: 0,
                publicationCount: 0,
                productCount: 0,
                previewItems: []
              };

              const description = (dept.introduction || '').trim();
              const tagline = (dept.tagline || '').trim();
              const hasExpandableSectors = isRdd && sectors.length > 0;

              return (
                <motion.section
                  key={dept.id}
                  id={dept.slug}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{
                    duration: 0.38,
                    delay: Math.min(index * 0.05, 0.25),
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="scroll-mt-sticky group relative rounded-2xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/50 overflow-hidden shadow-xl shadow-black/25 transition-colors duration-300"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[380px]">
                    {/* Text & Telemetry Panel */}
                    <div
                      className={`order-2 ${
                        isEven ? 'lg:order-1' : 'lg:order-2'
                      } p-7 sm:p-10 flex flex-col justify-between space-y-6`}
                    >
                      <div className="space-y-3.5">
                        <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#CA7952] font-bold">
                          DEPARTMENT {String(index + 1).padStart(2, '0')}
                        </p>

                        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight leading-tight break-words">
                          {isEditMode ? (
                            <EditableText
                              value={dept.name}
                              fieldPath={`department.${dept.id}.name`}
                              label="Department Name"
                              isEditMode={isEditMode}
                              onUpdate={(_, val) => onUpdateDepartment(dept.id, { name: val })}
                            />
                          ) : (
                            <SpaLink
                              href={getUnitHref(dept)}
                              onNavigate={onNavigate}
                              className="hover:text-[#25CDB6] transition-colors cursor-pointer"
                            >
                              {dept.name}
                            </SpaLink>
                          )}
                        </h3>

                        {(tagline || isEditMode) && (
                          <div className="italic text-base text-[#CA7952] font-medium leading-snug">
                            <EditableText
                              value={tagline}
                              fieldPath={`department.${dept.id}.tagline`}
                              label="Department Tagline"
                              isEditMode={isEditMode}
                              onUpdate={(_, val) => onUpdateDepartment(dept.id, { tagline: val })}
                              as="p"
                            >
                              {tagline || (isEditMode ? 'Add tagline...' : '')}
                            </EditableText>
                          </div>
                        )}

                        {(description || isEditMode) && (
                          <div className="text-sm text-[#EDE9E0]/80 leading-relaxed line-clamp-3">
                            <EditableText
                              value={description}
                              fieldPath={`department.${dept.id}.introduction`}
                              label="Department Description"
                              isEditMode={isEditMode}
                              multiline
                              onUpdate={(_, val) =>
                                onUpdateDepartment(dept.id, { introduction: val })
                              }
                              as="p"
                            >
                              {description || (isEditMode ? 'Add description...' : '')}
                            </EditableText>
                          </div>
                        )}
                      </div>

                      <div className="space-y-5">
                        {/* Numeric Stat Counters */}
                        <div className="flex flex-wrap items-center gap-8">
                          <div>
                            <div className="text-2xl font-bold text-[#EDE9E0] tabular-nums leading-none">
                              {summary.projectCount}
                            </div>
                            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#EDE9E0]/55 mt-1.5">
                              PROJECTS
                            </div>
                          </div>

                          <div>
                            <div className="text-2xl font-bold text-[#EDE9E0] tabular-nums leading-none">
                              {summary.publicationCount}
                            </div>
                            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#EDE9E0]/55 mt-1.5">
                              PUBLICATIONS
                            </div>
                          </div>

                          {summary.productCount > 0 && (
                            <div>
                              <div className="text-2xl font-bold text-[#EDE9E0] tabular-nums leading-none">
                                {summary.productCount}
                              </div>
                              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#EDE9E0]/55 mt-1.5">
                                PRODUCTS
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Preview Work Cards (up to 2) */}
                        {summary.previewItems.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {summary.previewItems.map(item => (
                              <SpaLink
                                key={item.id}
                                href={item.href}
                                external={item.external}
                                onNavigate={onNavigate}
                                className="flex items-center gap-3 p-3 rounded-xl bg-[#042423]/75 border border-white/10 hover:border-[#25CDB6]/50 transition-colors cursor-pointer min-w-0"
                              >
                                <div className="w-8 h-8 rounded-lg bg-[#084442] text-[#25CDB6] font-bold text-xs flex items-center justify-center shrink-0">
                                  {item.badge}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-[#EDE9E0] truncate">
                                    {item.title}
                                  </div>
                                  <div className="text-[11px] text-[#EDE9E0]/55">
                                    {item.label}
                                  </div>
                                </div>
                              </SpaLink>
                            ))}
                          </div>
                        )}

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <SpaLink
                            href={getUnitHref(dept)}
                            onNavigate={onNavigate}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#17A491]/60 hover:border-[#25CDB6] hover:bg-[#17A491]/10 text-sm font-semibold text-[#25CDB6] transition-all cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <EditableText
                              value={exploreLabel}
                              fieldPath="departments.exploreButtonLabel"
                              label="Open Department Label"
                              isEditMode={isEditMode}
                              onUpdate={onUpdateContent}
                            />
                            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
                          </SpaLink>

                          {hasExpandableSectors && (
                            <button
                              type="button"
                              onClick={() => setSectorsExpanded(prev => !prev)}
                              aria-expanded={sectorsExpanded}
                              aria-controls="rdd-sectors-panel"
                              aria-label={sectorsExpanded ? 'Collapse sectors' : 'Expand sectors'}
                              title={sectorsExpanded ? 'Collapse sectors' : 'Expand sectors'}
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                sectorsExpanded
                                  ? 'border-[#25CDB6]/70 bg-[#17A491]/15 text-[#25CDB6]'
                                  : 'border-[#17A491]/40 bg-[#06302F]/60 text-[#25CDB6] hover:border-[#25CDB6] hover:bg-[#17A491]/10'
                              }`}
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-300 ${
                                  sectorsExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual Emblem / Full-Bleed Image Square Panel */}
                    <div
                      className={`order-1 ${
                        isEven ? 'lg:order-2' : 'lg:order-1'
                      } relative min-h-[280px] lg:min-h-full bg-gradient-to-br from-[#073A38]/85 via-[#042726] to-[#031D1C] border-b lg:border-b-0 ${
                        isEven ? 'lg:border-l' : 'lg:border-r'
                      } border-white/10 overflow-hidden`}
                    >
                      <DepartmentVisualPanel
                        department={dept}
                        logoSrc={emblemLogoSrc}
                      />
                    </div>
                  </div>

                  {/* Expandable Sectors Grid inside RDD (starts collapsed unless #sectors hash) */}
                  {hasExpandableSectors && (
                    <div id="sectors" className="relative z-10 scroll-mt-sticky">
                      <AnimatePresence initial={false}>
                        {sectorsExpanded && (
                          <motion.div
                            key="rdd-sectors-drawer"
                            id="rdd-sectors-panel"
                            initial={
                              prefersReducedMotion
                                ? { opacity: 1 }
                                : { height: 0, opacity: 0 }
                            }
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { height: 0, opacity: 0 }
                            }
                            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 sm:p-8 border-t border-white/10 bg-[#021716]/60">
                              <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[960px]:grid-cols-3 min-[1200px]:grid-cols-4 gap-3.5">
                                {sectors.map((sector, sIdx) => (
                                  <motion.div
                                    key={sector.id}
                                    initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.24, delay: sIdx * 0.03 }}
                                  >
                                    <SpaLink
                                      href={getUnitHref(sector)}
                                      onNavigate={onNavigate}
                                      className="group/sec p-3.5 rounded-xl bg-[#06302F]/85 border border-white/10 hover:border-[#25CDB6]/65 hover:-translate-y-0.5 transition-all flex items-center gap-3 cursor-pointer h-full"
                                    >
                                      <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow shrink-0 border border-white/10"
                                        style={{
                                          backgroundColor: sector.iconBgHex || '#FFFFFF',
                                          color: sector.colorHex || '#06302F'
                                        }}
                                      >
                                        <DepartmentIcon
                                          glyph={sector.iconGlyph}
                                          iconUrl={sector.iconUrl}
                                          size={20}
                                          color={sector.colorHex || '#06302F'}
                                        />
                                      </div>
                                      <h4 className="flex-1 min-w-0 text-sm font-semibold text-[#EDE9E0] group-hover/sec:text-[#25CDB6] transition-colors leading-snug break-words">
                                        {sector.name}
                                      </h4>
                                      <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0 transition-transform duration-200 group-hover/sec:translate-x-0.5" />
                                    </SpaLink>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
