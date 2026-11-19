import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import {
  User,
  RoleDefinition,
  Project,
  Publication,
  Product,
  Department,
  SiteContent,
  MediaAsset,
  FormSubmission,
  SiteSettings,
  SiteHealthItem,
  ActivityRecord,
  PageRecord
} from '../types';
import { api } from '../services/api';
import { can } from '../shared/permissions';
import { DEFAULT_ROLES } from '../shared/permissions';
import { INITIAL_SETTINGS, INITIAL_SITE_CONTENT } from '../data/initialData';
import { PortalSidebar, MainTab } from '../components/portal/PortalSidebar';
import { PortalHeader } from '../components/portal/PortalHeader';
import { ShortcutsModal } from '../components/portal/ShortcutsModal';
import {
  AttentionInboxDrawer,
  buildPendingReviews
} from '../components/portal/AttentionInboxDrawer';
import { GlobalSearchModal } from '../components/portal/GlobalSearchModal';
import {
  CreateActionType,
  getVisibleMainTabs,
  getVisibleSubTabs
} from '../components/portal/portalRegistry';
import type { WebsiteSubTab } from '../components/portal/views/WebsiteTab';
import type { ContentRequestedEdit, ContentSubTab } from '../components/portal/views/ContentTab';
import type { SettingsSubTab } from '../components/portal/views/SettingsTab';
import {
  loadPortalSessionState,
  savePortalSessionState,
  resetPortalActiveTabOnExit,
  type TeamSubTab
} from '../components/portal/portalSessionCookie';

const OverviewTab = lazy(() =>
  import('../components/portal/views/OverviewTab').then(m => ({ default: m.OverviewTab }))
);
const WebsiteTab = lazy(() =>
  import('../components/portal/views/WebsiteTab').then(m => ({ default: m.WebsiteTab }))
);
const ContentTab = lazy(() =>
  import('../components/portal/views/ContentTab').then(m => ({ default: m.ContentTab }))
);
const MediaTab = lazy(() =>
  import('../components/portal/views/MediaTab').then(m => ({ default: m.MediaTab }))
);
const TeamTab = lazy(() =>
  import('../components/portal/views/TeamTab').then(m => ({ default: m.TeamTab }))
);
const SettingsTab = lazy(() =>
  import('../components/portal/views/SettingsTab').then(m => ({ default: m.SettingsTab }))
);

interface AdminPortalProps {
  currentUser: User;
  onUpdateUser?: (user: User) => void;
  onLogout: () => Promise<void> | void;
  onNavigateSite: (path?: string) => void;
  onEnterEditMode?: (targetRoute?: string) => Promise<void> | void;
  onRefreshData: () => Promise<void>;
}

