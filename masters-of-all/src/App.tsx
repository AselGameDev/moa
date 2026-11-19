import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Department,
  Project,
  Publication,
  Product,
  PageRecord,
  SiteContent,
  SiteSettings,
  User
} from './types';
import { INITIAL_DEPARTMENTS, INITIAL_SETTINGS, INITIAL_SITE_CONTENT } from './data/initialData';
import { api } from './services/api';
import { can } from './shared/permissions';
import { sanitizeSafeUrl } from './shared/url';
import { getSectorParentId, isSector } from './utils/orgHelpers';
import { useContent } from './hooks/useContent';
import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeView } from './views/HomeView';
import { AboutView } from './views/AboutView';
import { DepartmentsView } from './views/DepartmentsView';
import { DepartmentDetailView } from './views/DepartmentDetailView';
import { ProjectsView } from './views/ProjectsView';
import { ProjectDetailView } from './views/ProjectDetailView';
import { ProductsView } from './views/ProductsView';
import { ProductDetailView } from './views/ProductDetailView';
import { ContactView } from './views/ContactView';
import { CustomPageView } from './views/CustomPageView';
import { SignInView } from './views/SignInView';
import { AdminPortal } from './views/AdminPortal';
import { NotFoundView } from './views/NotFoundView';
import { Edit3, Save, CheckCircle2, X, ExternalLink, ArrowRight } from 'lucide-react';

function normalizeRoutePath(raw: string): string {
  const withoutHash = raw.split('#')[0] || '/';
  const [pathname] = withoutHash.split('?');
  const cleaned = pathname.replace(/\/+$/, '');
  return cleaned || '/';
}

function setContentFieldByPath(
  source: Partial<SiteContent>,
  fieldPath: string,
  value: unknown
): Partial<SiteContent> {
  const parts = fieldPath.split('.');
  if (parts.length === 0) return source;
  const clone = JSON.parse(JSON.stringify(source || {})) as Record<string, unknown>;
  let cursor: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const existing = cursor[key];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
  return clone as Partial<SiteContent>;
}

function resolveUnitFromSegments(
  segments: string[],
  departments: Department[],
  includeUnpublished: boolean
): Department | undefined {
  const pool = departments.filter(d => !d.deletedAt && (includeUnpublished || d.published));
  if (segments.length === 0) return undefined;

  if (segments.length >= 2) {
    const parentSlug = decodeURIComponent(segments[0]).toLowerCase();
    const sectorSlug = decodeURIComponent(segments[1]).toLowerCase();
    const parent = pool.find(d => !isSector(d) && d.slug.toLowerCase() === parentSlug);
    if (parent) {
      const exactChild = pool.find(
        d => isSector(d) && d.slug.toLowerCase() === sectorSlug && getSectorParentId(d) === parent.id
      );
      if (exactChild) return exactChild;
    }
    return pool.find(d => isSector(d) && d.slug.toLowerCase() === sectorSlug);
  }

  const slug = decodeURIComponent(segments[0]).toLowerCase();
  return (
    pool.find(d => !isSector(d) && d.slug.toLowerCase() === slug) ||
    pool.find(d => d.slug.toLowerCase() === slug)
  );
}

