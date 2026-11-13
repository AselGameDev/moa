import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Project,
  Department,
  SiteContent,
  MediaAsset,
  FormSubmission,
  SiteSettings,
  SiteHealthItem,
  ActivityRecord,
  PageRecord,
  ContentType,
  ContentItem
} from '../types';
import { api } from '../services/api';
import { PortalSidebar, MainTab } from '../components/portal/PortalSidebar';
import { PortalHeader } from '../components/portal/PortalHeader';
import { ShortcutsModal } from '../components/portal/ShortcutsModal';
import { AttentionInboxDrawer } from '../components/portal/AttentionInboxDrawer';
import { GlobalSearchModal } from '../components/portal/GlobalSearchModal';

// Views for the 6 Main Tabs
import { OverviewTab } from '../components/portal/views/OverviewTab';
import { WebsiteTab, WebsiteSubTab } from '../components/portal/views/WebsiteTab';
import { ContentTab, ContentSubTab } from '../components/portal/views/ContentTab';
import { MediaTab, MediaSubTab } from '../components/portal/views/MediaTab';
import { TeamTab } from '../components/portal/views/TeamTab';
import { SettingsTab } from '../components/portal/views/SettingsTab';

// Dedicated Sub-Editors
import { ProjectEditor } from '../components/portal/ProjectEditor';
import { DepartmentEditor } from '../components/portal/DepartmentEditor';

import { INITIAL_SETTINGS } from '../data/initialData';

interface AdminPortalProps {
  currentUser: User;
  departments: Department[];
  projects: Project[];
  siteContent: SiteContent;
  settings?: SiteSettings;
  onUpdateSettings?: (settings: Partial<SiteSettings>) => Promise<void>;
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
  onNavigate: (path: string) => void;
}

