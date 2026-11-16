import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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
import { api, HttpError, MaintenanceInfoResponse } from './services/api';
import { INITIAL_SITE_CONTENT } from './data/initialData';
import { useContent } from './hooks/useContent';
import { can, hasPortalAccess } from './shared/permissions';
import { sanitizeSafeUrl } from './shared/url';
import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SpaLink } from './components/SpaLink';
import { HomeView } from './views/HomeView';
import { AboutView } from './views/AboutView';
import { DepartmentsView } from './views/DepartmentsView';
import { DepartmentDetailView } from './views/DepartmentDetailView';
import { ProjectsView } from './views/ProjectsView';
import { ProjectDetailView } from './views/ProjectDetailView';
import { ProductDetailView } from './views/ProductDetailView';
import { ContactView } from './views/ContactView';
import { SignInView } from './views/SignInView';
import { NotFoundView } from './views/NotFoundView';
import { MaintenanceView } from './views/MaintenanceView';
import { CustomPageView } from './views/CustomPageView';
import {
  Save,
  Send,
  X,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  LayoutDashboard,
  ArrowRight
} from 'lucide-react';

const AdminPortal = lazy(() =>
  import('./views/AdminPortal').then(mod => ({ default: mod.AdminPortal }))
);

function normalizeRoutePath(rawPath: string): string {
  const pathOnly = rawPath.split('?')[0].split('#')[0] || '/';
  if (pathOnly === '/') return '/';
  const cleaned = pathOnly.replace(/\/+$/, '');
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

function setByFieldPath(obj: Record<string, unknown>, fieldPath: string, value: unknown): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj || {})) as Record<string, unknown>;
  const parts = fieldPath.split('.').filter(Boolean);
  if (parts.length === 0) return clone;
  let curr: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = curr[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      curr[key] = {};
    }
    curr = curr[key] as Record<string, unknown>;
  }
  curr[parts[parts.length - 1]] = value;
  return clone;
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function removeMetaTag(attr: 'name' | 'property', key: string) {
  const el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (el) el.remove();
}

