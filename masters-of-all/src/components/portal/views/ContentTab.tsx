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
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Save
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
import { splitOrgUnits, isSector, isRddDepartment, getSectorParentId } from '../../../utils/orgHelpers';
import { getVisibleSubTabs } from '../portalRegistry';
import { DepartmentLogo } from '../../DepartmentLogo';
import { DepartmentEditor } from '../DepartmentEditor';
import { ProjectEditor } from '../ProjectEditor';
import { PublicationEditor } from '../PublicationEditor';
import { ProductEditor } from '../ProductEditor';
import { ConfirmDialog } from '../ConfirmDialog';
import { DeleteButton, DESTRUCTIVE_LABEL_BTN_CLASS } from '../DeleteButton';

export type ContentSubTab = 'departments' | 'projects' | 'publications' | 'products';

export interface ContentRequestedEdit {
  kind: ContentSubTab;
  id: string | 'new';
  nonce: number;
}

interface ContentTabProps {
  initialSubTab?: ContentSubTab;
  onSubTabChange?: (sub: ContentSubTab) => void;
  initialSelectedOrgUnitId?: string | null;
  onSelectedOrgUnitChange?: (unitId: string | null) => void;
  requestedEdit?: ContentRequestedEdit | null;
  departments: Department[];
  projects: Project[];
  publications: Publication[];
  products: Product[];
  currentUser: User;
  roles?: RoleDefinition[];
  onSaveDepartment: (dept: Partial<Department>, targetId?: string) => Promise<Department | void>;
  onReorderDepartments?: (orderedIds: string[]) => Promise<void>;
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
  initialSelectedOrgUnitId = null,
  onSelectedOrgUnitChange,
  requestedEdit,
  departments,
  projects,
  publications,
  products,
  currentUser,
  roles,
  onSaveDepartment,
  onReorderDepartments,
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

