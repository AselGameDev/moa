import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, RefreshCw, ArrowRight, FileText, Package, ExternalLink, Layers } from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { sanitizeSafeUrl } from '../shared/url';
import { Project, Publication, Product, Department, SiteContent } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  publications?: Publication[];
  products?: Product[];
  departments: Department[];
  content?: SiteContent;
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
}

type WorkTab = 'all' | 'projects' | 'publications' | 'products';

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  publications = [],
  products = [],
  departments,
  content: rawContent,
  onNavigate,
  isEditMode = false,
  onUpdateContent = () => {}
}) => {
  const { content } = useContent(rawContent);
  const [activeTab, setActiveTab] = useState<WorkTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const deptMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach(d => map.set(d.id, d));
    return map;
  }, [departments]);

  const q = searchQuery.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch =
        !q ||
        project.title.toLowerCase().includes(q) ||
        project.shortDescription.toLowerCase().includes(q) ||
        project.category.toLowerCase().includes(q) ||
        (project.tags || []).some(t => t.toLowerCase().includes(q));
      const matchesDept = selectedDeptId === 'all' || project.departmentIds.includes(selectedDeptId);
      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [projects, q, selectedDeptId, selectedStatus]);

  const filteredPublications = useMemo(() => {
    return publications.filter(pub => {
      const matchesSearch =
        !q ||
        pub.title.toLowerCase().includes(q) ||
        pub.authors.toLowerCase().includes(q) ||
        pub.abstract.toLowerCase().includes(q) ||
        pub.publicationType.toLowerCase().includes(q) ||
        (pub.tags || []).some(t => t.toLowerCase().includes(q));
      const matchesDept = selectedDeptId === 'all' || (pub.departmentIds || []).includes(selectedDeptId);
      return matchesSearch && matchesDept;
    });
  }, [publications, q, selectedDeptId]);

  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.tagline.toLowerCase().includes(q) ||
        prod.shortDescription.toLowerCase().includes(q) ||
        prod.category.toLowerCase().includes(q) ||
        (prod.tags || []).some(t => t.toLowerCase().includes(q));
      const matchesDept = selectedDeptId === 'all' || (prod.departmentIds || []).includes(selectedDeptId);
      const matchesStatus = selectedStatus === 'all' || prod.status === selectedStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [products, q, selectedDeptId, selectedStatus]);

  const showProjects = (activeTab === 'all' || activeTab === 'projects') && filteredProjects.length > 0;
  const showPublications = (activeTab === 'all' || activeTab === 'publications') && filteredPublications.length > 0;
  const showProducts = (activeTab === 'all' || activeTab === 'products') && filteredProducts.length > 0;
  const totalMatching =
    (activeTab === 'all' || activeTab === 'projects' ? filteredProjects.length : 0) +
    (activeTab === 'all' || activeTab === 'publications' ? filteredPublications.length : 0) +
    (activeTab === 'all' || activeTab === 'products' ? filteredProducts.length : 0);

  const hasAnyPublished = projects.length > 0 || publications.length > 0 || products.length > 0;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDeptId('all');
    setSelectedStatus('all');
    setActiveTab('all');
  };

  return (
    <div className="min-h-screen">
      <AtmosphericBackground
        intensity="subtle"
        fadeToColor="transparent"
        className="pt-16 pb-10 lg:pt-20 lg:pb-12 border-b border-[#EDE9E0]/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl space-y-4"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
              <EditableText
                value={content.work.heading}
                fieldPath="work.heading"
                label="Our Work Heading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </h1>
            <div className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed">
              <EditableText
                value={content.work.subtitle}
                fieldPath="work.subtitle"
                label="Our Work Subtitle"
                multiline
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </div>
          </motion.div>
        </div>
      </AtmosphericBackground>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-24 pt-8 sm:pt-12">
        {/* Category Switcher + Filter Controls */}
        <div className="p-5 sm:p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/25 space-y-4">
          {hasAnyPublished && (
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#17A491] text-[#031D1C]'
                    : 'bg-white/5 text-[#EDE9E0]/70 hover:text-white'
                }`}
              >
                All ({projects.length + publications.length + products.length})
              </button>
              {projects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'projects'
                      ? 'bg-[#17A491] text-[#031D1C]'
                      : 'bg-white/5 text-[#EDE9E0]/70 hover:text-white'
                  }`}
                >
                  {content.work.projectsTabLabel} ({projects.length})
                </button>
              )}
              {publications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('publications')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'publications'
                      ? 'bg-[#17A491] text-[#031D1C]'
                      : 'bg-white/5 text-[#EDE9E0]/70 hover:text-white'
                  }`}
                >
                  {content.work.publicationsTabLabel} ({publications.length})
                </button>
              )}
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'products'
                      ? 'bg-[#17A491] text-[#031D1C]'
                      : 'bg-white/5 text-[#EDE9E0]/70 hover:text-white'
                  }`}
                >
                  {content.work.productsTabLabel} ({products.length})
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={content.work.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0] placeholder:text-[#EDE9E0]/40 focus:outline-none focus:border-[#17A491]"
              />
            </div>

            <div className="md:col-span-4">
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                aria-label="Filter by department"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#17A491] cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                aria-label="Filter by status"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#17A491] cursor-pointer"
              >
                <option value="all">All Stages / Statuses</option>
                <option value="Active">Active</option>
                <option value="In Development">In Development</option>
                <option value="In development">In development (Products)</option>
                <option value="Released">Released</option>
                <option value="Completed">Completed</option>
                <option value="Concept">Concept</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          {(searchQuery || selectedDeptId !== 'all' || selectedStatus !== 'all' || activeTab !== 'all') && (
            <div className="pt-2 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs">
              <span className="text-[#EDE9E0]/60">
                Found <strong className="text-[#25CDB6]">{totalMatching}</strong> matching entries
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="text-[#CA7952] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!showProjects && !showPublications && !showProducts ? (
          <div className="p-16 sm:p-24 text-center rounded-3xl bg-[#031D1C] border border-[#EDE9E0]/10 space-y-6">
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border border-dashed border-[#17A491]/50 relative animate-[spin_10s_linear_infinite]">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#CA7952] shadow-[0_0_10px_#CA7952]" />
              </div>
              <div className="absolute w-12 h-12 rounded-full border border-[#EDE9E0]/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#25CDB6]" />
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-[#EDE9E0]">
                <EditableText
                  value={content.work.emptyTitle}
                  fieldPath="work.emptyTitle"
                  label="Empty State Title"
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                />
              </h3>
              <p className="text-sm text-[#EDE9E0]/70 leading-relaxed">
                <EditableText
                  value={content.work.emptySubtitle}
                  fieldPath="work.emptySubtitle"
                  label="Empty State Subtitle"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                />
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-16">
            {/* PROJECTS SECTION */}
            {showProjects && (
              <section className="space-y-6">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-[#25CDB6]" />
                  <h2 className="text-2xl font-extrabold text-[#EDE9E0] tracking-tight">
                    <EditableText
                      value={content.work.projectsTabLabel}
                      fieldPath="work.projectsTabLabel"
                      label="Projects Section Heading"
                      isEditMode={isEditMode}
                      onUpdate={onUpdateContent}
                    />
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProjects.map(project => {
                    const assignedDepts = project.departmentIds
                      .map(id => deptMap.get(id))
                      .filter(Boolean) as Department[];

                    return (
                      <SpaLink
                        key={project.id}
                        href={`/projects/${project.slug}`}
                        onNavigate={onNavigate}
                        className="group cursor-pointer rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#17A491]"
                      >
                        <div>
                          {project.coverImage && (
                            <div className="relative aspect-[16/10] overflow-hidden bg-[#06302F]">
                              <img
                                src={project.coverImage}
                                alt={project.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-xs bg-[#06302F]/90 border border-[#EDE9E0]/10 text-[#25CDB6]">
                                {project.status}
                              </div>
                            </div>
                          )}

                          <div className="p-6 space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                              {assignedDepts.map(d => (
                                <span
                                  key={d.id}
                                  className="text-xs text-[#CA7952] bg-[#06302F] px-2 py-0.5 rounded border border-[#EDE9E0]/10"
                                >
                                  {d.name}
                                </span>
                              ))}
                            </div>

                            <h3 className="text-lg font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug">
                              {project.title}
                            </h3>

                            <p className="text-xs sm:text-sm text-[#EDE9E0]/70 line-clamp-3 leading-relaxed">
                              {project.shortDescription}
                            </p>
                          </div>
                        </div>

                        <div className="p-6 pt-0">
                          <div className="pt-4 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs text-[#EDE9E0]/50">
                            <span>{(project.startDate || project.createdAt || '').substring(0, 7)}</span>
                            <span className="inline-flex items-center gap-1 text-[#25CDB6] font-medium group-hover:translate-x-1 transition-transform">
                              <span>Read More</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
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
                    <EditableText
                      value={content.work.publicationsTabLabel}
                      fieldPath="work.publicationsTabLabel"
                      label="Publications Section Heading"
                      isEditMode={isEditMode}
                      onUpdate={onUpdateContent}
                    />
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredPublications.map(pub => {
                    const pdfHref = sanitizeSafeUrl(pub.pdfUrl);
                    const doiHref = sanitizeSafeUrl(pub.doiOrUrl);
                    const assignedDepts = (pub.departmentIds || [])
                      .map(id => deptMap.get(id))
                      .filter(Boolean) as Department[];

                    return (
                      <div
                        key={pub.id}
                        className="group rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#D0A873]"
                      >
                        <div>
                          <a
                            href={pdfHref || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative aspect-[4/3] overflow-hidden bg-[#06302F]"
                          >
                            {pub.thumbnailUrl ? (
                              <img
                                src={pub.thumbnailUrl}
                                alt={pub.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#D0A873]/70">
                                <FileText className="w-12 h-12" />
                                <span className="text-xs font-mono uppercase">PDF Document</span>
                              </div>
                            )}
                            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded text-xs bg-[#06302F]/90 border border-[#EDE9E0]/10 text-[#D0A873]">
                              {pub.publicationType || 'Paper'}
                            </span>
                          </a>

                          <div className="p-6 space-y-3">
                            {assignedDepts.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {assignedDepts.map(d => (
                                  <span
                                    key={d.id}
                                    className="text-xs text-[#CA7952] bg-[#06302F] px-2 py-0.5 rounded border border-[#EDE9E0]/10"
                                  >
                                    {d.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <a
                              href={pdfHref || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-lg font-bold text-[#EDE9E0] group-hover:text-[#D0A873] transition-colors leading-snug"
                            >
                              {pub.title}
                            </a>
                            {pub.authors && (
                              <p className="text-xs font-semibold text-[#25CDB6]">{pub.authors}</p>
                            )}
                            {pub.abstract && (
                              <p className="text-xs sm:text-sm text-[#EDE9E0]/70 line-clamp-3 leading-relaxed">
                                {pub.abstract}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="p-6 pt-0">
                          <div className="pt-4 border-t border-[#EDE9E0]/10 flex items-center justify-between gap-2 text-xs text-[#EDE9E0]/50">
                            <span>{(pub.publicationDate || pub.createdAt || '').substring(0, 10)}</span>
                            <div className="flex items-center gap-3">
                              {doiHref && (
                                <a
                                  href={doiHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#EDE9E0]/70 hover:text-white underline decoration-dotted"
                                >
                                  DOI / Link
                                </a>
                              )}
                              {pdfHref && (
                                <a
                                  href={pdfHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#D0A873] font-semibold hover:underline"
                                >
                                  <span>Read PDF</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* PRODUCTS SECTION */}
            {showProducts && (
              <section className="space-y-6">
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-[#25CDB6]" />
                  <h2 className="text-2xl font-extrabold text-[#EDE9E0] tracking-tight">
                    <EditableText
                      value={content.work.productsTabLabel}
                      fieldPath="work.productsTabLabel"
                      label="Products Section Heading"
                      isEditMode={isEditMode}
                      onUpdate={onUpdateContent}
                    />
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map(prod => {
                    const assignedDepts = (prod.departmentIds || [])
                      .map(id => deptMap.get(id))
                      .filter(Boolean) as Department[];

                    return (
                      <SpaLink
                        key={prod.id}
                        href={`/products/${prod.slug}`}
                        onNavigate={onNavigate}
                        className="group cursor-pointer rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#25CDB6]"
                      >
                        <div>
                          {prod.coverImage && (
                            <div className="relative aspect-[16/10] overflow-hidden bg-[#06302F]">
                              <img
                                src={prod.coverImage}
                                alt={prod.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-xs bg-[#06302F]/90 border border-[#EDE9E0]/10 text-[#25CDB6]">
                                {prod.status}
                              </div>
                            </div>
                          )}

                          <div className="p-6 space-y-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {prod.version && (
                                <span className="text-xs font-mono text-[#25CDB6] bg-[#17A491]/15 px-2 py-0.5 rounded">
                                  v{prod.version}
                                </span>
                              )}
                              {assignedDepts.map(d => (
                                <span
                                  key={d.id}
                                  className="text-xs text-[#CA7952] bg-[#06302F] px-2 py-0.5 rounded border border-[#EDE9E0]/10"
                                >
                                  {d.name}
                                </span>
                              ))}
                            </div>

                            <h3 className="text-lg font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug">
                              {prod.name}
                            </h3>

                            <p className="text-xs sm:text-sm text-[#EDE9E0]/70 line-clamp-3 leading-relaxed">
                              {prod.tagline || prod.shortDescription}
                            </p>
                          </div>
                        </div>

                        <div className="p-6 pt-0">
                          <div className="pt-4 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs text-[#EDE9E0]/50">
                            <span className="capitalize">
                              {prod.availabilityPricing === 'paid' && prod.priceText
                                ? prod.priceText
                                : prod.availabilityPricing === 'contact'
                                  ? 'Contact for access'
                                  : 'Free'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[#25CDB6] font-medium group-hover:translate-x-1 transition-transform">
                              <span>View Product</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </SpaLink>
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
