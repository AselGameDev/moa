import React, { useState, useEffect } from 'react';
import {
  FileText,
  Edit,
  Menu,
  Palette,
  LayoutTemplate,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Eye,
  Check,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Layers,
  ArrowRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import { PageRecord, PageBlock, SiteSettings, SiteContent, NavigationItem, FooterColumn, RedirectRule } from '../../../types';

export type WebsiteSubTab = 'pages' | 'editor' | 'navigation' | 'theme' | 'footer' | 'seo';

interface WebsiteTabProps {
  initialSubTab?: WebsiteSubTab;
  pages: PageRecord[];
  onSavePage: (page: PageRecord) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  settings: SiteSettings;
  onUpdateSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  siteContent: SiteContent;
  onUpdateSiteContent: (content: SiteContent) => Promise<void>;
  onNavigateSite: (path?: string) => void;
}

export const WebsiteTab: React.FC<WebsiteTabProps> = ({
  initialSubTab = 'pages',
  pages,
  onSavePage,
  onDeletePage,
  settings,
  onUpdateSettings,
  siteContent,
  onUpdateSiteContent,
  onNavigateSite
}) => {
  const [subTab, setSubTab] = useState<WebsiteSubTab>(initialSubTab);

  // Editor sub-state
  const [activePageId, setActivePageId] = useState<string>('home');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Theme panel state
  const [themePreset, setThemePreset] = useState<string>(settings?.theme?.preset || 'brand-deep');
  const [primaryColor, setPrimaryColor] = useState<string>(settings?.theme?.primaryColor || '#17A491');
  const [secondaryColor, setSecondaryColor] = useState<string>(settings?.theme?.secondaryColor || '#25CDB6');
  const [copperColor, setCopperColor] = useState<string>(settings?.theme?.copperColor || '#CA7952');
  const [themeRadius, setThemeRadius] = useState<'sm' | 'md' | 'lg' | 'xl'>(settings?.theme?.radius || 'xl');
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSavedBanner, setThemeSavedBanner] = useState(false);

  useEffect(() => {
    if (settings?.theme) {
      if (settings.theme.primaryColor) setPrimaryColor(settings.theme.primaryColor);
      if (settings.theme.secondaryColor) setSecondaryColor(settings.theme.secondaryColor);
      if (settings.theme.copperColor) setCopperColor(settings.theme.copperColor);
      if (settings.theme.radius) setThemeRadius(settings.theme.radius as any);
      if (settings.theme.preset) setThemePreset(settings.theme.preset);
    }
  }, [settings?.theme]);

  // Live CSS variable application helper
  const applyLiveColor = (variable: string, val: string) => {
    document.documentElement.style.setProperty(variable, val);
  };

  // Pages manager state
  const [creatingPage, setCreatingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageTemplate, setNewPageTemplate] = useState<'Standard' | 'Landing' | 'Article' | 'Team' | 'FAQ' | 'Gallery'>('Standard');

  // Navigation state
  const [navItems, setNavItems] = useState<NavigationItem[]>(
    settings?.navigation?.length > 0
      ? settings.navigation
      : [
          { id: 'nav-home', label: 'Home', path: '/' },
          { id: 'nav-about', label: 'About', path: '/about' },
          { id: 'nav-dept', label: 'Departments', path: '/departments' },
          { id: 'nav-proj', label: 'Projects', path: '/projects' },
          { id: 'nav-contact', label: 'Contact', path: '/contact' }
        ]
  );
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavPath, setNewNavPath] = useState('');

  // SEO & Redirects state
  const [seoTitleTemplate, setSeoTitleTemplate] = useState(settings?.seoDefaults?.title || 'Masters Of All — Believe. Build. Become.');
  const [seoDescription, setSeoDescription] = useState(settings?.seoDefaults?.description || 'Masters Of All is a multidisciplinary innovation organization dedicated to understanding the world and solving real-world challenges.');
  const [sitemapEnabled, setSitemapEnabled] = useState(settings?.seoDefaults?.sitemapEnabled !== false);
  const [robotsEnabled, setRobotsEnabled] = useState(settings?.seoDefaults?.robotsEnabled !== false);
  const [redirects, setRedirects] = useState<RedirectRule[]>(settings?.redirects || []);
  const [newRedirectFrom, setNewRedirectFrom] = useState('');
  const [newRedirectTo, setNewRedirectTo] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  // Find and replace state
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findReplaceMsg, setFindReplaceMsg] = useState<string | null>(null);

  // Save theme settings
  const handleSaveTheme = async () => {
    setThemeSaving(true);
    try {
      await onUpdateSettings({
        theme: {
          preset: themePreset as any,
          primaryColor,
          secondaryColor,
          copperColor,
          radius: themeRadius,
          buttonStyle: 'rounded',
          density: 'comfortable'
        }
      });
      document.documentElement.style.setProperty('--color-brand-primary', primaryColor);
      document.documentElement.style.setProperty('--color-brand-secondary', secondaryColor);
      document.documentElement.style.setProperty('--color-brand-copper', copperColor);
      setThemeSavedBanner(true);
      setTimeout(() => setThemeSavedBanner(false), 3000);
    } finally {
      setThemeSaving(false);
    }
  };

  // Add redirect rule
  const handleAddRedirect = async () => {
    if (!newRedirectFrom || !newRedirectTo) return;
    const rule: RedirectRule = {
      id: `red-${Date.now()}`,
      from: newRedirectFrom.trim(),
      to: newRedirectTo.trim(),
      type: '301',
      createdAt: new Date().toISOString()
    };
    const updated = [...redirects, rule];
    setRedirects(updated);
    setNewRedirectFrom('');
    setNewRedirectTo('');
    await onUpdateSettings({ redirects: updated });
  };

  // Test redirect url
  const handleTestRedirect = () => {
    if (!testUrl) return;
    const match = redirects.find(r => r.from.toLowerCase() === testUrl.trim().toLowerCase());
    if (match) {
      setTestResult(`Redirect Match: ${match.from} → ${match.to} (${match.type} Permanent)`);
    } else {
      setTestResult(`No redirect matched for ${testUrl}. URL served normally.`);
    }
  };

  // Find & replace across site content
  const handleFindReplace = async () => {
    if (!findQuery) return;
    let jsonStr = JSON.stringify(siteContent);
    const count = (jsonStr.match(new RegExp(findQuery, 'gi')) || []).length;
    if (count === 0) {
      setFindReplaceMsg(`Found 0 occurrences of "${findQuery}".`);
      return;
    }
    jsonStr = jsonStr.replace(new RegExp(findQuery, 'g'), replaceQuery);
    const updatedContent = JSON.parse(jsonStr);
    await onUpdateSiteContent(updatedContent);
    setFindReplaceMsg(`Replaced ${count} occurrence(s) across site content.`);
  };

  // Create new page
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle) return;
    const newPage: PageRecord = {
      id: `page-${Date.now()}`,
      title: newPageTitle,
      slug: newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      template: newPageTemplate,
      status: 'Draft',
      blocks: [
        {
          id: `b-hero-${Date.now()}`,
          type: 'hero',
          config: {
            title: newPageTitle,
            subtitle: 'New page description'
          }
        },
        {
          id: `b-text-${Date.now()}`,
          type: 'text',
          config: {
            body: 'Add your story and modular content here.'
          }
        }
      ],
      seo: {
        title: `${newPageTitle} — Masters Of All`,
        description: `Explore ${newPageTitle} at Masters Of All.`
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await onSavePage(newPage);
    setCreatingPage(false);
    setNewPageTitle('');
    setActivePageId(newPage.id);
    setSubTab('editor');
  };

  return (
    <div className="space-y-6 select-none">
      {/* Sub-Tabs Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-[#031D1C] rounded-2xl border border-white/10 text-xs">
          {[
            { id: 'pages', label: 'Pages', icon: FileText },
            { id: 'editor', label: 'Page Editor', icon: Edit },
            { id: 'navigation', label: 'Navigation', icon: Menu },
            { id: 'theme', label: 'Theme & Branding', icon: Palette },
            { id: 'footer', label: 'Footer', icon: LayoutTemplate },
            { id: 'seo', label: 'SEO & Redirects', icon: Search }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as WebsiteSubTab)}
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

      {/* ===================================================================
          1. SUB-TAB: PAGES MANAGER
          =================================================================== */}
      {subTab === 'pages' && (
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

          {/* New Page Modal */}
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
                    placeholder="e.g. Annual Symposia, Research Fellows..."
                    className="w-full bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Template</label>
                  <select
                    value={newPageTemplate}
                    onChange={e => setNewPageTemplate(e.target.value as any)}
                    className="w-full bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  >
                    <option value="Standard">Standard (Hero + Modular Story Blocks)</option>
                    <option value="Landing">Landing (Conversion CTA & Features)</option>
                    <option value="Article">Article (Editorial Longform)</option>
                    <option value="Team">Team (Faculty & Leadership Grid)</option>
                    <option value="FAQ">FAQ (Accordion Q&A)</option>
                    <option value="Gallery">Gallery (Visual Media & Captions)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setCreatingPage(false)}
                    className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs"
                  >
                    Create Page
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Core System Pages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Home Page', slug: '/', status: 'Published', desc: 'Hero orbit visual, Belief manifesto, Explore/Create panels', type: 'Core' },
              { title: 'About Page', slug: '/about', status: 'Published', desc: 'Origin, 4 Action Pillars, 6-Stage Continuum, Tripartite Credo', type: 'Core' },
              { title: 'Departments & RDD', slug: '/departments', status: 'Published', desc: 'RDD oversight overview, animated hierarchy tree', type: 'Core' },
              { title: 'Projects Registry', slug: '/projects', status: 'Published', desc: 'Searchable public innovation and research catalog', type: 'Core' },
              { title: 'Contact Channels', slug: '/contact', status: 'Published', desc: 'Direct communications channel and contact inquiries', type: 'Core' }
            ].map((p, idx) => (
              <div
                key={idx}
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
                  <button
                    type="button"
                    onClick={() => {
                      setActivePageId(p.slug === '/' ? 'home' : p.slug.replace('/', ''));
                      setSubTab('editor');
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                    <span>Open Editor</span>
                  </button>

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

            {/* Custom Created Pages */}
            {pages.map(page => (
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
                  <span className="text-[11px] font-mono text-[#EDE9E0]/50 block">/{page.slug}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePageId(page.id);
                      setSubTab('editor');
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#25CDB6]" />
                    <span>Edit Blocks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeletePage(page.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete custom page"
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
          2. SUB-TAB: ONE PAGE EDITOR (Blocks & Live In-Place Editor)
          =================================================================== */}
      {subTab === 'editor' && (
        <div className="space-y-6">
          {/* Top Bar for Page Editor */}
          <div className="p-4 rounded-3xl bg-[#031D1C] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase font-extrabold text-[#25CDB6] font-mono tracking-wider">
                Editing: {activePageId.toUpperCase()}
              </span>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg ${previewDevice === 'desktop' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'}`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg ${previewDevice === 'tablet' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'}`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg ${previewDevice === 'mobile' ? 'bg-[#17A491] text-[#06302F]' : 'text-white/40'}`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateSite(activePageId === 'home' ? '/' : `/${activePageId}`)}
                className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open in Live Page Editor</span>
              </button>
            </div>
          </div>

          {/* Modular Block Library & Outline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Outline Panel */}
            <div className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#25CDB6] font-mono">
                Section Outline
              </h3>
              <div className="space-y-1.5">
                {[
                  { id: 'sec-hero', name: 'Hero Headline & Atmospheric Visual', type: 'Hero' },
                  { id: 'sec-manifesto', name: 'Believe · Build · Become Manifesto', type: 'Text+Icons' },
                  { id: 'sec-explore', name: 'Explore / Create / Transform Panels', type: 'Interactive' },
                  { id: 'sec-depts', name: 'Departmental Orbit & Nodes', type: 'Orbit' },
                  { id: 'sec-channels', name: 'Official Connect Channels', type: 'Links' }
                ].map(sec => (
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

            {/* Block Inspector & Settings */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-[#EDE9E0]">
                  Block Settings & Live Text Controls
                </h3>
                <span className="text-[11px] text-[#25CDB6] font-mono">
                  Changes save to live draft automatically
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#06302F]/80 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-[#EDE9E0]">Direct Canvas Editing Available</h4>
                  <p className="text-xs text-[#EDE9E0]/70 leading-relaxed">
                    You can click any headline, paragraph, card title, or slogan directly on the public website when in Page Editor mode to update typography and copy with zero latency.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigateSite('/')}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#25CDB6] border border-[#25CDB6]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Click Here to Edit on Canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Section Background</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Default (Canvas)', 'Surface Deep', 'Accent Mesh'].map((bg, i) => (
                      <button
                        key={i}
                        type="button"
                        className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-[#EDE9E0] hover:border-[#25CDB6] transition-colors"
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          3. SUB-TAB: NAVIGATION MANAGER
          =================================================================== */}
      {subTab === 'navigation' && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#EDE9E0]">Navigation Manager</h2>
            <p className="text-xs text-[#EDE9E0]/60">
              Configure top-level navbar links, order, and external redirect destinations.
            </p>
          </div>

          <div className="space-y-3 max-w-xl">
            {navItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-[#06302F]/60 border border-white/10 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-lg bg-white/5 text-[10px] font-mono text-[#EDE9E0]/50 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#EDE9E0] block">{item.label}</span>
                    <span className="text-[11px] font-mono text-[#25CDB6]">{item.path}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const filtered = navItems.filter(n => n.id !== item.id);
                    setNavItems(filtered);
                    onUpdateSettings({ navigation: filtered });
                  }}
                  className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Add New Link */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 space-y-3">
              <h4 className="text-xs font-bold text-[#EDE9E0]">Add Navigation Item</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Symposia)"
                  value={newNavLabel}
                  onChange={e => setNewNavLabel(e.target.value)}
                  className="bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Path (e.g. /symposia or https://...)"
                  value={newNavPath}
                  onChange={e => setNewNavPath(e.target.value)}
                  className="bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newNavLabel || !newNavPath) return;
                  const item: NavigationItem = {
                    id: `nav-${Date.now()}`,
                    label: newNavLabel,
                    path: newNavPath,
                    isExternal: newNavPath.startsWith('http')
                  };
                  const updated = [...navItems, item];
                  setNavItems(updated);
                  setNewNavLabel('');
                  setNewNavPath('');
                  onUpdateSettings({ navigation: updated });
                }}
                className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          4. SUB-TAB: THEME & BRANDING
          =================================================================== */}
      {subTab === 'theme' && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Theme & Branding</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                Control the brand palette, container radii, and typography scales across the platform.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {themeSavedBanner && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  Theme palette applied & saved!
                </span>
              )}
              <button
                type="button"
                disabled={themeSaving}
                onClick={handleSaveTheme}
                className="px-5 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold shadow-md cursor-pointer transition"
              >
                {themeSaving ? 'Saving...' : 'Save Theme'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Color Swatches */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#EDE9E0] block">Brand Primary</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => {
                    setPrimaryColor(e.target.value);
                    applyLiveColor('--color-brand-primary', e.target.value);
                  }}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => {
                    setPrimaryColor(e.target.value);
                    applyLiveColor('--color-brand-primary', e.target.value);
                  }}
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#EDE9E0]"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#EDE9E0] block">Brand Secondary (Teal Glow)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={e => {
                    setSecondaryColor(e.target.value);
                    applyLiveColor('--color-brand-secondary', e.target.value);
                  }}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={e => {
                    setSecondaryColor(e.target.value);
                    applyLiveColor('--color-brand-secondary', e.target.value);
                  }}
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#EDE9E0]"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#EDE9E0] block">Copper Accent</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={copperColor}
                  onChange={e => {
                    setCopperColor(e.target.value);
                    applyLiveColor('--color-brand-copper', e.target.value);
                  }}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={copperColor}
                  onChange={e => {
                    setCopperColor(e.target.value);
                    applyLiveColor('--color-brand-copper', e.target.value);
                  }}
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#EDE9E0]"
                />
              </div>
            </div>
          </div>

          {/* Find and Replace across site text */}
          <div className="pt-6 border-t border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-[#EDE9E0]">Find and Replace Across All Site Text</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <input
                type="text"
                placeholder="Find text..."
                value={findQuery}
                onChange={e => setFindQuery(e.target.value)}
                className="bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6]"
              />
              <input
                type="text"
                placeholder="Replace with..."
                value={replaceQuery}
                onChange={e => setReplaceQuery(e.target.value)}
                className="bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6]"
              />
            </div>
            <button
              type="button"
              onClick={handleFindReplace}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#25CDB6] border border-[#25CDB6]/30 cursor-pointer"
            >
              Run Global Replace
            </button>
            {findReplaceMsg && <p className="text-xs text-[#25CDB6]">{findReplaceMsg}</p>}
          </div>
        </div>
      )}

      {/* ===================================================================
          5. SUB-TAB: FOOTER MANAGER
          =================================================================== */}
      {subTab === 'footer' && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#EDE9E0]">Footer Manager</h2>
            <p className="text-xs text-[#EDE9E0]/60">
              Manage footer legal text, column link groupings, and official institutional disclaimers.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#EDE9E0] block">Footer Blurb</label>
              <textarea
                rows={3}
                defaultValue={siteContent?.footer?.blurb || 'Masters Of All is a multidisciplinary innovation organization.'}
                onChange={e => {
                  onUpdateSiteContent({
                    ...siteContent,
                    footer: { blurb: e.target.value }
                  });
                }}
                className="w-full bg-[#06302F] border border-white/10 rounded-xl p-3 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          6. SUB-TAB: SEO & REDIRECTS
          =================================================================== */}
      {subTab === 'seo' && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#EDE9E0]">SEO & Redirects</h2>
            <p className="text-xs text-[#EDE9E0]/60">
              Manage platform-wide search engine indexing, OpenGraph cards, and 301/302 redirects.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: SEO Defaults */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#EDE9E0] block">Title Template</label>
                <input
                  type="text"
                  value={seoTitleTemplate}
                  onChange={e => {
                    setSeoTitleTemplate(e.target.value);
                    onUpdateSettings({
                      seoDefaults: { ...settings.seoDefaults, title: e.target.value }
                    });
                  }}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#EDE9E0] block">Global Meta Description</label>
                <textarea
                  rows={4}
                  value={seoDescription}
                  onChange={e => {
                    setSeoDescription(e.target.value);
                    onUpdateSettings({
                      seoDefaults: { ...settings.seoDefaults, description: e.target.value }
                    });
                  }}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl p-3 text-xs text-[#EDE9E0] focus:border-[#25CDB6]"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#EDE9E0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sitemapEnabled}
                    onChange={e => {
                      setSitemapEnabled(e.target.checked);
                      onUpdateSettings({
                        seoDefaults: { ...settings.seoDefaults, sitemapEnabled: e.target.checked }
                      });
                    }}
                    className="rounded text-[#17A491]"
                  />
                  <span>Enable sitemap.xml generation</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#EDE9E0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={robotsEnabled}
                    onChange={e => {
                      setRobotsEnabled(e.target.checked);
                      onUpdateSettings({
                        seoDefaults: { ...settings.seoDefaults, robotsEnabled: e.target.checked }
                      });
                    }}
                    className="rounded text-[#17A491]"
                  />
                  <span>Enable robots.txt indexing</span>
                </label>
              </div>
            </div>

            {/* Right: Redirects Manager */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#EDE9E0]">301 & 302 Redirect Manager</h3>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="/old-path"
                    value={newRedirectFrom}
                    onChange={e => setNewRedirectFrom(e.target.value)}
                    className="bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
                  />
                  <input
                    type="text"
                    placeholder="/new-destination"
                    value={newRedirectTo}
                    onChange={e => setNewRedirectTo(e.target.value)}
                    className="bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddRedirect}
                  className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer"
                >
                  Add Redirect Rule
                </button>
              </div>

              {/* Redirect Tester */}
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
                    onClick={handleTestRedirect}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#EDE9E0]"
                  >
                    Test
                  </button>
                </div>
                {testResult && <p className="text-[11px] text-[#25CDB6]">{testResult}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
