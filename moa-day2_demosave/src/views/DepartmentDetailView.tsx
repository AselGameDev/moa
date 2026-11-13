import React, { useState, useEffect } from 'react';
import { Department, Project } from '../types';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { ArrowLeft, ArrowRight, FolderOpen, ChevronRight } from 'lucide-react';

interface DepartmentDetailViewProps {
  department: Department;
  allDepartments?: Department[];
  relatedProjects: Project[];
  onNavigate: (path: string) => void;
}

export const DepartmentDetailView: React.FC<DepartmentDetailViewProps> = ({
  department,
  allDepartments = [],
  relatedProjects,
  onNavigate
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'purpose' | 'mission' | 'focus' | 'initiatives' | 'projects'>('overview');

  // Compute Prev and Next departments
  const currentIndex = allDepartments.findIndex(d => d.id === department.id);
  const prevDept = currentIndex > 0 ? allDepartments[currentIndex - 1] : allDepartments[allDepartments.length - 1];
  const nextDept = currentIndex < allDepartments.length - 1 ? allDepartments[currentIndex + 1] : allDepartments[0];

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'purpose', label: 'Purpose' },
    { id: 'mission', label: 'Mission' },
    { id: 'focus', label: 'Areas of Focus' },
    { id: 'initiatives', label: 'Initiatives' },
    { id: 'projects', label: 'Related Projects' }
  ];

  return (
    <div className="min-h-screen">
      {/* Header with Atmospheric Background */}
      <AtmosphericBackground intensity="subtle" fadeToColor="transparent" className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Breadcrumbs: Departments / RDD / [Department Name] */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#EDE9E0]/60">
            <button
              onClick={() => onNavigate('/departments')}
              className="hover:text-[#25CDB6] transition-colors cursor-pointer"
            >
              Departments
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/30 shrink-0" />
            <button
              onClick={() => onNavigate('/departments')}
              className="hover:text-[#25CDB6] transition-colors cursor-pointer"
            >
              RDD
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/30 shrink-0" />
            <span className="text-[#EDE9E0] font-medium truncate max-w-[200px] sm:max-w-none">
              {department.name}
            </span>
          </nav>

          {/* Top Header */}
          <div className="flex items-center gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-[#EDE9E0]/10">
            <div className="shrink-0 shadow-lg rounded-full">
              <DepartmentIcon glyph={department.iconGlyph} size={64} />
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
        {/* Two-Column Layout: Left Navigation & Right Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Outline Navigation: horizontal chips on mobile, sticky sidebar on desktop */}
          <aside className="lg:col-span-3 lg:sticky lg:top-28 space-y-2 bg-[#031D1C]/60 p-3 sm:p-4 rounded-2xl border border-[#EDE9E0]/10">
            <span className="text-[11px] uppercase tracking-wider text-[#25CDB6] font-bold px-2 block mb-1">
              Department Outline
            </span>
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden gap-1.5 sm:gap-2 pb-1 lg:pb-0">
              {sections.map(sec => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection(sec.id as any);
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

          {/* Right Main Content */}
          <div className="lg:col-span-9 space-y-16">
            {/* Overview / Introduction */}
            <section id="overview" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#25CDB6]" />
                Overview
              </h2>
              <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed">
                {department.introduction ||
                  `The Department of ${department.name} operates under the Research, Discovery and Development (RDD) wing of Masters Of All. It serves as an active disciplinary branch addressing fundamental inquiries, field experiments, and societal implementations.`}
              </div>
            </section>

            {/* Purpose */}
            <section id="purpose" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#CA7952]" />
                Purpose
              </h2>
              <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed">
                {department.purpose ||
                  `To rigorously analyze core principles within ${department.name.toLowerCase()} and discover actionable methodologies that advance human understanding and societal progress.`}
              </div>
            </section>

            {/* Mission */}
            <section id="mission" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#17A491]" />
                Mission
              </h2>
              <div className="p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-sm sm:text-base text-[#EDE9E0]/85 leading-relaxed">
                {department.mission ||
                  `Fostering interdisciplinary collaboration, conducting evidence-based research, and translating insights into impactful solutions within the Masters Of All ecosystem.`}
              </div>
            </section>

            {/* Areas of Focus */}
            <section id="focus" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#6B8AFF]" />
                Areas of Focus
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
                  Specific focus tracks for this department are being structured by the academic leads.
                </div>
              )}
            </section>

            {/* Initiatives */}
            <section id="initiatives" className="space-y-4">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#D0A873]" />
                Active Initiatives
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
                  Initiatives and research programs under this department will be published upon institutional review.
                </div>
              )}
            </section>

            {/* Related Projects */}
            <section id="projects" className="space-y-4 pt-6 border-t border-[#EDE9E0]/10">
              <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight">
                Related Projects
              </h2>

              {relatedProjects.length === 0 ? (
                <div className="p-10 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 text-center space-y-3">
                  <FolderOpen className="w-10 h-10 text-[#EDE9E0]/30 mx-auto" />
                  <p className="text-sm text-[#EDE9E0]/70">
                    No active projects currently cataloged under this department.
                  </p>
                  <p className="text-xs text-[#EDE9E0]/40">
                    Projects will appear here as soon as approved and published by the editorial committee.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedProjects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => onNavigate(`/projects/${proj.slug}`)}
                      className="p-6 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 hover:border-[#25CDB6] transition-colors cursor-pointer group space-y-2"
                    >
                      <h3 className="font-bold text-lg text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-[#EDE9E0]/70 line-clamp-2">
                        {proj.shortDescription}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Previous / Next Department Footer Navigation */}
            {allDepartments.length > 1 && (
              <div className="pt-12 border-t border-[#EDE9E0]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                {prevDept && (
                  <button
                    onClick={() => onNavigate(`/departments/${prevDept.slug}`)}
                    className="p-4 rounded-xl border border-[#EDE9E0]/15 hover:border-[#25CDB6] hover:bg-white/5 transition-all text-left flex items-center gap-3 w-full sm:w-auto cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#25CDB6]" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#EDE9E0]/50 block">Previous</span>
                      <span className="text-sm font-bold text-[#EDE9E0]">{prevDept.name}</span>
                    </div>
                  </button>
                )}

                {nextDept && (
                  <button
                    onClick={() => onNavigate(`/departments/${nextDept.slug}`)}
                    className="p-4 rounded-xl border border-[#EDE9E0]/15 hover:border-[#25CDB6] hover:bg-white/5 transition-all text-right flex items-center gap-3 w-full sm:w-auto justify-end cursor-pointer ml-auto"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#EDE9E0]/50 block">Next</span>
                      <span className="text-sm font-bold text-[#EDE9E0]">{nextDept.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#25CDB6]" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
