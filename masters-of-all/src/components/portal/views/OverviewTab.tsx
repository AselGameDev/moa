import React, { useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  FolderKanban,
  Building,
  Eye,
  Sparkles,
  Mail,
  ShieldCheck,
  BookOpen,
  Package,
  Plus,
  MessageSquareWarning,
  FileEdit
} from 'lucide-react';
import {
  Department,
  Project,
  Publication,
  Product,
  SiteHealthItem,
  FormSubmission,
  ActivityRecord,
  SiteSettings,
  User,
  RoleDefinition
} from '../../../types';
import { can } from '../../../shared/permissions';
import { splitOrgUnits } from '../../../utils/orgHelpers';
import { CreateActionType, getVisibleCreateActions } from '../portalRegistry';

interface OverviewTabProps {
  currentUser: User;
  roles?: RoleDefinition[];
  departments: Department[];
  projects: Project[];
  publications?: Publication[];
  products?: Product[];
  healthWarnings: SiteHealthItem[];
  submissions: FormSubmission[];
  activityLog: ActivityRecord[];
  settings?: SiteSettings;
  onNavigateTab: (
    tab: string,
    subTab?: string,
    id?: string,
    kind?: 'projects' | 'publications' | 'products' | 'departments'
  ) => void;
  onCreateAction?: (actionType: CreateActionType) => void;
  onNavigateSite: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  currentUser,
  roles,
  departments,
  projects,
  publications = [],
  products = [],
  healthWarnings,
  submissions,
  activityLog,
  settings,
  onNavigateTab,
  onCreateAction,
  onNavigateSite
}) => {
  const canEditSite = can(currentUser, 'website.edit', roles);
  const canManageDepts = can(currentUser, 'departments.manage', roles);
  const canEditAllProjects = can(currentUser, 'projects.editAll', roles);
  const canPublish = can(currentUser, 'projects.publish', roles);
  const canViewInbox = can(currentUser, 'inbox.view', roles);
  const canViewAudit = can(currentUser, 'audit.view', roles);
  const canManageSettings = can(currentUser, 'settings.manage', roles);

  const isPrivilegedOverview =
    canEditSite || canManageDepts || canEditAllProjects || canPublish || canManageSettings || canViewAudit || canViewInbox;

  const activeDepts = useMemo(() => departments.filter(d => !d.deletedAt), [departments]);
  const { departments: deptUnits, sectors: sectorUnits } = useMemo(
    () => splitOrgUnits(activeDepts),
    [activeDepts]
  );
  const publishedDeptUnits = useMemo(() => deptUnits.filter(d => d.published), [deptUnits]);
  const activeProjects = useMemo(() => projects.filter(p => !p.deletedAt), [projects]);
  const activePubs = useMemo(() => publications.filter(p => !p.deletedAt), [publications]);
  const activeProds = useMemo(() => products.filter(p => !p.deletedAt), [products]);

  const publishedProjects = activeProjects.filter(p => p.publicationStatus === 'Published');
  const pendingReviews = [
    ...activeProjects.filter(p => p.publicationStatus === 'Pending Review'),
    ...activePubs.filter(p => p.publicationStatus === 'Pending Review'),
    ...activeProds.filter(p => p.publicationStatus === 'Pending Review')
  ];
  const draftProjects = activeProjects.filter(p => p.publicationStatus === 'Draft');
  const newSubmissionsCount = submissions.filter(s => s.status === 'new').length;

  // Contributor-scoped lists
  const myDrafts = useMemo(() => {
    const mine: Array<{ kind: 'projects' | 'publications' | 'products'; id: string; title: string; updatedAt: string }> = [];
    activeProjects
      .filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Draft')
      .forEach(p => mine.push({ kind: 'projects', id: p.id, title: p.title, updatedAt: p.updatedAt || p.createdAt }));
    activePubs
      .filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Draft')
      .forEach(p => mine.push({ kind: 'publications', id: p.id, title: p.title, updatedAt: p.updatedAt || p.createdAt }));
    activeProds
      .filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Draft')
      .forEach(p => mine.push({ kind: 'products', id: p.id, title: p.name, updatedAt: p.updatedAt || p.createdAt }));
    return mine.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [activeProjects, activePubs, activeProds, currentUser.id]);

  const myPending = useMemo(() => {
    return [
      ...activeProjects
        .filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Pending Review')
        .map(p => ({ kind: 'projects' as const, id: p.id, title: p.title, updatedAt: p.updatedAt || p.createdAt })),
      ...activePubs
        .filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Pending Review')
        .map(p => ({ kind: 'publications' as const, id: p.id, title: p.title, updatedAt: p.updatedAt || p.createdAt })),
      ...activeProds
        .filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Pending Review')
        .map(p => ({ kind: 'products' as const, id: p.id, title: p.name, updatedAt: p.updatedAt || p.createdAt }))
    ];
  }, [activeProjects, activePubs, activeProds, currentUser.id]);

  const myFeedbackItems = useMemo(() => {
    const items: Array<{ kind: 'projects' | 'publications' | 'products'; id: string; title: string; comment: string }> = [];
    activeProjects
      .filter(p => p.authorId === currentUser.id && p.reviewComment)
      .forEach(p => items.push({ kind: 'projects', id: p.id, title: p.title, comment: p.reviewComment || '' }));
    activePubs
      .filter(p => p.authorId === currentUser.id && p.reviewComment)
      .forEach(p => items.push({ kind: 'publications', id: p.id, title: p.title, comment: p.reviewComment || '' }));
    activeProds
      .filter(p => p.authorId === currentUser.id && p.reviewComment)
      .forEach(p => items.push({ kind: 'products', id: p.id, title: p.name, comment: p.reviewComment || '' }));
    return items;
  }, [activeProjects, activePubs, activeProds, currentUser.id]);

  const myPublishedCount =
    activeProjects.filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Published').length +
    activePubs.filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Published').length +
    activeProds.filter(p => p.authorId === currentUser.id && p.publicationStatus === 'Published').length;

  const myRecentActivity = useMemo(
    () =>
      activityLog
        .filter(a => a.userId === currentUser.id || a.userEmail === currentUser.email)
        .slice(0, 6),
    [activityLog, currentUser.id, currentUser.email]
  );

  const visibleCreateActions = useMemo(
    () => getVisibleCreateActions(currentUser, roles),
    [currentUser, roles]
  );

  const firstName = currentUser?.name?.split(' ')[0] || 'Contributor';

  // Non-privileged Contributor Overview
  if (!isPrivilegedOverview) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#031D1C] to-[#0A3D3C] border border-white/10 shadow-2xl">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#25CDB6]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#25CDB6] font-mono">
                Contributor Workspace
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-[#EDE9E0]/70 leading-relaxed">
              Manage your drafts, track review feedback, and submit projects, publications, or products.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onNavigateSite}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#25CDB6]" />
              <span>View Live Site</span>
            </button>

            {visibleCreateActions.slice(0, 2).map(action => (
              <button
                key={action.id}
                type="button"
                onClick={() =>
                  onCreateAction
                    ? onCreateAction(action.id)
                    : onNavigateTab(action.targetTab, action.targetSubTab)
                }
                className="px-4 py-2.5 rounded-2xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-[#17A491]/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contributor Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigateTab('content', 'projects')}
            className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
              <span className="font-semibold">My Drafts</span>
              <FileEdit className="w-4 h-4 text-[#25CDB6]" />
            </div>
            <div className="text-3xl font-extrabold text-[#EDE9E0] font-mono tabular-nums">{myDrafts.length}</div>
            <div className="text-[11px] text-[#EDE9E0]/50">In progress</div>
          </div>

          <div
            onClick={() => onNavigateTab('content', 'projects')}
            className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
              <span className="font-semibold">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-amber-300 font-mono tabular-nums">{myPending.length}</div>
            <div className="text-[11px] text-[#EDE9E0]/50">Awaiting approval</div>
          </div>

          <div className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
              <span className="font-semibold">Reviewer Feedback</span>
              <MessageSquareWarning className="w-4 h-4 text-[#CA7952]" />
            </div>
            <div className="text-3xl font-extrabold text-[#CA7952] font-mono tabular-nums">
              {myFeedbackItems.length}
            </div>
            <div className="text-[11px] text-[#EDE9E0]/50">Items with notes</div>
          </div>

          <div className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
              <span className="font-semibold">Published by Me</span>
              <CheckCircle2 className="w-4 h-4 text-[#25CDB6]" />
            </div>
            <div className="text-3xl font-extrabold text-[#25CDB6] font-mono tabular-nums">
              {myPublishedCount}
            </div>
            <div className="text-[11px] text-[#EDE9E0]/50">Live across MoA</div>
          </div>
        </div>

        {/* Permitted Quick Create + Drafts / Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-[#EDE9E0]">My Drafts &amp; Submissions</h3>
            {myDrafts.length === 0 && myPending.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#EDE9E0]/50">
                You have no active drafts or pending reviews yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...myPending.map(x => ({ ...x, badge: 'Pending Review' })), ...myDrafts.map(x => ({ ...x, badge: 'Draft' }))]
                  .slice(0, 6)
                  .map(item => (
                    <div
                      key={`${item.kind}-${item.id}`}
                      onClick={() => onNavigateTab('content', item.kind, item.id, item.kind)}
                      className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between gap-4 transition-colors cursor-pointer"
                    >
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-[#EDE9E0] truncate">{item.title}</h4>
                        <span className="text-[11px] text-[#25CDB6] capitalize">{item.kind} · {item.badge}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-[#EDE9E0]">Reviewer Feedback</h3>
            {myFeedbackItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#EDE9E0]/50">
                No reviewer comments on your submissions.
              </div>
            ) : (
              <div className="space-y-2.5">
                {myFeedbackItems.map(item => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    onClick={() => onNavigateTab('content', item.kind, item.id, item.kind)}
                    className="p-3.5 rounded-2xl bg-[#CA7952]/10 border border-[#CA7952]/30 space-y-1 cursor-pointer hover:border-[#CA7952]/60 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#EDE9E0]">
                      <span>{item.title}</span>
                      <span className="text-[10px] font-mono uppercase text-[#CA7952]">{item.kind}</span>
                    </div>
                    <p className="text-[11px] text-[#EDE9E0]/75 leading-relaxed">{item.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {myRecentActivity.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#EDE9E0]/50 font-mono">
                  Recent Activity
                </h4>
                {myRecentActivity.map(act => (
                  <div key={act.id} className="text-[11px] text-[#EDE9E0]/70 flex items-center justify-between gap-2">
                    <span className="truncate">{act.action}</span>
                    <span className="text-[10px] font-mono text-[#EDE9E0]/40 shrink-0">
                      {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Privileged / Admin Overview
  const getDeptCompleteness = (dept: Department) => {
    let score = 0;
    if (dept.name) score += 20;
    if (dept.introduction && dept.introduction.length > 20) score += 20;
    if (dept.purpose && dept.purpose.length > 20) score += 20;
    if (dept.mission && dept.mission.length > 20) score += 20;
    if (dept.areasOfFocus && dept.areasOfFocus.length > 0) score += 20;
    return score;
  };

  const continueEditingItems = [
    ...activeProjects.map(p => ({
      kind: 'projects' as const,
      id: p.id,
      title: p.title,
      meta: p.category || 'Innovation',
      publicationStatus: p.publicationStatus,
      updatedAt: p.updatedAt || p.createdAt
    })),
    ...activePubs.map(p => ({
      kind: 'publications' as const,
      id: p.id,
      title: p.title,
      meta: p.publicationType || 'Publication',
      publicationStatus: p.publicationStatus,
      updatedAt: p.updatedAt || p.createdAt
    })),
    ...activeProds.map(p => ({
      kind: 'products' as const,
      id: p.id,
      title: p.name,
      meta: p.category || 'Product',
      publicationStatus: p.publicationStatus,
      updatedAt: p.updatedAt || p.createdAt
    }))
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* 1. Welcome Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#031D1C] to-[#0A3D3C] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#25CDB6]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#25CDB6] font-mono">
              Operational Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-[#EDE9E0]/70 leading-relaxed">
            {pendingReviews.length} item{pendingReviews.length === 1 ? '' : 's'} pending editorial review
            {canViewInbox ? ` and ${newSubmissionsCount} new ${newSubmissionsCount === 1 ? 'inquiry' : 'inquiries'}` : ''}.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onNavigateSite}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#25CDB6]" />
            <span>View Live Site</span>
          </button>

          {canEditSite && (
            <button
              type="button"
              onClick={() => onNavigateTab('website', 'editor')}
              className="px-5 py-2.5 rounded-2xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#17A491]/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Page Editor</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Core Metrics & Pipeline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('content', 'projects')}
          className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
            <span className="font-semibold">Projects Pipeline</span>
            <FolderKanban className="w-4 h-4 text-[#25CDB6]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#EDE9E0] tracking-tight tabular-nums font-mono">
              {activeProjects.length}
            </span>
            <span className="text-xs text-[#25CDB6] font-semibold">
              {publishedProjects.length} live
            </span>
          </div>
          <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-white/5">
            <div style={{ width: `${(publishedProjects.length / (activeProjects.length || 1)) * 100}%` }} className="bg-[#25CDB6]" title="Published" />
            <div style={{ width: `${(activeProjects.filter(p => p.publicationStatus === 'Pending Review').length / (activeProjects.length || 1)) * 100}%` }} className="bg-amber-400" title="In Review" />
            <div style={{ width: `${(draftProjects.length / (activeProjects.length || 1)) * 100}%` }} className="bg-white/20" title="Draft" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('content', 'publications')}
          className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
            <span className="font-semibold">Publications &amp; Products</span>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#D0A873]" />
              <Package className="w-4 h-4 text-[#64B5D9]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#EDE9E0] tracking-tight tabular-nums font-mono">
              {activePubs.length + activeProds.length}
            </span>
            <span className="text-xs text-[#25CDB6] font-semibold">
              {activePubs.filter(p => p.publicationStatus === 'Published').length} pubs ·{' '}
              {activeProds.filter(p => p.publicationStatus === 'Published').length} products
            </span>
          </div>
          <div className="text-[11px] text-[#EDE9E0]/50 truncate">
            {activePubs.length} papers · {activeProds.length} products total
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('content', 'departments')}
          className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
            <span className="font-semibold">Active Departments</span>
            <Building className="w-4 h-4 text-[#D0A873]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#EDE9E0] tracking-tight tabular-nums font-mono">
              {publishedDeptUnits.length}
            </span>
            <span className="text-xs text-[#EDE9E0]/50 font-semibold">
              of {deptUnits.length} published
            </span>
          </div>
          <div className="text-[11px] text-[#EDE9E0]/60 truncate">
            Departments {deptUnits.length} · Sectors {sectorUnits.length}
          </div>
        </div>

        {canViewInbox ? (
          <div
            onClick={() => onNavigateTab('settings', 'inbox')}
            className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
              <span className="font-semibold">Contact Inquiries</span>
              <Mail className="w-4 h-4 text-[#64B5D9]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#EDE9E0] tracking-tight tabular-nums font-mono">
                {submissions.length}
              </span>
              {newSubmissionsCount > 0 && (
                <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {newSubmissionsCount} new
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#EDE9E0]/50">Direct private inbox</div>
          </div>
        ) : (
          <div
            onClick={() => canViewAudit && onNavigateTab('settings', 'health')}
            className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
              <span className="font-semibold">Site Health</span>
              <ShieldCheck className="w-4 h-4 text-[#25CDB6]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#25CDB6] tracking-tight tabular-nums font-mono">
                {healthWarnings.length === 0 ? '100%' : `${Math.max(40, 100 - healthWarnings.length * 10)}%`}
              </span>
              <span className="text-xs text-[#EDE9E0]/50 font-semibold">
                {healthWarnings.length === 0 ? 'Optimal' : `${healthWarnings.length} alert${healthWarnings.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="text-[11px] text-[#EDE9E0]/50">
              {healthWarnings.length === 0 ? 'All links & assets verified' : 'Review diagnostics'}
            </div>
          </div>
        )}
      </div>

      {/* 4. Continue Editing + Actionable Health Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#25CDB6]" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">Continue Editing</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('content', 'projects')}
              className="text-xs text-[#25CDB6] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5">
            {continueEditingItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#EDE9E0]/50">
                No active content items yet.
              </div>
            ) : (
              continueEditingItems.map(item => (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={() => onNavigateTab('content', item.kind, item.id, item.kind)}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between gap-4 transition-colors cursor-pointer"
                >
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-[#EDE9E0] truncate">{item.title}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-[#EDE9E0]/50 mt-0.5">
                      <span className="capitalize">{item.meta}</span>
                      <span>·</span>
                      <span className="capitalize font-medium text-[#25CDB6]">{item.publicationStatus}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">Actionable Site Health</h3>
            </div>
            {canViewAudit && (
              <button
                type="button"
                onClick={() => onNavigateTab('settings', 'health')}
                className="text-xs text-[#25CDB6] hover:underline cursor-pointer"
              >
                View diagnostics
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {healthWarnings.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#EDE9E0]/50 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-[#25CDB6] mx-auto mb-2" />
                <p className="font-semibold text-[#EDE9E0]">No health warnings</p>
                <p>All SEO titles, department intros, and assets are in verified order.</p>
              </div>
            ) : (
              healthWarnings.slice(0, 4).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#EDE9E0]">{item.title}</h4>
                    <p className="text-[11px] text-[#EDE9E0]/60 mt-0.5">{item.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab(item.actionTab || 'settings', item.actionTab === 'website' ? 'seo' : 'health')}
                    className="px-3 py-1 rounded-xl bg-[#17A491]/20 hover:bg-[#17A491]/30 text-[#25CDB6] text-xs font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    Fix
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Department Completeness Section */}
      {canManageDepts && (
        <div className="p-6 sm:p-7 rounded-3xl bg-[#031D1C] border border-white/10 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#EDE9E0]">Department Completeness Scores</h3>
              <p className="text-xs text-[#EDE9E0]/60">
                Ensure each department has structured purpose, mission, and areas of focus for public display.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('content', 'departments')}
              className="text-xs text-[#25CDB6] font-bold hover:underline cursor-pointer"
            >
              Manage Departments &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeDepts.map(dept => {
              const pct = getDeptCompleteness(dept);
              return (
                <div
                  key={dept.id}
                  onClick={() => onNavigateTab('content', 'departments', dept.id, 'departments')}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-[#EDE9E0] truncate">{dept.name}</span>
                    <span className="font-mono font-bold text-[#25CDB6] text-[11px] tabular-nums">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full transition-all duration-300 ${
                        pct === 100 ? 'bg-[#25CDB6]' : pct >= 60 ? 'bg-[#17A491]' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