export default function App() {
  const [currentUrl, setCurrentUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/home'
  );

  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCurrentUser());
  const [authChecked, setAuthChecked] = useState(false);

  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SETTINGS);
  const [siteContent, setSiteContent] = useState<SiteContent>(INITIAL_SITE_CONTENT);
  const [loadingPublicData, setLoadingPublicData] = useState(true);

  const initialPath = normalizeRoutePath(currentUrl).toLowerCase();
  const skipSplashInitially =
    initialPath === '/portal' ||
    initialPath === '/admin' ||
    initialPath === '/login' ||
    initialPath === '/invite';
  const [introComplete, setIntroComplete] = useState<boolean>(skipSplashInitially);

  // Live Inline Website Editor state
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState<Partial<SiteContent> | null>(null);
  const [pendingDeptPatches, setPendingDeptPatches] = useState<Record<string, Partial<Department>>>({});
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorStatus, setEditorStatus] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const { content: mergedContent } = useContent(siteContent, isEditMode ? draftContent : null);

  const navigate = useCallback((target: string) => {
    if (typeof window === 'undefined') return;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }
    const cleanTarget = target.startsWith('/') ? target : `/${target}`;
    if (`${window.location.pathname}${window.location.search}` !== cleanTarget) {
      window.history.pushState({}, '', cleanTarget);
    }
    setCurrentUrl(cleanTarget);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentUrl(`${window.location.pathname}${window.location.search}`);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const loadSiteData = useCallback(async (activeUser?: User | null) => {
    try {
      const userForRequests = activeUser !== undefined ? activeUser : api.getCurrentUser();
      const [deptsRes, projsRes, pubsRes, prodsRes, pagesRes, settingsRes, contentRes] = await Promise.all([
        userForRequests ? api.getAllDepartments().catch(() => api.getDepartments()) : api.getDepartments(),
        userForRequests ? api.getProjectsAdmin().catch(() => api.getProjects()) : api.getProjects(),
        userForRequests ? api.getPublicationsAdmin().catch(() => api.getPublications()) : api.getPublications(),
        userForRequests ? api.getProductsAdmin().catch(() => api.getProducts()) : api.getProducts(),
        api.getPages(),
        api.getSettings(),
        api.getPageContent()
      ]);

      if (Array.isArray(deptsRes)) setDepartments(deptsRes);
      if (Array.isArray(projsRes)) setProjects(projsRes);
      if (Array.isArray(pubsRes)) setPublications(pubsRes);
      if (Array.isArray(prodsRes)) setProducts(prodsRes);
      if (Array.isArray(pagesRes)) setPages(pagesRes);
      if (settingsRes) setSettings(settingsRes);
      if (contentRes) setSiteContent(contentRes);
    } catch {
      // Keep safe defaults if API is temporarily unreachable
    } finally {
      setLoadingPublicData(false);
    }
  }, []);

  useEffect(() => {
    api.registerUnauthorizedHandler(() => {
      setCurrentUser(null);
      setIsEditMode(false);
      setDraftContent(null);
      const pathNow = normalizeRoutePath(window.location.pathname).toLowerCase();
      if (pathNow === '/portal' || pathNow === '/admin') {
        navigate('/login?expired=1');
      }
    });
    return () => api.registerUnauthorizedHandler(null);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      let verifiedUser: User | null = null;
      if (api.getToken()) {
        try {
          const me = await api.getMe();
          verifiedUser = me.user;
        } catch {
          api.clearSession();
          verifiedUser = null;
        }
      }
      if (!cancelled) {
        setCurrentUser(verifiedUser);
        setAuthChecked(true);
        await loadSiteData(verifiedUser);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadSiteData]);

  // Periodically check content-version to sync published edits without full reload
  useEffect(() => {
    let lastVersion: number | null = null;
    const timer = window.setInterval(async () => {
      if (isEditMode) return;
      try {
        const res = await api.getContentVersion();
        if (lastVersion !== null && res.version !== lastVersion) {
          void loadSiteData(currentUser);
        }
        lastVersion = res.version;
      } catch {
        // Ignore transient poll errors
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [currentUser, isEditMode, loadSiteData]);

  // Keep document title synchronized cleanly on client navigation
  useEffect(() => {
    const route = normalizeRoutePath(currentUrl).toLowerCase();
    const siteName = settings.siteName || 'Masters Of All';
    if (route === '/portal' || route === '/admin') {
      document.title = currentUser ? `Control Room — ${siteName}` : `Not Found — ${siteName}`;
    } else if (route === '/login') {
      document.title = `Sign In — ${siteName}`;
    } else if (route === '/invite') {
      document.title = `Accept Invitation — ${siteName}`;
    } else if (route === '/about') {
      document.title = `About — ${siteName}`;
    } else if (route === '/departments') {
      document.title = `Departments — ${siteName}`;
    } else if (route === '/projects') {
      document.title = `Projects — ${siteName}`;
    } else if (route === '/products') {
      document.title = `Products — ${siteName}`;
    } else if (route === '/contact') {
      document.title = `Contact — ${siteName}`;
    } else {
      document.title = settings.seoDefaults?.title || `${siteName} — ${settings.tagline || 'Believe. Build. Become.'}`;
    }
  }, [currentUrl, settings, currentUser]);

  const handleEnterEditMode = useCallback(async (targetRoute?: string) => {
    if (!currentUser || !can(currentUser, 'website.edit')) return;
    try {
      const draftRes = await api.getDraftContent();
      setDraftContent(draftRes.draft || {});
      setPendingDeptPatches({});
      setEditorError(null);
      setEditorStatus(null);
      setIsEditMode(true);
      if (targetRoute) {
        navigate(targetRoute);
      } else {
        const nowPath = normalizeRoutePath(currentUrl).toLowerCase();
        if (nowPath === '/portal' || nowPath === '/admin' || nowPath === '/login' || nowPath === '/invite') {
          navigate('/home');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to enter Live Editor mode.';
      setEditorError(message);
      throw new Error(message);
    }
  }, [currentUser, currentUrl, navigate]);

  const handleUpdateContentField = useCallback(
    (fieldPath: string, newValue: unknown) => {
      setDraftContent(prev => setContentFieldByPath(prev ?? siteContent, fieldPath, newValue));
      setEditorStatus(null);
    },
    [siteContent]
  );

  const handleUpdateDepartmentInline = useCallback((departmentId: string, patch: Partial<Department>) => {
    setDepartments(prev => prev.map(d => (d.id === departmentId ? { ...d, ...patch } : d)));
    setPendingDeptPatches(prev => ({
      ...prev,
      [departmentId]: { ...(prev[departmentId] || {}), ...patch }
    }));
    setEditorStatus(null);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    setEditorSaving(true);
    setEditorError(null);
    try {
      if (draftContent) {
        await api.saveDraftContent(draftContent);
      }
      const patchEntries = Object.entries(pendingDeptPatches) as Array<[string, Partial<Department>]>;
      for (const [deptId, patch] of patchEntries) {
        await api.updateDepartment(deptId, patch);
      }
      setPendingDeptPatches({});
      setEditorStatus('Draft saved');
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Failed to save draft.');
    } finally {
      setEditorSaving(false);
    }
  }, [draftContent, pendingDeptPatches]);

  const handlePublishDraft = useCallback(async () => {
    setEditorSaving(true);
    setEditorError(null);
    try {
      if (draftContent) {
        await api.saveDraftContent(draftContent);
        const published = await api.publishDraftContent();
        setSiteContent(published);
        setDraftContent(null);
      }
      const patchEntries = Object.entries(pendingDeptPatches) as Array<[string, Partial<Department>]>;
      for (const [deptId, patch] of patchEntries) {
        await api.updateDepartment(deptId, patch);
      }
      setPendingDeptPatches({});
      await loadSiteData(currentUser);
      setEditorStatus('Published live');
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Failed to publish changes.');
    } finally {
      setEditorSaving(false);
    }
  }, [draftContent, pendingDeptPatches, loadSiteData, currentUser]);

  const handleExitEditMode = useCallback(async () => {
    setIsEditMode(false);
    setDraftContent(null);
    setPendingDeptPatches({});
    setEditorError(null);
    setEditorStatus(null);
    await loadSiteData(currentUser);
    navigate('/portal');
  }, [loadSiteData, currentUser, navigate]);

  const handleLogout = useCallback(async () => {
    await api.signOut();
    setCurrentUser(null);
    setIsEditMode(false);
    setDraftContent(null);
    await loadSiteData(null);
    navigate('/home');
  }, [loadSiteData, navigate]);

  const pathname = normalizeRoutePath(currentUrl);
  const lowerPath = pathname.toLowerCase();
  const queryParams = useMemo(() => {
    const idx = currentUrl.indexOf('?');
    return new URLSearchParams(idx >= 0 ? currentUrl.slice(idx) : '');
  }, [currentUrl]);
  const isPreviewQuery = queryParams.get('preview') === '1' && Boolean(currentUser);

  const publishedProducts = useMemo(
    () => products.filter(p => !p.deletedAt && p.publicationStatus === 'Published'),
    [products]
  );
  const showProducts = Boolean(settings.alwaysShowProducts || publishedProducts.length > 0);

  const announcement = settings.announcementBar;
  const isAnnouncementVisible = Boolean(
    !announcementDismissed &&
      announcement?.enabled &&
      announcement.text?.trim() &&
      (!announcement.expiresAt || new Date(announcement.expiresAt).getTime() > Date.now())
  );

  // Admin Control Room (/portal or /admin)
  if (lowerPath === '/portal' || lowerPath === '/admin') {
    if (!authChecked) {
      return <div className="min-h-screen bg-[#06302F]" />;
    }
    if (!currentUser) {
      return (
        <div className="min-h-screen flex flex-col bg-[#06302F] text-[#EDE9E0]">
          <Navbar
            currentPath={pathname}
            onNavigate={navigate}
            socialLinks={settings.socialLinks}
            navigation={settings.navigation}
            showProducts={showProducts}
            logoUrl={settings.moaLogoUrl}
            siteName={settings.siteName}
          />
          <NotFoundView content={mergedContent} onNavigate={navigate} />
          <Footer
            departments={departments}
            onNavigate={navigate}
            socialLinks={settings.socialLinks}
            footerText={settings.footerText}
            footerColumns={settings.footerColumns}
            showProducts={showProducts}
            contactEmail={settings.contactEmail}
            organizationAddress={settings.organizationAddress}
            logoUrl={settings.moaLogoUrl}
            siteName={settings.siteName}
            tagline={settings.tagline}
            content={mergedContent.footer}
          />
        </div>
      );
    }

    return (
      <ErrorBoundary onResetHome={() => navigate('/home')}>
        <AdminPortal
          currentUser={currentUser}
          onUpdateUser={setCurrentUser}
          onLogout={handleLogout}
          onNavigateSite={path => {
            setIsEditMode(false);
            navigate(path || '/home');
          }}
          onEnterEditMode={handleEnterEditMode}
          onRefreshData={() => loadSiteData(currentUser)}
        />
      </ErrorBoundary>
    );
  }

  // Auth Screens (/login, /invite)
  if (lowerPath === '/login' || lowerPath === '/invite') {
    return (
      <ErrorBoundary onResetHome={() => navigate('/home')}>
        <SignInView
          onSignInSuccess={user => {
            setCurrentUser(user);
            void loadSiteData(user);
          }}
          onNavigate={navigate}
          logoUrl={settings.moaLogoUrl}
          minPasswordLength={settings.securityPolicy?.minPasswordLength}
        />
      </ErrorBoundary>
    );
  }

  // Route public views
  const renderPublicContent = () => {
    if (lowerPath === '/' || lowerPath === '/home') {
      return (
        <HomeView
          content={mergedContent}
          departments={departments}
          onNavigate={navigate}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
          logoUrl={settings.moaLogoUrl}
        />
      );
    }

    if (lowerPath === '/about') {
      return (
        <AboutView
          content={mergedContent}
          departments={departments}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
        />
      );
    }

    if (lowerPath === '/departments') {
      return (
        <DepartmentsView
          departments={departments}
          projects={projects}
          publications={publications}
          products={products}
          content={mergedContent}
          onNavigate={navigate}
          loading={loadingPublicData}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
          onUpdateDepartment={handleUpdateDepartmentInline}
          moaLogoUrl={settings.moaLogoUrl}
          rddLogoUrl={settings.rddLogoUrl}
          siteName={settings.siteName}
          animateTreeReady={introComplete}
        />
      );
    }

    if (lowerPath.startsWith('/departments/') || lowerPath.startsWith('/sectors/')) {
      const segments = lowerPath.startsWith('/sectors/')
        ? pathname.slice('/sectors/'.length).split('/').filter(Boolean)
        : pathname.slice('/departments/'.length).split('/').filter(Boolean);
      const unit = resolveUnitFromSegments(segments, departments, isPreviewQuery || isEditMode);
      if (!unit) {
        return (
          <NotFoundView
            content={mergedContent}
            onNavigate={navigate}
            isEditMode={isEditMode}
            onUpdateContent={handleUpdateContentField}
          />
        );
      }
      const childSectorIds = !isSector(unit)
        ? departments.filter(d => !d.deletedAt && isSector(d) && getSectorParentId(d) === unit.id).map(d => d.id)
        : [];
      const matchingUnitIds = new Set([unit.id, ...childSectorIds]);
      const matchesUnit = (ids?: string[], secIds?: string[]) =>
        Boolean(ids?.some(id => matchingUnitIds.has(id)) || secIds?.some(id => matchingUnitIds.has(id)));

      const relatedProjects = projects.filter(
        p => !p.deletedAt && (isPreviewQuery || p.publicationStatus === 'Published') && matchesUnit(p.departmentIds, p.sectorIds)
      );
      const relatedPublications = publications.filter(
        p => !p.deletedAt && (isPreviewQuery || p.publicationStatus === 'Published') && matchesUnit(p.departmentIds, p.sectorIds)
      );
      const relatedProducts = products.filter(
        p => !p.deletedAt && (isPreviewQuery || p.publicationStatus === 'Published') && matchesUnit(p.departmentIds, p.sectorIds)
      );

      return (
        <DepartmentDetailView
          department={unit}
          allDepartments={departments}
          relatedProjects={relatedProjects}
          relatedPublications={relatedPublications}
          relatedProducts={relatedProducts}
          content={mergedContent}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
          onUpdateDepartment={handleUpdateDepartmentInline}
          rddLogoUrl={settings.rddLogoUrl}
          onNavigate={navigate}
        />
      );
    }

    if (lowerPath === '/projects') {
      const visibleProjects = projects.filter(p => !p.deletedAt && p.publicationStatus === 'Published');
      const visiblePublications = publications.filter(p => !p.deletedAt && p.publicationStatus === 'Published');
      return (
        <ProjectsView
          projects={visibleProjects}
          publications={visiblePublications}
          departments={departments}
          content={mergedContent}
          loading={loadingPublicData}
          onNavigate={navigate}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
        />
      );
    }

    if (lowerPath.startsWith('/projects/')) {
      const slug = decodeURIComponent(pathname.slice('/projects/'.length)).toLowerCase();
      const proj = projects.find(
        p =>
          !p.deletedAt &&
          p.slug.toLowerCase() === slug &&
          (isPreviewQuery || p.publicationStatus === 'Published')
      );
      if (!proj) {
        return (
          <NotFoundView
            content={mergedContent}
            onNavigate={navigate}
            isEditMode={isEditMode}
            onUpdateContent={handleUpdateContentField}
          />
        );
      }
      const relatedProjects = projects.filter(
        p =>
          p.id !== proj.id &&
          !p.deletedAt &&
          p.publicationStatus === 'Published' &&
          p.departmentIds?.some(id => proj.departmentIds?.includes(id))
      );
      return (
        <ProjectDetailView
          project={proj}
          departments={departments}
          relatedProjects={relatedProjects}
          content={mergedContent}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
          onNavigate={navigate}
        />
      );
    }

    if (lowerPath === '/products') {
      if (!showProducts && !isPreviewQuery) {
        return (
          <NotFoundView
            content={mergedContent}
            onNavigate={navigate}
            isEditMode={isEditMode}
            onUpdateContent={handleUpdateContentField}
          />
        );
      }
      return (
        <ProductsView
          products={publishedProducts}
          departments={departments}
          content={mergedContent}
          loading={loadingPublicData}
          onNavigate={navigate}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
        />
      );
    }

    if (lowerPath.startsWith('/products/')) {
      const slug = decodeURIComponent(pathname.slice('/products/'.length)).toLowerCase();
      const prod = products.find(
        p =>
          !p.deletedAt &&
          p.slug.toLowerCase() === slug &&
          (isPreviewQuery || p.publicationStatus === 'Published')
      );
      if (!prod || (!showProducts && !isPreviewQuery)) {
        return (
          <NotFoundView
            content={mergedContent}
            onNavigate={navigate}
            isEditMode={isEditMode}
            onUpdateContent={handleUpdateContentField}
          />
        );
      }
      return (
        <ProductDetailView
          product={prod}
          departments={departments}
          projects={projects}
          content={mergedContent}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
          onNavigate={navigate}
        />
      );
    }

    if (lowerPath === '/contact') {
      return (
        <ContactView
          content={mergedContent}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateContentField}
          socialLinks={settings.socialLinks}
          contactEmail={settings.contactEmail}
          organizationAddress={settings.organizationAddress}
        />
      );
    }

    // Custom CMS Pages (/pages/:slug or /:slug)
    const candidateSlug = lowerPath.startsWith('/pages/')
      ? decodeURIComponent(pathname.slice('/pages/'.length)).toLowerCase()
      : decodeURIComponent(pathname.slice(1)).toLowerCase();
    const customPage = pages.find(
      p =>
        !p.deletedAt &&
        p.slug.toLowerCase() === candidateSlug &&
        (isPreviewQuery || p.status === 'Published')
    );
    if (customPage) {
      return (
        <CustomPageView
          page={customPage}
          departments={departments}
          onNavigate={navigate}
          moaLogoUrl={settings.moaLogoUrl}
          rddLogoUrl={settings.rddLogoUrl}
          siteName={settings.siteName}
        />
      );
    }

    // Client-side redirect fallback from settings
    const matchedRedirect = (settings.redirects || []).find(
      r => r.from.replace(/\/+$/, '').toLowerCase() === lowerPath
    );
    if (matchedRedirect && sanitizeSafeUrl(matchedRedirect.to)) {
      if (matchedRedirect.to.startsWith('/')) {
        window.history.replaceState({}, '', matchedRedirect.to);
        setCurrentUrl(matchedRedirect.to);
        return null;
      }
    }

    return (
      <NotFoundView
        content={mergedContent}
        onNavigate={navigate}
        isEditMode={isEditMode}
        onUpdateContent={handleUpdateContentField}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#06302F] text-[#EDE9E0]">
      {!introComplete && (
        <LoadingScreen
          onComplete={() => setIntroComplete(true)}
          logoUrl={settings.loaderLogoUrl || settings.moaLogoUrl || '/drawing1.png'}
        />
      )}

      {isAnnouncementVisible && announcement && (
        <div className="bg-[#031D1C] border-b border-[#25CDB6]/30 text-[#EDE9E0] px-4 py-2.5 text-xs flex items-center justify-center gap-3 relative z-50">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center pr-6">
            <span>{announcement.text}</span>
            {announcement.linkUrl && sanitizeSafeUrl(announcement.linkUrl) && (
              <button
                type="button"
                onClick={() => navigate(announcement.linkUrl!)}
                className="inline-flex items-center gap-1 font-bold text-[#25CDB6] hover:underline cursor-pointer"
              >
                <span>{announcement.linkLabel || 'Learn more'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#EDE9E0]/60 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isEditMode && (
        <div className="sticky top-0 z-[60] bg-[#031D1C] border-b border-[#25CDB6]/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#17A491]/20 border border-[#25CDB6]/40 text-[#25CDB6] font-bold">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Live Page Editor</span>
            </span>
            {editorStatus && <span className="text-[#25CDB6] font-semibold">{editorStatus}</span>}
            {editorError && <span className="text-red-300 font-semibold">{editorError}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={editorSaving}
              onClick={handleSaveDraft}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 font-semibold text-[#EDE9E0] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editorSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>
            <button
              type="button"
              disabled={editorSaving}
              onClick={handlePublishDraft}
              className="px-3.5 py-1.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Publish Live</span>
            </button>
            <button
              type="button"
              onClick={handleExitEditMode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#EDE9E0]/80 hover:text-white inline-flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </button>
          </div>
        </div>
      )}

      <Navbar
        currentPath={pathname}
        onNavigate={navigate}
        socialLinks={settings.socialLinks}
        navigation={settings.navigation}
        showProducts={showProducts}
        logoUrl={settings.moaLogoUrl}
        siteName={settings.siteName}
      />

      <main className="flex-1 flex flex-col">
        <ErrorBoundary onResetHome={() => navigate('/home')}>
          {renderPublicContent()}
        </ErrorBoundary>
      </main>

      <Footer
        departments={departments}
        onNavigate={navigate}
        socialLinks={settings.socialLinks}
        footerText={settings.footerText}
        footerColumns={settings.footerColumns}
        showProducts={showProducts}
        contactEmail={settings.contactEmail}
        organizationAddress={settings.organizationAddress}
        logoUrl={settings.moaLogoUrl}
        siteName={settings.siteName}
        tagline={settings.tagline}
        content={mergedContent.footer}
      />
    </div>
  );
}
