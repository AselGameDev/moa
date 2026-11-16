import React, { useMemo, useState, useEffect } from 'react';
import { Department, Project, Publication, Product } from '../types';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { DepartmentLogo } from '../components/DepartmentLogo';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EmptyState } from '../components/EmptyState';
import { SpaLink } from '../components/SpaLink';
import { sanitizeSafeUrl } from '../shared/url';
import { getUnitHref, isRddDepartment, isSector } from '../utils/orgHelpers';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FileText,
  Layers,
  Package,
  ExternalLink
} from 'lucide-react';

interface DepartmentDetailViewProps {
  department: Department;
  allDepartments?: Department[];
  relatedProjects: Project[];
  relatedPublications?: Publication[];
  relatedProducts?: Product[];
  rddLogoUrl?: string;
  onNavigate: (path: string) => void;
}

type RelatedTab = 'projects' | 'publications' | 'products';

export const DepartmentDetailView: React.FC<DepartmentDetailViewProps> = ({
  department,
  allDepartments = [],
  relatedProjects,
  relatedPublications = [],
  relatedProducts = [],
  rddLogoUrl = '/5320.jpg',
  onNavigate
}) => {
  const unitIsSector = isSector(department);
  const unitIsRdd = !unitIsSector && isRddDepartment(department);

  // Filter sibling navigation to the same org level (departments vs RDD sectors)
  const siblings = useMemo(
    () => allDepartments.filter(d => d.published && !d.deletedAt && isSector(d) === unitIsSector),
    [allDepartments, unitIsSector]
  );
  const currentIndex = siblings.findIndex(d => d.id === department.id);
  const prevUnit =
    siblings.length > 1
      ? currentIndex > 0
        ? siblings[currentIndex - 1]
        : siblings[siblings.length - 1]
      : null;
  const nextUnit =
    siblings.length > 1
      ? currentIndex < siblings.length - 1
        ? siblings[currentIndex + 1]
        : siblings[0]
      : null;

  const hasRelatedWork =
    relatedProjects.length > 0 || relatedPublications.length > 0 || relatedProducts.length > 0;

  // Non-RDD (or RDD division) Department tabs — render ONLY tabs containing published items
  const availableWorkTabs = useMemo(() => {
    const list: Array<{ id: RelatedTab; label: string; count: number }> = [];
    if (relatedProjects.length > 0) {
      list.push({ id: 'projects', label: 'Projects', count: relatedProjects.length });
    }
    if (relatedPublications.length > 0) {
      list.push({ id: 'publications', label: 'Publications', count: relatedPublications.length });
    }
    if (relatedProducts.length > 0) {
      list.push({ id: 'products', label: 'Products', count: relatedProducts.length });
    }
    return list;
  }, [relatedProjects.length, relatedPublications.length, relatedProducts.length]);

  const [activeWorkTab, setActiveWorkTab] = useState<RelatedTab>(
    () => availableWorkTabs[0]?.id || 'projects'
  );

  useEffect(() => {
    if (availableWorkTabs.length > 0 && !availableWorkTabs.some(t => t.id === activeWorkTab)) {
      setActiveWorkTab(availableWorkTabs[0].id);
    }
  }, [availableWorkTabs, activeWorkTab]);

  // RDD Sector dynamic sections (render ONLY non-empty sections, outline lists ONLY rendered sections)
  const sectorSections = useMemo(() => {
    if (!unitIsSector) return [];
    const list: Array<{ id: string; label: string; dotColor: string }> = [];
    if (department.introduction?.trim()) {
      list.push({ id: 'overview', label: 'Overview', dotColor: '#25CDB6' });
    }
    if (department.purpose?.trim()) {
      list.push({ id: 'purpose', label: 'Purpose', dotColor: '#CA7952' });
    }
    if (department.mission?.trim()) {
      list.push({ id: 'mission', label: 'Mission', dotColor: '#17A491' });
    }
    if (department.areasOfFocus && department.areasOfFocus.length > 0) {
      list.push({ id: 'focus', label: 'Areas of Focus', dotColor: '#6B8AFF' });
    }
    if (department.initiatives && department.initiatives.length > 0) {
      list.push({ id: 'initiatives', label: 'Initiatives', dotColor: '#D0A873' });
    }
    if (hasRelatedWork) {
      list.push({ id: 'related-work', label: 'Related Work', dotColor: '#25CDB6' });
    }
    return list;
  }, [unitIsSector, department, hasRelatedWork]);

  const [activeSectorSection, setActiveSectorSection] = useState<string>(
    () => sectorSections[0]?.id || 'overview'
  );

  useEffect(() => {
    if (sectorSections.length > 0 && !sectorSections.some(s => s.id === activeSectorSection)) {
      setActiveSectorSection(sectorSections[0].id);
    }
  }, [sectorSections, activeSectorSection]);

  // Helper to render unified work cards for both page types
  const renderWorkLists = (filterTab?: RelatedTab) => {
    const showProj = (!filterTab || filterTab === 'projects') && relatedProjects.length > 0;
    const showPub = (!filterTab || filterTab === 'publications') && relatedPublications.length > 0;
    const showProd = (!filterTab || filterTab === 'products') && relatedProducts.length > 0;

    return (
      <div className="space-y-8">
        {showProj && (
          <div className="space-y-3">
            {!filterTab && (
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Projects</span>
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedProjects.map(proj => (
                <SpaLink
                  key={proj.id}
                  href={`/projects/${proj.slug}`}
                  onNavigate={onNavigate}
                  className="p-6 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 hover:border-[#25CDB6] transition-colors cursor-pointer group space-y-2 block"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#EDE9E0]/65">
                    <span>{proj.status}</span>
                    {proj.startDate && <span>{proj.startDate.slice(0, 7)}</span>}
                  </div>
                  <h4 className="font-bold text-lg text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors">
                    {proj.title}
                  </h4>
                  {proj.shortDescription && (
                    <p className="text-xs text-[#EDE9E0]/75 line-clamp-2">{proj.shortDescription}</p>
                  )}
                </SpaLink>
              ))}
            </div>
          </div>
        )}

        {showPub && (
          <div className="space-y-3">
            {!filterTab && (
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#D0A873] flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Publications</span>
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPublications.map(pub => {
                const pdfHref = sanitizeSafeUrl(pub.pdfUrl);
                return (
                  <a
                    key={pub.id}
                    href={pdfHref || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-5 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 hover:border-[#D0A873] transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="text-[11px] font-mono uppercase text-[#D0A873]">
                        {pub.publicationType || 'Paper'}
                      </span>
                      <h4 className="font-bold text-sm text-[#EDE9E0] group-hover:text-[#D0A873] line-clamp-2">
                        {pub.title}
                      </h4>
                      {pub.authors && (
                        <p className="text-xs text-[#EDE9E0]/70 truncate">{pub.authors}</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#D0A873] shrink-0 mt-1" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {showProd && (
          <div className="space-y-3">
            {!filterTab && (
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                <span>Products</span>
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedProducts.map(prod => (
                <SpaLink
                  key={prod.id}
                  href={`/products/${prod.slug}`}
                  onNavigate={onNavigate}
                  className="p-5 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 hover:border-[#25CDB6] transition-colors block space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-xs text-[#EDE9E0]/65">
                    <span>{prod.status}</span>
                    {prod.version && <span className="font-mono">v{prod.version}</span>}
                  </div>
                  <h4 className="font-bold text-sm text-[#EDE9E0] group-hover:text-[#25CDB6]">
                    {prod.name}
                  </h4>
                  {(prod.tagline || prod.shortDescription) && (
                    <p className="text-xs text-[#EDE9E0]/70 line-clamp-2">
                      {prod.tagline || prod.shortDescription}
                    </p>
                  )}
                </SpaLink>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // =====================================================================
  // PAGE TYPE 1: NON-RDD / DIVISION DEPARTMENT PAGE
  // =====================================================================
  if (!unitIsSector) {
    const deptWithLogo =
      unitIsRdd && !department.customLogoUrl
        ? { ...department, customLogoUrl: rddLogoUrl || '/5320.jpg' }
        : department;
    const aboutText = (department.introduction || department.purpose || '').trim();

    return (
      <div className="min-h-screen">
        {/* 1. Hero */}
        <AtmosphericBackground intensity="subtle" fadeToColor="transparent" className="py-12 lg:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#EDE9E0]/70"
            >
              <SpaLink href="/" onNavigate={onNavigate} className="hover:text-[#25CDB6] transition-colors cursor-pointer">
                Masters Of All
              </SpaLink>
              <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
              <SpaLink
                href="/departments"
                onNavigate={onNavigate}
                className="hover:text-[#25CDB6] transition-colors cursor-pointer"
              >
                Departments
              </SpaLink>
              <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
              <span className="text-[#EDE9E0] font-medium truncate max-w-[220px] sm:max-w-none">
                {department.name}
              </span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b border-[#EDE9E0]/10">
              <div className="shrink-0">
                <DepartmentLogo department={deptWithLogo} size={96} />
              </div>
              <div className="space-y-2 min-w-0">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight leading-tight">
                  {department.name}
                </h1>
                {department.tagline && (
                  <p className="text-base sm:text-lg font-medium text-[#CA7952]">
                    {department.tagline}
                  </p>
                )}
              </div>
            </div>
          </div>
        </AtmosphericBackground>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 space-y-16">
          {/* 2. About (70ch max reading width) */}
          {aboutText && (
            <section className="space-y-4">
              <h2 className="text-xs uppercase tracking-widest font-bold text-[#25CDB6]">
                About
              </h2>
              <p className="text-base sm:text-lg text-[#EDE9E0]/85 leading-relaxed max-w-[70ch]">
                {aboutText}
              </p>
            </section>
          )}

          {/* RDD Sectors link if viewing RDD's own department page */}
          {unitIsRdd && (
            <div className="p-6 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[#EDE9E0]">Research Sectors</h2>
                <p className="text-sm text-[#EDE9E0]/75">
                  Explore all research and innovation sectors inside {department.name}.
                </p>
              </div>
              <SpaLink
                href="/departments#sectors"
                onNavigate={onNavigate}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] text-sm font-bold shrink-0 cursor-pointer"
              >
                <span>View RDD Sectors</span>
                <ArrowRight className="w-4 h-4" />
              </SpaLink>
            </div>
          )}

          {/* 3. Related Work (Render ONLY tabs with published items) */}
          {availableWorkTabs.length > 0 && (
            <section className="space-y-6 pt-6 border-t border-[#EDE9E0]/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight">Related Work</h2>

                {availableWorkTabs.length > 1 && (
                  <div
                    role="tablist"
                    aria-label="Related work categories"
                    className="flex flex-wrap items-center gap-2 p-1 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10"
                  >
                    {availableWorkTabs.map(tab => {
                      const active = activeWorkTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setActiveWorkTab(tab.id)}
                          className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#17A491] text-[#031D1C]'
                              : 'text-[#EDE9E0]/75 hover:text-[#EDE9E0]'
                          }`}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {renderWorkLists(activeWorkTab)}
            </section>
          )}

          {/* Prev / Next Department navigation */}
          {siblings.length > 1 && (
            <div className="pt-10 border-t border-[#EDE9E0]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              {prevUnit && (
                <SpaLink
                  href={getUnitHref(prevUnit)}
                  onNavigate={onNavigate}
                  className="min-h-[56px] p-4 rounded-xl border border-[#EDE9E0]/15 hover:border-[#25CDB6] hover:bg-white/5 transition-all text-left flex items-center gap-3 w-full sm:w-auto cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#25CDB6] shrink-0" />
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#EDE9E0]/65 block">
                      Previous
                    </span>
                    <span className="text-sm font-bold text-[#EDE9E0]">{prevUnit.name}</span>
                  </div>
                </SpaLink>
              )}

              {nextUnit && (
                <SpaLink
                  href={getUnitHref(nextUnit)}
                  onNavigate={onNavigate}
                  className="min-h-[56px] p-4 rounded-xl border border-[#EDE9E0]/15 hover:border-[#25CDB6] hover:bg-white/5 transition-all text-right flex items-center gap-3 w-full sm:w-auto justify-end cursor-pointer ml-auto"
                >
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#EDE9E0]/65 block">
                      Next
                    </span>
                    <span className="text-sm font-bold text-[#EDE9E0]">{nextUnit.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0" />
                </SpaLink>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================================
  // PAGE TYPE 2: RDD SECTOR PAGE (/sectors/:slug)
  // =====================================================================
  return (
    <div className="min-h-screen">
      <AtmosphericBackground intensity="subtle" fadeToColor="transparent" className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Breadcrumb: Masters Of All > RDD > Sector */}
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#EDE9E0]/70"
          >
            <SpaLink href="/" onNavigate={onNavigate} className="hover:text-[#25CDB6] transition-colors cursor-pointer">
              Masters Of All
            </SpaLink>
            <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
            <SpaLink
              href="/departments#sectors"
              onNavigate={onNavigate}
              className="hover:text-[#25CDB6] transition-colors cursor-pointer"
            >
              RDD
            </SpaLink>
            <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
            <span className="text-[#EDE9E0] font-medium truncate max-w-[220px] sm:max-w-none">
              {department.name}
            </span>
          </nav>

          <div className="flex items-center gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-[#EDE9E0]/10">
            <div className="shrink-0 shadow-lg rounded-full">
              <DepartmentIcon
                glyph={department.iconGlyph}
                iconUrl={department.iconUrl}
                color={department.colorHex}
                bgColor={department.iconBgHex}
                showBg
                size={64}
              />
            </div>
            <div className="space-y-1 min-w-0">
              <span className="text-xs uppercase tracking-wider text-[#CA7952] font-semibold block">
                RDD Sector
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight leading-tight">
                {department.name}
              </h1>
            </div>
          </div>
        </div>
      </AtmosphericBackground>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24">
        {sectorSections.length === 0 ? (
          <EmptyState
            title="Sector details coming soon"
            description="Content and related work for this RDD sector will appear here once published."
            actionLabel="Back to RDD Sectors"
            onAction={() => onNavigate('/departments#sectors')}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Sticky Outline Sidebar listing ONLY rendered sections */}
            <aside className="lg:col-span-3 lg:sticky lg:top-28 space-y-2 bg-[#031D1C]/60 p-3 sm:p-4 rounded-2xl border border-[#EDE9E0]/10">
              <span className="text-[11px] uppercase tracking-wider text-[#25CDB6] font-bold px-2 block mb-1">
                Sector Outline
              </span>
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible no-scrollbar gap-1.5 sm:gap-2 pb-1 lg:pb-0">
                {sectorSections.map(sec => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={e => {
                      e.preventDefault();
                      setActiveSectorSection(sec.id);
                      const el = document.getElementById(sec.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`min-h-[40px] flex items-center px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeSectorSection === sec.id
                        ? 'bg-[#17A491]/20 text-[#25CDB6] border-l-0 lg:border-l-2 border-[#25CDB6]'
                        : 'text-[#EDE9E0]/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {sec.label}
                  </a>
                ))}
              </div>
            </aside>

            {/* Reading Column (max-w-[720px]) */}
            <div className="lg:col-span-9 max-w-[720px] space-y-14">
              {department.introduction?.trim() && (
                <section id="overview" className="scroll-mt-[96px] space-y-4">
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#25CDB6]" />
                    <span>Overview</span>
                  </h2>
                  <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line">
                    {department.introduction}
                  </div>
                </section>
              )}

              {department.purpose?.trim() && (
                <section id="purpose" className="scroll-mt-[96px] space-y-4">
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#CA7952]" />
                    <span>Purpose</span>
                  </h2>
                  <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line">
                    {department.purpose}
                  </div>
                </section>
              )}

              {department.mission?.trim() && (
                <section id="mission" className="scroll-mt-[96px] space-y-4">
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#17A491]" />
                    <span>Mission</span>
                  </h2>
                  <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line">
                    {department.mission}
                  </div>
                </section>
              )}

              {department.areasOfFocus && department.areasOfFocus.length > 0 && (
                <section id="focus" className="scroll-mt-[96px] space-y-4">
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#6B8AFF]" />
                    <span>Areas of Focus</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {department.areasOfFocus.map((focus, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0]/85 font-medium flex items-start gap-3"
                      >
                        <span className="text-[#25CDB6] font-mono text-xs mt-0.5">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span>{focus}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {department.initiatives && department.initiatives.length > 0 && (
                <section id="initiatives" className="scroll-mt-[96px] space-y-4">
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#D0A873]" />
                    <span>Initiatives</span>
                  </h2>
                  <div className="space-y-3">
                    {department.initiatives.map((init, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0]/85"
                      >
                        {init}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {hasRelatedWork && (
                <section id="related-work" className="scroll-mt-[96px] space-y-6 pt-6 border-t border-[#EDE9E0]/10">
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight">
                    Related Work
                  </h2>
                  {renderWorkLists()}
                </section>
              )}

              {siblings.length > 1 && (
                <div className="pt-10 border-t border-[#EDE9E0]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {prevUnit && (
                    <SpaLink
                      href={getUnitHref(prevUnit)}
                      onNavigate={onNavigate}
                      className="min-h-[56px] p-4 rounded-xl border border-[#EDE9E0]/15 hover:border-[#25CDB6] hover:bg-white/5 transition-all text-left flex items-center gap-3 w-full sm:w-auto cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-[#25CDB6] shrink-0" />
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-[#EDE9E0]/65 block">
                          Previous Sector
                        </span>
                        <span className="text-sm font-bold text-[#EDE9E0]">{prevUnit.name}</span>
                      </div>
                    </SpaLink>
                  )}

                  {nextUnit && (
                    <SpaLink
                      href={getUnitHref(nextUnit)}
                      onNavigate={onNavigate}
                      className="min-h-[56px] p-4 rounded-xl border border-[#EDE9E0]/15 hover:border-[#25CDB6] hover:bg-white/5 transition-all text-right flex items-center gap-3 w-full sm:w-auto justify-end cursor-pointer ml-auto"
                    >
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-[#EDE9E0]/65 block">
                          Next Sector
                        </span>
                        <span className="text-sm font-bold text-[#EDE9E0]">{nextUnit.name}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0" />
                    </SpaLink>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
