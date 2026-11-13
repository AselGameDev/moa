import React, { useState, useMemo } from 'react';
import {
  Building,
  FolderKanban,
  Megaphone,
  Calendar,
  BookOpen,
  Users,
  Globe,
  HelpCircle,
  Sliders,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Archive,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Columns3,
  Sparkles
} from 'lucide-react';
import {
  Department,
  Project,
  ContentType,
  ContentItem,
  User
} from '../../../types';
import { DepartmentIcon } from '../../DepartmentIcon';
import { DepartmentEditor } from '../DepartmentEditor';
import { ProjectEditor } from '../ProjectEditor';

export type ContentSubTab =
  | 'departments'
  | 'projects'
  | 'updates'
  | 'events'
  | 'publications'
  | 'profiles'
  | 'partners'
  | 'faq'
  | 'types';

interface ContentTabProps {
  initialSubTab?: ContentSubTab;
  departments: Department[];
  projects: Project[];
  currentUser: User;
  onSaveDepartment: (dept: Partial<Department>) => Promise<void>;
  onDeleteDepartment: (id: string) => Promise<void>;
  onSaveProject: (proj: Partial<Project>) => Promise<Project>;
  onDeleteProject: (id: string) => Promise<void>;
  contentTypes: ContentType[];
  contentItems: ContentItem[];
  onSaveContentItem: (item: any) => Promise<any>;
  onDeleteContentItem: (id: string) => Promise<void>;
  onNavigateSite: (path?: string) => void;
}

