import React, { useState } from 'react';
import { Department, Project, Publication, Product } from '../types';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { SpaLink } from '../components/SpaLink';
import { sanitizeSafeUrl } from '../shared/url';
import { ArrowLeft, ArrowRight, FolderOpen, ChevronRight, FileText, Package, ExternalLink } from 'lucide-react';

interface DepartmentDetailViewProps {
  department: Department;
  allDepartments?: Department[];
  relatedProjects: Project[];
  relatedPublications?: Publication[];
  relatedProducts?: Product[];
  onNavigate: (path: string) => void;
}

export const DepartmentDetailView: React.FC<DepartmentDetailViewProps> = ({
  department,
  allDepartments = [],
  relatedProjects,
  relatedPublications = [],
  relatedProducts = [],
  onNavigate
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'purpose' | 'mission' | 'focus' | 'initiatives' | 'projects'>('overview');

  const currentIndex = allDepartments.findIndex(d => d.id === department.id);
  const prevDept = currentIndex > 0 ? allDepartments[currentIndex - 1] : allDepartments[allDepartments.length - 1];
  const nextDept = currentIndex < allDepartments.length - 1 ? allDepartments[currentIndex + 1] : allDepartments[0];

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'purpose', label: 'Purpose' },
    { id: 'mission', label: 'Mission' },
    { id: 'focus', label: 'Areas of Focus' },
    { id: 'initiatives', label: 'Initiatives' },
    { id: 'projects', label: 'Related Work' }
  ];

  const hasRelatedWork =
    relatedProjects.length > 0 || relatedPublications.length > 0 || relatedProducts.length > 0;

  return (
    <div className="min-h-screen">
      <AtmosphericBackground intensity="subtle" fadeToColor="transparent" className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#EDE9E0]/60">
            <SpaLink href="/departments" onNavigate={onNavigate} className="hover:text-[#25CDB6] transition-colors cursor-pointer">
              Departments
            </SpaLink>
            <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/30 shrink-0" />
            <SpaLink href="/departments" onNavigate={onNavigate} className="hover:text-[#25CDB6] transition-colors cursor-pointer">
              RDD
            </SpaLink>
            <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/30 shrink-0" />
            <span className="text-[#EDE9E0] font-medium truncate max-w-[200px] sm:max-w-none">
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
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-[#CA7952] font-semibold">
                RDD Research Department
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight leading-tight">
                {department.name}
              </h1>
            </div>
          </div>
        </div>
      </AtmosphericBackground>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <aside className="lg:col-span-3 lg:sticky lg:top-28 space-y-2 bg-[#031D1C]/60 p-3 sm:p-4 rounded-2xl border border-[#EDE9E0]/10">
            <span className="text-[11px] uppercase tracking-wider text-[#25CDB6] font-bold px-2 block mb-1">
              Department Outline
            </span>
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible no-scrollbar gap-1.5 sm:gap-2 pb-1 lg:pb-0">
              {sections.map(sec => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={e => {
                    e.preventDefault();
                    setActiveSection(sec.id as typeof activeSection);
                    const el = document.getElementById(sec.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`block px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeSection === sec.id
                      ? 'bg-[#17A491]/20 text-[#25CDB6] border-l-0 lg:border-l-2 border-[#25CDB6]'
                      : 'text-[#EDE9E0]/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {sec.label}
                </a>
              ))}
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-16">
            <section id="overview" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#25CDB6]" />
                <span>Overview</span>
              </h2>
              <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed">
                {department.introduction ||
                  `The Department of ${department.name} operates under the Research, Discovery and Development (RDD) wing of Masters Of All.`}
              </div>
            </section>

            <section id="purpose" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#CA7952]" />
                <span>Purpose</span>
              </h2>
              <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed">
                {department.purpose ||
                  `Advancing foundational research and applied solutions within ${department.name.toLowerCase()}.`}
              </div>
            </section>

            <section id="mission" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#17A491]" />
                <span>Mission</span>
              </h2>
              <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed">
                {department.mission ||
                  `Fostering interdisciplinary collaboration, evidence-based research, and practical solutions within Masters Of All.`}
              </div>
            </section>

            <section id="focus" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#6B8AFF]" />
                <span>Areas of Focus</span>
              </h2>
              {department.areasOfFocus && department.areasOfFocus.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {department.areasOfFocus.map((focus, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0]/85 font-medium flex items-start gap-3"
                    >
                      <span className="text-[#25CDB6] font-mono text-xs mt-0.5">0{idx + 1}.</span>
                      <span>{focus}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0]/70 italic">
                  Focus tracks for this department have not been published yet.
                </div>
              )}
            </section>

            <section id="initiatives" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#D0A873]" />
                <span>Active Initiatives</span>
              </h2>
              {department.initiatives && department.initiatives.length > 0 ? (
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
              ) : (
                <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0]/70 italic">
                  Active initiatives under this department will appear here once published.
                </div>
              )}
            </section>

            <section id="projects" className="space-y-6 pt-6 border-t border-[#EDE9E0]/10">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight">
                Related Work
              </h2>

              {!hasRelatedWork ? (
                <div className="p-10 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-center space-y-3">
                  <FolderOpen className="w-10 h-10 text-[#EDE9E0]/30 mx-auto" />
                  <p className="text-sm text-[#EDE9E0]/70">
                    No published work currently cataloged under this department.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {relatedProjects.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {relatedProjects.map(proj => (
                        <SpaLink
                          key={proj.id}
                          href={`/projects/${proj.slug}`}
                          onNavigate={onNavigate}
                          className="p-6 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 hover:border-[#25CDB6] transition-colors cursor-pointer group space-y-2 block"
                        >
                          <h3 className="font-bold text-lg text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors">
                            {proj.title}
                          </h3>
                          <p className="text-xs text-[#EDE9E0]/70 line-clamp-2">
                            {proj.shortDescription}
                          </p>
                        </SpaLink>
                      ))}
                    </div>
                  )}

                  {relatedPublications.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[#D0A873] flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Publications</span>
                      </h3>
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
                                <h4 className="font-bold text-sm text-[#EDE9E0] group-hover:text-[#D0A873] truncate">
                                  {pub.title}
                                </h4>
                                <p className="text-xs text-[#EDE9E0]/60 truncate">{pub.authors}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-[#D0A873] shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {relatedProducts.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" />
                        <span>Products</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {relatedProducts.map(prod => (
                          <SpaLink
                            key={prod.id}
                            href={`/products/${prod.slug}`}
                            onNavigate={onNavigate}
                            className="p-5 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 hover:border-[#25CDB6] transition-colors block space-y-1 group"
                          >
                            <h4 className="font-bold text-sm text-[#EDE9E0] group-hover:text-[#25CDB6]">
                              {prod.name}
                            </h4>
                            <p className="text-xs text-[#EDE9E0]/65 line-clamp-2">{prod.tagline || prod.shortDescription}</p>
                          </SpaLink>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {allDepartments.length > 1 && (
              <div className="pt-12 border-t border-[#EDE9E0]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                {prevDept && (
                  <SpaLink
                    href={`/departments/${prevDept.slug}`}
                    onNavigate={onNavigate}
                    className="p-4 rounded-xl border border-[#EDE9E0]/15 hover:border-[#25CDB6] hover:bg-white/5 transition-all text-left flex items-center gap-3 w-full sm:w-auto cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#25CDB6]" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#EDE9E0]/50 block">Previous</span>
                      <span className="text-sm font-bold text-[#EDE9E0]">{prevDept.name}</span>
                    </div>
                  </SpaLink>
                )}

                {nextDept && (
                  <SpaLink
                    href={`/departments/${nextDept.slug}`}
                    onNavigate={onNavigate}
                    className="p-4 rounded-xl border border-[#EDE9E0]/15 hover:border-[#25CDB6] hover:bg-white/5 transition-all text-right flex items-center gap-3 w-full sm:w-auto justify-end cursor-pointer ml-auto"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#EDE9E0]/50 block">Next</span>
                      <span className="text-sm font-bold text-[#EDE9E0]">{nextDept.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#25CDB6]" />
                  </SpaLink>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
