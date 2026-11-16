import React, { useState, useMemo, useEffect } from 'react';
import {
  Building,
  FolderKanban,
  BookOpen,
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  LayoutGrid,
  List,
  Columns3,
  AlertCircle,
  X
} from 'lucide-react';
import {
  Department,
  Project,
  Publication,
  Product,
  User,
  RoleDefinition
} from '../../../types';
import { can } from '../../../shared/permissions';
import { getVisibleSubTabs } from '../portalRegistry';
import { DepartmentIcon } from '../../DepartmentIcon';
import { DepartmentEditor } from '../DepartmentEditor';
import { ProjectEditor } from '../ProjectEditor';
import { PublicationEditor } from '../PublicationEditor';
import { ProductEditor } from '../ProductEditor';
import { ConfirmDialog } from '../ConfirmDialog';

export type ContentSubTab = 'departments' | 'projects' | 'publications' | 'products';

export interface ContentRequestedEdit {
  kind: ContentSubTab;
  id: string | 'new';
  nonce: number;
}

interface ContentTabProps {
  initialSubTab?: ContentSubTab;
  onSubTabChange?: (sub: ContentSubTab) => void;
  requestedEdit?: ContentRequestedEdit | null;
  departments: Department[];
  projects: Project[];
  publications: Publication[];
  products: Product[];
  currentUser: User;
  roles?: RoleDefinition[];
  onSaveDepartment: (dept: Partial<Department>, targetId?: string) => Promise<void>;
  onDeleteDepartment: (
    id: string,
    options: { projectHandling: 'leave' | 'reassign'; targetDeptId?: string }
  ) => Promise<void>;
  onSaveProject: (proj: Partial<Project>, targetId?: string) => Promise<Project>;
  onProjectUpdated?: (updated: Project) => void;
  onDeleteProject: (id: string) => Promise<void>;
  onSavePublication: (pub: Partial<Publication>, targetId?: string) => Promise<Publication>;
  onReviewPublication: (
    id: string,
    action: 'approved' | 'rejected' | 'requested_changes',
    comment?: string
  ) => Promise<void>;
  onDeletePublication: (id: string) => Promise<void>;
  onSaveProduct: (prod: Partial<Product>, targetId?: string) => Promise<Product>;
  onReviewProduct: (
    id: string,
    action: 'approved' | 'rejected' | 'requested_changes',
    comment?: string
  ) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onNavigateSite: (path?: string) => void;
}

type DeleteConfirmState =
  | { kind: 'project'; id: string; label: string }
  | { kind: 'publication'; id: string; label: string }
  | { kind: 'product'; id: string; label: string }
  | null;

const SUBTAB_ICONS: Record<ContentSubTab, React.ComponentType<{ className?: string }>> = {
  departments: Building,
  projects: FolderKanban,
  publications: BookOpen,
  products: Package
};