const DEFAULT_SETTINGS: SiteSettings = INITIAL_SETTINGS;

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  departments: initialDepartments,
  projects: initialProjects,
  siteContent: initialContent,
  settings: propSettings,
  onUpdateSettings: propOnUpdateSettings,
  onLogout,
  onRefreshData,
  onNavigate
}) => {
  // Navigation & Tabs State
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Sub-tab States for each domain
  const [websiteSubTab, setWebsiteSubTab] = useState<WebsiteSubTab>('pages');
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>('departments');
  const [mediaSubTab, setMediaSubTab] = useState<MediaSubTab>('library');
  const [teamSubTab, setTeamSubTab] = useState<'members' | 'roles' | 'invitations'>('members');
  const [settingsSubTab, setSettingsSubTab] = useState<'organization' | 'security' | 'inbox' | 'backups' | 'audit' | 'health' | 'trash' | 'diagrams'>('organization');

  // Modals & Drawers
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);

  // Entities Data State
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [siteContent, setSiteContent] = useState<SiteContent>(initialContent);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [healthWarnings, setHealthWarnings] = useState<SiteHealthItem[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityRecord[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(propSettings || DEFAULT_SETTINGS);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propSettings) {
      setSettings(propSettings);
    }
  }, [propSettings]);

  // In-Place Full Editors
  const [editingProject, setEditingProject] = useState<Project | null | 'new'>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null | 'new'>(null);

  // Keyboard Shortcuts Listener (? and ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      // ? for shortcuts cheat sheet (when not typing in an input/textarea)
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch full data on mount
  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [
        depts,
        projs,
        media,
        health,
        subs,
        activity,
        pagesData,
        settingsData,
        typesData,
        itemsData
      ] = await Promise.all([
        api.getAllDepartments().catch(() => initialDepartments),
        api.getProjectsAdmin().catch(() => initialProjects),
        api.getMedia().catch(() => []),
        api.getSiteHealth().catch(() => []),
        api.getSubmissions().catch(() => []),
        api.getActivityLog().catch(() => []),
        api.getPages().catch(() => []),
        api.getSettings().catch(() => DEFAULT_SETTINGS),
        api.getContentTypes().catch(() => []),
        api.getContentItems().catch(() => [])
      ]);

      setDepartments(depts);
      setProjects(projs);
      setMediaAssets(media);
      setHealthWarnings(health);
      setSubmissions(subs);
      setActivityLog(activity);
      setPages(pagesData);
      if (settingsData && Object.keys(settingsData).length > 0) {
        setSettings(prev => ({ ...prev, ...settingsData }));
      }
      setContentTypes(typesData);
      setContentItems(itemsData);
    } catch (err) {
      console.warn('Error loading portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute Attention Count
  const attentionCount = useMemo(() => {
    const pendingReviews = projects.filter(p => p.publicationStatus === 'Pending Review').length;
    const staleDrafts = projects.filter(p => p.publicationStatus === 'Draft').length;
    const newSubs = submissions.filter(s => s.status === 'new').length;
    const warnings = healthWarnings.length;
    return pendingReviews + staleDrafts + newSubs + warnings;
  }, [projects, submissions, healthWarnings]);

  // Handle + Create Actions from Top Bar Menu
  const handleCreateAction = (actionType: 'project' | 'department' | 'page' | 'update' | 'event' | 'member') => {
    switch (actionType) {
      case 'project':
        setEditingProject('new');
        break;
      case 'department':
        setEditingDepartment('new');
        break;
      case 'page':
        setActiveTab('website');
        setWebsiteSubTab('pages');
        break;
      case 'update':
      case 'event':
        setActiveTab('content');
        setContentSubTab(actionType === 'update' ? 'updates' : 'events');
        break;
      case 'member':
        setActiveTab('team');
        setTeamSubTab('invitations');
        break;
    }
  };

  // Dynamic Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const list = ['MoA Control Room'];
    switch (activeTab) {
      case 'overview':
        list.push('Overview');
        break;
      case 'website':
        list.push('Website');
        list.push(websiteSubTab.charAt(0).toUpperCase() + websiteSubTab.slice(1));
        break;
      case 'content':
        list.push('Content');
        list.push(contentSubTab.charAt(0).toUpperCase() + contentSubTab.slice(1));
        break;
      case 'media':
        list.push('Media');
        list.push(mediaSubTab.charAt(0).toUpperCase() + mediaSubTab.slice(1));
        break;
      case 'team':
        list.push('Team');
        list.push(teamSubTab.charAt(0).toUpperCase() + teamSubTab.slice(1));
        break;
      case 'settings':
        list.push('Settings');
        list.push(settingsSubTab.charAt(0).toUpperCase() + settingsSubTab.slice(1));
        break;
    }
    return list;
  }, [activeTab, websiteSubTab, contentSubTab, mediaSubTab, teamSubTab, settingsSubTab]);

  // Project Editor Save
  const handleSaveProject = async (payload: Partial<Project>): Promise<Project> => {
    let saved: Project;
    if (editingProject === 'new') {
      saved = await api.createProject(payload);
      setProjects([saved, ...projects]);
    } else if (editingProject) {
      saved = await api.updateProject(editingProject.id, payload);
      setProjects(projects.map(p => p.id === saved.id ? saved : p));
    } else {
      throw new Error('No project targeted');
    }
    setEditingProject(null);
    await onRefreshData();
    return saved;
  };

  // Department Editor Save
  const handleSaveDepartment = async (payload: Partial<Department>) => {
    if (editingDepartment === 'new') {
      const created = await api.createDepartment(payload);
      setDepartments([...departments, created]);
    } else if (editingDepartment) {
      const updated = await api.updateDepartment(editingDepartment.id, payload);
      setDepartments(departments.map(d => d.id === updated.id ? updated : d));
    }
    setEditingDepartment(null);
    await onRefreshData();
  };

  // Full Page Project Editor View
  if (editingProject) {
    return (
      <div className="min-h-screen bg-[#06302F] text-[#EDE9E0] p-4 sm:p-6 lg:p-8">
        <ProjectEditor
          project={editingProject === 'new' ? null : editingProject}
          departments={departments}
          currentUserRole={currentUser.role}
          onSave={handleSaveProject}
          onCancel={() => setEditingProject(null)}
        />
      </div>
    );
  }

  // Full Page Department Editor View
  if (editingDepartment) {
    return (
      <div className="min-h-screen bg-[#06302F] text-[#EDE9E0] p-4 sm:p-6 lg:p-8">
        <DepartmentEditor
          department={editingDepartment === 'new' ? null : editingDepartment}
          allDepartments={departments}
          onSave={handleSaveDepartment}
          onCancel={() => setEditingDepartment(null)}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex bg-[#06302F] text-[#EDE9E0] font-sans ${theme === 'light' ? 'portal-light' : ''}`}>
      {/* 1. Left Collapsible Sidebar */}
      <PortalSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        attentionCount={attentionCount}
        onNavigateSite={() => onNavigate('/')}
      />

      {/* 2. Main Content Area with independent vertical scrolling */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* Top Header */}
        <PortalHeader
          breadcrumbs={breadcrumbs}
          currentUser={currentUser}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenInbox={() => setInboxOpen(true)}
          attentionCount={attentionCount}
          onNavigateSite={() => onNavigate('/')}
          onLogout={onLogout}
          onCreateAction={handleCreateAction}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          siteStatus="Live"
        />

        {/* View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <OverviewTab
              currentUser={currentUser}
              departments={departments}
              projects={projects}
              healthWarnings={healthWarnings}
              submissions={submissions}
              activityLog={activityLog}
              onNavigateTab={(tab, sub, id) => {
                setActiveTab(tab as MainTab);
                if (sub) {
                  if (tab === 'website') setWebsiteSubTab(sub as any);
                  if (tab === 'content') setContentSubTab(sub as any);
                  if (tab === 'media') setMediaSubTab(sub as any);
                  if (tab === 'team') setTeamSubTab(sub as any);
                  if (tab === 'settings') setSettingsSubTab(sub as any);
                }
                if (id) {
                  const p = projects.find(item => item.id === id);
                  if (p) setEditingProject(p);
                }
              }}
              onNavigateSite={() => onNavigate('/')}
            />
          )}

          {/* TAB 2: WEBSITE */}
          {activeTab === 'website' && (
            <WebsiteTab
              initialSubTab={websiteSubTab}
              pages={pages}
              onSavePage={async (page) => {
                const saved = await api.savePage(page);
                setPages(prev => {
                  const idx = prev.findIndex(p => p.id === saved.id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = saved;
                    return next;
                  }
                  return [...prev, saved];
                });
              }}
              onDeletePage={async (id) => {
                await api.deletePage(id);
                setPages(prev => prev.filter(p => p.id !== id));
              }}
              settings={settings}
              onUpdateSettings={async (newSettings) => {
                const updated = await api.updateSettings(newSettings);
                setSettings(updated);
              }}
              siteContent={siteContent}
              onUpdateSiteContent={async (updated) => {
                setSiteContent(updated);
                await api.updatePageContent(updated);
                await onRefreshData();
              }}
              onNavigateSite={(path) => onNavigate(path || '/')}
            />
          )}

          {/* TAB 3: CONTENT */}
          {activeTab === 'content' && (
            <ContentTab
              initialSubTab={contentSubTab}
              departments={departments}
              projects={projects}
              currentUser={currentUser}
              onSaveDepartment={handleSaveDepartment}
              onDeleteDepartment={async (id) => {
                await api.deleteDepartment(id, { projectHandling: 'leave' });
                setDepartments(departments.filter(d => d.id !== id));
                await onRefreshData();
              }}
              onSaveProject={handleSaveProject}
              onDeleteProject={async (id) => {
                await api.deleteProject(id);
                setProjects(projects.filter(p => p.id !== id));
                await onRefreshData();
              }}
              contentTypes={contentTypes}
              contentItems={contentItems}
              onSaveContentItem={async (item) => {
                const saved = await api.saveContentItem(item);
                setContentItems(prev => {
                  const idx = prev.findIndex(ci => ci.id === saved.id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = saved;
                    return next;
                  }
                  return [saved, ...prev];
                });
                return saved;
              }}
              onDeleteContentItem={async (id) => {
                await api.deleteContentItem(id);
                setContentItems(prev => prev.filter(ci => ci.id !== id));
              }}
              onNavigateSite={(path) => onNavigate(path || '/')}
            />
          )}

          {/* TAB 4: MEDIA */}
          {activeTab === 'media' && (
            <MediaTab
              initialSubTab={mediaSubTab}
              media={mediaAssets}
              onUploadMedia={async (dataUrl, name, altText) => {
                const created = await api.uploadMedia({ name, dataUrl, altText });
                setMediaAssets([created, ...mediaAssets]);
              }}
              onDeleteMedia={async (id) => {
                await api.deleteMedia(id);
                setMediaAssets(mediaAssets.filter(m => m.id !== id));
              }}
            />
          )}

          {/* TAB 5: TEAM */}
          {activeTab === 'team' && (
            <TeamTab
              currentSubTab={teamSubTab}
              onSubTabChange={setTeamSubTab}
            />
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsTab
              currentSubTab={settingsSubTab}
              onSubTabChange={setSettingsSubTab}
              settings={settings}
              onUpdateSettings={async (updated) => {
                if (propOnUpdateSettings) {
                  await propOnUpdateSettings(updated);
                } else {
                  const saved = await api.updateSettings(updated);
                  setSettings(saved);
                }
              }}
              departments={departments}
              projects={projects}
              siteContent={siteContent}
              onRefreshData={onRefreshData}
            />
          )}
        </main>
      </div>

      {/* 3. Global Overlays & Modals */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <AttentionInboxDrawer
        isOpen={inboxOpen}
        onClose={() => setInboxOpen(false)}
        pendingReviews={projects.filter(p => p.publicationStatus === 'Pending Review')}
        staleDrafts={projects.filter(p => p.publicationStatus === 'Draft')}
        newSubmissions={submissions}
        healthWarnings={healthWarnings}
        onActionClick={(targetTab, subTab, entityId) => {
          setActiveTab(targetTab as MainTab);
          if (subTab) {
            if (targetTab === 'website') setWebsiteSubTab(subTab as any);
            if (targetTab === 'content') setContentSubTab(subTab as any);
            if (targetTab === 'media') setMediaSubTab(subTab as any);
            if (targetTab === 'team') setTeamSubTab(subTab as any);
            if (targetTab === 'settings') setSettingsSubTab(subTab as any);
          }
          if (entityId) {
            const p = projects.find(item => item.id === entityId);
            if (p) setEditingProject(p);
            const d = departments.find(item => item.id === entityId);
            if (d) setEditingDepartment(d);
          }
          setInboxOpen(false);
        }}
      />

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        projects={projects}
        departments={departments}
        media={mediaAssets}
        siteContent={siteContent}
        onSelectAction={(tab, itemId) => {
          if (tab === 'projects' || tab === 'content') {
            setActiveTab('content');
            setContentSubTab('projects');
            if (itemId) {
              const p = projects.find(item => item.id === itemId);
              if (p) setEditingProject(p);
            }
          } else if (tab === 'departments') {
            setActiveTab('content');
            setContentSubTab('departments');
            if (itemId) {
              const d = departments.find(item => item.id === itemId);
              if (d) setEditingDepartment(d);
            }
          } else if (tab === 'media') {
            setActiveTab('media');
          } else if (tab === 'website') {
            setActiveTab('website');
          }
          setSearchOpen(false);
        }}
      />
    </div>
  );
};