const STALE_DRAFT_MS = 14 * 24 * 60 * 60 * 1000;

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  onUpdateUser,
  onLogout,
  onNavigateSite,
  onEnterEditMode,
  onRefreshData
}) => {
  const initialPortalState = useMemo(() => loadPortalSessionState(), []);
  const [activeTab, setActiveTab] = useState<MainTab>(() => initialPortalState.activeTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [websiteSubTab, setWebsiteSubTab] = useState<WebsiteSubTab>(() => initialPortalState.websiteSubTab);
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>(() => initialPortalState.contentSubTab);
  const [teamSubTab, setTeamSubTab] = useState<TeamSubTab>(() => initialPortalState.teamSubTab);
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>(() => initialPortalState.settingsSubTab);
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<string | null>(() => initialPortalState.selectedOrgUnitId);

  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [requestedContentEdit, setRequestedContentEdit] = useState<ContentRequestedEdit | null>(null);

  // Server-backed portal state (kept separate from public site state)
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [healthWarnings, setHealthWarnings] = useState<SiteHealthItem[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [unreadSubmissionsCount, setUnreadSubmissionsCount] = useState(0);
  const [activityLog, setActivityLog] = useState<ActivityRecord[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SETTINGS);
  const [siteContent, setSiteContent] = useState<SiteContent>(INITIAL_SITE_CONTENT);

  const [loadingPortal, setLoadingPortal] = useState(true);
  const [portalLoadError, setPortalLoadError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        Boolean(target) &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target!.tagName) || target!.isContentEditable);

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget) {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === '?' && !isTypingTarget) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    savePortalSessionState({
      activeTab,
      websiteSubTab,
      contentSubTab,
      teamSubTab,
      settingsSubTab,
      selectedOrgUnitId
    });
  }, [activeTab, websiteSubTab, contentSubTab, teamSubTab, settingsSubTab, selectedOrgUnitId]);

  const handleExitToSite = useCallback(
    (path = '/home') => {
      resetPortalActiveTabOnExit();
      onNavigateSite(path);
    },
    [onNavigateSite]
  );

  const handlePortalLogout = useCallback(async () => {
    resetPortalActiveTabOnExit();
    await onLogout();
  }, [onLogout]);

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const onUpdateUserRef = useRef(onUpdateUser);
  onUpdateUserRef.current = onUpdateUser;

  const loadPortalData = useCallback(async () => {
    setLoadingPortal(true);
    setPortalLoadError(null);
    try {
      const [meRes, rolesRes, settingsRes, contentRes, pagesRes] = await Promise.all([
        api.getMe().catch(() => null),
        api.getRoles().catch(() => DEFAULT_ROLES),
        api.getSettings(),
        api.getPageContent(),
        api.getPages().catch(() => [])
      ]);

      const resolvedUser = meRes?.user || currentUserRef.current;
      if (
        meRes?.user &&
        onUpdateUserRef.current &&
        JSON.stringify(meRes.user) !== JSON.stringify(currentUserRef.current)
      ) {
        onUpdateUserRef.current(meRes.user);
      }
      const resolvedRoles = rolesRes.length > 0 ? rolesRes : DEFAULT_ROLES;
      setRoles(resolvedRoles);
      setSettings(prev => ({ ...prev, ...settingsRes }));
      setSiteContent(contentRes);
      setPages(pagesRes);

      const canDepts =
        can(resolvedUser, 'departments.manage', resolvedRoles) ||
        can(resolvedUser, 'projects.create', resolvedRoles) ||
        can(resolvedUser, 'projects.editOwn', resolvedRoles) ||
        can(resolvedUser, 'projects.editAll', resolvedRoles) ||
        can(resolvedUser, 'projects.publish', resolvedRoles) ||
        can(resolvedUser, 'publications.manage', resolvedRoles) ||
        can(resolvedUser, 'products.manage', resolvedRoles);

      const canProjs =
        can(resolvedUser, 'projects.create', resolvedRoles) ||
        can(resolvedUser, 'projects.editOwn', resolvedRoles) ||
        can(resolvedUser, 'projects.editAll', resolvedRoles) ||
        can(resolvedUser, 'projects.publish', resolvedRoles);

      const canPubs =
        can(resolvedUser, 'publications.manage', resolvedRoles) ||
        can(resolvedUser, 'projects.publish', resolvedRoles) ||
        can(resolvedUser, 'projects.create', resolvedRoles);

      const canProds =
        can(resolvedUser, 'products.manage', resolvedRoles) ||
        can(resolvedUser, 'projects.publish', resolvedRoles);

      const canMedia =
        can(resolvedUser, 'media.upload', resolvedRoles) ||
        can(resolvedUser, 'media.manage', resolvedRoles) ||
        can(resolvedUser, 'pages.manage', resolvedRoles) ||
        can(resolvedUser, 'website.edit', resolvedRoles) ||
        canProjs;

      const canInbox = can(resolvedUser, 'inbox.view', resolvedRoles);
      const canAudit = can(resolvedUser, 'audit.view', resolvedRoles);

      const [
        deptsData,
        projsData,
        pubsData,
        prodsData,
        mediaData,
        subsData,
        activityData,
        healthData
      ] = await Promise.all([
        canDepts ? api.getAllDepartments() : api.getDepartments(),
        canProjs ? api.getProjectsAdmin() : Promise.resolve([]),
        canPubs ? api.getPublicationsAdmin() : Promise.resolve([]),
        canProds ? api.getProductsAdmin() : Promise.resolve([]),
        canMedia ? api.getMedia() : Promise.resolve([]),
        canInbox ? api.getSubmissions({ page: 1, limit: 50 }) : Promise.resolve([]),
        canAudit ? api.getActivityLog({ page: 1, limit: 25 }) : Promise.resolve([]),
        canAudit ? api.getSiteHealth() : Promise.resolve([])
      ]);

      setDepartments(deptsData);
      setProjects(projsData);
      setPublications(pubsData);
      setProducts(prodsData);
      setMediaAssets(mediaData);

      if (Array.isArray(subsData)) {
        setSubmissions(subsData);
        setUnreadSubmissionsCount(subsData.filter(s => s.status === 'new').length);
      } else {
        setSubmissions(subsData.items || []);
        setUnreadSubmissionsCount(subsData.unreadCount ?? 0);
      }

      if (Array.isArray(activityData)) {
        setActivityLog(activityData);
      } else {
        setActivityLog(activityData.items || []);
      }

      setHealthWarnings(healthData);
    } catch (err: unknown) {
      setPortalLoadError(err instanceof Error ? err.message : 'Failed to load Control Room data from the server.');
    } finally {
      setLoadingPortal(false);
    }
  }, []);

  const handleRolesChange = useCallback(
    (nextRoles: RoleDefinition[]) => {
      setRoles(nextRoles);
      void loadPortalData();
    },
    [loadPortalData]
  );

  useEffect(() => {
    void loadPortalData();
  }, [loadPortalData]);

  // Keep active sub-tabs valid for current permissions
  const visibleMainTabs = useMemo(
    () => getVisibleMainTabs(currentUser, roles),
    [currentUser, roles]
  );

  useEffect(() => {
    if (visibleMainTabs.length > 0 && !visibleMainTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleMainTabs[0].id);
    }
  }, [visibleMainTabs, activeTab]);

  useEffect(() => {
    const allowedSettings = getVisibleSubTabs('settings', currentUser, roles);
    if (allowedSettings.length > 0 && !allowedSettings.some(s => s.id === settingsSubTab)) {
      setSettingsSubTab(allowedSettings[0].id as SettingsSubTab);
    }
  }, [currentUser, roles, settingsSubTab]);

  const pendingReviews = useMemo(
    () => buildPendingReviews(projects, publications, products),
    [projects, publications, products]
  );

  const staleDrafts = useMemo(() => {
    const now = Date.now();
    const list: Array<{ kind: 'projects' | 'publications' | 'products'; id: string; title: string; updatedAt: string }> = [];

    projects.forEach(p => {
      if (p.deletedAt || p.publicationStatus !== 'Draft') return;
      const ts = new Date(p.updatedAt || p.createdAt).getTime();
      if (Number.isFinite(ts) && now - ts >= STALE_DRAFT_MS) {
        list.push({ kind: 'projects', id: p.id, title: p.title, updatedAt: p.updatedAt || p.createdAt });
      }
    });
    publications.forEach(pub => {
      if (pub.deletedAt || pub.publicationStatus !== 'Draft') return;
      const ts = new Date(pub.updatedAt || pub.createdAt).getTime();
      if (Number.isFinite(ts) && now - ts >= STALE_DRAFT_MS) {
        list.push({ kind: 'publications', id: pub.id, title: pub.title, updatedAt: pub.updatedAt || pub.createdAt });
      }
    });
    products.forEach(prod => {
      if (prod.deletedAt || prod.publicationStatus !== 'Draft') return;
      const ts = new Date(prod.updatedAt || prod.createdAt).getTime();
      if (Number.isFinite(ts) && now - ts >= STALE_DRAFT_MS) {
        list.push({ kind: 'products', id: prod.id, title: prod.name, updatedAt: prod.updatedAt || prod.createdAt });
      }
    });
    return list;
  }, [projects, publications, products]);

  const attentionCount = useMemo(() => {
    const visibleReviews = can(currentUser, 'projects.publish', roles) ? pendingReviews.length : 0;
    const visibleInbox = can(currentUser, 'inbox.view', roles) ? unreadSubmissionsCount : 0;
    const visibleHealth = can(currentUser, 'audit.view', roles) ? healthWarnings.length : 0;
    return visibleReviews + staleDrafts.length + visibleInbox + visibleHealth;
  }, [currentUser, roles, pendingReviews.length, unreadSubmissionsCount, healthWarnings.length, staleDrafts.length]);

  const triggerContentEdit = (kind: ContentSubTab, id: string | 'new') => {
    setActiveTab('content');
    setContentSubTab(kind);
    setRequestedContentEdit({ kind, id, nonce: Date.now() });
  };

  const handleCreateAction = (actionType: CreateActionType) => {
    switch (actionType) {
      case 'project':
        triggerContentEdit('projects', 'new');
        break;
      case 'publication':
        triggerContentEdit('publications', 'new');
        break;
      case 'product':
        triggerContentEdit('products', 'new');
        break;
      case 'department':
        triggerContentEdit('departments', 'new');
        break;
      case 'page':
        setActiveTab('website');
        setWebsiteSubTab('pages');
        break;
      case 'member':
        setActiveTab('team');
        setTeamSubTab('invitations');
        break;
    }
  };

  const applySubTab = (tab: string, sub?: string) => {
    if (!sub) return;
    if (tab === 'website') setWebsiteSubTab(sub as WebsiteSubTab);
    if (tab === 'content') setContentSubTab(sub as ContentSubTab);
    if (tab === 'team') setTeamSubTab(sub as 'members' | 'roles' | 'invitations');
    if (tab === 'settings') setSettingsSubTab(sub as SettingsSubTab);
  };

  const breadcrumbs = useMemo(() => {
    const list = ['MoA Control Room'];
    switch (activeTab) {
      case 'overview':
        list.push('Dashboard');
        break;
      case 'website':
        list.push('Website', websiteSubTab.charAt(0).toUpperCase() + websiteSubTab.slice(1));
        break;
      case 'content':
        list.push('Content', contentSubTab.charAt(0).toUpperCase() + contentSubTab.slice(1));
        break;
      case 'media':
        list.push('Media');
        break;
      case 'team':
        list.push('Team', teamSubTab.charAt(0).toUpperCase() + teamSubTab.slice(1));
        break;
      case 'settings':
        list.push('Settings', settingsSubTab.charAt(0).toUpperCase() + settingsSubTab.slice(1));
        break;
    }
    return list;
  }, [activeTab, websiteSubTab, contentSubTab, teamSubTab, settingsSubTab]);

  // Refetch + sync helpers
  const syncAfterMutation = async () => {
    await Promise.all([loadPortalData(), onRefreshData()]);
  };

  const handleSaveDepartment = async (payload: Partial<Department>, targetId?: string): Promise<Department> => {
    const saved = !targetId
      ? await api.createDepartment(payload)
      : await api.updateDepartment(targetId, payload);
    await syncAfterMutation();
    return saved;
  };

  const handleReorderDepartments = async (orderedIds: string[]) => {
    await api.reorderDepartments(orderedIds);
    await syncAfterMutation();
  };

  const handleDeleteDepartment = async (
    id: string,
    options: { projectHandling: 'leave' | 'reassign'; targetDeptId?: string }
  ) => {
    await api.deleteDepartment(id, options);
    await syncAfterMutation();
  };

  const handleSaveProject = async (payload: Partial<Project>, targetId?: string): Promise<Project> => {
    const saved = !targetId
      ? await api.createProject(payload)
      : await api.updateProject(targetId, payload);
    await syncAfterMutation();
    return saved;
  };

  const handleDeleteProject = async (id: string) => {
    await api.deleteProject(id);
    await syncAfterMutation();
  };

  const handleSavePublication = async (payload: Partial<Publication>, targetId?: string): Promise<Publication> => {
    const saved = !targetId
      ? await api.createPublication(payload)
      : await api.updatePublication(targetId, payload);
    await syncAfterMutation();
    return saved;
  };

  const handleReviewPublication = async (
    id: string,
    action: 'approved' | 'rejected' | 'requested_changes',
    comment?: string
  ) => {
    await api.reviewPublication(id, { action, comment });
    await syncAfterMutation();
  };

  const handleDeletePublication = async (id: string) => {
    await api.deletePublication(id);
    await syncAfterMutation();
  };

  const handleSaveProduct = async (payload: Partial<Product>, targetId?: string): Promise<Product> => {
    const saved = !targetId
      ? await api.createProduct(payload)
      : await api.updateProduct(targetId, payload);
    await syncAfterMutation();
    return saved;
  };

  const handleReviewProduct = async (
    id: string,
    action: 'approved' | 'rejected' | 'requested_changes',
    comment?: string
  ) => {
    await api.reviewProduct(id, { action, comment });
    await syncAfterMutation();
  };

  const handleDeleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    await syncAfterMutation();
  };

  const handleSettingsUpdate = async (updated: Partial<SiteSettings>) => {
    const saved = await api.updateSettings(updated);
    setSettings(saved);
    await syncAfterMutation();
  };

  const canRenderActiveTab = visibleMainTabs.some(t => t.id === activeTab);

  return (
    <div className="min-h-screen flex bg-[#06302F] text-[#EDE9E0] font-sans">
      <PortalSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
        roles={roles}
        logoUrl={settings?.moaLogoUrl || '/drawing1.png'}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        attentionCount={attentionCount}
        onNavigateSite={() => handleExitToSite('/home')}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 h-[100dvh] overflow-x-clip overscroll-contain ${
          activeTab === 'content' && contentSubTab === 'departments' && !loadingPortal && canRenderActiveTab
            ? 'overflow-y-auto lg:overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        <PortalHeader
          breadcrumbs={breadcrumbs}
          currentUser={currentUser}
          roles={roles}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenInbox={() => setInboxOpen(true)}
          attentionCount={attentionCount}
          onNavigateSite={() => handleExitToSite('/home')}
          onLogout={() => void handlePortalLogout()}
          onCreateAction={handleCreateAction}
          siteStatus="Live"
        />

        {portalLoadError && (
          <div className="mx-3 sm:mx-6 lg:mx-8 mt-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <span className="min-w-0 break-words">{portalLoadError}</span>
            <button
              type="button"
              onClick={() => void loadPortalData()}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <main
          className={`flex-1 min-h-0 flex flex-col p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 ${
            activeTab === 'content' && contentSubTab === 'departments' && !loadingPortal && canRenderActiveTab
              ? 'lg:pb-6'
              : ''
          }`}
        >
          {loadingPortal && !departments.length && !projects.length ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-xs text-[#EDE9E0]/60">
              <RefreshCw className="w-5 h-5 animate-spin text-[#25CDB6]" />
              <span className="font-mono">Loading Control Room workspace...</span>
            </div>
          ) : !canRenderActiveTab ? (
            <div className="p-10 rounded-2xl bg-[#031D1C] border border-white/10 text-center space-y-3">
              <Lock className="w-8 h-8 text-[#D0A873] mx-auto" />
              <h2 className="text-base font-bold text-[#EDE9E0]">Access Restricted</h2>
              <p className="text-xs text-[#EDE9E0]/60 max-w-md mx-auto">
                Your account does not have permission to view this Control Room section.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="h-9 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="py-20 text-center text-xs font-mono text-[#25CDB6]">
                  Loading workspace panel...
                </div>
              }
            >
              {activeTab === 'overview' && (
                <OverviewTab
                  currentUser={currentUser}
                  roles={roles}
                  departments={departments}
                  projects={projects}
                  publications={publications}
                  products={products}
                  healthWarnings={healthWarnings}
                  submissions={submissions}
                  activityLog={activityLog}
                  settings={settings}
                  onNavigateTab={(tab, sub, id, kind) => {
                    if (id && kind) {
                      triggerContentEdit(kind, id);
                      return;
                    }
                    setActiveTab(tab as MainTab);
                    applySubTab(tab, sub);
                  }}
                  onCreateAction={handleCreateAction}
                  onNavigateSite={() => handleExitToSite('/home')}
                />
              )}

              {activeTab === 'website' && (
                <WebsiteTab
                  initialSubTab={websiteSubTab}
                  onSubTabChange={setWebsiteSubTab}
                  currentUser={currentUser}
                  roles={roles}
                  pages={pages}
                  onSavePage={async page => {
                    await api.savePage(page);
                    await syncAfterMutation();
                  }}
                  onDeletePage={async id => {
                    await api.deletePage(id);
                    await syncAfterMutation();
                  }}
                  settings={settings}
                  onUpdateSettings={handleSettingsUpdate}
                  siteContent={siteContent}
                  onUpdateSiteContent={async updated => {
                    await api.updatePageContent(updated);
                    await syncAfterMutation();
                  }}
                  onEnterEditMode={onEnterEditMode}
                  onNavigateSite={path => handleExitToSite(path || '/home')}
                />
              )}

              {activeTab === 'content' && (
                <ContentTab
                  initialSubTab={contentSubTab}
                  onSubTabChange={setContentSubTab}
                  initialSelectedOrgUnitId={selectedOrgUnitId}
                  onSelectedOrgUnitChange={setSelectedOrgUnitId}
                  requestedEdit={requestedContentEdit}
                  departments={departments}
                  projects={projects}
                  publications={publications}
                  products={products}
                  currentUser={currentUser}
                  roles={roles}
                  onSaveDepartment={handleSaveDepartment}
                  onReorderDepartments={handleReorderDepartments}
                  onDeleteDepartment={handleDeleteDepartment}
                  onSaveProject={handleSaveProject}
                  onProjectUpdated={() => {
                    void syncAfterMutation();
                  }}
                  onDeleteProject={handleDeleteProject}
                  onSavePublication={handleSavePublication}
                  onReviewPublication={handleReviewPublication}
                  onDeletePublication={handleDeletePublication}
                  onSaveProduct={handleSaveProduct}
                  onReviewProduct={handleReviewProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onNavigateSite={path => handleExitToSite(path || '/home')}
                />
              )}

              {activeTab === 'media' && (
                <MediaTab
                  media={mediaAssets}
                  currentUser={currentUser}
                  roles={roles}
                  settings={settings}
                  onUploadMedia={async (payload, onProgress) => {
                    await api.uploadMedia(payload, onProgress);
                    await syncAfterMutation();
                  }}
                  onUpdateMedia={async (id, payload) => {
                    await api.updateMedia(id, payload);
                    await syncAfterMutation();
                  }}
                  onReplaceMedia={async (id, payload) => {
                    await api.replaceMedia(id, payload);
                    await syncAfterMutation();
                  }}
                  onDeleteMedia={async id => {
                    await api.deleteMedia(id);
                    await syncAfterMutation();
                  }}
                />
              )}

              {activeTab === 'team' && (
                <TeamTab
                  currentSubTab={teamSubTab}
                  onSubTabChange={setTeamSubTab}
                  currentUser={currentUser}
                  roles={roles}
                  onRolesChange={handleRolesChange}
                  departments={departments}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  currentSubTab={settingsSubTab}
                  onSubTabChange={setSettingsSubTab}
                  currentUser={currentUser}
                  roles={roles}
                  settings={settings}
                  onUpdateSettings={handleSettingsUpdate}
                  departments={departments}
                  projects={projects}
                  siteContent={siteContent}
                  onRefreshData={syncAfterMutation}
                  onNavigateTab={(tab, sub) => {
                    setActiveTab(tab as MainTab);
                    applySubTab(tab, sub);
                  }}
                  onUserUpdated={user => onUpdateUser?.(user)}
                />
              )}
            </Suspense>
          )}
        </main>
      </div>

      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <AttentionInboxDrawer
        isOpen={inboxOpen}
        onClose={() => setInboxOpen(false)}
        pendingReviews={can(currentUser, 'projects.publish', roles) ? pendingReviews : []}
        staleDrafts={staleDrafts}
        newSubmissions={
          can(currentUser, 'inbox.view', roles)
            ? submissions.filter(s => s.status === 'new')
            : []
        }
        healthWarnings={can(currentUser, 'audit.view', roles) ? healthWarnings : []}
        onActionClick={(targetTab, subTab, entityId) => {
          if (
            targetTab === 'content' &&
            entityId &&
            (subTab === 'projects' || subTab === 'publications' || subTab === 'products' || subTab === 'departments')
          ) {
            triggerContentEdit(subTab, entityId);
          } else {
            setActiveTab(targetTab as MainTab);
            applySubTab(targetTab, subTab);
          }
          setInboxOpen(false);
        }}
      />

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        currentUser={currentUser}
        roles={roles}
        projects={projects}
        publications={publications}
        products={products}
        departments={departments}
        media={mediaAssets}
        siteContent={siteContent}
        onSelectAction={(tab, itemId) => {
          if (tab === 'projects' || tab === 'content') {
            if (itemId) triggerContentEdit('projects', itemId);
            else {
              setActiveTab('content');
              setContentSubTab('projects');
            }
          } else if (tab === 'publications') {
            if (itemId) triggerContentEdit('publications', itemId);
            else {
              setActiveTab('content');
              setContentSubTab('publications');
            }
          } else if (tab === 'products') {
            if (itemId) triggerContentEdit('products', itemId);
            else {
              setActiveTab('content');
              setContentSubTab('products');
            }
          } else if (tab === 'departments') {
            if (itemId) triggerContentEdit('departments', itemId);
            else {
              setActiveTab('content');
              setContentSubTab('departments');
            }
          } else if (tab === 'media') {
            setActiveTab('media');
          } else if (tab === 'site-content' || tab === 'website') {
            setActiveTab('website');
            setWebsiteSubTab('editor');
          }
          setSearchOpen(false);
        }}
      />
    </div>
  );
};