  // Master-detail state for Departments & Sectors (D9)
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<string | 'new-department' | 'new-sector' | null>(
    () => initialSelectedOrgUnitId || null
  );
  const [newSectorParentId, setNewSectorParentId] = useState<string | undefined>(undefined);
  const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);
  const [reorderingOrg, setReorderingOrg] = useState(false);
  const [deptEditorSaving, setDeptEditorSaving] = useState(false);
  const [deptSavedNotice, setDeptSavedNotice] = useState<string | null>(null);
  const DEPT_EDITOR_FORM_ID = 'portal-department-editor-form';

  // Full-screen editors for Projects / Publications / Products
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
        setSelectedOrgUnitId('new-department');
      } else {
        setSelectedOrgUnitId(requestedEdit.id);
      }
    } else if (requestedEdit.kind === 'projects' && (canCreateProject || canEditOwn || canEditAll || canPublish)) {
      setSubTab('projects');
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
      setEditingProj(null);
      setEditingProd(null);
      if (requestedEdit.id === 'new') {
        setEditingPub('new');
      } else {
        const found = publications.find(p => p.id === requestedEdit.id);
        if (found) setEditingPub(found);
      }
    } else if (requestedEdit.kind === 'products' && canManageProds) {
      setSubTab('products');
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

  // Filters & View Modes
  const [deptSearch, setDeptSearch] = useState('');
  const [projSearch, setProjSearch] = useState('');
  const [projStatusFilter, setProjStatusFilter] = useState('all');
  const [projViewMode, setProjViewMode] = useState<'table' | 'cards' | 'kanban'>('table');
  const [pubSearch, setPubSearch] = useState('');
  const [pubStatusFilter, setPubStatusFilter] = useState('all');
  const [pubViewMode, setPubViewMode] = useState<'table' | 'cards' | 'kanban'>('table');
  const [prodSearch, setProdSearch] = useState('');
  const [prodStatusFilter, setProdStatusFilter] = useState('all');
  const [prodViewMode, setProdViewMode] = useState<'table' | 'cards' | 'kanban'>('table');

  // Department Delete Choice Modal
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [deptHandling, setDeptHandling] = useState<'leave' | 'reassign'>('leave');
  const [reassignTargetDeptId, setReassignTargetDeptId] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Other Confirm Deletes & Errors
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirmState>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeDepts = useMemo(() => departments.filter(d => !d.deletedAt), [departments]);
  const orgUnits = useMemo(() => splitOrgUnits(activeDepts), [activeDepts]);
  const activeProjects = useMemo(() => projects.filter(p => !p.deletedAt), [projects]);
  const activePubs = useMemo(() => publications.filter(p => !p.deletedAt), [publications]);
  const activeProds = useMemo(() => products.filter(p => !p.deletedAt), [products]);

  useEffect(() => {
    if (activeDepts.length === 0) return;
    const isCreating = selectedOrgUnitId === 'new-department' || selectedOrgUnitId === 'new-sector';
    if (isCreating) return;
    const exists = selectedOrgUnitId && activeDepts.some(d => d.id === selectedOrgUnitId);
    if (!exists) {
      const firstId = orgUnits.departments[0]?.id || activeDepts[0].id;
      setSelectedOrgUnitId(firstId);
    }
  }, [selectedOrgUnitId, activeDepts, orgUnits]);

  useEffect(() => {
    if (selectedOrgUnitId !== 'new-department' && selectedOrgUnitId !== 'new-sector') {
      onSelectedOrgUnitChange?.(selectedOrgUnitId);
    }
  }, [selectedOrgUnitId, onSelectedOrgUnitChange]);

  const selectedOrgUnit = useMemo(() => {
    if (!selectedOrgUnitId || selectedOrgUnitId === 'new-department' || selectedOrgUnitId === 'new-sector') {
      return null;
    }
    return activeDepts.find(d => d.id === selectedOrgUnitId) || null;
  }, [selectedOrgUnitId, activeDepts]);

  const sectorsByParentId = useMemo(() => {
    const map = new Map<string, Department[]>();
    orgUnits.sectors.forEach(s => {
      const pid = getSectorParentId(s);
      const list = map.get(pid) || [];
      list.push(s);
      map.set(pid, list);
    });
    return map;
  }, [orgUnits.sectors]);

  const filteredTreeQuery = deptSearch.trim().toLowerCase();
  const visibleDepartments = useMemo(() => {
    if (!filteredTreeQuery) return orgUnits.departments;
    return orgUnits.departments.filter(d => {
      if (d.name.toLowerCase().includes(filteredTreeQuery) || d.slug.toLowerCase().includes(filteredTreeQuery)) {
        return true;
      }
      const children = sectorsByParentId.get(d.id) || [];
      return children.some(
        s => s.name.toLowerCase().includes(filteredTreeQuery) || s.slug.toLowerCase().includes(filteredTreeQuery)
      );
    });
  }, [orgUnits.departments, sectorsByParentId, filteredTreeQuery]);

  const filterChildSectors = (parentDept: Department) => {
    const list = sectorsByParentId.get(parentDept.id) || [];
    if (!filteredTreeQuery) return list;
    const parentMatches =
      parentDept.name.toLowerCase().includes(filteredTreeQuery) ||
      parentDept.slug.toLowerCase().includes(filteredTreeQuery);
    if (parentMatches) return list;
    return list.filter(
      s => s.name.toLowerCase().includes(filteredTreeQuery) || s.slug.toLowerCase().includes(filteredTreeQuery)
    );
  };

  const commitOrgOrder = async (nextDepartments: Department[], nextSectors: Department[]) => {
    if (!onReorderDepartments) return;
    const combinedIds = [
      ...nextDepartments.map(d => d.id),
      ...nextSectors.map(s => s.id)
    ];
    setReorderingOrg(true);
    setActionError(null);
    try {
      await onReorderDepartments(combinedIds);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to reorder units.');
    } finally {
      setReorderingOrg(false);
    }
  };

  const handleReorderUnit = (dragId: string, targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const dragUnit = activeDepts.find(d => d.id === dragId);
    const targetUnit = activeDepts.find(d => d.id === targetId);
    if (!dragUnit || !targetUnit) return;

    const dragIsSector = isSector(dragUnit);
    const targetIsSector = isSector(targetUnit);
    if (dragIsSector !== targetIsSector) return;

    if (!dragIsSector) {
      const list = [...orgUnits.departments];
      const fromIdx = list.findIndex(d => d.id === dragId);
      const toIdx = list.findIndex(d => d.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      void commitOrgOrder(list, orgUnits.sectors);
    } else {
      const dragParentId = getSectorParentId(dragUnit);
      const targetParentId = getSectorParentId(targetUnit);
      if (dragParentId !== targetParentId) return;
      const siblings = [...(sectorsByParentId.get(dragParentId) || [])];
      const fromIdx = siblings.findIndex(s => s.id === dragId);
      const toIdx = siblings.findIndex(s => s.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = siblings.splice(fromIdx, 1);
      siblings.splice(toIdx, 0, moved);
      const rebuiltSectors = orgUnits.sectors.map(s =>
        getSectorParentId(s) === dragParentId ? siblings.shift()! : s
      );
      void commitOrgOrder(orgUnits.departments, rebuiltSectors);
    }
  };

  const handleMoveUnitStep = (unit: Department, delta: -1 | 1) => {
    if (!isSector(unit)) {
      const list = [...orgUnits.departments];
      const idx = list.findIndex(d => d.id === unit.id);
      const nextIdx = idx + delta;
      if (idx < 0 || nextIdx < 0 || nextIdx >= list.length) return;
      const [moved] = list.splice(idx, 1);
      list.splice(nextIdx, 0, moved);
      void commitOrgOrder(list, orgUnits.sectors);
    } else {
      const parentId = getSectorParentId(unit);
      const siblings = [...(sectorsByParentId.get(parentId) || [])];
      const idx = siblings.findIndex(s => s.id === unit.id);
      const nextIdx = idx + delta;
      if (idx < 0 || nextIdx < 0 || nextIdx >= siblings.length) return;
      const [moved] = siblings.splice(idx, 1);
      siblings.splice(nextIdx, 0, moved);
      const rebuiltSectors = orgUnits.sectors.map(s =>
        getSectorParentId(s) === parentId ? siblings.shift()! : s
      );
      void commitOrgOrder(orgUnits.departments, rebuiltSectors);
    }
  };

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
    return activePubs.filter(p => {
      if (pubStatusFilter !== 'all' && p.publicationStatus !== pubStatusFilter) return false;
      if (!pubSearch.trim()) return true;
      const q = pubSearch.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.authors.toLowerCase().includes(q) ||
        p.publicationType.toLowerCase().includes(q)
      );
    });
  }, [activePubs, pubStatusFilter, pubSearch]);

  const filteredProds = useMemo(() => {
    return activeProds.filter(p => {
      if (prodStatusFilter !== 'all' && p.status.toLowerCase() !== prodStatusFilter.toLowerCase()) {
        return false;
      }
      if (!prodSearch.trim()) return true;
      const q = prodSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q)
      );
    });
  }, [activeProds, prodStatusFilter, prodSearch]);

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

  // Full Sub-Editors (Projects / Publications / Products)

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
    <div
      className={
        subTab === 'departments' && canManageDepts
          ? 'flex flex-col gap-5 lg:flex-1 lg:min-h-0'
          : 'space-y-6'
      }
    >
      {/* Sub-Tabs Navigation */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-[#031D1C] rounded-2xl border border-white/10 text-xs">
          {visibleSubTabs.map(tab => {
            const id = tab.id as ContentSubTab;
            const Icon = SUBTAB_ICONS[id] || FolderKanban;
            const isActive = subTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectSubTab(id)}
                className={`h-9 flex items-center gap-2 px-3.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
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

      {/* 1. DEPARTMENTS & SECTORS MASTER-DETAIL TREE */}
      {subTab === 'departments' && canManageDepts && (
        <div className="flex flex-col gap-4 lg:flex-1 lg:min-h-0">
          <div className="shrink-0 flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="w-full lg:w-[295px] shrink-0">
              <h2 className="text-xl font-bold text-[#EDE9E0]">Departments &amp; Sectors</h2>
              <p className="text-xs text-[#EDE9E0]/65">
                {orgUnits.departments.length} Departments &middot; {orgUnits.sectors.length} Sectors
                {reorderingOrg ? ' · Saving order...' : ''}
              </p>
            </div>

            <div className="flex-1 min-w-0 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5">
              {/* Selected Unit Badge & Heading aligned cleanly on the action row */}
              <div className="min-w-0 flex-1">
                {(selectedOrgUnitId === 'new-department' || selectedOrgUnitId === 'new-sector' || selectedOrgUnit) && (() => {
                  const isCreatingSector = selectedOrgUnitId === 'new-sector';
                  const isCreatingDept = selectedOrgUnitId === 'new-department';
                  const isUnitSector = isCreatingSector || (selectedOrgUnit ? isSector(selectedOrgUnit) : false);
                  const isUnitRdd = !isUnitSector && Boolean(selectedOrgUnit && isRddDepartment(selectedOrgUnit));
                  const parentDept = isUnitSector
                    ? activeDepts.find(
                        d =>
                          d.id ===
                          (isCreatingSector
                            ? newSectorParentId || orgUnits.departments[0]?.id
                            : getSectorParentId(selectedOrgUnit!))
                      )
                    : undefined;
                  const badgeLabel = isUnitSector
                    ? `${parentDept?.shortName || parentDept?.name || 'Department'} Sector`
                    : isUnitRdd
                    ? 'RDD Division'
                    : 'Department';
                  const titleLabel = isCreatingSector
                    ? 'New Sector'
                    : isCreatingDept
                    ? 'New Department'
                    : selectedOrgUnit?.name || '';

                  return (
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#25CDB6] font-bold shrink-0">
                          {badgeLabel}
                        </span>
                        {deptSavedNotice && (
                          <span className="text-xs text-[#25CDB6] font-semibold truncate">{deptSavedNotice}</span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#EDE9E0] truncate mt-0.5">
                        {titleLabel}
                      </h3>
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 shrink-0">
                {selectedOrgUnit &&
                  selectedOrgUnitId !== 'new-department' &&
                  selectedOrgUnitId !== 'new-sector' &&
                  !(!isSector(selectedOrgUnit) && isRddDepartment(selectedOrgUnit)) && (
                    <DeleteButton
                      onClick={() => openDeleteDepartmentModal(selectedOrgUnit)}
                      label="Trash"
                      title="Move to Trash"
                    />
                  )}

                {selectedOrgUnit && !isSector(selectedOrgUnit) && selectedOrgUnitId !== 'new-department' && selectedOrgUnitId !== 'new-sector' && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewSectorParentId(selectedOrgUnit.id);
                      setSelectedOrgUnitId('new-sector');
                    }}
                    className="h-9 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-[#25CDB6]/40 text-[#25CDB6] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                    <span>New Sector</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setNewSectorParentId(undefined);
                    setSelectedOrgUnitId('new-department');
                  }}
                  className="h-9 px-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                  <span>New Department</span>
                </button>

                {(selectedOrgUnitId === 'new-department' || selectedOrgUnitId === 'new-sector' || selectedOrgUnit) && (
                  <>
                    <span className="hidden sm:inline-block w-px h-5 bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />

                    {selectedOrgUnitId === 'new-department' || selectedOrgUnitId === 'new-sector' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setNewSectorParentId(undefined);
                            setSelectedOrgUnitId(orgUnits.departments[0]?.id || null);
                          }}
                          className="h-9 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0]/80 inline-flex items-center justify-center whitespace-nowrap transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          form={DEPT_EDITOR_FORM_ID}
                          disabled={deptEditorSaving}
                          className="h-9 px-3 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {deptEditorSaving ? (
                            <div className="w-4 h-4 border-2 border-[#06302F] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5 shrink-0" />
                              <span>{selectedOrgUnitId === 'new-sector' ? 'Save Sector' : 'Save Department'}</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : selectedOrgUnit ? (
                      <button
                        type="submit"
                        form={DEPT_EDITOR_FORM_ID}
                        disabled={deptEditorSaving}
                        className="h-9 px-3 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {deptEditorSaving ? (
                          <div className="w-4 h-4 border-2 border-[#06302F] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 shrink-0" />
                            <span>{isSector(selectedOrgUnit) ? 'Save Sector' : 'Save Department'}</span>
                          </>
                        )}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5 items-stretch lg:flex-1 lg:min-h-0">
            {/* LEFT PANEL: ~295px Unified Org Outline Tree */}
            <aside className="w-full lg:w-[295px] shrink-0 lg:h-full lg:overflow-y-auto no-scrollbar rounded-2xl bg-[#031D1C] border border-white/10 p-4 space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#EDE9E0]/45 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deptSearch}
                  onChange={e => setDeptSearch(e.target.value)}
                  placeholder="Filter org tree..."
                  className="w-full h-9 bg-[#06302F] border border-white/10 rounded-xl pl-9 pr-3 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-[#25CDB6] px-1 pt-1 flex items-center justify-between">
                <span>Masters Of All</span>
                <span className="text-[10px] font-mono text-[#EDE9E0]/45">Org Tree</span>
              </div>

              {/* All Departments (Unified, Draggable, Up/Down Reorderable) + Nested Child Sectors */}
              <div className="space-y-1.5">
                {visibleDepartments.map((dept, index) => {
                  const isSelected = selectedOrgUnitId === dept.id;
                  const deptSectors = filterChildSectors(dept);
                  const totalDeptSectors = (sectorsByParentId.get(dept.id) || []).length;
                  const hasSelectedChild = deptSectors.some(s => s.id === selectedOrgUnitId);
                  return (
                    <div key={dept.id} className="space-y-1">
                      <div
                        draggable={!filteredTreeQuery && Boolean(onReorderDepartments)}
                        onDragStart={() => setDraggingUnitId(dept.id)}
                        onDragOver={e => {
                          if (draggingUnitId && draggingUnitId !== dept.id) e.preventDefault();
                        }}
                        onDrop={() => {
                          if (draggingUnitId) handleReorderUnit(draggingUnitId, dept.id);
                          setDraggingUnitId(null);
                        }}
                        onDragEnd={() => setDraggingUnitId(null)}
                        className={`group flex items-center gap-2 px-2 py-2 rounded-xl border transition-colors ${
                          isSelected
                            ? 'bg-[#17A491]/15 border-[#25CDB6]/60 text-[#EDE9E0]'
                            : 'bg-transparent border-transparent hover:bg-white/[0.04] text-[#EDE9E0]/85'
                        }`}
                      >
                        {!filteredTreeQuery && onReorderDepartments && (
                          <span
                            className="text-[#EDE9E0]/35 hover:text-[#EDE9E0]/75 cursor-grab shrink-0"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedOrgUnitId(dept.id)}
                          className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                        >
                          <DepartmentLogo department={dept} size={24} />
                          <span className="text-xs font-semibold truncate flex-1">{dept.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              dept.published ? 'bg-[#25CDB6]' : 'bg-white/25'
                            }`}
                            title={dept.published ? 'Published' : 'Draft / Hidden'}
                          />
                        </button>
                        {!filteredTreeQuery && onReorderDepartments && visibleDepartments.length > 1 && (
                          <div className="flex lg:hidden lg:group-hover:flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={index === 0 || reorderingOrg}
                              onClick={() => handleMoveUnitStep(dept, -1)}
                              aria-label={`Move ${dept.name} up`}
                              className="p-1 rounded hover:bg-white/10 text-[#EDE9E0]/55 hover:text-white disabled:opacity-25 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={index === visibleDepartments.length - 1 || reorderingOrg}
                              onClick={() => handleMoveUnitStep(dept, 1)}
                              aria-label={`Move ${dept.name} down`}
                              className="p-1 rounded hover:bg-white/10 text-[#EDE9E0]/55 hover:text-white disabled:opacity-25 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {(deptSectors.length > 0 || (hasSelectedChild && totalDeptSectors > 0)) && (
                        <div className="pl-3.5 ml-3 border-l border-[#CA7952]/35 space-y-1 pt-0.5 pb-1">
                          {deptSectors.map((sector, sIdx) => {
                            const isSectorSelected = selectedOrgUnitId === sector.id;
                            return (
                              <div key={sector.id} className="relative flex items-center">
                                <span
                                  aria-hidden="true"
                                  className="w-2.5 h-px bg-[#CA7952]/35 shrink-0 mr-1"
                                />
                                <div
                                  draggable={!filteredTreeQuery && Boolean(onReorderDepartments)}
                                  onDragStart={() => setDraggingUnitId(sector.id)}
                                  onDragOver={e => {
                                    if (draggingUnitId && draggingUnitId !== sector.id) e.preventDefault();
                                  }}
                                  onDrop={() => {
                                    if (draggingUnitId) handleReorderUnit(draggingUnitId, sector.id);
                                    setDraggingUnitId(null);
                                  }}
                                  onDragEnd={() => setDraggingUnitId(null)}
                                  className={`flex-1 min-w-0 group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors ${
                                    isSectorSelected
                                      ? 'bg-[#17A491]/15 border-[#25CDB6]/60 text-[#EDE9E0]'
                                      : 'bg-transparent border-transparent hover:bg-white/[0.04] text-[#EDE9E0]/85'
                                  }`}
                                >
                                  {!filteredTreeQuery && onReorderDepartments && deptSectors.length > 1 && (
                                    <span
                                      className="text-[#EDE9E0]/35 hover:text-[#EDE9E0]/75 cursor-grab shrink-0"
                                      title="Drag to reorder sector"
                                    >
                                      <GripVertical className="w-3 h-3" />
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrgUnitId(sector.id)}
                                    className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                                  >
                                    <DepartmentLogo
                                      department={sector}
                                      size={20}
                                      rounded="xl"
                                      fallbackMode="icon"
                                      iconSize={12}
                                      showBorder={false}
                                    />
                                    <span className="text-xs font-medium truncate flex-1">{sector.name}</span>
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        sector.published ? 'bg-[#25CDB6]' : 'bg-white/25'
                                      }`}
                                      title={sector.published ? 'Published' : 'Draft / Hidden'}
                                    />
                                  </button>
                                  {!filteredTreeQuery && onReorderDepartments && deptSectors.length > 1 && (
                                    <div className="flex lg:hidden lg:group-hover:flex items-center gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        disabled={sIdx === 0 || reorderingOrg}
                                        onClick={() => handleMoveUnitStep(sector, -1)}
                                        aria-label={`Move ${sector.name} up`}
                                        className="p-1 rounded hover:bg-white/10 text-[#EDE9E0]/55 hover:text-white disabled:opacity-25 cursor-pointer"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={sIdx === deptSectors.length - 1 || reorderingOrg}
                                        onClick={() => handleMoveUnitStep(sector, 1)}
                                        aria-label={`Move ${sector.name} down`}
                                        className="p-1 rounded hover:bg-white/10 text-[#EDE9E0]/55 hover:text-white disabled:opacity-25 cursor-pointer"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* RIGHT PANEL: Independently Scrolling Inline Department / Sector Editor */}
            <div className="flex-1 min-w-0 w-full lg:h-full lg:overflow-y-auto no-scrollbar lg:pr-1 pb-6">
              {selectedOrgUnitId === 'new-department' || selectedOrgUnitId === 'new-sector' ? (
                <DepartmentEditor
                  key={`${selectedOrgUnitId}-${newSectorParentId || 'default'}`}
                  embedded
                  hideHeaderActions
                  formId={DEPT_EDITOR_FORM_ID}
                  onSavingChange={setDeptEditorSaving}
                  onSavedNoticeChange={setDeptSavedNotice}
                  department={null}
                  parentDepartment={
                    (newSectorParentId ? activeDepts.find(d => d.id === newSectorParentId) : undefined) ||
                    orgUnits.departments[0]
                  }
                  defaultParentDepartmentId={newSectorParentId || orgUnits.departments[0]?.id}
                  defaultKind={selectedOrgUnitId === 'new-sector' ? 'sector' : 'department'}
                  allDepartments={departments}
                  onSave={async payload => {
                    const created = await onSaveDepartment(payload);
                    setNewSectorParentId(undefined);
                    if (created && created.id) {
                      setSelectedOrgUnitId(created.id);
                    } else {
                      setSelectedOrgUnitId(null);
                    }
                  }}
                  onCancel={() => {
                    setNewSectorParentId(undefined);
                    setSelectedOrgUnitId(orgUnits.departments[0]?.id || null);
                  }}
                />
              ) : selectedOrgUnit ? (
                <DepartmentEditor
                  key={selectedOrgUnit.id}
                  embedded
                  hideHeaderActions
                  formId={DEPT_EDITOR_FORM_ID}
                  onSavingChange={setDeptEditorSaving}
                  onSavedNoticeChange={setDeptSavedNotice}
                  department={selectedOrgUnit}
                  parentDepartment={
                    (isSector(selectedOrgUnit)
                      ? activeDepts.find(d => d.id === getSectorParentId(selectedOrgUnit))
                      : undefined) || orgUnits.rddDepartment
                  }
                  allDepartments={departments}
                  onSave={async payload => {
                    await onSaveDepartment(payload, selectedOrgUnit.id);
                  }}
                  onCancel={() => {}}
                  onDelete={dept => openDeleteDepartmentModal(dept)}
                  onViewLive={path => onNavigateSite(path)}
                />
              ) : (
                <div className="rounded-2xl bg-[#031D1C] border border-white/10 p-12 text-center space-y-3">
                  <Building className="w-8 h-8 text-[#25CDB6] mx-auto opacity-75" />
                  <h3 className="text-sm font-bold text-[#EDE9E0]">
                    Select a Department or Sector
                  </h3>
                  <p className="text-xs text-[#EDE9E0]/60 max-w-sm mx-auto">
                    Choose an organizational unit from the hierarchy outline on the left, or create a new department or sector.
                  </p>
                </div>
              )}
            </div>
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
                  className="h-9 px-3.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
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
              <div className="p-4 hidden sm:grid sm:grid-cols-12 text-[10px] uppercase font-bold text-[#EDE9E0]/40 font-mono">
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
                    className="p-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 sm:gap-2 hover:bg-white/[0.02] transition-colors text-xs"
                  >
                    <div className="sm:col-span-5 flex items-center gap-3 min-w-0 sm:pr-4">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                        {proj.coverImage ? (
                          <img src={proj.coverImage} alt={proj.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 font-bold">
                            MOA
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#EDE9E0] block truncate">{proj.title}</span>
                        <span className="text-[11px] font-mono text-[#EDE9E0]/40 block truncate">/projects/{proj.slug}</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:block">
                      <span className="sm:hidden text-[10px] uppercase font-mono text-[#EDE9E0]/45">Status</span>
                      <span className="text-[11px] font-semibold text-[#EDE9E0]/80">{proj.status}</span>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:block">
                      <span className="sm:hidden text-[10px] uppercase font-mono text-[#EDE9E0]/45">Publication</span>
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

                    <div className="sm:col-span-3 flex flex-wrap items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
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
                        <DeleteButton
                          onClick={() => setDeleteTarget({ kind: 'project', id: proj.id, label: proj.title })}
                          title="Move project to Trash"
                          ariaLabel={`Move ${proj.title} to Trash`}
                        />
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
                                  <DeleteButton
                                    onClick={() => setDeleteTarget({ kind: 'project', id: proj.id, label: proj.title })}
                                    title="Move project to Trash"
                                    ariaLabel={`Move ${proj.title} to Trash`}
                                  />
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
                        <DeleteButton
                          onClick={() => setDeleteTarget({ kind: 'project', id: proj.id, label: proj.title })}
                          title="Move project to Trash"
                          ariaLabel={`Move ${proj.title} to Trash`}
                        />
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

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#031D1C] p-1 rounded-2xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setPubViewMode('table')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    pubViewMode === 'table' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPubViewMode('cards')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    pubViewMode === 'cards' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Card grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPubViewMode('kanban')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    pubViewMode === 'kanban' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Pipeline kanban"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {canManagePubs && (
                <button
                  type="button"
                  onClick={() => setEditingPub('new')}
                  className="h-9 px-3.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span>New Publication</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 p-3 rounded-2xl bg-[#031D1C] border border-white/10 relative w-full">
              <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-6 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pubSearch}
                onChange={e => setPubSearch(e.target.value)}
                placeholder="Search publications..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <select
              value={pubStatusFilter}
              onChange={e => setPubStatusFilter(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-[#031D1C] border border-white/10 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {filteredPubs.length === 0 ? (
            <div className="py-24 text-center rounded-3xl bg-[#031D1C] border border-white/10 space-y-3">
              <BookOpen className="w-8 h-8 text-[#25CDB6] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">No publications yet</h3>
              <p className="text-xs text-[#EDE9E0]/50 max-w-sm mx-auto">
                Publish a research paper, monograph, or whitepaper to make it available under Projects &amp; Publications.
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
          ) : pubViewMode === 'table' ? (
            <div className="rounded-3xl bg-[#031D1C] border border-white/10 overflow-hidden divide-y divide-white/5">
              <div className="p-4 hidden sm:grid sm:grid-cols-12 text-[10px] uppercase font-bold text-[#EDE9E0]/40 font-mono">
                <div className="col-span-5">Publication Title</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Publication</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {filteredPubs.map(pub => {
                const editable = canManagePubs && canEditEntry(pub.authorId);
                return (
                  <div
                    key={pub.id}
                    className="p-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 sm:gap-2 hover:bg-white/[0.02] transition-colors text-xs"
                  >
                    <div className="sm:col-span-5 flex items-center gap-3 min-w-0 sm:pr-4">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                        {pub.thumbnailUrl ? (
                          <img src={pub.thumbnailUrl} alt={pub.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 font-bold">
                            MOA
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#EDE9E0] block truncate">{pub.title}</span>
                        <span className="text-[11px] font-mono text-[#EDE9E0]/40 truncate block">
                          {pub.authors || pub.publicationDate || 'Research Publication'}
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:block">
                      <span className="sm:hidden text-[10px] uppercase font-mono text-[#EDE9E0]/45">Type</span>
                      <span className="text-[11px] font-semibold text-[#EDE9E0]/80">{pub.publicationType}</span>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:block">
                      <span className="sm:hidden text-[10px] uppercase font-mono text-[#EDE9E0]/45">Publication</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pub.publicationStatus === 'Published'
                            ? 'bg-[#25CDB6]/15 text-[#25CDB6]'
                            : pub.publicationStatus === 'Pending Review'
                            ? 'bg-amber-400/15 text-amber-300'
                            : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {pub.publicationStatus}
                      </span>
                    </div>

                    <div className="sm:col-span-3 flex flex-wrap items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setEditingPub(pub)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                          <span>{pub.publicationStatus === 'Pending Review' && canPublish ? 'Review / Edit' : 'Edit'}</span>
                        </button>
                      )}

                      {pub.pdfUrl ? (
                        <a
                          href={pub.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-white/40 hover:text-white cursor-pointer"
                          title="Open PDF"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigateSite('/projects')}
                          className="p-1.5 rounded-lg text-white/40 hover:text-white cursor-pointer"
                          title="View on public site"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {editable && (
                        <DeleteButton
                          onClick={() => setDeleteTarget({ kind: 'publication', id: pub.id, label: pub.title })}
                          title="Move publication to Trash"
                          ariaLabel={`Move ${pub.title} to Trash`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : pubViewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Draft', 'Pending Review', 'Published', 'Archived'] as const).map(stage => {
                const stagePubs = filteredPubs.filter(p => p.publicationStatus === stage);
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
                        {stagePubs.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {stagePubs.length === 0 ? (
                        <div className="py-10 text-center text-[11px] text-[#EDE9E0]/30 border border-dashed border-white/10 rounded-2xl">
                          No publications in {stage}
                        </div>
                      ) : (
                        stagePubs.map(pub => {
                          const editable = canManagePubs && canEditEntry(pub.authorId);
                          return (
                            <div
                              key={pub.id}
                              className="p-3.5 rounded-2xl bg-[#06302F]/80 border border-white/10 hover:border-[#25CDB6]/40 transition-colors space-y-2.5"
                            >
                              {pub.thumbnailUrl && (
                                <div className="h-24 rounded-xl overflow-hidden bg-black/30">
                                  <img src={pub.thumbnailUrl} alt={pub.title} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-bold text-[#EDE9E0] line-clamp-2">{pub.title}</h4>
                                <p className="text-[11px] text-[#EDE9E0]/50 mt-0.5 truncate">
                                  {pub.publicationType} · {pub.authors || 'MoA'}
                                </p>
                              </div>
                              {editable && (
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingPub(pub)}
                                    className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-[#25CDB6] cursor-pointer"
                                  >
                                    {stage === 'Pending Review' && canPublish ? 'Review / Edit' : 'Edit'}
                                  </button>
                                  <DeleteButton
                                    onClick={() => setDeleteTarget({ kind: 'publication', id: pub.id, label: pub.title })}
                                    title="Move publication to Trash"
                                    ariaLabel={`Move ${pub.title} to Trash`}
                                  />
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
              {filteredPubs.map(pub => {
                const editable = canManagePubs && canEditEntry(pub.authorId);
                return (
                  <div
                    key={pub.id}
                    className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-col justify-between gap-4 hover:border-[#25CDB6]/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="h-36 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative flex items-center justify-center">
                        {pub.thumbnailUrl ? (
                          <img src={pub.thumbnailUrl} alt={pub.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-8 h-8 text-[#D0A873]/50" />
                        )}
                        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#031D1C]/90 backdrop-blur-md text-[#25CDB6]">
                          {pub.publicationStatus}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-[#EDE9E0] line-clamp-1">{pub.title}</h3>
                        <p className="text-xs text-[#EDE9E0]/60 line-clamp-2 mt-1">
                          {pub.abstract || pub.authors || 'No abstract provided.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
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
                        <DeleteButton
                          onClick={() => setDeleteTarget({ kind: 'publication', id: pub.id, label: pub.title })}
                          title="Move publication to Trash"
                          ariaLabel={`Move ${pub.title} to Trash`}
                        />
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

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#031D1C] p-1 rounded-2xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setProdViewMode('table')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    prodViewMode === 'table' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setProdViewMode('cards')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    prodViewMode === 'cards' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Card grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setProdViewMode('kanban')}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    prodViewMode === 'kanban' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'
                  }`}
                  title="Pipeline kanban"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {canManageProds && (
                <button
                  type="button"
                  onClick={() => setEditingProd('new')}
                  className="h-9 px-3.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span>New Product</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 p-3 rounded-2xl bg-[#031D1C] border border-white/10 relative w-full">
              <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-6 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <select
              value={prodStatusFilter}
              onChange={e => setProdStatusFilter(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-[#031D1C] border border-white/10 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Concept">Concept</option>
              <option value="In development">In development</option>
              <option value="Released">Released</option>
            </select>
          </div>

          {filteredProds.length === 0 ? (
            <div className="py-24 text-center rounded-3xl bg-[#031D1C] border border-white/10 space-y-3">
              <Package className="w-8 h-8 text-[#25CDB6] mx-auto opacity-70" />
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
          ) : prodViewMode === 'table' ? (
            <div className="rounded-3xl bg-[#031D1C] border border-white/10 overflow-hidden divide-y divide-white/5">
              <div className="p-4 hidden sm:grid sm:grid-cols-12 text-[10px] uppercase font-bold text-[#EDE9E0]/40 font-mono">
                <div className="col-span-5">Product Name</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Publication</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              {filteredProds.map(prod => {
                const editable = canManageProds && canEditEntry(prod.authorId);
                return (
                  <div
                    key={prod.id}
                    className="p-4 flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3 sm:gap-2 hover:bg-white/[0.02] transition-colors text-xs"
                  >
                    <div className="sm:col-span-5 flex items-center gap-3 min-w-0 sm:pr-4">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                        {prod.coverImage ? (
                          <img src={prod.coverImage} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 font-bold">
                            MOA
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-[#EDE9E0] block truncate">{prod.name}</span>
                        <span className="text-[11px] font-mono text-[#EDE9E0]/40 block truncate">/products/{prod.slug}</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:block">
                      <span className="sm:hidden text-[10px] uppercase font-mono text-[#EDE9E0]/45">Status</span>
                      <span className="text-[11px] font-semibold text-[#EDE9E0]/80">{prod.status}</span>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:block">
                      <span className="sm:hidden text-[10px] uppercase font-mono text-[#EDE9E0]/45">Publication</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prod.publicationStatus === 'Published'
                            ? 'bg-[#25CDB6]/15 text-[#25CDB6]'
                            : prod.publicationStatus === 'Pending Review'
                            ? 'bg-amber-400/15 text-amber-300'
                            : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {prod.publicationStatus}
                      </span>
                    </div>

                    <div className="sm:col-span-3 flex flex-wrap items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setEditingProd(prod)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1 cursor-pointer"
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
                        className="p-1.5 rounded-lg text-white/40 hover:text-white cursor-pointer"
                        title="View on public site"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {editable && (
                        <DeleteButton
                          onClick={() => setDeleteTarget({ kind: 'product', id: prod.id, label: prod.name })}
                          title="Move product to Trash"
                          ariaLabel={`Move ${prod.name} to Trash`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : prodViewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['Draft', 'Pending Review', 'Published', 'Archived'] as const).map(stage => {
                const stageProducts = filteredProds.filter(p => p.publicationStatus === stage);
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
                        {stageProducts.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {stageProducts.length === 0 ? (
                        <div className="py-10 text-center text-[11px] text-[#EDE9E0]/30 border border-dashed border-white/10 rounded-2xl">
                          No products in {stage}
                        </div>
                      ) : (
                        stageProducts.map(prod => {
                          const editable = canManageProds && canEditEntry(prod.authorId);
                          return (
                            <div
                              key={prod.id}
                              className="p-3.5 rounded-2xl bg-[#06302F]/80 border border-white/10 hover:border-[#25CDB6]/40 transition-colors space-y-2.5"
                            >
                              {prod.coverImage && (
                                <div className="h-24 rounded-xl overflow-hidden bg-black/30">
                                  <img src={prod.coverImage} alt={prod.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-bold text-[#EDE9E0] line-clamp-2">{prod.name}</h4>
                                <p className="text-[11px] text-[#EDE9E0]/50 mt-0.5 truncate">
                                  {prod.category || 'Product'} · {prod.status}
                                </p>
                              </div>
                              {editable && (
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingProd(prod)}
                                    className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-[#25CDB6] cursor-pointer"
                                  >
                                    {stage === 'Pending Review' && canPublish ? 'Review / Edit' : 'Edit'}
                                  </button>
                                  <DeleteButton
                                    onClick={() => setDeleteTarget({ kind: 'product', id: prod.id, label: prod.name })}
                                    title="Move product to Trash"
                                    ariaLabel={`Move ${prod.name} to Trash`}
                                  />
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
                          <Package className="w-8 h-8 text-[#25CDB6]/50" />
                        )}
                        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#031D1C]/90 backdrop-blur-md text-[#25CDB6]">
                          {prod.publicationStatus}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-[#EDE9E0] line-clamp-1">{prod.name}</h3>
                        <p className="text-xs text-[#EDE9E0]/60 line-clamp-2 mt-1">
                          {prod.tagline || prod.shortDescription || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
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
                        <DeleteButton
                          onClick={() => setDeleteTarget({ kind: 'product', id: prod.id, label: prod.name })}
                          title="Move product to Trash"
                          ariaLabel={`Move ${prod.name} to Trash`}
                        />
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
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[#031D1C] border border-white/15 rounded-3xl p-4 sm:p-6 space-y-4 text-[#EDE9E0] shadow-2xl">
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

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/10">
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
                className={DESTRUCTIVE_LABEL_BTN_CLASS}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingBusy ? 'Moving to Trash...' : 'Move to Trash'}</span>
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
