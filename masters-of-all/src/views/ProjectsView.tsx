import React, { useEffect, useMemo, useState } from 'react';
import { Search, FileText, ExternalLink, Layers } from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { AnimatedAtomGraphic } from '../components/AnimatedAtomGraphic';
import { EditableText } from '../components/EditableText';
import { EmptyState } from '../components/EmptyState';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { sanitizeSafeUrl } from '../shared/url';
import { Project, Publication, Department, SiteContent } from '../types';
import { getSectorParentId, splitOrgUnits } from '../utils/orgHelpers';
import { getOrGeneratePdfThumbnail } from '../utils/pdfThumbnail';

interface ProjectsViewProps {
  projects: Project[];
  publications?: Publication[];
  departments: Department[];
  content?: SiteContent;
  loading?: boolean;
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
}

type ProjectsTab = 'all' | 'projects' | 'publications';

interface PublicationThumbnailProps {
  pub: Publication;
}

const PublicationThumbnail: React.FC<PublicationThumbnailProps> = ({ pub }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(
    () => sanitizeSafeUrl(pub.thumbnailUrl) || null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const existing = sanitizeSafeUrl(pub.thumbnailUrl);
    if (existing) {
      setThumbUrl(existing);
      setFailed(false);
      return;
    }
    const safePdf = sanitizeSafeUrl(pub.pdfUrl);
    if (!safePdf) {
      setFailed(true);
      return;
    }

    let cancelled = false;
    getOrGeneratePdfThumbnail(pub.id, safePdf)
      .then(generated => {
        if (cancelled) return;
        if (generated) {
          setThumbUrl(generated);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [pub.id, pub.thumbnailUrl, pub.pdfUrl]);

  if (thumbUrl && !failed) {
    return (
      <img
        src={thumbUrl}
        alt={pub.title}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  // Minimalist centered icon fallback matching Project & Product covers cleanly
  return (
    <div className="w-full h-full flex items-center justify-center opacity-40">
      <FileText className="w-10 h-10 text-[#D0A873]" />
    </div>
  );
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  publications = [],
  departments,
  content: rawContent,
  loading = false,
  onNavigate,
  isEditMode = false,
  onUpdateContent = () => {}
}) => {
  const { content } = useContent(rawContent);
  const [activeTab, setActiveTab] = useState<ProjectsTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const activeUnits = useMemo(
    () => departments.filter(d => d.published && !d.deletedAt),
    [departments]
  );
  const { departments: deptList, sectors: sectorList } = useMemo(
    () => splitOrgUnits(activeUnits),
    [activeUnits]
  );

  const unitMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach(d => map.set(d.id, d));
    return map;
  }, [departments]);

  const selectedDeptObj =
    selectedDeptId !== 'all' ? unitMap.get(selectedDeptId) : undefined;
  const selectedDeptSectors = useMemo(
    () =>
      selectedDeptId !== 'all'
        ? sectorList.filter(s => getSectorParentId(s) === selectedDeptId)
        : [],
    [selectedDeptId, sectorList]
  );

  // Reset sector filter when selected department changes or has no sectors
  useEffect(() => {
    if (
      selectedSectorId !== 'all' &&
      !selectedDeptSectors.some(s => s.id === selectedSectorId)
    ) {
      setSelectedSectorId('all');
    }
  }, [selectedDeptId, selectedDeptSectors, selectedSectorId]);

  const q = searchQuery.trim().toLowerCase();

  const matchesOrgFilters = (deptIds: string[] = [], secIds: string[] = []) => {
    if (selectedDeptId === 'all') return true;

    if (selectedDeptSectors.length > 0) {
      if (selectedSectorId !== 'all') {
        return secIds.includes(selectedSectorId) || deptIds.includes(selectedSectorId);
      }
      const sectorIdsSet = new Set(selectedDeptSectors.map(s => s.id));
      return (
        deptIds.includes(selectedDeptId) ||
        secIds.some(id => sectorIdsSet.has(id)) ||
        deptIds.some(id => sectorIdsSet.has(id))
      );
    }

    return deptIds.includes(selectedDeptId);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (project.deletedAt) return false;
      const matchesSearch =
        !q ||
        project.title.toLowerCase().includes(q) ||
        (project.shortDescription || '').toLowerCase().includes(q) ||
        (project.category || '').toLowerCase().includes(q) ||
        (project.tags || []).some(t => t.toLowerCase().includes(q));
      const matchesOrg = matchesOrgFilters(project.departmentIds, project.sectorIds);
      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
      return matchesSearch && matchesOrg && matchesStatus;
    });
  }, [projects, q, selectedDeptId, selectedSectorId, selectedStatus, selectedDeptSectors]);

  const filteredPublications = useMemo(() => {
    return publications.filter(pub => {
      if (pub.deletedAt) return false;
      const matchesSearch =
        !q ||
        pub.title.toLowerCase().includes(q) ||
        (pub.authors || '').toLowerCase().includes(q) ||
        (pub.abstract || '').toLowerCase().includes(q) ||
        (pub.publicationType || '').toLowerCase().includes(q) ||
        (pub.tags || []).some(t => t.toLowerCase().includes(q));
      const matchesOrg = matchesOrgFilters(pub.departmentIds, pub.sectorIds);
      return matchesSearch && matchesOrg;
    });
  }, [publications, q, selectedDeptId, selectedSectorId, selectedDeptSectors]);

  const hasAnyProjects = projects.some(p => !p.deletedAt);
  const hasAnyPublications = publications.some(p => !p.deletedAt);
  const totalBaseCount =
    projects.filter(p => !p.deletedAt).length + publications.filter(p => !p.deletedAt).length;

  const showProjects =
    (activeTab === 'all' || activeTab === 'projects') && filteredProjects.length > 0;
  const showPublications =
    (activeTab === 'all' || activeTab === 'publications') && filteredPublications.length > 0;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDeptId('all');
    setSelectedSectorId('all');
    setSelectedStatus('all');
    setActiveTab('all');
  };

  const statusOptions = useMemo(() => {
    const set = new Set<string>(['Concept', 'In Development', 'Active', 'Completed', 'On Hold']);
    projects.forEach(p => {
      if (p.status) set.add(p.status);
    });
    return Array.from(set);
  }, [projects]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <AtmosphericBackground
        intensity="subtle"
        fadeToColor="transparent"
        className="pt-14 pb-10 lg:pt-20 lg:pb-12 border-b border-[#EDE9E0]/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
              <EditableText
                value={content.work.heading === 'Our Work' ? 'Projects' : content.work.heading || 'Projects'}
                fieldPath="work.heading"
                label="Projects Heading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </h1>
            <div className="text-base sm:text-lg text-[#EDE9E0]/85 leading-relaxed">
              <EditableText
                value={content.work.subtitle}
                fieldPath="work.subtitle"
                label="Projects Subtext"
                multiline
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </div>
          </div>
        </div>
      </AtmosphericBackground>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10 pb-24 pt-8 sm:pt-12">
        {/* Filter Bar & Tabs */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/25 space-y-4">
          {/* Single-row desktop filter bar: 1. Search, 2. Department, 3. Sector (only when RDD), 4. Status */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#EDE9E0]/55 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={content.work.searchPlaceholder || 'Search projects…'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search projects"
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
                <option value="all">
                  {content.work.allDepartmentsOption || 'All departments'}
                </option>
                {deptList.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedDeptSectors.length > 0 && (
              <div className="w-full lg:w-56 shrink-0">
                <select
                  value={selectedSectorId}
                  onChange={e => setSelectedSectorId(e.target.value)}
                  aria-label="Filter by sector"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#06302F] border border-[#25CDB6]/40 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
                >
                  <option value="all">
                    All {selectedDeptObj?.shortName || selectedDeptObj?.name || ''} sectors
                  </option>
                  {selectedDeptSectors.map(sector => (
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
                <option value="all">{content.work.allStatusesOption || 'All statuses'}</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs: All, Projects, Publications with counts (shown only when items exist) */}
          {totalBaseCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#17A491] text-[#031D1C]'
                    : 'bg-white/5 text-[#EDE9E0]/75 hover:text-white'
                }`}
              >
                {content.work.allTabLabel || 'All'} ({filteredProjects.length + filteredPublications.length})
              </button>

              {hasAnyProjects && (
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    activeTab === 'projects'
                      ? 'bg-[#17A491] text-[#031D1C]'
                      : 'bg-white/5 text-[#EDE9E0]/75 hover:text-white'
                  }`}
                >
                  {content.work.projectsTabLabel || 'Projects'} ({filteredProjects.length})
                </button>
              )}

              {hasAnyPublications && (
                <button
                  type="button"
                  onClick={() => setActiveTab('publications')}
                  className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    activeTab === 'publications'
                      ? 'bg-[#17A491] text-[#031D1C]'
                      : 'bg-white/5 text-[#EDE9E0]/75 hover:text-white'
                  }`}
                >
                  {content.work.publicationsTabLabel || 'Publications'} ({filteredPublications.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content / Loading Atom / Filtered Empty State */}
        {loading ? (
          <div
            className="text-center py-20 px-6 rounded-2xl bg-[#031D1C] border border-white/10 w-full shadow-xl shadow-black/25"
            aria-label="Loading projects and publications"
          >
            <div className="flex items-center justify-center mx-auto mb-5">
              <AnimatedAtomGraphic size={92} />
            </div>
            <p className="text-sm font-medium text-[#EDE9E0]/75">
              Loading projects &amp; publications...
            </p>
          </div>
        ) : !showProjects && !showPublications ? (
          <EmptyState
            customVisual={<AnimatedAtomGraphic size={92} />}
            maxWidthClass="w-full"
            className="py-16 sm:py-20 shadow-xl shadow-black/25"
            title={
              totalBaseCount === 0
                ? content.work.emptyTitle || 'No projects or publications yet'
                : content.work.noMatchesTitle || 'No matching items found'
            }
            description={
              totalBaseCount === 0
                ? content.work.emptySubtitle ||
                  'Published projects and research publications will appear here.'
                : content.work.noMatchesDescription ||
                  'Try adjusting your search query, department, sector, or status filter.'
            }
            actionLabel={
              totalBaseCount > 0 ? content.work.clearFiltersLabel || 'Clear filters' : undefined
            }
            onAction={totalBaseCount > 0 ? resetFilters : undefined}
          />
        ) : (
          <div className="space-y-16">
            {/* PROJECTS SECTION */}
            {showProjects && (
              <section className="space-y-6">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-[#25CDB6]" />
                  <h2 className="text-2xl font-extrabold text-[#EDE9E0] tracking-tight">
                    {content.work.projectsTabLabel || 'Projects'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map(project => {
                    const safeCover = sanitizeSafeUrl(project.coverImage);
                    const assignedUnits = (project.departmentIds || [])
                      .map(id => unitMap.get(id))
                      .filter(Boolean) as Department[];
                    const assignedSectors = [
                      ...(project.sectorIds || []).map(id => unitMap.get(id)),
                      ...assignedUnits.filter(u => u.kind === 'sector')
                    ].filter((u, idx, arr): u is Department =>
                      Boolean(u && arr.findIndex(x => x?.id === u.id) === idx)
                    );
                    const assignedDepts = assignedUnits.filter(u => u.kind !== 'sector');

                    return (
                      <SpaLink
                        key={project.id}
                        href={`/projects/${project.slug}`}
                        onNavigate={onNavigate}
                        className="group cursor-pointer rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#17A491]"
                      >
                        <div>
                          <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#0A3D3C] via-[#06302F] to-[#031D1C] border-b border-[#EDE9E0]/10">
                            {safeCover ? (
                              <img
                                src={safeCover}
                                alt={project.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-40">
                                <Layers className="w-10 h-10 text-[#25CDB6]" />
                              </div>
                            )}
                          </div>

                          <div className="p-6 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold text-[#25CDB6]">
                                <Layers className="w-3.5 h-3.5 shrink-0" />
                                <span>{project.category || 'Project'}</span>
                              </span>
                            </div>

                            <h3 className="text-lg font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug">
                              {project.title}
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

                            {project.shortDescription && (
                              <p className="text-sm text-[#EDE9E0]/75 line-clamp-2 leading-relaxed">
                                {project.shortDescription}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="px-6 pb-5 pt-3 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#25CDB6]">{project.status}</span>
                          {project.startDate && (
                            <span className="text-[#EDE9E0]/65 font-mono tabular-nums">
                              {project.startDate.slice(0, 7)}
                            </span>
                          )}
                        </div>
                      </SpaLink>
                    );
                  })}
                </div>
              </section>
            )}

            {/* PUBLICATIONS SECTION */}
            {showPublications && (
              <section className="space-y-6">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-[#D0A873]" />
                  <h2 className="text-2xl font-extrabold text-[#EDE9E0] tracking-tight">
                    {content.work.publicationsTabLabel || 'Publications'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPublications.map(pub => {
                    const pdfHref = sanitizeSafeUrl(pub.pdfUrl);
                    const dateStr = (pub.publicationDate || pub.createdAt || '').slice(0, 10);
                    const CardTag = pdfHref ? 'a' : 'div';
                    const linkProps = pdfHref
                      ? {
                          href: pdfHref,
                          target: '_blank',
                          rel: 'noopener noreferrer'
                        }
                      : {};

                    return (
                      <CardTag
                        key={pub.id}
                        {...linkProps}
                        className={`group rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                          pdfHref
                            ? 'hover:-translate-y-1 hover:border-[#D0A873] cursor-pointer'
                            : 'hover:border-[#EDE9E0]/20'
                        }`}
                      >
                        <div>
                          <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#0A3D3C] via-[#06302F] to-[#031D1C] border-b border-[#EDE9E0]/10">
                            <PublicationThumbnail pub={pub} />
                          </div>

                          <div className="p-6 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold text-[#D0A873]">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span>{pub.publicationType || 'Paper'}</span>
                              </span>
                              {pdfHref && (
                                <ExternalLink className="w-3.5 h-3.5 text-[#D0A873]/80 group-hover:text-[#D0A873] shrink-0" />
                              )}
                            </div>

                            <h3 className="text-lg font-bold text-[#EDE9E0] group-hover:text-[#D0A873] transition-colors leading-snug">
                              {pub.title}
                            </h3>

                            {pub.authors && (
                              <p className="text-xs sm:text-sm font-medium text-[#25CDB6]">
                                {pub.authors}
                              </p>
                            )}

                            {pub.abstract && (
                              <p className="text-sm text-[#EDE9E0]/75 line-clamp-2 leading-relaxed">
                                {pub.abstract}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="px-6 pb-5 pt-3 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#D0A873]">
                            {pdfHref ? 'Read publication' : pub.publicationType || 'Paper'}
                          </span>
                          {dateStr && (
                            <span className="text-[#EDE9E0]/65 font-mono tabular-nums">{dateStr}</span>
                          )}
                        </div>
                      </CardTag>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
