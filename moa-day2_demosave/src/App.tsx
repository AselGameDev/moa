import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoadingScreen } from './components/LoadingScreen';

// Views
import { HomeView } from './views/HomeView';
import { AboutView } from './views/AboutView';
import { DepartmentsView } from './views/DepartmentsView';
import { DepartmentDetailView } from './views/DepartmentDetailView';
import { ProjectsView } from './views/ProjectsView';
import { ProjectDetailView } from './views/ProjectDetailView';
import { ContactView } from './views/ContactView';
import { SignInView } from './views/SignInView';
import { AdminPortal } from './views/AdminPortal';

// Services & Data
import { storageService } from './services/storageService';
import { api } from './services/api';
import { Department, Project, SiteContent, SiteSettings, User } from './types';
import {
  Edit3,
  Eye,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  Undo2,
  X
} from 'lucide-react';

export default function App() {
  // Show intro loading screen on startup and refresh (bypassed only on /admin or /signin/login)
  const [showLoading, setShowLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = (window.location.pathname || '').toLowerCase();
    if (path.startsWith('/admin') || path === '/signin' || path === '/login') {
      return false;
    }
    return true;
  });

  // Data state
  const [departments, setDepartments] = useState<Department[]>(() => storageService.getDepartments());
  const [projects, setProjects] = useState<Project[]>(() => storageService.getProjects());
  const [siteContent, setSiteContent] = useState<SiteContent>(() => storageService.getSiteContent());
  const [settings, setSettings] = useState<SiteSettings>(() => storageService.getSettings());
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCurrentUser());

  // Settings update handler that saves both locally and remote
  const handleUpdateSettings = useCallback(async (updated: Partial<SiteSettings>) => {
    const next = { ...settings, ...updated };
    setSettings(next);
    storageService.saveSettings(next);
    try {
      await api.updateSettings(updated);
    } catch (e) {
      console.warn('Backend sync failed, saved locally:', e);
    }
  }, [settings]);

  // Edit Mode state (for Admin on public site)
  const [isEditMode, setIsEditMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('edit') === 'true') return true;
      return sessionStorage.getItem('moa_edit_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [viewAsVisitor, setViewAsVisitor] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [hasDraftChanges, setHasDraftChanges] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<Partial<SiteContent>>({});
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishSuccessBanner, setPublishSuccessBanner] = useState<boolean>(false);

  // Routing state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  // Refresh data function
  const refreshData = useCallback(async () => {
    try {
      const user = api.getCurrentUser();
      setCurrentUser(user);

      // Attempt to sync from backend APIs
      try {
        const remoteDepts = await api.getDepartments();
        if (remoteDepts && Array.isArray(remoteDepts) && remoteDepts.length > 0) {
          setDepartments(remoteDepts);
          storageService.saveDepartments(remoteDepts);
        }
      } catch {
        // Fallback already in state
      }

      try {
        const remoteProjects = await (user?.role === 'admin' ? api.getProjectsAdmin().catch(() => api.getProjects()) : api.getProjects());
        if (remoteProjects && Array.isArray(remoteProjects)) {
          setProjects(remoteProjects);
          storageService.saveProjects(remoteProjects);
        }
      } catch {
        // Fallback already in state
      }

      try {
        const remoteContent = await api.getPageContent();
        if (remoteContent && remoteContent.home) {
          setSiteContent(remoteContent);
          storageService.saveSiteContent(remoteContent);
        }
      } catch {
        // Fallback already in state
      }

      try {
        const remoteSettings = await api.getSettings();
        if (remoteSettings && remoteSettings.siteName) {
          setSettings(remoteSettings);
          storageService.saveSettings(remoteSettings);
        }
      } catch {
        // Fallback already in state
      }
    } catch (e) {
      console.warn('Error refreshing data:', e);
    }
  }, []);

  // Sync brand colors with CSS variables dynamically
  useEffect(() => {
    if (settings?.theme) {
      const root = document.documentElement;
      if (settings.theme.primaryColor) {
        root.style.setProperty('--color-brand-primary', settings.theme.primaryColor);
        root.style.setProperty('--primary', settings.theme.primaryColor);
      }
      if (settings.theme.secondaryColor) {
        root.style.setProperty('--color-brand-secondary', settings.theme.secondaryColor);
        root.style.setProperty('--secondary', settings.theme.secondaryColor);
      }
      if (settings.theme.copperColor) {
        root.style.setProperty('--color-brand-copper', settings.theme.copperColor);
        root.style.setProperty('--copper', settings.theme.copperColor);
      }
    }
  }, [settings?.theme]);

  // Sync route on popstate (browser Back / Forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Pre-load data on startup
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Navigate handler
  const handleNavigate = useCallback((path: string) => {
    if (path !== window.location.pathname) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Auth handlers
  const handleSignInSuccess = (user: User) => {
    setCurrentUser(user);
    handleNavigate('/admin');
  };

  const handleLogout = async () => {
    await api.signOut();
    storageService.logout();
    setCurrentUser(null);
    setIsEditMode(false);
    sessionStorage.setItem('moa_edit_mode', 'false');
    handleNavigate('/');
  };

  // Live in-place text update: mutates siteContent instantly so fonts & layout update with zero latency
  const handleLiveContentUpdate = useCallback((fieldPath: string, newValue: string) => {
    setSiteContent(prev => {
      const parts = fieldPath.split('.');
      const updated = JSON.parse(JSON.stringify(prev || {}));
      let cur = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = newValue;
      return updated;
    });

    setDraftContent(prev => {
      const parts = fieldPath.split('.');
      const updated = JSON.parse(JSON.stringify(prev || {}));
      let cur = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = newValue;
      return updated;
    });

    setHasDraftChanges(true);
  }, []);

  // Publish all live edits to database & storage
  const handlePublishDraftChanges = async () => {
    setPublishing(true);
    try {
      const updated = await api.updatePageContent(siteContent);
      setSiteContent(updated);
      storageService.saveSiteContent(updated);
      setDraftContent({});
      setHasDraftChanges(false);
      setPublishSuccessBanner(true);
      setTimeout(() => setPublishSuccessBanner(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Publishing failed');
    } finally {
      setPublishing(false);
    }
  };

  // Discard drafts and reset to database snapshot
  const handleDiscardDrafts = () => {
    if (window.confirm('Discard all unsaved edits made during this session?')) {
      const original = storageService.getSiteContent();
      setSiteContent(original);
      setDraftContent({});
      setHasDraftChanges(false);
    }
  };

  // Resolve current view
  const renderCurrentView = () => {
    const path = currentPath.toLowerCase();

    // 1. Department Detail: /departments/:slug
    if (path.startsWith('/departments/') && path !== '/departments') {
      const slug = path.replace('/departments/', '').replace(/\/$/, '');
      const dept = departments.find(d => d.slug.toLowerCase() === slug.toLowerCase());
      if (dept) {
        const related = projects.filter(p => p.departmentIds && p.departmentIds.includes(dept.id));
        return (
          <DepartmentDetailView
            department={dept}
            allDepartments={departments.filter(d => d.published)}
            relatedProjects={related}
            onNavigate={handleNavigate}
          />
        );
      }
      return (
        <div className="py-24 text-center max-w-xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl font-bold text-[#EDE9E0]">Department not found</h2>
          <p className="text-sm text-[#EDE9E0]/60">The department you requested could not be located.</p>
          <button
            onClick={() => handleNavigate('/departments')}
            className="px-5 py-2.5 rounded-xl bg-[#17A491] text-[#06302F] font-bold text-xs"
          >
            View all departments
          </button>
        </div>
      );
    }

    // 2. Project Detail: /projects/:slug
    if (path.startsWith('/projects/') && path !== '/projects') {
      const slug = path.replace('/projects/', '').replace(/\/$/, '');
      const proj = projects.find(p => p.slug.toLowerCase() === slug.toLowerCase());
      if (proj) {
        return (
          <ProjectDetailView
            project={proj}
            departments={departments}
            onNavigate={handleNavigate}
          />
        );
      }
      return (
        <div className="py-24 text-center max-w-xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl font-bold text-[#EDE9E0]">Project not found</h2>
          <p className="text-sm text-[#EDE9E0]/60">The requested project could not be located.</p>
          <button
            onClick={() => handleNavigate('/projects')}
            className="px-5 py-2.5 rounded-xl bg-[#17A491] text-[#06302F] font-bold text-xs"
          >
            View all projects
          </button>
        </div>
      );
    }

    // 3. Admin / Control Room View
    if (path === '/admin' || path.startsWith('/admin/')) {
      if (currentUser) {
        return (
          <AdminPortal
            currentUser={currentUser}
            departments={departments}
            projects={projects}
            siteContent={siteContent}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onLogout={handleLogout}
            onRefreshData={refreshData}
            onNavigate={(p) => {
              if (p === '/' || p === '/about' || p === '/departments' || p === '/contact') {
                setIsEditMode(true);
                sessionStorage.setItem('moa_edit_mode', 'true');
              }
              handleNavigate(p);
            }}
          />
        );
      }
      return (
        <SignInView
          onSignInSuccess={handleSignInSuccess}
          onNavigate={handleNavigate}
        />
      );
    }

    // 4. Sign In View
    if (path === '/signin' || path === '/login') {
      if (currentUser) {
        return (
          <AdminPortal
            currentUser={currentUser}
            departments={departments}
            projects={projects}
            siteContent={siteContent}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onLogout={handleLogout}
            onRefreshData={refreshData}
            onNavigate={handleNavigate}
          />
        );
      }
      return (
        <SignInView
          onSignInSuccess={handleSignInSuccess}
          onNavigate={handleNavigate}
        />
      );
    }

    // 5. Standard Public Pages with Live In-Place Editing Enabled
    const activeEdit = isEditMode && !viewAsVisitor;

    switch (path) {
      case '/about':
        return (
          <AboutView
            content={siteContent}
            departments={departments}
            onNavigate={handleNavigate}
            isEditMode={activeEdit}
            onUpdateContent={handleLiveContentUpdate}
          />
        );

      case '/departments':
        return (
          <DepartmentsView
            departments={departments}
            onNavigate={handleNavigate}
            rddIntro={siteContent?.departments?.rddIntro}
            isEditMode={activeEdit}
            onUpdateContent={handleLiveContentUpdate}
          />
        );

      case '/projects':
        return (
          <ProjectsView
            projects={projects}
            departments={departments}
            onNavigate={handleNavigate}
          />
        );

      case '/contact':
        return (
          <ContactView
            content={siteContent}
            socialLinks={settings?.socialLinks}
            isEditMode={activeEdit}
            onUpdateContent={handleLiveContentUpdate}
          />
        );

      case '/':
      default:
        return (
          <HomeView
            content={siteContent}
            departments={departments}
            socialLinks={settings?.socialLinks}
            onNavigate={handleNavigate}
            isEditMode={activeEdit}
            onUpdateContent={handleLiveContentUpdate}
          />
        );
    }
  };

  const isPortalView = currentPath.startsWith('/admin') && Boolean(currentUser);
  const isSignInView = currentPath === '/signin' || currentPath === '/login';
  const showAdminToolbar = currentUser && currentUser.role === 'admin' && !isPortalView && !isSignInView;

  // Frame widths for preview frames
  const frameWidthClass = previewDevice === 'mobile'
    ? 'max-w-[390px] mx-auto border-x border-[#EDE9E0]/20 shadow-2xl min-h-screen'
    : previewDevice === 'tablet'
    ? 'max-w-[768px] mx-auto border-x border-[#EDE9E0]/20 shadow-2xl min-h-screen'
    : 'w-full';

  return (
    <div className="min-h-screen flex flex-col bg-[#06302F] text-[#EDE9E0] font-sans antialiased selection:bg-[#17A491]/30 selection:text-white">
      {/* Loading Screen on startup and refresh (Mandatory) */}
      {showLoading && (
        <LoadingScreen onComplete={() => {
          setShowLoading(false);
          try {
            sessionStorage.setItem('moa_intro_seen', 'true');
          } catch {}
        }} />
      )}

      {/* Live Publishing Toast Notification */}
      {publishSuccessBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-[#031D1C] border-2 border-[#25CDB6] text-[#EDE9E0] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-[#25CDB6] text-[#06302F] flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#EDE9E0]">Live Changes Published!</h4>
            <p className="text-[11px] text-[#EDE9E0]/70">Your edits are now live on the public website.</p>
          </div>
        </div>
      )}

      {/* Persistent Header Editor Bar (When in Edit Mode) */}
      {showAdminToolbar && isEditMode && (
        <header className="sticky top-0 z-50 bg-[#031D1C]/98 backdrop-blur-xl border-b border-[#25CDB6]/40 shadow-2xl px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#EDE9E0]">
          {/* Left: Brand + Page Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#25CDB6]" />
              <span className="font-extrabold tracking-wider text-[11px] text-[#25CDB6] uppercase font-mono">
                MoA Page Editor
              </span>
            </div>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {/* Page Navigation Switcher */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {[
                { label: 'Home', path: '/' },
                { label: 'About', path: '/about' },
                { label: 'Departments', path: '/departments' },
                { label: 'Projects', path: '/projects' },
                { label: 'Contact', path: '/contact' }
              ].map(page => {
                const isActive = currentPath === page.path;
                return (
                  <button
                    key={page.path}
                    type="button"
                    onClick={() => handleNavigate(page.path)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#17A491] text-[#06302F] shadow-sm'
                        : 'text-[#EDE9E0]/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {page.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center: Viewport & Mode Toggle */}
          <div className="flex items-center gap-2">
            {/* Viewport frame selector */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  previewDevice === 'desktop' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/50 hover:text-white'
                }`}
                title="Desktop full viewport"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  previewDevice === 'tablet' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/50 hover:text-white'
                }`}
                title="Tablet view (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  previewDevice === 'mobile' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/50 hover:text-white'
                }`}
                title="Mobile view (390px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Preview as visitor toggle */}
            <button
              type="button"
              onClick={() => setViewAsVisitor(!viewAsVisitor)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                viewAsVisitor
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/5 text-[#EDE9E0]/80 border-white/10 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{viewAsVisitor ? 'Viewing as Visitor' : 'Preview Visitor'}</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Draft Status Badge */}
            {hasDraftChanges ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Unsaved Draft Edits</span>
                </span>

                <button
                  type="button"
                  onClick={handleDiscardDrafts}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Discard current draft edits"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Discard</span>
                </button>

                <button
                  type="button"
                  disabled={publishing}
                  onClick={handlePublishDraftChanges}
                  className="px-4 py-1.5 rounded-xl bg-[#25CDB6] hover:bg-[#17A491] text-[#06302F] font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#25CDB6]/30 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{publishing ? 'Publishing...' : 'Publish Live'}</span>
                </button>
              </div>
            ) : (
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold text-[#25CDB6] bg-[#25CDB6]/10 px-2.5 py-1 rounded-lg border border-[#25CDB6]/20">
                <Check className="w-3 h-3" />
                <span>Live Site In Sync</span>
              </span>
            )}

            {/* Exit to Control Room */}
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false);
                sessionStorage.setItem('moa_edit_mode', 'false');
                handleNavigate('/admin');
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#EDE9E0] font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Control Room</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </header>
      )}

      {/* Floating Quick Action Button to Enter Edit Mode (if admin visiting public site) */}
      {showAdminToolbar && !isEditMode && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => {
              setIsEditMode(true);
              sessionStorage.setItem('moa_edit_mode', 'true');
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#031D1C]/95 backdrop-blur-md border border-[#25CDB6]/60 text-[#25CDB6] font-bold text-xs flex items-center gap-2 shadow-2xl hover:scale-105 transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Launch Page Editor</span>
          </button>
        </div>
      )}

      {/* Frame Container for Device Previews */}
      <div className={frameWidthClass}>
        {/* Public Navigation */}
        {!isPortalView && !isSignInView && (
          <Navbar
            currentPath={currentPath}
            onNavigate={handleNavigate}
            socialLinks={settings?.socialLinks}
          />
        )}

        {/* Main View Content */}
        <main className={`flex-1 w-full ${isEditMode && !viewAsVisitor ? 'outline-dashed outline-1 outline-[#25CDB6]/30' : ''}`}>
          {renderCurrentView()}
        </main>

        {/* Public Footer */}
        {!isPortalView && !isSignInView && (
          <Footer
            departments={departments}
            onNavigate={handleNavigate}
            socialLinks={settings?.socialLinks}
          />
        )}
      </div>
    </div>
  );
}

