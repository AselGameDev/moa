import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Edit,
  Menu,
  LayoutTemplate,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Eye,
  Sparkles,
  ArrowRight,
  MoveUp,
  MoveDown,
  Save,
  Check,
  Image as ImageIcon,
  History,
  RotateCcw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  PageRecord,
  PageBlock,
  SiteSettings,
  SiteContent,
  NavigationItem,
  FooterColumn,
  RedirectRule,
  ContentHistorySnapshot,
  MediaAsset,
  User,
  RoleDefinition
} from '../../../types';
import { api, RedirectTestResult } from '../../../services/api';
import { can } from '../../../shared/permissions';
import { sanitizeSafeUrl } from '../../../shared/url';
import { getVisibleSubTabs } from '../portalRegistry';
import { MediaPicker } from '../../MediaPicker';
import { ConfirmDialog } from '../ConfirmDialog';

export type WebsiteSubTab = 'pages' | 'editor' | 'navigation' | 'footer' | 'seo';

interface WebsiteTabProps {
  initialSubTab?: WebsiteSubTab;
  onSubTabChange?: (sub: WebsiteSubTab) => void;
  currentUser: User;
  roles?: RoleDefinition[];
  pages: PageRecord[];
  onSavePage: (page: PageRecord) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  settings: SiteSettings;
  onUpdateSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  siteContent: SiteContent;
  onUpdateSiteContent: (content: SiteContent) => Promise<void>;
  onEnterEditMode?: () => void | Promise<void>;
  onNavigateSite: (path?: string) => void;
}

const CORE_PAGE_OUTLINES: Record<string, { id: string; name: string; type: string }[]> = {
  home: [
    { id: 'sec-hero', name: 'Hero Headline & Orbit Visual', type: 'Hero' },
    { id: 'sec-methodology', name: 'Explore / Create / Transform Methodology', type: 'Interactive' },
    { id: 'sec-pillars', name: 'Believe · Build · Become Manifesto', type: 'Pillars' },
    { id: 'sec-depts', name: 'Departmental Orbit & Statement', type: 'Departments' }
  ],
  about: [
    { id: 'sec-origin', name: 'About Hero & Who We Are', type: 'Hero' },
    { id: 'sec-what', name: 'What We Do Action Cards', type: 'Cards' },
    { id: 'sec-think', name: 'How We Think Continuum', type: 'Steps' },
    { id: 'sec-founder', name: 'Philosophy Pillars & Founder Statement', type: 'Credo' }
  ],
  departments: [
    { id: 'sec-rdd', name: 'RDD Division Overview', type: 'Intro' },
    { id: 'sec-tree', name: 'Interactive Organization Tree', type: 'Diagram' },
    { id: 'sec-dir', name: 'Published Departments Directory', type: 'Directory' }
  ],
  projects: [
    { id: 'sec-work-header', name: 'Projects Header & Search', type: 'Header' },
    { id: 'sec-work-catalog', name: 'Projects & Publications Tabs', type: 'Catalog' }
  ],
  products: [
    { id: 'sec-products-header', name: 'Products Header & Filters', type: 'Header' },
    { id: 'sec-products-grid', name: 'Products Showcase Grid', type: 'Catalog' }
  ],
  contact: [
    { id: 'sec-contact-intro', name: 'Direct Contact & Form Copy', type: 'Form' },
    { id: 'sec-contact-channels', name: 'Official Social Channels', type: 'Links' }
  ],
  notFound: [{ id: 'sec-404', name: '404 Not Found Copy', type: 'System Page' }],
  maintenance: [{ id: 'sec-maint', name: 'Maintenance Mode Copy', type: 'System Page' }]
};

const SUBTAB_ICONS: Record<WebsiteSubTab, React.ComponentType<{ className?: string }>> = {
  pages: FileText,
  editor: Edit,
  navigation: Menu,
  footer: LayoutTemplate,
  seo: Search
};

type BrandAssetKey = 'moaLogoUrl' | 'loaderLogoUrl' | 'rddLogoUrl' | 'faviconUrl' | 'shareImageUrl';

type MediaTarget =
  | { kind: 'brand'; key: BrandAssetKey }
  | { kind: 'pageSeo' }
  | { kind: 'blockField'; blockIndex: number; fieldKey: string };