export const ContentTab: React.FC<ContentTabProps> = ({
  initialSubTab = 'departments',
  departments,
  projects,
  currentUser,
  onSaveDepartment,
  onDeleteDepartment,
  onSaveProject,
  onDeleteProject,
  contentTypes,
  contentItems,
  onSaveContentItem,
  onDeleteContentItem,
  onNavigateSite
}) => {
  const [subTab, setSubTab] = useState<ContentSubTab>(initialSubTab);

  // Departments state
  const [editingDept, setEditingDept] = useState<Department | null | 'new'>(null);
  const [deptSearch, setDeptSearch] = useState('');

  // Projects state
  const [editingProj, setEditingProj] = useState<Project | null | 'new'>(null);
  const [projSearch, setProjSearch] = useState('');
  const [projStatusFilter, setProjStatusFilter] = useState('all');
  const [projViewMode, setProjViewMode] = useState<'table' | 'cards' | 'kanban'>('table');

  // Modular items state
  const [creatingItem, setCreatingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemData, setNewItemData] = useState<Record<string, any>>({});

  // Filtered departments
  const filteredDepts = useMemo(() => {
    return departments.filter(d => {
      if (d.deletedAt) return false;
      if (!deptSearch) return true;
      const q = deptSearch.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        (d.shortName && d.shortName.toLowerCase().includes(q)) ||
        d.slug.toLowerCase().includes(q)
      );
    });
  }, [departments, deptSearch]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.deletedAt) return false;
      if (projStatusFilter !== 'all' && p.status !== projStatusFilter) return false;
      if (!projSearch) return true;
      const q = projSearch.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    });
  }, [projects, projStatusFilter, projSearch]);

  // Current content type for modular tabs
  const currentContentType = contentTypes.find(ct => {
    if (subTab === 'updates') return ct.slug === 'updates';
    if (subTab === 'events') return ct.slug === 'events';
    if (subTab === 'publications') return ct.slug === 'publications';
    if (subTab === 'profiles') return ct.slug === 'team-profiles';
    if (subTab === 'partners') return ct.slug === 'partners';
    if (subTab === 'faq') return ct.slug === 'faq';
    return false;
  });

  const modularItemsForTab = useMemo(() => {
    if (!currentContentType) return [];
    return contentItems.filter(i => i.typeSlug === currentContentType.slug && !i.deletedAt);
  }, [contentItems, currentContentType]);

  // Handle department edit full view
  if (editingDept) {
    return (
      <div className="min-h-screen">
        <DepartmentEditor
          department={editingDept === 'new' ? null : editingDept}
          allDepartments={departments}
          onSave={async (payload) => {
            await onSaveDepartment(payload);
            setEditingDept(null);
          }}
          onCancel={() => setEditingDept(null)}
        />
      </div>
    );
  }

  // Handle project edit full view
  if (editingProj) {
    return (
      <div className="min-h-screen">
        <ProjectEditor
          project={editingProj === 'new' ? null : editingProj}
          departments={departments}
          currentUserRole={currentUser?.role === 'admin' || currentUser?.role === 'owner' ? 'admin' : 'member'}
          onSave={async (payload) => {
            const saved = await onSaveProject(payload);
            setEditingProj(null);
            return saved;
          }}
          onCancel={() => setEditingProj(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-[#031D1C] rounded-2xl border border-white/10 text-xs">
          {[
            { id: 'departments', label: 'Departments', icon: Building, count: departments.filter(d => !d.deletedAt).length },
            { id: 'projects', label: 'Projects', icon: FolderKanban, count: projects.filter(p => !p.deletedAt).length },
            { id: 'updates', label: 'Updates', icon: Megaphone },
            { id: 'events', label: 'Events', icon: Calendar },
            { id: 'publications', label: 'Publications', icon: BookOpen },
            { id: 'profiles', label: 'Team Profiles', icon: Users },
            { id: 'partners', label: 'Partners', icon: Globe },
            { id: 'faq', label: 'FAQ', icon: HelpCircle },
            { id: 'types', label: 'Content Types', icon: Sliders }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as ContentSubTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#17A491] text-[#06302F] shadow-sm'
                    : 'text-[#EDE9E0]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 rounded-full ${isActive ? 'bg-[#06302F]/30 text-[#06302F]' : 'bg-white/5 text-[#EDE9E0]/50'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          1. SUB-TAB: DEPARTMENTS (Unified Single Editor)
          =================================================================== */}
      {subTab === 'departments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Departments & Sub-Units</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Single unified source of truth for all departments. Derives badges, contrast checks, and focus areas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEditingDept('new')}
              className="px-4 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Department</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3.5 rounded-2xl bg-[#031D1C] border border-white/10 relative">
            <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-6 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={deptSearch}
              onChange={e => setDeptSearch(e.target.value)}
              placeholder="Search departments by name, short name, or slug..."
              className="w-full bg-[#06302F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
            />
          </div>

          {/* Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDepts.map(dept => (
              <div
                key={dept.id}
                className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-col justify-between gap-4 hover:border-[#25CDB6]/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Contrast-safe department badge */}
                    <DepartmentIcon
                      glyph={dept.iconGlyph}
                      iconUrl={dept.iconUrl}
                      size={24}
                      color={dept.colorHex}
                      bgColor={dept.iconBgHex}
                      showBg
                    />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dept.published ? 'bg-[#25CDB6]/10 text-[#25CDB6]' : 'bg-white/5 text-white/40'}`}>
                      {dept.published ? 'Published' : 'Hidden'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#EDE9E0] line-clamp-1">{dept.name}</h3>
                    <span className="text-[11px] font-mono text-[#EDE9E0]/50 block">/departments/{dept.slug}</span>
                  </div>

                  <p className="text-xs text-[#EDE9E0]/60 line-clamp-2 leading-relaxed">
                    {dept.purpose || dept.introduction || 'No overview text provided.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingDept(dept)}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                    <span>Edit Unit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateSite(`/departments/${dept.slug}`)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                    title="View department live"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Move department "${dept.name}" to Trash? (Can be restored within 30 days)`)) {
                        onDeleteDepartment(dept.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                    title="Trash department"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          2. SUB-TAB: PROJECTS (Story Blocks, Views, Review Workflow)
          =================================================================== */}
      {subTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Projects & Initiatives</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Manage the MoA innovation pipeline, modular story blocks, and reviewer workflows.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#031D1C] p-1 rounded-2xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setProjViewMode('table')}
                  className={`p-1.5 rounded-xl ${projViewMode === 'table' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'}`}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setProjViewMode('cards')}
                  className={`p-1.5 rounded-xl ${projViewMode === 'cards' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'}`}
                  title="Card grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setProjViewMode('kanban')}
                  className={`p-1.5 rounded-xl ${projViewMode === 'kanban' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'}`}
                  title="Pipeline kanban"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setEditingProj('new')}
                className="px-4 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Project</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 p-3 rounded-2xl bg-[#031D1C] border border-white/10 relative w-full">
              <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-6 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={projSearch}
                onChange={e => setProjSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <select
              value={projStatusFilter}
              onChange={e => setProjStatusFilter(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-[#031D1C] border border-white/10 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Concept">Concept</option>
              <option value="In Development">In Development</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 ? (
            <div className="py-24 text-center rounded-3xl bg-[#031D1C] border border-white/10 space-y-3">
              <FolderKanban className="w-8 h-8 text-[#25CDB6] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">No projects yet</h3>
              <p className="text-xs text-[#EDE9E0]/50 max-w-sm mx-auto">
                We will publish as soon we are done with them.
              </p>
              <button
                type="button"
                onClick={() => setEditingProj('new')}
                className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs"
              >
                Create First Project
              </button>
            </div>
          ) : projViewMode === 'table' ? (
            /* Table View */
            <div className="rounded-3xl bg-[#031D1C] border border-white/10 overflow-hidden divide-y divide-white/5">
              <div className="p-4 grid grid-cols-12 text-[10px] uppercase font-bold text-[#EDE9E0]/40 font-mono">
                <div className="col-span-5">Project Title</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Publication</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {filteredProjects.map(proj => (
                <div
                  key={proj.id}
                  className="p-4 grid grid-cols-12 items-center hover:bg-white/[0.02] transition-colors text-xs"
                >
                  <div className="col-span-5 flex items-center gap-3 truncate pr-4">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                      {proj.coverImage ? (
                        <img src={proj.coverImage} alt={proj.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 font-bold">
                          MOA
                        </div>
                      )}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-[#EDE9E0] block truncate">{proj.title}</span>
                      <span className="text-[11px] font-mono text-[#EDE9E0]/40">/{proj.slug}</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[11px] font-semibold text-[#EDE9E0]/80">{proj.status}</span>
                  </div>

                  <div className="col-span-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      proj.publicationStatus === 'Published'
                        ? 'bg-[#25CDB6]/15 text-[#25CDB6]'
                        : proj.publicationStatus === 'Pending Review'
                        ? 'bg-amber-400/15 text-amber-300'
                        : 'bg-white/5 text-white/40'
                    }`}>
                      {proj.publicationStatus}
                    </span>
                  </div>

                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProj(proj)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateSite(`/projects/${proj.slug}`)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white"
                      title="View on public site"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Move project "${proj.title}" to trash?`)) {
                          onDeleteProject(proj.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400"
                      title="Trash project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(proj => (
                <div
                  key={proj.id}
                  className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-col justify-between gap-4 hover:border-[#25CDB6]/40 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="h-36 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative">
                      {proj.coverImage && (
                        <img src={proj.coverImage} alt={proj.title} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#031D1C]/90 backdrop-blur-md text-[#25CDB6]">
                        {proj.publicationStatus}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#EDE9E0] line-clamp-1">{proj.title}</h3>
                      <p className="text-xs text-[#EDE9E0]/60 line-clamp-2 mt-1">
                        {proj.shortDescription || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setEditingProj(proj)}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                      <span>Edit Story</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          3. SUB-TABS: MODULAR CONTENT ITEMS (Updates, Events, Profiles, etc.)
          =================================================================== */}
      {subTab !== 'departments' && subTab !== 'projects' && subTab !== 'types' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0] capitalize">{subTab}</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Data-driven records managed through the modular Content Types schema.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreatingItem(true)}
              className="px-4 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New {subTab.slice(0, -1)}</span>
            </button>
          </div>

          {/* Creation Modal */}
          {creatingItem && currentContentType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!newItemTitle) return;
                  await onSaveContentItem({
                    typeSlug: currentContentType.slug,
                    title: newItemTitle,
                    status: 'Published',
                    data: newItemData
                  });
                  setCreatingItem(false);
                  setNewItemTitle('');
                  setNewItemData({});
                }}
                className="w-full max-w-lg bg-[#031D1C] border border-white/15 rounded-3xl p-6 space-y-4 text-[#EDE9E0] shadow-2xl"
              >
                <h3 className="text-base font-bold text-[#EDE9E0]">Create {currentContentType.name}</h3>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Title</label>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={e => setNewItemTitle(e.target.value)}
                    required
                    placeholder="Title or name..."
                    className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                </div>

                {/* Dynamic fields from ContentType definition */}
                {currentContentType.fields.map(field => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#EDE9E0]/70 block">{field.label}</label>
                    {field.type === 'rich-text' ? (
                      <textarea
                        rows={3}
                        value={newItemData[field.name] || ''}
                        onChange={e => setNewItemData({ ...newItemData, [field.name]: e.target.value })}
                        className="w-full bg-[#06302F] border border-white/10 rounded-xl p-3 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                      />
                    ) : (
                      <input
                        type={field.type === 'date' ? 'date' : 'text'}
                        value={newItemData[field.name] || ''}
                        onChange={e => setNewItemData({ ...newItemData, [field.name]: e.target.value })}
                        className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                      />
                    )}
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCreatingItem(false)}
                    className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Items Listing */}
          <div className="rounded-3xl bg-[#031D1C] border border-white/10 divide-y divide-white/5 overflow-hidden">
            {modularItemsForTab.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#EDE9E0]/50 space-y-2">
                <p>No {subTab} records found.</p>
                <button
                  type="button"
                  onClick={() => setCreatingItem(true)}
                  className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#25CDB6] font-bold text-xs"
                >
                  Create First Record
                </button>
              </div>
            ) : (
              modularItemsForTab.map(item => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="space-y-1 truncate max-w-xl">
                    <h4 className="text-xs font-bold text-[#EDE9E0] truncate">{item.title}</h4>
                    <span className="text-[11px] text-[#EDE9E0]/50 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDeleteContentItem(item.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          4. SUB-TAB: CONTENT TYPES (Modular Schema Builder)
          =================================================================== */}
      {subTab === 'types' && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#EDE9E0]">Content Types Schema System</h2>
            <p className="text-xs text-[#EDE9E0]/60">
              Define custom data models, fields, and relations without writing application code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contentTypes.map(ct => (
              <div
                key={ct.id}
                className="p-5 rounded-3xl bg-[#06302F]/60 border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#EDE9E0]">{ct.name}</span>
                  <span className="text-[10px] font-mono text-[#25CDB6] bg-[#25CDB6]/10 px-2 py-0.5 rounded-full">
                    {ct.slug}
                  </span>
                </div>
                <p className="text-xs text-[#EDE9E0]/60 leading-relaxed">{ct.description}</p>
                <div className="pt-2 border-t border-white/10 text-[11px] text-[#EDE9E0]/50 font-mono">
                  {ct.fields.length} schema fields
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