function resolveRedirects(
  rawPath: string,
  redirects: SiteSettings['redirects'] | undefined
): { target: string; isExternal: boolean } | null {
  if (!redirects || redirects.length === 0) return null;
  let current = normalizeRoutePath(rawPath);
  const visited = new Set<string>([current.toLowerCase()]);
  let redirected = false;

  for (let hop = 0; hop < 5; hop++) {
    const rule = redirects.find(r => normalizeRoutePath(r.from).toLowerCase() === current.toLowerCase());
    if (!rule) break;
    redirected = true;
    const dest = (rule.to || '').trim();
    if (!dest) break;
    if (/^https?:\/\//i.test(dest)) {
      return { target: dest, isExternal: true };
    }
    const normalizedDest = normalizeRoutePath(dest);
    const key = normalizedDest.toLowerCase();
    if (visited.has(key)) {
      break;
    }
    visited.add(key);
    current = normalizedDest;
  }

  return redirected ? { target: current, isExternal: false } : null;
}

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return normalizeRoutePath(window.location.pathname);
  });

  // Public & authenticated core state (no hardcoded fallback content lists)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maintenanceBlock, setMaintenanceBlock] = useState<MaintenanceInfoResponse | null>(null);

  // Auth & Edit Mode state
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCurrentUser());
  const [authChecked, setAuthChecked] = useState<boolean>(() => !api.getToken());
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState<Partial<SiteContent> | null>(null);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editBannerMsg, setEditBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Announcement bar dismissal (per session)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // Optional `?preview=1` single-item lookup for unpublished items when signed in
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const knownVersionRef = useRef<number | null>(null);
  const { content: mergedContent } = useContent(siteContent, isEditMode ? draftContent : null);

  const navigate = useCallback((to: string) => {
    const raw = to.trim() || '/';
    if (/^https?:\/\//i.test(raw) || raw.startsWith('mailto:')) {
      const safe = sanitizeSafeUrl(raw, true);
      if (safe) window.location.assign(safe);
      return;
    }

    const qIdx = raw.indexOf('?');
    const pathPart = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    const queryPart = qIdx >= 0 ? raw.slice(qIdx) : '';
    const normalized = normalizeRoutePath(pathPart);
    const fullUrl = `${normalized}${queryPart}`;

    if (typeof window !== 'undefined') {
      const currentFull = `${normalizeRoutePath(window.location.pathname)}${window.location.search}`;
      if (fullUrl !== currentFull) {
        window.history.pushState({}, '', fullUrl);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setCurrentRoute(normalized);
  }, []);

  // Sync browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      setCurrentRoute(normalizeRoutePath(window.location.pathname));
      setPreviewProject(null);
      setPreviewProduct(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Register 401 unauthorized handler
  useEffect(() => {
    api.registerUnauthorizedHandler(() => {
      setCurrentUser(null);
      setIsEditMode(false);
      setDraftContent(null);
      setHasDraftChanges(false);
      navigate('/login?expired=1');
    });
    return () => api.registerUnauthorizedHandler(null);
  }, [navigate]);

  // Verify stored token on mount
  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setCurrentUser(null);
      setAuthChecked(true);
      return;
    }
    let active = true;
    api
      .getMe()
      .then(res => {
        if (active) setCurrentUser(res.user);
      })
      .catch(() => {
        if (active) {
          api.clearSession();
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch public site data
  const fetchPublicData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    }
    setLoadError(null);
    try {
      const [deptsRes, projRes, pubRes, prodRes, contentRes, settingsRes, pagesRes, verRes] =
        await Promise.all([
          api.getDepartments(),
          api.getProjects(),
          api.getPublications(),
          api.getProducts(),
          api.getPageContent(),
          api.getSettings(),
          api.getPages(),
          api.getContentVersion()
        ]);

      setDepartments(deptsRes);
      setProjects(projRes);
      setPublications(pubRes);
      setProducts(prodRes);
      setSiteContent(contentRes);
      setSettings(settingsRes);
      setPages(pagesRes);
      setMaintenanceBlock(null);
      knownVersionRef.current = verRes.version;
    } catch (err) {
      if (err instanceof HttpError && err.status === 503) {
        try {
          const info = await api.getMaintenanceInfo();
          setMaintenanceBlock(info);
        } catch {
          setMaintenanceBlock({
            maintenanceMode: true,
            siteName: 'Masters Of All',
            moaLogoUrl: '/drawing1.png',
            maintenance: INITIAL_SITE_CONTENT.maintenance
          });
        }
      } else {
        setLoadError(
          err instanceof Error ? err.message : 'Unable to load website content from the server.'
        );
      }
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPublicData(true);
  }, [fetchPublicData]);

  // Content version freshness check on route change, window focus, and 60s interval
  const checkContentVersion = useCallback(async () => {
    try {
      const res = await api.getContentVersion();
      if (knownVersionRef.current !== null && res.version !== knownVersionRef.current) {
        await fetchPublicData(false);
      } else if (knownVersionRef.current === null) {
        knownVersionRef.current = res.version;
      }
    } catch {
      // Ignore background version check errors
    }
  }, [fetchPublicData]);

  useEffect(() => {
    void checkContentVersion();
  }, [currentRoute, checkContentVersion]);

  useEffect(() => {
    const onFocus = () => {
      void checkContentVersion();
    };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => {
      void checkContentVersion();
    }, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [checkContentVersion]);

  // Redirect rules check on route changes
  useEffect(() => {
    if (!settings?.redirects || settings.redirects.length === 0) return;
    if (
      currentRoute === '/portal' ||
      currentRoute.startsWith('/portal/') ||
      currentRoute === '/admin' ||
      currentRoute.startsWith('/admin/') ||
      currentRoute === '/login' ||
      currentRoute === '/invite'
    ) {
      return;
    }
    const resolved = resolveRedirects(currentRoute, settings.redirects);
    if (resolved) {
      if (resolved.isExternal) {
        window.location.replace(resolved.target);
      } else if (resolved.target !== currentRoute) {
        window.history.replaceState({}, '', resolved.target);
        setCurrentRoute(resolved.target);
      }
    }
  }, [currentRoute, settings]);

  // Preview lookup when visiting /projects/:slug?preview=1 or /products/:slug?preview=1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== '1' || !currentUser) {
      setPreviewProject(null);
      setPreviewProduct(null);
      return;
    }

    if (currentRoute.startsWith('/projects/')) {
      const slug = decodeURIComponent(currentRoute.slice('/projects/'.length));
      if (slug && !projects.some(p => p.slug === slug)) {
        api
          .getProjectBySlug(slug)
          .then(p => setPreviewProject(p))
          .catch(() => setPreviewProject(null));
      }
    } else if (currentRoute.startsWith('/products/')) {
      const slug = decodeURIComponent(currentRoute.slice('/products/'.length));
      if (slug && !products.some(p => p.slug === slug)) {
        api
          .getProductBySlug(slug)
          .then(p => setPreviewProduct(p))
          .catch(() => setPreviewProduct(null));
      }
    }
  }, [currentRoute, currentUser, projects, products]);

  // Warn before unloading page if inline edit mode has unsaved draft edits
  useEffect(() => {
    if (!isEditMode || !hasDraftChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isEditMode, hasDraftChanges]);

  // Edit mode actions (permission-gated)
  const enterEditMode = useCallback(async () => {
    if (!can(currentUser, 'website.edit')) return;
    try {
      const res = await api.getDraftContent();
      setDraftContent(res.draft || null);
      setHasDraftChanges(Boolean(res.draft && Object.keys(res.draft).length > 0));
    } catch {
      setDraftContent(null);
    }
    setEditBannerMsg(null);
    setIsEditMode(true);
    if (
      currentRoute === '/portal' ||
      currentRoute.startsWith('/portal/') ||
      currentRoute === '/admin' ||
      currentRoute.startsWith('/admin/')
    ) {
      navigate('/');
    }
  }, [currentUser, currentRoute, navigate]);

  const handleUpdateInlineContent = useCallback(
    (fieldPath: string, newValue: unknown) => {
      if (!can(currentUser, 'website.edit')) return;
      setDraftContent(prev => {
        const base = (prev || siteContent || INITIAL_SITE_CONTENT) as Record<string, unknown>;
        return setByFieldPath(base, fieldPath, newValue) as Partial<SiteContent>;
      });
      setHasDraftChanges(true);
      setEditBannerMsg(null);
    },
    [currentUser, siteContent]
  );

  const handleSaveInlineDraft = async () => {
    if (!draftContent) return;
    setEditSaving(true);
    setEditBannerMsg(null);
    try {
      await api.saveDraftContent(draftContent);
      setEditBannerMsg({ type: 'ok', text: 'Draft saved.' });
    } catch (err) {
      setEditBannerMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to save draft.'
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handlePublishInlineDraft = async () => {
    setEditSaving(true);
    setEditBannerMsg(null);
    try {
      if (draftContent) {
        await api.saveDraftContent(draftContent);
      }
      const published = await api.publishDraftContent();
      setSiteContent(published);
      setDraftContent(null);
      setHasDraftChanges(false);
      await fetchPublicData(false);
      setEditBannerMsg({ type: 'ok', text: 'Published live.' });
    } catch (err) {
      setEditBannerMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to publish changes.'
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDiscardInlineDraft = async () => {
    setEditSaving(true);
    setEditBannerMsg(null);
    try {
      await api.saveDraftContent(null as unknown as Partial<SiteContent>);
    } catch {
      // Ignore clear error
    } finally {
      setDraftContent(null);
      setHasDraftChanges(false);
      await fetchPublicData(false);
      setEditSaving(false);
      setEditBannerMsg({ type: 'ok', text: 'Draft discarded.' });
    }
  };

  // Compute route resolution
  const isPortalRoute =
    currentRoute === '/portal' ||
    currentRoute.startsWith('/portal/') ||
    currentRoute === '/admin' ||
    currentRoute.startsWith('/admin/');
  const isAuthRoute = currentRoute === '/login' || currentRoute === '/invite';
  const showMaintenanceGate =
    !isAuthRoute &&
    (Boolean(maintenanceBlock?.maintenanceMode) ||
      (Boolean(settings?.maintenanceMode) && !hasPortalAccess(currentUser)));

  // Route matching helper for document metadata & view rendering
  const matchedDeptSlug = currentRoute.startsWith('/departments/')
    ? decodeURIComponent(currentRoute.slice('/departments/'.length))
    : null;
  const matchedDepartment = matchedDeptSlug
    ? departments.find(d => d.slug === matchedDeptSlug && !d.deletedAt)
    : undefined;

  const matchedProjectSlug = currentRoute.startsWith('/projects/')
    ? decodeURIComponent(currentRoute.slice('/projects/'.length))
    : null;
  const matchedProject = matchedProjectSlug
    ? projects.find(p => p.slug === matchedProjectSlug && !p.deletedAt) ||
      (previewProject?.slug === matchedProjectSlug ? previewProject : undefined)
    : undefined;

  const matchedProductSlug = currentRoute.startsWith('/products/')
    ? decodeURIComponent(currentRoute.slice('/products/'.length))
    : null;
  const matchedProduct = matchedProductSlug
    ? products.find(p => p.slug === matchedProductSlug && !p.deletedAt) ||
      (previewProduct?.slug === matchedProductSlug ? previewProduct : undefined)
    : undefined;

  const customPageSlug = currentRoute.startsWith('/pages/')
    ? decodeURIComponent(currentRoute.slice('/pages/'.length))
    : currentRoute !== '/'
      ? decodeURIComponent(currentRoute.slice(1))
      : '';
  const matchedCustomPage = customPageSlug
    ? pages.find(p => p.slug === customPageSlug && !p.deletedAt && p.status === 'Published')
    : undefined;

  // Dynamic <head> metadata + JSON-LD + robots
  useEffect(() => {
    const siteName = settings?.siteName || 'Masters Of All';
    const defaultTitle = settings?.seoDefaults?.title || `${siteName} — Believe. Build. Become.`;
    const defaultDesc =
      settings?.seoDefaults?.description ||
      'Masters Of All (MoA) is a platform dedicated to research, discovery and development.';
    const defaultKeywords = settings?.seoDefaults?.keywords || '';
    const defaultImage = sanitizeSafeUrl(settings?.shareImageUrl) || '/drawing1.png';
    const favicon = sanitizeSafeUrl(settings?.faviconUrl) || sanitizeSafeUrl(settings?.moaLogoUrl) || '/drawing1.png';

    let title = defaultTitle;
    let description = defaultDesc;
    let image = defaultImage;
    let noindex = false;

    if (showMaintenanceGate) {
      title = `Maintenance — ${siteName}`;
      noindex = true;
    } else if (currentRoute === '/login' || currentRoute === '/invite') {
      title = `Control Room Sign In — ${siteName}`;
      noindex = true;
    } else if (isPortalRoute) {
      if (currentUser && hasPortalAccess(currentUser)) {
        title = `Control Room — ${siteName}`;
      } else {
        title = `Not Found — ${siteName}`;
      }
      noindex = true;
    } else if (currentRoute === '/signin') {
      title = `Not Found — ${siteName}`;
      noindex = true;
    } else if (currentRoute === '/about') {
      title = `About — ${siteName}`;
      description = mergedContent.about.heroSub || defaultDesc;
    } else if (currentRoute === '/departments') {
      title = `Departments — ${siteName}`;
      description = mergedContent.departments.directorySubtitle || defaultDesc;
    } else if (currentRoute === '/projects') {
      title = `Our Work — ${siteName}`;
      description = mergedContent.work.subtitle || defaultDesc;
    } else if (currentRoute === '/contact') {
      title = `Contact — ${siteName}`;
      description = mergedContent.contact.subtext || defaultDesc;
    } else if (matchedDepartment) {
      title = matchedDepartment.seoTitle || `${matchedDepartment.name} — ${siteName}`;
      description =
        matchedDepartment.seoDescription || matchedDepartment.introduction || defaultDesc;
      image = sanitizeSafeUrl(matchedDepartment.seoShareImage) || sanitizeSafeUrl(matchedDepartment.heroImage) || defaultImage;
    } else if (matchedProject) {
      title = matchedProject.seoTitle || `${matchedProject.title} — ${siteName}`;
      description = matchedProject.seoDescription || matchedProject.shortDescription || defaultDesc;
      image = sanitizeSafeUrl(matchedProject.seoShareImage) || sanitizeSafeUrl(matchedProject.coverImage) || defaultImage;
    } else if (matchedProduct) {
      title = matchedProduct.seoTitle || `${matchedProduct.name} — ${siteName}`;
      description = matchedProduct.seoDescription || matchedProduct.shortDescription || defaultDesc;
      image = sanitizeSafeUrl(matchedProduct.seoShareImage) || sanitizeSafeUrl(matchedProduct.coverImage) || defaultImage;
    } else if (matchedCustomPage) {
      title = matchedCustomPage.seo?.title || `${matchedCustomPage.title} — ${siteName}`;
      description = matchedCustomPage.seo?.description || defaultDesc;
      image = sanitizeSafeUrl(matchedCustomPage.seo?.shareImage) || defaultImage;
      noindex = Boolean(matchedCustomPage.seo?.noindex);
    } else if (currentRoute !== '/') {
      title = `Not Found — ${siteName}`;
      noindex = true;
    }

    document.title = title;
    upsertMetaTag('name', 'description', description);
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:image', image);
    if (defaultKeywords) {
      upsertMetaTag('name', 'keywords', defaultKeywords);
    } else {
      removeMetaTag('name', 'keywords');
    }
    if (noindex) {
      upsertMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      removeMetaTag('name', 'robots');
    }

    const iconEl = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (iconEl) {
      iconEl.href = favicon;
    }

    // Schema.org Organization JSON-LD
    let ldScript = document.getElementById('moa-org-jsonld') as HTMLScriptElement | null;
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.id = 'moa-org-jsonld';
      ldScript.type = 'application/ld+json';
      document.head.appendChild(ldScript);
    }
    const orgSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: typeof window !== 'undefined' ? window.location.origin : '',
      logo: sanitizeSafeUrl(settings?.moaLogoUrl) || '/drawing1.png',
      email: settings?.contactEmail || undefined,
      sameAs: (settings?.socialLinks || []).map(l => sanitizeSafeUrl(l.url)).filter(Boolean)
    };
    if (settings?.organizationAddress) {
      orgSchema.address = settings.organizationAddress;
    }
    ldScript.textContent = JSON.stringify(orgSchema);
  }, [
    settings,
    mergedContent,
    currentRoute,
    currentUser,
    isPortalRoute,
    showMaintenanceGate,
    matchedDepartment,
    matchedProject,
    matchedProduct,
    matchedCustomPage
  ]);

  const moaLogoUrl = sanitizeSafeUrl(settings?.moaLogoUrl) || '/drawing1.png';
  const loaderLogoUrl = sanitizeSafeUrl(settings?.loaderLogoUrl) || moaLogoUrl;
  const rddLogoUrl = sanitizeSafeUrl(settings?.rddLogoUrl) || '/5320.jpg';
  const siteName = settings?.siteName || 'Masters Of All';

  // Announcement bar logic
  const announcement = settings?.announcementBar;
  const isAnnouncementActive = Boolean(
    !announcementDismissed &&
      announcement?.enabled &&
      announcement.text?.trim() &&
      (!announcement.expiresAt || new Date(announcement.expiresAt).getTime() > Date.now())
  );

  // Full-screen Maintenance Mode gate for public visitors
  if (showMaintenanceGate && !initialLoading) {
    return (
      <ErrorBoundary onResetHome={() => navigate('/')}>
        <MaintenanceView
          content={
            maintenanceBlock?.maintenance
              ? ({ ...mergedContent, maintenance: maintenanceBlock.maintenance } as SiteContent)
              : mergedContent
          }
          logoUrl={maintenanceBlock?.moaLogoUrl || moaLogoUrl}
          siteName={maintenanceBlock?.siteName || siteName}
        />
      </ErrorBoundary>
    );
  }

  // Dedicated Control Room route
  if (isPortalRoute) {
    if (!authChecked) {
      return (
        <div className="min-h-screen bg-[#06302F] flex items-center justify-center text-[#EDE9E0]/70 text-xs font-mono">
          Verifying session...
        </div>
      );
    }

    if (!currentUser) {
      return (
        <ErrorBoundary onResetHome={() => navigate('/')}>
          <div className="min-h-screen flex flex-col bg-[#06302F] text-[#EDE9E0]">
            <Navbar
              currentPath={currentRoute}
              onNavigate={navigate}
              socialLinks={settings?.socialLinks}
              navigation={settings?.navigation}
              logoUrl={moaLogoUrl}
              siteName={siteName}
            />
            <main className="flex-1">
              <NotFoundView content={mergedContent} onNavigate={navigate} />
            </main>
            <Footer
              departments={departments}
              onNavigate={navigate}
              socialLinks={settings?.socialLinks}
              footerText={settings?.footerText}
              footerColumns={settings?.footerColumns}
              contactEmail={settings?.contactEmail}
              organizationAddress={settings?.organizationAddress}
              logoUrl={moaLogoUrl}
              siteName={siteName}
              tagline={settings?.tagline}
              content={mergedContent.footer}
            />
          </div>
        </ErrorBoundary>
      );
    }

    if (!hasPortalAccess(currentUser)) {
      return (
        <div className="min-h-screen bg-[#06302F] flex items-center justify-center p-6 text-[#EDE9E0]">
          <div className="max-w-md w-full bg-[#031D1C] border border-white/10 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#CA7952]/15 border border-[#CA7952]/40 flex items-center justify-center text-[#CA7952] mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold">Portal Access Restricted</h1>
            <p className="text-xs text-[#EDE9E0]/70 leading-relaxed">
              Your account ({currentUser.email}) does not currently have Control Room permissions assigned. Contact an administrator if you need access.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-xs cursor-pointer"
              >
                Return Home
              </button>
              <button
                type="button"
                onClick={async () => {
                  await api.signOut();
                  setCurrentUser(null);
                  navigate('/login');
                }}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ErrorBoundary onResetHome={() => navigate('/')}>
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#06302F] flex items-center justify-center text-[#25CDB6] text-xs font-mono">
              Loading Control Room...
            </div>
          }
        >
          <AdminPortal
            currentUser={currentUser}
            onUpdateUser={setCurrentUser}
            onLogout={async () => {
              await api.signOut();
              setCurrentUser(null);
              setIsEditMode(false);
              navigate('/login');
            }}
            onNavigateSite={(path = '/') => {
              setIsEditMode(false);
              navigate(path);
            }}
            onEnterEditMode={enterEditMode}
            onRefreshData={async () => {
              await fetchPublicData(false);
            }}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Dedicated Sign-In / Invite routes (hidden cleanly; no public navbar/footer)
  if (currentRoute === '/login' || currentRoute === '/invite') {
    if (authChecked && currentUser && currentRoute === '/login') {
      const params =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      if (!params?.get('reset') && !params?.get('invite') && !params?.get('token')) {
        window.history.replaceState({}, '', '/portal');
        setCurrentRoute('/portal');
        return null;
      }
    }

    return (
      <ErrorBoundary onResetHome={() => navigate('/')}>
        <SignInView
          onSignInSuccess={user => {
            setCurrentUser(user);
            navigate('/portal');
          }}
          onNavigate={navigate}
          logoUrl={moaLogoUrl}
          minPasswordLength={settings?.securityPolicy?.minPasswordLength || 12}
        />
      </ErrorBoundary>
    );
  }

  const renderPublicView = () => {
    if (loadError && !siteContent && !initialLoading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full bg-[#031D1C] border border-white/10 rounded-3xl p-8 text-center space-y-4">
            <AlertTriangle className="w-8 h-8 text-[#CA7952] mx-auto" />
            <h2 className="text-xl font-bold text-[#EDE9E0]">Unable to reach server</h2>
            <p className="text-xs text-[#EDE9E0]/65 leading-relaxed">{loadError}</p>
            <button
              type="button"
              onClick={() => void fetchPublicData(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      );
    }

    if (initialLoading && !siteContent) {
      return (
        <div className="min-h-[65vh] flex items-center justify-center text-xs font-mono text-[#EDE9E0]/50">
          Loading...
        </div>
      );
    }

    // Legacy /signin must return NotFoundView
    if (currentRoute === '/signin') {
      return (
        <NotFoundView
          content={mergedContent}
          onNavigate={navigate}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateInlineContent}
        />
      );
    }

    if (currentRoute === '/') {
      return (
        <HomeView
          content={mergedContent}
          departments={departments}
          onNavigate={navigate}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateInlineContent}
          logoUrl={moaLogoUrl}
        />
      );
    }

    if (currentRoute === '/about') {
      return (
        <AboutView
          content={mergedContent}
          departments={departments}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateInlineContent}
        />
      );
    }

    if (currentRoute === '/departments') {
      return (
        <DepartmentsView
          departments={departments}
          content={mergedContent}
          onNavigate={navigate}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateInlineContent}
          moaLogoUrl={moaLogoUrl}
          rddLogoUrl={rddLogoUrl}
          siteName={siteName}
        />
      );
    }

    if (matchedDeptSlug) {
      if (!matchedDepartment) {
        return (
          <NotFoundView
            content={mergedContent}
            onNavigate={navigate}
            isEditMode={isEditMode}
            onUpdateContent={handleUpdateInlineContent}
          />
        );
      }
      const relProjects = projects.filter(
        p => !p.deletedAt && (p.departmentIds || []).includes(matchedDepartment.id)
      );
      const relPubs = publications.filter(
        p => !p.deletedAt && (p.departmentIds || []).includes(matchedDepartment.id)
      );
      const relProducts = products.filter(
        p => !p.deletedAt && (p.departmentIds || []).includes(matchedDepartment.id)
      );
      return (
        <DepartmentDetailView
          department={matchedDepartment}
          allDepartments={departments.filter(d => d.published && !d.deletedAt)}
          relatedProjects={relProjects}
          relatedPublications={relPubs}
          relatedProducts={relProducts}
          onNavigate={navigate}
        />
      );
    }

    if (currentRoute === '/projects') {
      return (
        <ProjectsView
          projects={projects}
          publications={publications}
          products={products}
          departments={departments}
          content={mergedContent}
          onNavigate={navigate}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateInlineContent}
        />
      );
    }

    if (matchedProjectSlug) {
      if (!matchedProject) {
        return (
          <NotFoundView
            content={mergedContent}
            onNavigate={navigate}
            isEditMode={isEditMode}
            onUpdateContent={handleUpdateInlineContent}
          />
        );
      }
      return (
        <ProjectDetailView
          project={matchedProject}
          departments={departments}
          onNavigate={navigate}
        />
      );
    }

    if (matchedProductSlug) {
      if (!matchedProduct) {
        return (
          <NotFoundView
            content={mergedContent}
            onNavigate={navigate}
            isEditMode={isEditMode}
            onUpdateContent={handleUpdateInlineContent}
          />
        );
      }
      return (
        <ProductDetailView
          product={matchedProduct}
          departments={departments}
          projects={projects}
          onNavigate={navigate}
        />
      );
    }

    if (currentRoute === '/contact') {
      return (
        <ContactView
          content={mergedContent}
          isEditMode={isEditMode}
          onUpdateContent={handleUpdateInlineContent}
          socialLinks={settings?.socialLinks}
          contactEmail={settings?.contactEmail}
          organizationAddress={settings?.organizationAddress}
        />
      );
    }

    if (matchedCustomPage) {
      return (
        <CustomPageView
          page={matchedCustomPage}
          departments={departments}
          onNavigate={navigate}
          moaLogoUrl={moaLogoUrl}
          rddLogoUrl={rddLogoUrl}
          siteName={siteName}
        />
      );
    }

    return (
      <NotFoundView
        content={mergedContent}
        onNavigate={navigate}
        isEditMode={isEditMode}
        onUpdateContent={handleUpdateInlineContent}
      />
    );
  };

  return (
    <ErrorBoundary onResetHome={() => navigate('/')}>
      {!introDone && !isAuthRoute && (
        <LoadingScreen onComplete={() => setIntroDone(true)} logoUrl={loaderLogoUrl} />
      )}

      <div className="min-h-screen flex flex-col bg-[#06302F] text-[#EDE9E0]">
        {/* Admin notice when browsing public site while maintenance mode is on */}
        {settings?.maintenanceMode && hasPortalAccess(currentUser) && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-3">
            <span className="font-medium">
              Maintenance mode is currently active. Public visitors see the maintenance screen.
            </span>
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 font-bold cursor-pointer shrink-0"
            >
              Control Room
            </button>
          </div>
        )}

        {/* Inline Edit Mode Toolbar (only for users with website.edit) */}
        {isEditMode && can(currentUser, 'website.edit') && (
          <div className="sticky top-0 z-50 bg-[#031D1C] border-b border-[#25CDB6]/40 px-4 py-2.5 shadow-xl">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-full bg-[#17A491]/20 border border-[#25CDB6]/40 text-[#25CDB6] font-bold font-mono text-[11px]">
                  Inline Edit Mode
                </span>
                {hasDraftChanges && (
                  <span className="text-amber-300 font-semibold">Unsaved draft changes</span>
                )}
                {editBannerMsg && (
                  <span
                    className={
                      editBannerMsg.type === 'ok' ? 'text-[#25CDB6] font-semibold' : 'text-red-300 font-semibold'
                    }
                  >
                    {editBannerMsg.text}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={editSaving || !hasDraftChanges}
                  onClick={handleSaveInlineDraft}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-[#EDE9E0] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={editSaving || !hasDraftChanges}
                  onClick={handlePublishInlineDraft}
                  className="px-3.5 py-1.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] disabled:opacity-40 text-[#031D1C] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Live</span>
                </button>
                <button
                  type="button"
                  disabled={editSaving || !hasDraftChanges}
                  onClick={handleDiscardInlineDraft}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 disabled:opacity-40 text-[#EDE9E0]/80 hover:text-red-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    navigate('/portal');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#0A3D3C] hover:bg-[#0A3D3C]/80 border border-white/15 text-[#EDE9E0] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#25CDB6]" />
                  <span>Control Room</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Bar */}
        {isAnnouncementActive && announcement && (
          <div className="bg-[#031D1C] border-b border-[#17A491]/30 px-4 py-2 text-xs text-[#EDE9E0]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex-1 text-center flex flex-wrap items-center justify-center gap-2">
                <span>{announcement.text}</span>
                {announcement.linkUrl && sanitizeSafeUrl(announcement.linkUrl) && (
                  <SpaLink
                    href={sanitizeSafeUrl(announcement.linkUrl)}
                    onNavigate={navigate}
                    className="inline-flex items-center gap-1 font-bold text-[#25CDB6] hover:underline"
                  >
                    <span>{announcement.linkLabel || 'Learn more'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </SpaLink>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss announcement"
                onClick={() => setAnnouncementDismissed(true)}
                className="p-1 text-[#EDE9E0]/50 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <Navbar
          currentPath={currentRoute}
          onNavigate={navigate}
          socialLinks={settings?.socialLinks}
          navigation={settings?.navigation}
          logoUrl={moaLogoUrl}
          siteName={siteName}
        />

        <main className="flex-1">{renderPublicView()}</main>

        <Footer
          departments={departments}
          onNavigate={navigate}
          socialLinks={settings?.socialLinks}
          footerText={settings?.footerText}
          footerColumns={settings?.footerColumns}
          contactEmail={settings?.contactEmail}
          organizationAddress={settings?.organizationAddress}
          logoUrl={moaLogoUrl}
          siteName={siteName}
          tagline={settings?.tagline}
          content={mergedContent.footer}
        />
      </div>
    </ErrorBoundary>
  );
}