export const WebsiteTab: React.FC<WebsiteTabProps> = ({
  initialSubTab = 'pages',
  onSubTabChange,
  currentUser,
  roles,
  pages,
  onSavePage,
  onDeletePage,
  settings,
  onUpdateSettings,
  siteContent,
  onUpdateSiteContent,
  onEnterEditMode,
  onNavigateSite
}) => {
  const visibleSubTabs = useMemo(
    () => getVisibleSubTabs('website', currentUser, roles),
    [currentUser, roles]
  );

  const [subTab, setSubTab] = useState<WebsiteSubTab>(() => {
    if (visibleSubTabs.some(st => st.id === initialSubTab)) return initialSubTab;
    return (visibleSubTabs[0]?.id as WebsiteSubTab) || 'editor';
  });

  useEffect(() => {
    if (visibleSubTabs.some(st => st.id === initialSubTab)) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab, visibleSubTabs]);

  const selectSubTab = (next: WebsiteSubTab) => {
    setSubTab(next);
    onSubTabChange?.(next);
  };

  const canManagePages = can(currentUser, 'pages.manage', roles);
  const canEditWebsite = can(currentUser, 'website.edit', roles);
  const canManageNav = can(currentUser, 'navigation.manage', roles);
  const canManageSeo = can(currentUser, 'seo.manage', roles);

  const [actionError, setActionError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string>('home');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Brand Assets editor buffer
  const [brandAssets, setBrandAssets] = useState({
    moaLogoUrl: settings?.moaLogoUrl || '/drawing1.png',
    loaderLogoUrl: settings?.loaderLogoUrl || '/drawing1.png',
    rddLogoUrl: settings?.rddLogoUrl || '/5320.jpg',
    faviconUrl: settings?.faviconUrl || '/drawing1.png',
    shareImageUrl: settings?.shareImageUrl || '/drawing1.png'
  });
  const [savingBrandAssets, setSavingBrandAssets] = useState(false);
  const [brandAssetsSaved, setBrandAssetsSaved] = useState(false);

  useEffect(() => {
    setBrandAssets({
      moaLogoUrl: settings?.moaLogoUrl || '/drawing1.png',
      loaderLogoUrl: settings?.loaderLogoUrl || '/drawing1.png',
      rddLogoUrl: settings?.rddLogoUrl || '/5320.jpg',
      faviconUrl: settings?.faviconUrl || '/drawing1.png',
      shareImageUrl: settings?.shareImageUrl || '/drawing1.png'
    });
  }, [
    settings?.moaLogoUrl,
    settings?.loaderLogoUrl,
    settings?.rddLogoUrl,
    settings?.faviconUrl,
    settings?.shareImageUrl
  ]);

  // Content History snapshots
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<ContentHistorySnapshot[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);

  const loadContentHistory = async () => {
    setHistoryLoading(true);
    setActionError(null);
    try {
      const list = await api.getContentHistory();
      setHistoryItems(list);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to load site content history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Media Picker target
  const [mediaTarget, setMediaTarget] = useState<MediaTarget | null>(null);

  // Custom Page Editor buffer state
  const matchedCustomPage = pages.find(p => p.id === activePageId);
  const [customTitle, setCustomTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [customStatus, setCustomStatus] = useState<PageRecord['status']>('Draft');
  const [customTemplate, setCustomTemplate] = useState<PageRecord['template']>('Standard');
  const [customSeoTitle, setCustomSeoTitle] = useState('');
  const [customSeoDesc, setCustomSeoDesc] = useState('');
  const [customSeoShareImage, setCustomSeoShareImage] = useState('');
  const [customSeoNoindex, setCustomSeoNoindex] = useState(false);
  const [customBlocks, setCustomBlocks] = useState<PageBlock[]>([]);
  const [savingCustomPage, setSavingCustomPage] = useState(false);
  const [customPageSavedMsg, setCustomPageSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (matchedCustomPage) {
      setCustomTitle(matchedCustomPage.title);
      setCustomSlug(matchedCustomPage.slug);
      setCustomStatus(matchedCustomPage.status);
      setCustomTemplate(matchedCustomPage.template);
      setCustomSeoTitle(matchedCustomPage.seo?.title || '');
      setCustomSeoDesc(matchedCustomPage.seo?.description || '');
      setCustomSeoShareImage(matchedCustomPage.seo?.shareImage || '');
      setCustomSeoNoindex(Boolean(matchedCustomPage.seo?.noindex));
      setCustomBlocks(matchedCustomPage.blocks || []);
      setCustomPageSavedMsg(null);
    }
  }, [matchedCustomPage?.id, matchedCustomPage?.updatedAt]);

  const [pendingDeletePage, setPendingDeletePage] = useState<PageRecord | null>(null);

  // Create Page modal
  const [creatingPage, setCreatingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageTemplate, setNewPageTemplate] = useState<PageRecord['template']>('Standard');

  // Navigation state
  const [navItems, setNavItems] = useState<NavigationItem[]>(settings?.navigation || []);
  const [alwaysShowProducts, setAlwaysShowProducts] = useState<boolean>(
    Boolean(settings?.alwaysShowProducts)
  );
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavPath, setNewNavPath] = useState('');
  const [navError, setNavError] = useState<string | null>(null);
  const [navSaved, setNavSaved] = useState(false);
  const [savingNav, setSavingNav] = useState(false);

  // Core Copy & Detail Fallback editor buffer
  const [workHeading, setWorkHeading] = useState(siteContent?.work?.heading || 'Projects');
  const [workSubtext, setWorkSubtext] = useState(siteContent?.work?.subtitle || '');
  const [productsHeading, setProductsHeading] = useState(siteContent?.products?.heading || 'Products');
  const [productsSubtext, setProductsSubtext] = useState(siteContent?.products?.subtext || '');
  const [detailComingSoon, setDetailComingSoon] = useState(
    siteContent?.detailFallback?.moreDetailsComingSoon || 'More details coming soon.'
  );
  const [savingCoreCopy, setSavingCoreCopy] = useState(false);
  const [coreCopySaved, setCoreCopySaved] = useState(false);

  useEffect(() => {
    setWorkHeading(siteContent?.work?.heading || 'Projects');
    setWorkSubtext(siteContent?.work?.subtitle || '');
    setProductsHeading(siteContent?.products?.heading || 'Products');
    setProductsSubtext(siteContent?.products?.subtext || '');
    setDetailComingSoon(
      siteContent?.detailFallback?.moreDetailsComingSoon || 'More details coming soon.'
    );
  }, [siteContent]);

  useEffect(() => {
    if (settings?.navigation) {
      setNavItems(settings.navigation);
    }
    setAlwaysShowProducts(Boolean(settings?.alwaysShowProducts));
  }, [settings?.navigation, settings?.alwaysShowProducts]);

  // Footer state
  const [footerBlurb, setFooterBlurb] = useState(
    siteContent?.footer?.blurb || settings?.footerText || ''
  );
  const [footerColumns, setFooterColumns] = useState<FooterColumn[]>(settings?.footerColumns || []);
  const [savingFooter, setSavingFooter] = useState(false);
  const [footerSaved, setFooterSaved] = useState(false);

  useEffect(() => {
    setFooterBlurb(siteContent?.footer?.blurb || settings?.footerText || '');
    setFooterColumns(settings?.footerColumns || []);
  }, [siteContent?.footer?.blurb, settings?.footerText, settings?.footerColumns]);

  // SEO & Redirects state
  const [seoTitleTemplate, setSeoTitleTemplate] = useState(settings?.seoDefaults?.title || '');
  const [seoDescription, setSeoDescription] = useState(settings?.seoDefaults?.description || '');
  const [seoKeywords, setSeoKeywords] = useState(settings?.seoDefaults?.keywords || '');
  const [sitemapEnabled, setSitemapEnabled] = useState(settings?.seoDefaults?.sitemapEnabled !== false);
  const [robotsEnabled, setRobotsEnabled] = useState(settings?.seoDefaults?.robotsEnabled !== false);
  const [savingSeo, setSavingSeo] = useState(false);
  const [seoSaved, setSeoSaved] = useState(false);

  const [redirects, setRedirects] = useState<RedirectRule[]>(settings?.redirects || []);
  const [newRedirectFrom, setNewRedirectFrom] = useState('');
  const [newRedirectTo, setNewRedirectTo] = useState('');
  const [newRedirectType, setNewRedirectType] = useState<'301' | '302'>('301');
  const [testUrl, setTestUrl] = useState('');
  const [testingRedirect, setTestingRedirect] = useState(false);
  const [testResult, setTestResult] = useState<RedirectTestResult | null>(null);

  useEffect(() => {
    if (settings?.seoDefaults) {
      setSeoTitleTemplate(settings.seoDefaults.title || '');
      setSeoDescription(settings.seoDefaults.description || '');
      setSeoKeywords(settings.seoDefaults.keywords || '');
      setSitemapEnabled(settings.seoDefaults.sitemapEnabled !== false);
      setRobotsEnabled(settings.seoDefaults.robotsEnabled !== false);
    }
    if (settings?.redirects) {
      setRedirects(settings.redirects);
    }
  }, [settings?.seoDefaults, settings?.redirects]);

  const handleSaveBrandAssets = async () => {
    setSavingBrandAssets(true);
    setActionError(null);
    try {
      await onUpdateSettings(brandAssets);
      setBrandAssetsSaved(true);
      setTimeout(() => setBrandAssetsSaved(false), 2500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save brand assets.');
    } finally {
      setSavingBrandAssets(false);
    }
  };

  const handleSaveNavigation = async () => {
    setSavingNav(true);
    setNavError(null);
    try {
      await onUpdateSettings({ navigation: navItems, alwaysShowProducts });
      setNavSaved(true);
      setTimeout(() => setNavSaved(false), 2500);
    } catch (err: unknown) {
      setNavError(err instanceof Error ? err.message : 'Failed to save navigation.');
    } finally {
      setSavingNav(false);
    }
  };

  const handleSaveCoreCopy = async () => {
    setSavingCoreCopy(true);
    setActionError(null);
    try {
      await onUpdateSiteContent({
        ...siteContent,
        work: {
          ...siteContent.work,
          heading: workHeading.trim() || 'Projects',
          subtitle: workSubtext.trim()
        },
        products: {
          ...siteContent.products,
          heading: productsHeading.trim() || 'Products',
          subtext: productsSubtext.trim(),
          searchPlaceholder: siteContent.products?.searchPlaceholder || 'Search products...',
          emptyTitle: siteContent.products?.emptyTitle || 'No products found',
          emptySubtitle:
            siteContent.products?.emptySubtitle ||
            'Try clearing or adjusting your active search filters.'
        },
        detailFallback: {
          moreDetailsComingSoon: detailComingSoon.trim() || 'More details coming soon.'
        }
      });
      setCoreCopySaved(true);
      setTimeout(() => setCoreCopySaved(false), 2500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save page copy.');
    } finally {
      setSavingCoreCopy(false);
    }
  };

  const moveNavItem = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= navItems.length) return;
    const next = [...navItems];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setNavItems(next);
  };

  const handleSaveFooter = async () => {
    setSavingFooter(true);
    setActionError(null);
    try {
      await onUpdateSiteContent({
        ...siteContent,
        footer: { ...siteContent.footer, blurb: footerBlurb }
      });
      await onUpdateSettings({
        footerText: footerBlurb,
        footerColumns
      });
      setFooterSaved(true);
      setTimeout(() => setFooterSaved(false), 2500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save footer.');
    } finally {
      setSavingFooter(false);
    }
  };

  const handleSaveSeoDefaults = async () => {
    setSavingSeo(true);
    setActionError(null);
    try {
      await onUpdateSettings({
        seoDefaults: {
          title: seoTitleTemplate.trim(),
          description: seoDescription.trim(),
          keywords: seoKeywords.trim(),
          sitemapEnabled,
          robotsEnabled
        }
      });
      setSeoSaved(true);
      setTimeout(() => setSeoSaved(false), 2500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save SEO defaults.');
    } finally {
      setSavingSeo(false);
    }
  };

  const handleAddRedirect = async () => {
    if (!newRedirectFrom.trim() || !newRedirectTo.trim()) return;
    setActionError(null);
    const rule: RedirectRule = {
      id: `red-${Date.now()}`,
      from: newRedirectFrom.trim().startsWith('/') ? newRedirectFrom.trim() : `/${newRedirectFrom.trim()}`,
      to: newRedirectTo.trim(),
      type: newRedirectType,
      createdAt: new Date().toISOString()
    };
    const updated = [...redirects, rule];
    try {
      await onUpdateSettings({ redirects: updated });
      setRedirects(updated);
      setNewRedirectFrom('');
      setNewRedirectTo('');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save redirect rule.');
    }
  };

  const handleDeleteRedirect = async (id: string) => {
    setActionError(null);
    const updated = redirects.filter(r => r.id !== id);
    try {
      await onUpdateSettings({ redirects: updated });
      setRedirects(updated);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove redirect rule.');
    }
  };

  const handleTestRedirect = async () => {
    if (!testUrl.trim()) return;
    setTestingRedirect(true);
    setActionError(null);
    try {
      const res = await api.testRedirect(testUrl.trim());
      setTestResult(res);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Redirect test failed.');
    } finally {
      setTestingRedirect(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;
    setActionError(null);
    const cleanSlug = newPageTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const newPage: PageRecord = {
      id: `page-${Date.now()}`,
      title: newPageTitle.trim(),
      slug: cleanSlug || `page-${Date.now()}`,
      template: newPageTemplate,
      status: 'Draft',
      blocks: [
        {
          id: `b-hero-${Date.now()}`,
          type: 'hero',
          config: {
            title: newPageTitle.trim(),
            subtitle: 'New page description',
            imageUrl: ''
          }
        },
        {
          id: `b-text-${Date.now() + 1}`,
          type: 'text',
          config: {
            heading: 'Overview',
            body: 'Add your story and modular content here.'
          }
        }
      ],
      seo: {
        title: `${newPageTitle.trim()} — ${settings?.siteName || 'Masters Of All'}`,
        description: `Explore ${newPageTitle.trim()}.`,
        shareImage: '',
        noindex: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await onSavePage(newPage);
      setCreatingPage(false);
      setNewPageTitle('');
      setActivePageId(newPage.id);
      if (canEditWebsite) selectSubTab('editor');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to create page.');
    }
  };

  const handleSaveCustomPage = async () => {
    if (!matchedCustomPage) return;
    setSavingCustomPage(true);
    setCustomPageSavedMsg(null);
    setActionError(null);
    try {
      const updated: PageRecord = {
        ...matchedCustomPage,
        title: customTitle.trim() || matchedCustomPage.title,
        slug:
          customSlug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/(^-|-$)+/g, '') || matchedCustomPage.slug,
        status: customStatus,
        template: customTemplate,
        blocks: customBlocks,
        seo: {
          ...matchedCustomPage.seo,
          title: customSeoTitle,
          description: customSeoDesc,
          shareImage: customSeoShareImage,
          noindex: customSeoNoindex
        },
        updatedAt: new Date().toISOString()
      };
      await onSavePage(updated);
      setCustomPageSavedMsg('Custom page saved!');
      setTimeout(() => setCustomPageSavedMsg(null), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save custom page.');
    } finally {
      setSavingCustomPage(false);
    }
  };

  const addCustomBlock = (type: PageBlock['type']) => {
    const defaultConfig: Record<string, unknown> =
      type === 'hero'
        ? { title: 'Section Title', subtitle: 'Supporting statement', imageUrl: '' }
        : type === 'text'
        ? { heading: 'Section Heading', body: '' }
        : type === 'quote'
        ? { quote: '', attribution: '' }
        : type === 'image-text'
        ? { heading: '', body: '', imageUrl: '' }
        : type === 'gallery'
        ? { heading: 'Gallery', images: [] }
        : type === 'logo-strip'
        ? { heading: 'Affiliated Entities', logos: [] }
        : type === 'video'
        ? { heading: 'Video', videoUrl: '' }
        : type === 'cta-band'
        ? { heading: 'Collaborate with Us', buttonLabel: 'Connect', buttonUrl: '/contact' }
        : { heading: 'Section Title', body: '' };

    setCustomBlocks([...customBlocks, { id: `blk-${Date.now()}`, type, config: defaultConfig }]);
  };

  const moveCustomBlock = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= customBlocks.length) return;
    const next = [...customBlocks];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setCustomBlocks(next);
  };

  const handleMediaPicked = (asset: MediaAsset) => {
    if (!mediaTarget) return;
    if (mediaTarget.kind === 'brand') {
      setBrandAssets(prev => ({ ...prev, [mediaTarget.key]: asset.url }));
    } else if (mediaTarget.kind === 'pageSeo') {
      setCustomSeoShareImage(asset.url);
    } else if (mediaTarget.kind === 'blockField') {
      const next = [...customBlocks];
      const targetBlock = next[mediaTarget.blockIndex];
      if (targetBlock) {
        if (Array.isArray(targetBlock.config?.[mediaTarget.fieldKey])) {
          const existing = targetBlock.config[mediaTarget.fieldKey] as string[];
          next[mediaTarget.blockIndex] = {
            ...targetBlock,
            config: { ...targetBlock.config, [mediaTarget.fieldKey]: [...existing, asset.url] }
          };
        } else {
          next[mediaTarget.blockIndex] = {
            ...targetBlock,
            config: { ...targetBlock.config, [mediaTarget.fieldKey]: asset.url }
          };
        }
        setCustomBlocks(next);
      }
    }
    setMediaTarget(null);
  };

  const coreOutline = CORE_PAGE_OUTLINES[activePageId] || CORE_PAGE_OUTLINES.home;

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-[#031D1C] rounded-2xl border border-white/10 text-xs">
          {visibleSubTabs.map(tab => {
            const id = tab.id as WebsiteSubTab;
            const Icon = SUBTAB_ICONS[id] || FileText;
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
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onNavigateSite('/')}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#25CDB6] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Public Site</span>
        </button>
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

      {/* 1. PAGES MANAGER */}
      {subTab === 'pages' && canManagePages && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Website Pages</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Manage core system views and configure custom modular pages from templates.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreatingPage(true)}
              className="px-4 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Custom Page</span>
            </button>
          </div>

          {creatingPage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <form
                onSubmit={handleCreatePage}
                className="w-full max-w-md bg-[#031D1C] border border-white/15 rounded-3xl p-6 space-y-4 text-[#EDE9E0] shadow-2xl"
              >
                <h3 className="text-base font-bold text-[#EDE9E0]">Create New Page</h3>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Page Title</label>
                  <input
                    type="text"
                    value={newPageTitle}
                    onChange={e => setNewPageTitle(e.target.value)}
                    required
                    placeholder="e.g. Annual Symposia, Research Charter..."
                    className="w-full bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Template</label>
                  <select
                    value={newPageTemplate}
                    onChange={e => setNewPageTemplate(e.target.value as PageRecord['template'])}
                    className="w-full bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
                  >
                    <option value="Standard">Standard (Hero + Modular Blocks)</option>
                    <option value="Landing">Landing (CTA &amp; Feature Layout)</option>
                    <option value="Article">Article (Editorial Longform)</option>
                    <option value="Gallery">Gallery (Visual Media &amp; Captions)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCreatingPage(false)}
                    className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer"
                  >
                    Create Page
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'home', title: 'Home Page', slug: '/', status: 'Published', desc: 'Hero rings visual, manifesto pillars, explore/create panels', type: 'Core' },
              { id: 'about', title: 'About Page', slug: '/about', status: 'Published', desc: 'Origin, action cards, 6-stage continuum, founder statement', type: 'Core' },
              { id: 'departments', title: 'Departments & RDD', slug: '/departments', status: 'Published', desc: 'Organizational hierarchy tree and full-width department cards', type: 'Core' },
              { id: 'projects', title: 'Projects', slug: '/projects', status: 'Published', desc: 'Searchable projects and publications catalog', type: 'Core' },
              { id: 'products', title: 'Products', slug: '/products', status: settings?.alwaysShowProducts ? 'Always Shown' : 'Auto-Visible', desc: 'Product showcase, specifications, releases, and download links', type: 'Core' },
              { id: 'contact', title: 'Contact Channels', slug: '/contact', status: 'Published', desc: 'Direct communications channel and contact form', type: 'Core' }
            ].map(p => (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-col justify-between gap-4 hover:border-[#25CDB6]/40 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#25CDB6] uppercase font-mono">{p.type} View</span>
                    <span className="text-[10px] font-bold text-[#25CDB6] bg-[#25CDB6]/10 px-2 py-0.5 rounded-full">
                      {p.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#EDE9E0]">{p.title}</h3>
                  <p className="text-xs text-[#EDE9E0]/60 line-clamp-2 leading-relaxed">{p.desc}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  {canEditWebsite && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePageId(p.id);
                        selectSubTab('editor');
                      }}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                      <span>Open Editor</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onNavigateSite(p.slug)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                    title="View page live"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {pages.filter(p => !p.deletedAt).map(page => (
              <div
                key={page.id}
                className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-col justify-between gap-4 hover:border-[#25CDB6]/40 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#D0A873] uppercase font-mono">{page.template}</span>
                    <span className="text-[10px] font-bold text-[#25CDB6] bg-[#25CDB6]/10 px-2 py-0.5 rounded-full">
                      {page.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#EDE9E0]">{page.title}</h3>
                  <span className="text-[11px] font-mono text-[#EDE9E0]/50 block">/pages/{page.slug}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePageId(page.id);
                      selectSubTab('editor');
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                    <span>Edit Blocks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateSite(`/pages/${page.slug}`)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                    title="View custom page live"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingDeletePage(page)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                    title="Move custom page to Trash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. PAGE EDITOR */}
      {subTab === 'editor' && (canEditWebsite || canManagePages) && (
        <div className="space-y-6">
          <div className="p-4 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={activePageId}
                onChange={e => setActivePageId(e.target.value)}
                className="bg-[#06302F] border border-white/15 rounded-xl px-3 py-1.5 text-xs font-bold text-[#25CDB6] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
              >
                {canEditWebsite && (
                  <optgroup label="Core Public Views">
                    <option value="home">Core: Home (/)</option>
                    <option value="about">Core: About (/about)</option>
                    <option value="departments">Core: Departments (/departments)</option>
                    <option value="projects">Core: Projects (/projects)</option>
                    <option value="products">Core: Products (/products)</option>
                    <option value="contact">Core: Contact (/contact)</option>
                    <option value="notFound">System: 404 Not Found</option>
                    <option value="maintenance">System: Maintenance Page</option>
                  </optgroup>
                )}
                {pages.filter(p => !p.deletedAt).length > 0 && (
                  <optgroup label="Custom Pages">
                    {pages
                      .filter(p => !p.deletedAt)
                      .map(pg => (
                        <option key={pg.id} value={pg.id}>
                          Custom: {pg.title} (/pages/{pg.slug})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              {canEditWebsite && !matchedCustomPage && (
                <button
                  type="button"
                  onClick={() => {
                    const nextOpen = !historyOpen;
                    setHistoryOpen(nextOpen);
                    if (nextOpen) void loadContentHistory();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-[#25CDB6]" />
                  <span>Version History</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {matchedCustomPage ? (
                <>
                  {customPageSavedMsg && (
                    <span className="text-xs font-bold text-[#25CDB6] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {customPageSavedMsg}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateSite(`/pages/${customSlug || matchedCustomPage.slug}`)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#25CDB6]" />
                    <span>View Live</span>
                  </button>
                  <button
                    type="button"
                    disabled={savingCustomPage}
                    onClick={handleSaveCustomPage}
                    className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingCustomPage ? 'Saving...' : 'Save Custom Page'}</span>
                  </button>
                </>
              ) : (
                canEditWebsite && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (onEnterEditMode) {
                        await onEnterEditMode();
                      }
                      const route =
                        activePageId === 'home'
                          ? '/'
                          : activePageId === 'notFound' || activePageId === 'maintenance'
                          ? '/'
                          : `/${activePageId}`;
                      onNavigateSite(route);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open in Live Page Editor</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Site Content Version History Drawer/Panel */}
          {historyOpen && !matchedCustomPage && (
            <div className="p-5 rounded-3xl bg-[#031D1C] border border-[#25CDB6]/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#25CDB6]" />
                  <h3 className="text-sm font-bold text-[#EDE9E0]">Published Copy Version History</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="text-xs text-[#EDE9E0]/50 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              {historyLoading ? (
                <div className="py-6 text-center text-xs text-[#EDE9E0]/60 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#25CDB6]" />
                  <span>Loading snapshot history...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <p className="text-xs text-[#EDE9E0]/50">No prior site content snapshots recorded yet.</p>
              ) : (
                <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  {historyItems.map(snap => (
                    <div key={snap.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-[#EDE9E0] block truncate">
                          {snap.changeNote || 'Site Content Snapshot'}
                        </span>
                        <span className="text-[11px] font-mono text-[#EDE9E0]/50">
                          {snap.authorEmail} · {new Date(snap.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={restoringSnapshotId === snap.id}
                        onClick={async () => {
                          setRestoringSnapshotId(snap.id);
                          setActionError(null);
                          try {
                            const restored = await api.restoreContentHistory(snap.id);
                            await onUpdateSiteContent(restored);
                            await loadContentHistory();
                          } catch (err: unknown) {
                            setActionError(err instanceof Error ? err.message : 'Restore failed.');
                          } finally {
                            setRestoringSnapshotId(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#25CDB6] flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{restoringSnapshotId === snap.id ? 'Restoring...' : 'Restore'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {matchedCustomPage ? (
            /* Custom Page Modular Block Editor */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#25CDB6] font-mono">
                  Page Settings &amp; SEO
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Page Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">URL Slug</label>
                  <div className="flex items-center bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs">
                    <span className="text-[#EDE9E0]/40 font-mono">/pages/</span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={e => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                      className="flex-1 bg-transparent text-xs font-mono text-[#25CDB6] focus:outline-none pl-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Status</label>
                    <select
                      value={customStatus}
                      onChange={e => setCustomStatus(e.target.value as PageRecord['status'])}
                      className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Hidden">Hidden</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Template</label>
                    <select
                      value={customTemplate}
                      onChange={e => setCustomTemplate(e.target.value as PageRecord['template'])}
                      className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Landing">Landing</option>
                      <option value="Article">Article</option>
                      <option value="Gallery">Gallery</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">SEO Title</label>
                  <input
                    type="text"
                    value={customSeoTitle}
                    onChange={e => setCustomSeoTitle(e.target.value)}
                    className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">SEO Description</label>
                  <textarea
                    rows={3}
                    value={customSeoDesc}
                    onChange={e => setCustomSeoDesc(e.target.value)}
                    className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">SEO Share Image</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSeoShareImage}
                      onChange={e => setCustomSeoShareImage(e.target.value)}
                      placeholder="/uploads/..."
                      className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaTarget({ kind: 'pageSeo' })}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#25CDB6] cursor-pointer"
                    >
                      Library
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#EDE9E0]/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customSeoNoindex}
                    onChange={e => setCustomSeoNoindex(e.target.checked)}
                    className="accent-[#25CDB6]"
                  />
                  <span>Hide from search engines (noindex)</span>
                </label>
              </div>

              <div className="lg:col-span-2 p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-[#EDE9E0]">Modular Page Blocks ({customBlocks.length})</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(['hero', 'text', 'image-text', 'quote', 'gallery', 'logo-strip', 'video', 'cta-band'] as PageBlock['type'][]).map(
                      bType => (
                        <button
                          key={bType}
                          type="button"
                          onClick={() => addCustomBlock(bType)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#25CDB6] flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="capitalize">{bType}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {customBlocks.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#EDE9E0]/50 border border-dashed border-white/10 rounded-2xl">
                      No blocks yet. Add a Hero, Text, Image-Text, Quote, Gallery, Video, or CTA Band block above.
                    </div>
                  ) : (
                    customBlocks.map((block, idx) => (
                      <div key={block.id} className="p-4 rounded-2xl bg-[#06302F]/80 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold uppercase text-[#25CDB6]">
                            {idx + 1}. {block.type}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveCustomBlock(idx, 'up')}
                              className="p-1 text-white/50 hover:text-white disabled:opacity-30 cursor-pointer"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === customBlocks.length - 1}
                              onClick={() => moveCustomBlock(idx, 'down')}
                              className="p-1 text-white/50 hover:text-white disabled:opacity-30 cursor-pointer"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomBlocks(customBlocks.filter(b => b.id !== block.id))}
                              className="p-1 text-white/40 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {Object.entries(block.config || {}).map(([fieldKey, fieldVal]) => {
                          const isMediaField =
                            fieldKey === 'imageUrl' ||
                            fieldKey === 'backgroundImage' ||
                            fieldKey === 'images' ||
                            fieldKey === 'logos';

                          if (Array.isArray(fieldVal)) {
                            const arr = fieldVal.filter((v): v is string => typeof v === 'string');
                            return (
                              <div key={fieldKey} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-semibold text-[#EDE9E0]/60 capitalize">
                                    {fieldKey} ({arr.length})
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMediaTarget({ kind: 'blockField', blockIndex: idx, fieldKey })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-[#25CDB6] cursor-pointer"
                                  >
                                    + Add from Library
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {arr.map((imgUrl, itemIdx) => (
                                    <div key={itemIdx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-white/15">
                                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = [...customBlocks];
                                          next[idx] = {
                                            ...block,
                                            config: {
                                              ...block.config,
                                              [fieldKey]: arr.filter((_, i) => i !== itemIdx)
                                            }
                                          };
                                          setCustomBlocks(next);
                                        }}
                                        className="absolute top-0.5 right-0.5 bg-black/75 text-white rounded-full px-1 text-[10px] cursor-pointer"
                                      >
                                        x
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={fieldKey} className="space-y-1">
                              <label className="text-[11px] font-semibold text-[#EDE9E0]/60 capitalize block">
                                {fieldKey}
                              </label>
                              {fieldKey === 'body' || fieldKey === 'quote' || fieldKey === 'subtitle' ? (
                                <textarea
                                  rows={fieldKey === 'body' ? 3 : 2}
                                  value={typeof fieldVal === 'string' ? fieldVal : ''}
                                  onChange={e => {
                                    const next = [...customBlocks];
                                    next[idx] = {
                                      ...block,
                                      config: { ...block.config, [fieldKey]: e.target.value }
                                    };
                                    setCustomBlocks(next);
                                  }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                                />
                              ) : isMediaField ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={typeof fieldVal === 'string' ? fieldVal : ''}
                                    onChange={e => {
                                      const next = [...customBlocks];
                                      next[idx] = {
                                        ...block,
                                        config: { ...block.config, [fieldKey]: e.target.value }
                                      };
                                      setCustomBlocks(next);
                                    }}
                                    placeholder="/uploads/..."
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMediaTarget({ kind: 'blockField', blockIndex: idx, fieldKey })
                                    }
                                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#25CDB6] cursor-pointer"
                                  >
                                    Library
                                  </button>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={typeof fieldVal === 'string' ? fieldVal : ''}
                                  onChange={e => {
                                    const next = [...customBlocks];
                                    next[idx] = {
                                      ...block,
                                      config: { ...block.config, [fieldKey]: e.target.value }
                                    };
                                    setCustomBlocks(next);
                                  }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Core Page Outline & Brand Assets */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#25CDB6] font-mono">
                  Section Outline ({activePageId.toUpperCase()})
                </h3>
                <div className="space-y-1.5">
                  {coreOutline.map(sec => (
                    <div
                      key={sec.id}
                      onClick={() => setSelectedBlockId(sec.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        selectedBlockId === sec.id
                          ? 'bg-[#17A491]/20 border-[#17A491]/50 text-[#25CDB6]'
                          : 'bg-white/[0.02] border-white/5 text-[#EDE9E0] hover:bg-white/5'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold block truncate">{sec.name}</span>
                        <span className="text-[10px] text-[#EDE9E0]/50 font-mono">{sec.type}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-bold text-[#EDE9E0]">Live Canvas In-Place Editing</h3>
                    <span className="text-[11px] text-[#25CDB6] font-mono">Core routes edit in-place</span>
                  </div>

                  <p className="text-xs text-[#EDE9E0]/70 leading-relaxed">
                    Launch the live canvas editor on{' '}
                    <span className="font-mono text-[#25CDB6]">
                      {activePageId === 'home' || activePageId === 'notFound' || activePageId === 'maintenance'
                        ? '/'
                        : `/${activePageId}`}
                    </span>{' '}
                    to modify copy directly, save drafts, or publish changes live to visitors.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (onEnterEditMode) await onEnterEditMode();
                      onNavigateSite(
                        activePageId === 'home' || activePageId === 'notFound' || activePageId === 'maintenance'
                          ? '/'
                          : `/${activePageId}`
                      );
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#25CDB6] border border-[#25CDB6]/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Edit on Live Canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Directory Headings & Detail Fallback Copy */}
                <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#EDE9E0]">Projects, Products &amp; Detail Copy</h3>
                      <p className="text-xs text-[#EDE9E0]/60">
                        Manage directory headers and fallback note for minimal detail entries.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {coreCopySaved && (
                        <span className="text-xs font-bold text-[#25CDB6] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Saved
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={savingCoreCopy}
                        onClick={handleSaveCoreCopy}
                        className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingCoreCopy ? 'Saving...' : 'Save Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[#EDE9E0]/75 font-semibold block">Projects Page Title</label>
                      <input
                        type="text"
                        value={workHeading}
                        onChange={e => setWorkHeading(e.target.value)}
                        className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#EDE9E0]/75 font-semibold block">Products Page Title</label>
                      <input
                        type="text"
                        value={productsHeading}
                        onChange={e => setProductsHeading(e.target.value)}
                        className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#EDE9E0]/75 font-semibold block">Projects Page Subtext</label>
                      <input
                        type="text"
                        value={workSubtext}
                        onChange={e => setWorkSubtext(e.target.value)}
                        className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#EDE9E0]/75 font-semibold block">Products Page Subtext</label>
                      <input
                        type="text"
                        value={productsSubtext}
                        onChange={e => setProductsSubtext(e.target.value)}
                        className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[#EDE9E0]/75 font-semibold block">
                        Minimal Detail Page Fallback Note
                      </label>
                      <input
                        type="text"
                        value={detailComingSoon}
                        onChange={e => setDetailComingSoon(e.target.value)}
                        placeholder="More details coming soon."
                        className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Logo & Media Assets */}
                <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#EDE9E0]">Site Brand Assets</h3>
                      <p className="text-xs text-[#EDE9E0]/60">
                        Logos, loading mark, RDD emblem, browser favicon, and default social share image.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {brandAssetsSaved && (
                        <span className="text-xs font-bold text-[#25CDB6] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Saved
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={savingBrandAssets}
                        onClick={handleSaveBrandAssets}
                        className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingBrandAssets ? 'Saving...' : 'Save Assets'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {(
                      [
                        { key: 'moaLogoUrl', label: 'Primary MoA Logo' },
                        { key: 'loaderLogoUrl', label: 'Loading Screen Logo' },
                        { key: 'rddLogoUrl', label: 'RDD Emblem Image' },
                        { key: 'faviconUrl', label: 'Browser Favicon' },
                        { key: 'shareImageUrl', label: 'Default OpenGraph Share Image' }
                      ] as const
                    ).map(item => (
                      <div key={item.key} className="space-y-1.5 p-3 rounded-2xl bg-[#06302F]/60 border border-white/10">
                        <label className="text-[#EDE9E0]/75 font-semibold block">{item.label}</label>
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-black/30 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {brandAssets[item.key] ? (
                              <img
                                src={sanitizeSafeUrl(brandAssets[item.key]) || brandAssets[item.key]}
                                alt={item.label}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-white/30" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={brandAssets[item.key]}
                            onChange={e =>
                              setBrandAssets(prev => ({ ...prev, [item.key]: e.target.value }))
                            }
                            className="flex-1 min-w-0 bg-[#031D1C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setMediaTarget({ kind: 'brand', key: item.key })}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-[#25CDB6] shrink-0 cursor-pointer"
                          >
                            Library
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. NAVIGATION MANAGER */}
      {subTab === 'navigation' && canManageNav && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Navigation Manager</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Configure top-level navbar links, order, and internal or external destinations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {navSaved && (
                <span className="text-xs font-bold text-[#25CDB6] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Navigation saved
                </span>
              )}
              <button
                type="button"
                disabled={savingNav}
                onClick={handleSaveNavigation}
                className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingNav ? 'Saving...' : 'Save Navigation'}</span>
              </button>
            </div>
          </div>

          {navError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs max-w-2xl">
              {navError}
            </div>
          )}

          <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#06302F]/60 border border-white/10 max-w-2xl cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={alwaysShowProducts}
              onChange={e => setAlwaysShowProducts(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#25CDB6] cursor-pointer"
            />
            <span>
              <strong className="block text-[#EDE9E0]">Always show Products in Navigation &amp; /products</strong>
              <span className="text-[#EDE9E0]/65">
                By default, Products only appears when at least one published product exists. Enable this toggle to keep it visible at all times.
              </span>
            </span>
          </label>

          <div className="space-y-3 max-w-2xl">
            {navItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-[#06302F]/60 border border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
              >
                <span className="w-6 h-6 rounded-lg bg-white/5 text-[10px] font-mono text-[#EDE9E0]/50 flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={item.label}
                  onChange={e => {
                    const next = [...navItems];
                    next[idx] = { ...item, label: e.target.value };
                    setNavItems(next);
                  }}
                  className="flex-1 min-w-[120px] bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#EDE9E0] focus:outline-none"
                />
                <input
                  type="text"
                  value={item.path}
                  onChange={e => {
                    const path = e.target.value;
                    const next = [...navItems];
                    next[idx] = { ...item, path, isExternal: /^https?:\/\//i.test(path) };
                    setNavItems(next);
                  }}
                  className="flex-1 min-w-[140px] bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#25CDB6] focus:outline-none"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveNavItem(idx, 'up')}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === navItems.length - 1}
                    onClick={() => moveNavItem(idx, 'down')}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNavItems(navItems.filter(n => n.id !== item.id))}
                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                    title="Remove link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 space-y-3">
              <h4 className="text-xs font-bold text-[#EDE9E0]">Add Navigation Item</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Research Charter)"
                  value={newNavLabel}
                  onChange={e => setNewNavLabel(e.target.value)}
                  className="bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Path (e.g. /pages/charter or https://...)"
                  value={newNavPath}
                  onChange={e => setNewNavPath(e.target.value)}
                  className="bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const cleanLabel = newNavLabel.trim();
                  const cleanPath = newNavPath.trim();
                  if (!cleanLabel || !cleanPath) return;
                  if (!cleanPath.startsWith('/') && !/^https?:\/\//i.test(cleanPath)) {
                    setNavError('Path must start with "/" for internal routes or "https://" / "http://" for external URLs.');
                    return;
                  }
                  setNavError(null);
                  const item: NavigationItem = {
                    id: `nav-${Date.now()}`,
                    label: cleanLabel,
                    path: cleanPath,
                    isExternal: /^https?:\/\//i.test(cleanPath)
                  };
                  const updated = [...navItems, item];
                  setNavItems(updated);
                  setNewNavLabel('');
                  setNewNavPath('');
                  try {
                    await onUpdateSettings({ navigation: updated });
                    setNavSaved(true);
                    setTimeout(() => setNavSaved(false), 2500);
                  } catch (err: unknown) {
                    setNavError(err instanceof Error ? err.message : 'Failed to save navigation.');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FOOTER MANAGER */}
      {subTab === 'footer' && canManageNav && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Footer Manager</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Manage footer description copy and custom footer column links.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {footerSaved && (
                <span className="text-xs font-bold text-[#25CDB6] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Footer saved
                </span>
              )}
              <button
                type="button"
                disabled={savingFooter}
                onClick={handleSaveFooter}
                className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingFooter ? 'Saving...' : 'Save Footer'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-5 max-w-2xl">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#EDE9E0] block">Footer Blurb</label>
              <textarea
                rows={3}
                value={footerBlurb}
                onChange={e => setFooterBlurb(e.target.value)}
                className="w-full bg-[#06302F] border border-white/10 rounded-xl p-3 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#25CDB6]">
                  Custom Footer Link Column (Explore Links)
                </h3>
                {footerColumns.length === 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFooterColumns([
                        {
                          id: `col-${Date.now()}`,
                          title: 'Explore',
                          links: [
                            { label: 'Home', url: '/' },
                            { label: 'About', url: '/about' },
                            { label: 'Departments', url: '/departments' },
                            { label: 'Projects', url: '/projects' },
                            { label: 'Contact', url: '/contact' }
                          ]
                        }
                      ])
                    }
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-[#25CDB6] cursor-pointer"
                  >
                    Customize Explore Column
                  </button>
                )}
              </div>

              {footerColumns.map((col, colIdx) => (
                <div key={col.id} className="p-4 rounded-2xl bg-[#06302F]/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={col.title}
                      onChange={e => {
                        const next = [...footerColumns];
                        next[colIdx] = { ...col, title: e.target.value };
                        setFooterColumns(next);
                      }}
                      className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-[#EDE9E0]"
                      placeholder="Column Heading"
                    />
                    <button
                      type="button"
                      onClick={() => setFooterColumns(footerColumns.filter((_, i) => i !== colIdx))}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  </div>

                  <div className="space-y-2">
                    {col.links.map((lnk, lIdx) => (
                      <div key={lIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={lnk.label}
                          onChange={e => {
                            const next = [...footerColumns];
                            const links = [...col.links];
                            links[lIdx] = { ...lnk, label: e.target.value };
                            next[colIdx] = { ...col, links };
                            setFooterColumns(next);
                          }}
                          placeholder="Label"
                          className="flex-1 bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#EDE9E0]"
                        />
                        <input
                          type="text"
                          value={lnk.url}
                          onChange={e => {
                            const next = [...footerColumns];
                            const links = [...col.links];
                            links[lIdx] = { ...lnk, url: e.target.value, isExternal: /^https?:\/\//i.test(e.target.value) };
                            next[colIdx] = { ...col, links };
                            setFooterColumns(next);
                          }}
                          placeholder="/path"
                          className="flex-1 bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#25CDB6]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...footerColumns];
                            next[colIdx] = { ...col, links: col.links.filter((_, i) => i !== lIdx) };
                            setFooterColumns(next);
                          }}
                          className="p-1 text-white/40 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...footerColumns];
                        next[colIdx] = {
                          ...col,
                          links: [...col.links, { label: 'New Link', url: '/' }]
                        };
                        setFooterColumns(next);
                      }}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#25CDB6] cursor-pointer"
                    >
                      + Add Column Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SEO & REDIRECTS */}
      {subTab === 'seo' && canManageSeo && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">SEO &amp; Redirects</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Manage search engine indexing, OpenGraph defaults, and 301/302 URL redirects.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {seoSaved && (
                <span className="text-xs font-bold text-[#25CDB6] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  SEO defaults saved
                </span>
              )}
              <button
                type="button"
                disabled={savingSeo}
                onClick={handleSaveSeoDefaults}
                className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingSeo ? 'Saving...' : 'Save SEO Defaults'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#EDE9E0] block">Default Title Template</label>
                <input
                  type="text"
                  value={seoTitleTemplate}
                  onChange={e => setSeoTitleTemplate(e.target.value)}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#EDE9E0] block">Global Meta Description</label>
                <textarea
                  rows={4}
                  value={seoDescription}
                  onChange={e => setSeoDescription(e.target.value)}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl p-3 text-xs text-[#EDE9E0] focus:border-[#25CDB6]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#EDE9E0] block">Keywords</label>
                <input
                  type="text"
                  value={seoKeywords}
                  onChange={e => setSeoKeywords(e.target.value)}
                  placeholder="research, discovery, development, MoA..."
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#EDE9E0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sitemapEnabled}
                    onChange={e => setSitemapEnabled(e.target.checked)}
                    className="rounded accent-[#17A491]"
                  />
                  <span>Enable /sitemap.xml</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#EDE9E0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={robotsEnabled}
                    onChange={e => setRobotsEnabled(e.target.checked)}
                    className="rounded accent-[#17A491]"
                  />
                  <span>Enable /robots.txt indexing</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#EDE9E0]">301 &amp; 302 Redirect Manager</h3>

              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2">
                  <input
                    type="text"
                    placeholder="/old-path"
                    value={newRedirectFrom}
                    onChange={e => setNewRedirectFrom(e.target.value)}
                    className="col-span-2 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
                  />
                  <input
                    type="text"
                    placeholder="/new-destination"
                    value={newRedirectTo}
                    onChange={e => setNewRedirectTo(e.target.value)}
                    className="col-span-2 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
                  />
                  <select
                    value={newRedirectType}
                    onChange={e => setNewRedirectType(e.target.value as '301' | '302')}
                    className="bg-[#06302F] border border-white/10 rounded-xl px-2 py-2 text-xs text-[#EDE9E0] cursor-pointer"
                  >
                    <option value="301">301</option>
                    <option value="302">302</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddRedirect}
                  className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer"
                >
                  Add Redirect Rule
                </button>
              </div>

              {redirects.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {redirects.map(rule => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-[#06302F]/70 border border-white/10 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <span className="font-mono text-[#EDE9E0]">{rule.from}</span>
                        <span className="mx-1.5 text-white/40">&rarr;</span>
                        <span className="font-mono text-[#25CDB6]">{rule.to}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/70">
                          {rule.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRedirect(rule.id)}
                          className="p-1 text-white/40 hover:text-red-400 cursor-pointer"
                          title="Delete redirect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <label className="text-[11px] font-bold text-[#EDE9E0]/70 block">Test Redirect Rule</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter URL path to test..."
                    value={testUrl}
                    onChange={e => setTestUrl(e.target.value)}
                    className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#EDE9E0]"
                  />
                  <button
                    type="button"
                    disabled={testingRedirect}
                    onClick={handleTestRedirect}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#EDE9E0] cursor-pointer disabled:opacity-50"
                  >
                    {testingRedirect ? 'Testing...' : 'Test'}
                  </button>
                </div>
                {testResult && (
                  <div className="text-[11px] space-y-1 pt-1">
                    {testResult.loopDetected ? (
                      <p className="text-red-300 font-semibold">
                        Redirect loop detected along chain: {testResult.chain.join(' → ')}
                      </p>
                    ) : testResult.matched ? (
                      <div className="text-[#25CDB6] space-y-0.5">
                        <p className="font-semibold">
                          Matched {testResult.redirect?.type || '301'} → {testResult.finalPath}
                        </p>
                        {testResult.chain.length > 1 && (
                          <p className="font-mono text-[#EDE9E0]/60">Chain: {testResult.chain.join(' → ')}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[#EDE9E0]/65">No redirect rule matched; served as {testResult.finalPath}.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <MediaPicker
        isOpen={Boolean(mediaTarget)}
        onClose={() => setMediaTarget(null)}
        onSelect={handleMediaPicked}
        allowedTypes={['image']}
        title="Choose Site Image Asset"
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeletePage)}
        title="Move Custom Page to Trash"
        message={
          pendingDeletePage
            ? `Move custom page "${pendingDeletePage.title}" (/pages/${pendingDeletePage.slug}) to Trash? You can restore it within 30 days.`
            : ''
        }
        confirmLabel="Move to Trash"
        onConfirm={async () => {
          if (pendingDeletePage) {
            const target = pendingDeletePage;
            setPendingDeletePage(null);
            await onDeletePage(target.id);
          }
        }}
        onCancel={() => setPendingDeletePage(null)}
      />
    </div>
  );
};