export const ContentTab: React.FC<ContentTabProps> = ({
  initialSubTab = 'departments',
  onSubTabChange,
  requestedEdit,
  departments,
  projects,
  publications,
  products,
  currentUser,
  roles,
  onSaveDepartment,
  onDeleteDepartment,
  onSaveProject,
  onProjectUpdated,
  onDeleteProject,
  onSavePublication,
  onReviewPublication,
  onDeletePublication,
  onSaveProduct,
  onReviewProduct,
  onDeleteProduct,
  onNavigateSite
}) => {
  const visibleSubTabs = useMemo(
    () => getVisibleSubTabs('content', currentUser, roles),
    [currentUser, roles]
  );

  const [subTab, setSubTab] = useState<ContentSubTab>(() => {
    if (visibleSubTabs.some(st => st.id === initialSubTab)) return initialSubTab;
    return (visibleSubTabs[0]?.id as ContentSubTab) || 'projects';
  });

  useEffect(() => {
    if (visibleSubTabs.some(st => st.id === initialSubTab)) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab, visibleSubTabs]);

  const selectSubTab = (next: ContentSubTab) => {
    setSubTab(next);
    onSubTabChange?.(next);
  };

  // Permissions
  const canManageDepts = can(currentUser, 'departments.manage', roles);
  const canCreateProject = can(currentUser, 'projects.create', roles);
  const canEditAll = can(currentUser, 'projects.editAll', roles);
  const canEditOwn = can(currentUser, 'projects.editOwn', roles);
  const canPublish = can(currentUser, 'projects.publish', roles);
  const canManagePubs = can(currentUser, 'publications.manage', roles) || canPublish;
  const canManageProds = can(currentUser, 'products.manage', roles) || canPublish;

  const canEditEntry = (authorId: string) =>
    canEditAll || (canEditOwn && authorId === currentUser.id) || canPublish;

  // Editors
  const [editingDept, setEditingDept] = useState<Department | null | 'new'>(null);
  const [editingProj, setEditingProj] = useState<Project | null | 'new'>(null);
  const [editingPub, setEditingPub] = useState<Publication | null | 'new'>(null);
  const [editingProd, setEditingProd] = useState<Product | null | 'new'>(null);

  useEffect(() => {
    if (!requestedEdit) return;
    if (requestedEdit.kind === 'departments' && canManageDepts) {
      setSubTab('departments');
      setEditingProj(null);
      setEditingPub(null);
      setEditingProd(null);
      if (requestedEdit.id === 'new') {
        setEditingDept('new');
      } else {
        const found = departments.find(d => d.id === requestedEdit.id);
        if (found) setEditingDept(found);
      }
    } else if (requestedEdit.kind === 'projects' && (canCreateProject || canEditOwn || canEditAll || canPublish)) {
      setSubTab('projects');
      setEditingDept(null);
      setEditingPub(null);
      setEditingProd(null);
      if (requestedEdit.id === 'new' && canCreateProject) {
        setEditingProj('new');
      } else {
        const found = projects.find(p => p.id === requestedEdit.id);
        if (found) setEditingProj(found);
      }
    } else if (requestedEdit.kind === 'publications' && (canManagePubs || canCreateProject)) {
      setSubTab('publications');
      setEditingDept(null);
      setEditingProj(null);
      setEditingProd(null);
      if (requestedEdit.id === 'new') {
        setEditingPub('new');
      } else {
        const found = publications.find(p => p.id === requestedEdit.id);
        if (found) setEditingPub(found);
      }
    } else if (requestedEdit.kind === 'products' && (canManageProds || canCreateProject)) {
      setSubTab('products');
      setEditingDept(null);
      setEditingProj(null);
      setEditingPub(null);
      if (requestedEdit.id === 'new') {
        setEditingProd('new');
      } else {
        const found = products.find(p => p.id === requestedEdit.id);
        if (found) setEditingProd(found);
      }
    }
  }, [
    requestedEdit,
    departments,
    projects,
    publications,
    products,
    canManageDepts,
    canCreateProject,
    canEditOwn,
    canEditAll,
    canPublish,
    canManagePubs,
    canManageProds
  ]);

  // Filters
  const [deptSearch, setDeptSearch] = useState('');
  const [projSearch, setProjSearch] = useState('');
  const [projStatusFilter, setProjStatusFilter] = useState('all');
  const [projViewMode, setProjViewMode] = useState<'table' | 'cards' | 'kanban'>('table');
  const [pubSearch, setPubSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');

  // Department Delete Choice Modal
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [deptHandling, setDeptHandling] = useState<'leave' | 'reassign'>('leave');
  const [reassignTargetDeptId, setReassignTargetDeptId] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Other Confirm Deletes & Errors
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirmState>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeDepts = useMemo(() => departments.filter(d => !d.deletedAt), [departments]);
  const activeProjects = useMemo(() => projects.filter(p => !p.deletedAt), [projects]);
  const activePubs = useMemo(() => publications.filter(p => !p.deletedAt), [publications]);
  const activeProds = useMemo(() => products.filter(p => !p.deletedAt), [products]);

  const filteredDepts = useMemo(() => {
    return activeDepts.filter(d => {
      if (!deptSearch) return true;
      const q = deptSearch.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        (d.shortName && d.shortName.toLowerCase().includes(q)) ||
        d.slug.toLowerCase().includes(q)
      );
    });
  }, [activeDepts, deptSearch]);

  const filteredProjects = useMemo(() => {
    return activeProjects.filter(p => {
      if (projStatusFilter !== 'all' && p.status !== projStatusFilter) return false;
      if (!projSearch) return true;
      const q = projSearch.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    });
  }, [activeProjects, projStatusFilter, projSearch]);

  const filteredPubs = useMemo(() => {
    if (!pubSearch.trim()) return activePubs;
    const q = pubSearch.toLowerCase();
    return activePubs.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.authors.toLowerCase().includes(q) ||
        p.publicationType.toLowerCase().includes(q)
    );
  }, [activePubs, pubSearch]);

  const filteredProds = useMemo(() => {
    if (!prodSearch.trim()) return activeProds;
    const q = prodSearch.toLowerCase();
    return activeProds.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q)
    );
  }, [activeProds, prodSearch]);

  const openDeleteDepartmentModal = (dept: Department) => {
    setDeletingDept(dept);
    setDeptHandling('leave');
    const firstAlternative = activeDepts.find(d => d.id !== dept.id);
    setReassignTargetDeptId(firstAlternative?.id || '');
    setActionError(null);
  };

  const handleConfirmDeleteDepartment = async () => {
    if (!deletingDept) return;
    if (deptHandling === 'reassign' && !reassignTargetDeptId) {
      setActionError('Please choose a destination department or select "Leave unlinked".');
      return;
    }
    setDeletingBusy(true);
    setActionError(null);
    try {
      await onDeleteDepartment(deletingDept.id, {
        projectHandling: deptHandling,
        targetDeptId: deptHandling === 'reassign' ? reassignTargetDeptId : undefined
      });
      setDeletingDept(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to move department to Trash.');
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setActionError(null);
    try {
      if (target.kind === 'project') {
        await onDeleteProject(target.id);
      } else if (target.kind === 'publication') {
        await onDeletePublication(target.id);
      } else if (target.kind === 'product') {
        await onDeleteProduct(target.id);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to move item to Trash.');
    }
  };

  // Full Sub-Editors
  if (editingDept) {
    return (
      <div className="min-h-screen">
        <DepartmentEditor
          department={editingDept === 'new' ? null : editingDept}
          allDepartments={departments}
          onSave={async payload => {
            await onSaveDepartment(payload, editingDept === 'new' ? undefined : editingDept.id);
            setEditingDept(null);
          }}
          onCancel={() => setEditingDept(null)}
        />
      </div>
    );
  }

  if (editingProj) {
    return (
      <div className="min-h-screen">
        <ProjectEditor
          project={editingProj === 'new' ? null : editingProj}
          departments={departments}
          currentUserRole={canPublish ? 'admin' : 'member'}
          canPublish={canPublish}
          onSave={async payload => {
            const saved = await onSaveProject(payload, editingProj === 'new' ? undefined : editingProj.id);
            setEditingProj(null);
            return saved;
          }}
          onProjectUpdated={updated => {
            setEditingProj(updated);
            onProjectUpdated?.(updated);
          }}
          onCancel={() => setEditingProj(null)}
        />
      </div>
    );
  }

  if (editingPub) {
    return (
      <div className="min-h-screen">
        <PublicationEditor
          publication={editingPub === 'new' ? null : editingPub}
          departments={departments}
          projects={projects}
          canPublish={canPublish}
          onSave={async payload => {
            const saved = await onSavePublication(payload, editingPub === 'new' ? undefined : editingPub.id);
            setEditingPub(null);
            return saved;
          }}
          onReview={async (id, action, comment) => {
            await onReviewPublication(id, action, comment);
            setEditingPub(null);
          }}
          onCancel={() => setEditingPub(null)}
        />
      </div>
    );
  }

  if (editingProd) {
    return (
      <div className="min-h-screen">
        <ProductEditor
          product={editingProd === 'new' ? null : editingProd}
          departments={departments}
          projects={projects}
          canPublish={canPublish}
          onSave={async payload => {
            const saved = await onSaveProduct(payload, editingProd === 'new' ? undefined : editingProd.id);
            setEditingProd(null);
            return saved;
          }}
          onReview={async (id, action, comment) => {
            await onReviewProduct(id, action, comment);
            setEditingProd(null);
          }}
          onCancel={() => setEditingProd(null)}
        />
      </div>
    );
  }

  const counts: Record<ContentSubTab, number> = {
    departments: activeDepts.length,
    projects: activeProjects.length,
    publications: activePubs.length,
    products: activeProds.length
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-[#031D1C] rounded-2xl border border-white/10 text-xs">
          {visibleSubTabs.map(tab => {
            const id = tab.id as ContentSubTab;
            const Icon = SUBTAB_ICONS[id] || FolderKanban;
            const isActive = subTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectSubTab(id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#17A491] text-[#06302F] shadow-sm'
                    : 'text-[#EDE9E0]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 rounded-full ${
                    isActive ? 'bg-[#06302F]/30 text-[#06302F]' : 'bg-white/5 text-[#EDE9E0]/50'
                  }`}
                >
                  {counts[id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs text-red-300 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. DEPARTMENTS */}
      {subTab === 'departments' && canManageDepts && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Departments &amp; Sub-Units</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Single unified source of truth for all departments, taxonomy metadata, and focus areas.
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDepts.map(dept => (
              <div
                key={dept.id}
                className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-col justify-between gap-4 hover:border-[#25CDB6]/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <DepartmentIcon
                      glyph={dept.iconGlyph}
                      iconUrl={dept.iconUrl}
                      size={24}
                      color={dept.colorHex}
                      bgColor={dept.iconBgHex}
                      showBg
                    />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dept.published ? 'bg-[#25CDB6]/10 text-[#25CDB6]' : 'bg-white/5 text-white/40'
                      }`}
                    >
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
                    onClick={() => openDeleteDepartmentModal(dept)}
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

      {/* 2. PROJECTS */}
      {subTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Projects &amp; Initiatives</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Manage the MoA innovation pipeline, modular story blocks, and reviewer workflows.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#031D1C] p-1 rounded-2xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setProjViewMode('table')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    projViewMode === 'table' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setProjViewMode('cards')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    projViewMode === 'cards' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Card grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setProjViewMode('kanban')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    projViewMode === 'kanban' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Pipeline kanban"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {canCreateProject && (
                <button
                  type="button"
                  onClick={() => setEditingProj('new')}
                  className="px-4 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Project</span>
                </button>
              )}
            </div>
          </div>

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

          {filteredProjects.length === 0 ? (
            <div className="py-24 text-center rounded-3xl bg-[#031D1C] border border-white/10 space-y-3">
              <FolderKanban className="w-8 h-8 text-[#25CDB6] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">No projects yet</h3>
              <p className="text-xs text-[#EDE9E0]/50 max-w-sm mx-auto">
                Create a project draft to begin adding story blocks, media, and team credits.
              </p>
              {canCreateProject && (
                <button
                  type="button"
                  onClick={() => setEditingProj('new')}
                  className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer"
                >
                  Create First Project
                </button>
              )}
            </div>
          ) : projViewMode === 'table' ? (
            <div className="rounded-3xl bg-[#031D1C] border border-white/10 overflow-hidden divide-y divide-white/5">
              <div className="p-4 grid grid-cols-12 text-[10px] uppercase font-bold text-[#EDE9E0]/40 font-mono">
                <div className="col-span-5">Project Title</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Publication</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {filteredProjects.map(proj => {
                const editable = canEditEntry(proj.authorId);
                return (
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
                        <span className="text-[11px] font-mono text-[#EDE9E0]/40">/projects/{proj.slug}</span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[11px] font-semibold text-[#EDE9E0]/80">{proj.status}</span>
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          proj.publicationStatus === 'Published'
                            ? 'bg-[#25CDB6]/15 text-[#25CDB6]'
                            : proj.publicationStatus === 'Pending Review'
                            ? 'bg-amber-400/15 text-amber-300'
                            : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {proj.publicationStatus}
                      </span>
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-2">
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setEditingProj(proj)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onNavigateSite(
                            `/projects/${proj.slug}${proj.publicationStatus !== 'Published' ? '?preview=1' : ''}`
                          )
                        }
                        className="p-1.5 rounded-lg text-white/40 hover:text-white cursor-pointer"
                        title="View on public site"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {editable && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ kind: 'project', id: proj.id, label: proj.title })}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 cursor-pointer"
                          title="Trash project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : projViewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Draft', 'Pending Review', 'Published', 'Archived'] as const).map(stage => {
                const stageProjects = filteredProjects.filter(p => p.publicationStatus === stage);
                const headerColor =
                  stage === 'Published'
                    ? 'text-[#25CDB6]'
                    : stage === 'Pending Review'
                    ? 'text-amber-300'
                    : stage === 'Draft'
                    ? 'text-[#EDE9E0]'
                    : 'text-[#EDE9E0]/50';
                return (
                  <div
                    key={stage}
                    className="p-4 rounded-3xl bg-[#031D1C] border border-white/10 space-y-3 flex flex-col min-h-[260px]"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className={`text-xs font-bold uppercase tracking-wider ${headerColor}`}>{stage}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[#EDE9E0]/60">
                        {stageProjects.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {stageProjects.length === 0 ? (
                        <div className="py-10 text-center text-[11px] text-[#EDE9E0]/30 border border-dashed border-white/10 rounded-2xl">
                          No projects in {stage}
                        </div>
                      ) : (
                        stageProjects.map(proj => {
                          const editable = canEditEntry(proj.authorId);
                          return (
                            <div
                              key={proj.id}
                              className="p-3.5 rounded-2xl bg-[#06302F]/80 border border-white/10 hover:border-[#25CDB6]/40 transition-colors space-y-2.5"
                            >
                              {proj.coverImage && (
                                <div className="h-24 rounded-xl overflow-hidden bg-black/30">
                                  <img src={proj.coverImage} alt={proj.title} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-bold text-[#EDE9E0] line-clamp-2">{proj.title}</h4>
                                <p className="text-[11px] text-[#EDE9E0]/50 mt-0.5 truncate">
                                  {proj.category || 'General'} · {proj.status}
                                </p>
                              </div>
                              {editable && (
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingProj(proj)}
                                    className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-[#25CDB6] cursor-pointer"
                                  >
                                    {stage === 'Pending Review' && canPublish ? 'Review / Edit' : 'Edit'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget({ kind: 'project', id: proj.id, label: proj.title })}
                                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 cursor-pointer"
                                    title="Trash project"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(proj => {
                const editable = canEditEntry(proj.authorId);
                return (
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
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setEditingProj(proj)}
                          className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                          <span>Edit Story</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateSite(
                            `/projects/${proj.slug}${proj.publicationStatus !== 'Published' ? '?preview=1' : ''}`
                          )
                        }
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white cursor-pointer"
                        title="View on public site"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ kind: 'project', id: proj.id, label: proj.title })}
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 cursor-pointer"
                          title="Trash project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. PUBLICATIONS */}
      {subTab === 'publications' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Publications</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Research papers, monographs, whitepapers, and institutional reports with automatic PDF cover previews.
              </p>
            </div>

            {canManagePubs && (
              <button
                type="button"
                onClick={() => setEditingPub('new')}
                className="px-4 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Publication</span>
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#031D1C] border border-white/10 relative">
            <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-6 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={pubSearch}
              onChange={e => setPubSearch(e.target.value)}
              placeholder="Search publications by title, authors, or type..."
              className="w-full bg-[#06302F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
            />
          </div>

          {filteredPubs.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-[#031D1C] border border-white/10 space-y-3">
              <BookOpen className="w-8 h-8 text-[#D0A873] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">No publications yet</h3>
              <p className="text-xs text-[#EDE9E0]/50 max-w-sm mx-auto">
                Publish a research paper, monograph, or whitepaper to make it available under /projects?tab=publications.
              </p>
              {canManagePubs && (
                <button
                  type="button"
                  onClick={() => setEditingPub('new')}
                  className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer"
                >
                  Create First Publication
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPubs.map(pub => {
                const editable = canManagePubs && canEditEntry(pub.authorId);
                return (
                  <div
                    key={pub.id}
                    className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-col justify-between gap-4 hover:border-[#25CDB6]/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        {pub.thumbnailUrl ? (
                          <img
                            src={pub.thumbnailUrl}
                            alt={pub.title}
                            className="w-16 h-20 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <BookOpen className="w-6 h-6 text-[#D0A873]/70" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase text-[#D0A873]">
                              {pub.publicationType}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                pub.publicationStatus === 'Published'
                                  ? 'bg-[#25CDB6]/15 text-[#25CDB6]'
                                  : pub.publicationStatus === 'Pending Review'
                                  ? 'bg-amber-400/15 text-amber-300'
                                  : 'bg-white/5 text-white/50'
                              }`}
                            >
                              {pub.publicationStatus}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#EDE9E0] line-clamp-2">{pub.title}</h3>
                          <p className="text-[11px] text-[#EDE9E0]/60 truncate">{pub.authors}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setEditingPub(pub)}
                          className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                          <span>{pub.publicationStatus === 'Pending Review' && canPublish ? 'Review / Edit' : 'Edit'}</span>
                        </button>
                      )}
                      {pub.pdfUrl && (
                        <a
                          href={pub.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                          title="Open PDF"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ kind: 'publication', id: pub.id, label: pub.title })}
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 cursor-pointer"
                          title="Trash publication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. PRODUCTS */}
      {subTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Products &amp; Platforms</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Manage released software, tools, specifications, and distribution links.
              </p>
            </div>

            {canManageProds && (
              <button
                type="button"
                onClick={() => setEditingProd('new')}
                className="px-4 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Product</span>
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#031D1C] border border-white/10 relative">
            <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-6 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={prodSearch}
              onChange={e => setProdSearch(e.target.value)}
              placeholder="Search products by name, category, or tagline..."
              className="w-full bg-[#06302F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
            />
          </div>

          {filteredProds.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-[#031D1C] border border-white/10 space-y-3">
              <Package className="w-8 h-8 text-[#64B5D9] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">No products yet</h3>
              <p className="text-xs text-[#EDE9E0]/50 max-w-sm mx-auto">
                Add product releases with key features, specifications, and public download or repository links.
              </p>
              {canManageProds && (
                <button
                  type="button"
                  onClick={() => setEditingProd('new')}
                  className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer"
                >
                  Create First Product
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProds.map(prod => {
                const editable = canManageProds && canEditEntry(prod.authorId);
                return (
                  <div
                    key={prod.id}
                    className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-col justify-between gap-4 hover:border-[#25CDB6]/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="h-36 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative flex items-center justify-center">
                        {prod.coverImage ? (
                          <img src={prod.coverImage} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-8 h-8 text-[#64B5D9]/50" />
                        )}
                        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#031D1C]/90 text-[#25CDB6]">
                          {prod.publicationStatus}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#64B5D9]">
                          <span>{prod.category}</span>
                          <span>{prod.status}{prod.version ? ` · v${prod.version}` : ''}</span>
                        </div>
                        <h3 className="text-sm font-bold text-[#EDE9E0] mt-0.5 line-clamp-1">{prod.name}</h3>
                        <p className="text-xs text-[#EDE9E0]/60 line-clamp-2 mt-1">{prod.tagline || prod.shortDescription}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setEditingProd(prod)}
                          className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                          <span>{prod.publicationStatus === 'Pending Review' && canPublish ? 'Review / Edit' : 'Edit'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateSite(
                            `/products/${prod.slug}${prod.publicationStatus !== 'Published' ? '?preview=1' : ''}`
                          )
                        }
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white cursor-pointer"
                        title="View product page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ kind: 'product', id: prod.id, label: prod.name })}
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 cursor-pointer"
                          title="Trash product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Department Delete Choice Modal */}
      {deletingDept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Move Department to Trash"
        >
          <div className="w-full max-w-md bg-[#031D1C] border border-white/15 rounded-3xl p-6 space-y-4 text-[#EDE9E0] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Move Department to Trash</h3>
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#EDE9E0]/75 leading-relaxed">
              Choose how linked projects, publications, and products in <strong>{deletingDept.name}</strong> should be handled before moving it to Trash:
            </p>

            <div className="space-y-2.5 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#06302F] border border-white/10 cursor-pointer">
                <input
                  type="radio"
                  name="deptHandling"
                  checked={deptHandling === 'leave'}
                  onChange={() => setDeptHandling('leave')}
                  className="mt-0.5 accent-[#25CDB6]"
                />
                <span>
                  <strong className="block text-[#EDE9E0]">Leave items unlinked</strong>
                  <span className="text-[#EDE9E0]/60">Remove only this department link while keeping all items intact.</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#06302F] border border-white/10 cursor-pointer">
                <input
                  type="radio"
                  name="deptHandling"
                  checked={deptHandling === 'reassign'}
                  onChange={() => setDeptHandling('reassign')}
                  className="mt-0.5 accent-[#25CDB6]"
                />
                <span className="flex-1 space-y-2">
                  <strong className="block text-[#EDE9E0]">Reassign to another department</strong>
                  {deptHandling === 'reassign' && (
                    <select
                      value={reassignTargetDeptId}
                      onChange={e => setReassignTargetDeptId(e.target.value)}
                      className="w-full bg-[#031D1C] border border-white/15 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
                    >
                      <option value="">Select target department...</option>
                      {activeDepts
                        .filter(d => d.id !== deletingDept.id)
                        .map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  )}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingBusy}
                onClick={handleConfirmDeleteDepartment}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {deletingBusy ? 'Moving to Trash...' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Projects / Publications / Products */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Move to Trash"
        message={
          deleteTarget
            ? `Move "${deleteTarget.label}" to Trash? You can restore it within 30 days from Settings > Trash.`
            : ''
        }
        confirmLabel="Move to Trash"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
