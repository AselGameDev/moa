import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaOfFocusCard,
  Department,
  DepartmentGlyph,
  InitiativeItem,
  MediaAsset
} from '../../types';
import { api } from '../../services/api';
import { getUnitHref, isRddDepartment } from '../../utils/orgHelpers';
import { DepartmentIcon, GLYPH_OPTIONS } from '../DepartmentIcon';
import { DepartmentLogo } from '../DepartmentLogo';
import { MediaPicker } from '../MediaPicker';
import { DeleteButton, DESTRUCTIVE_LABEL_BTN_CLASS } from './DeleteButton';
import { sanitizeSafeUrl } from '../../shared/url';
import {
  ArrowLeft,
  Save,
  Eye,
  Image,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Upload,
  Search,
  ExternalLink
} from 'lucide-react';

interface DepartmentEditorProps {
  department?: Department | null;
  parentDepartment?: Department | null;
  defaultKind?: 'department' | 'sector';
  onSave: (payload: Partial<Department>) => Promise<void>;
  onCancel: () => void;
  onDelete?: (dept: Department) => void;
  onViewLive?: (path: string) => void;
  allDepartments?: Department[];
  embedded?: boolean;
}

function deriveInitialFocusCards(dept?: Department | null): AreaOfFocusCard[] {
  if (dept?.structuredAreasOfFocus && dept.structuredAreasOfFocus.length > 0) {
    return dept.structuredAreasOfFocus.map((c, idx) => ({
      id: c.id || `focus-${idx}`,
      title: c.title || '',
      description: c.description || '',
      icon: c.icon
    }));
  }
  return (dept?.areasOfFocus || []).map((text, idx) => ({
    id: `focus-str-${idx}`,
    title: text,
    description: ''
  }));
}

function deriveInitialInitiatives(dept?: Department | null): InitiativeItem[] {
  if (dept?.structuredInitiatives && dept.structuredInitiatives.length > 0) {
    return dept.structuredInitiatives.map((item, idx) => ({
      id: item.id || `init-${idx}`,
      title: item.title || '',
      status: item.status || 'Active',
      summary: item.summary || '',
      owner: item.owner || '',
      link: item.link || ''
    }));
  }
  return (dept?.initiatives || []).map((text, idx) => ({
    id: `init-str-${idx}`,
    title: text,
    status: 'Active',
    summary: '',
    owner: '',
    link: ''
  }));
}

export const DepartmentEditor: React.FC<DepartmentEditorProps> = ({
  department,
  parentDepartment,
  defaultKind = 'department',
  onSave,
  onCancel,
  onDelete,
  onViewLive,
  embedded = false
}) => {
  const isEditing = Boolean(department?.id);
  const unitKind: 'department' | 'sector' = department?.kind || defaultKind;
  const isSectorUnit = unitKind === 'sector';
  const isRddUnit = !isSectorUnit && Boolean(department && isRddDepartment(department));

  const [name, setName] = useState(department?.name || '');
  const [slug, setSlug] = useState(department?.slug || '');
  const [tagline, setTagline] = useState(department?.tagline || '');
  const [iconGlyph, setIconGlyph] = useState<DepartmentGlyph>(department?.iconGlyph || 'tech');
  const [iconUrl, setIconUrl] = useState(department?.iconUrl || '');
  const [colorHex, setColorHex] = useState(department?.colorHex || '#25CDB6');
  const [iconBgHex, setIconBgHex] = useState(department?.iconBgHex || '#06302F');
  const [customLogoUrl, setCustomLogoUrl] = useState(department?.customLogoUrl || '');
  const [heroImage, setHeroImage] = useState(department?.heroImage || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(department?.galleryImages || []);
  const [introduction, setIntroduction] = useState(department?.introduction || '');
  const [purpose, setPurpose] = useState(department?.purpose || '');
  const [mission, setMission] = useState(department?.mission || '');
  const [seoTitle, setSeoTitle] = useState(department?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(department?.seoDescription || '');
  const [seoShareImage, setSeoShareImage] = useState(department?.seoShareImage || '');
  const [published, setPublished] = useState(department?.published !== false);
  const [showInTree, setShowInTree] = useState(department?.showInTree !== false);

  const [focusCards, setFocusCards] = useState<AreaOfFocusCard[]>(() =>
    deriveInitialFocusCards(department)
  );
  const [newFocusTitle, setNewFocusTitle] = useState('');
  const [newFocusDesc, setNewFocusDesc] = useState('');

  const [initiativeItems, setInitiativeItems] = useState<InitiativeItem[]>(() =>
    deriveInitialInitiatives(department)
  );
  const [newInitTitle, setNewInitTitle] = useState('');
  const [newInitStatus, setNewInitStatus] = useState<InitiativeItem['status']>('Active');
  const [newInitSummary, setNewInitSummary] = useState('');

  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState('');
  const iconPopoverRef = useRef<HTMLDivElement | null>(null);

  const [previewsOpen, setPreviewsOpen] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<
    'logo' | 'icon' | 'hero' | 'gallery' | 'seoShareImage' | null
  >(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(department?.name || '');
    setSlug(department?.slug || '');
    setTagline(department?.tagline || '');
    setIconGlyph(department?.iconGlyph || 'tech');
    setIconUrl(department?.iconUrl || '');
    setColorHex(department?.colorHex || '#25CDB6');
    setIconBgHex(department?.iconBgHex || '#06302F');
    setCustomLogoUrl(department?.customLogoUrl || '');
    setHeroImage(department?.heroImage || '');
    setGalleryImages(department?.galleryImages || []);
    setIntroduction(department?.introduction || '');
    setPurpose(department?.purpose || '');
    setMission(department?.mission || '');
    setSeoTitle(department?.seoTitle || '');
    setSeoDescription(department?.seoDescription || '');
    setSeoShareImage(department?.seoShareImage || '');
    setPublished(department?.published !== false);
    setShowInTree(department?.showInTree !== false);
    setFocusCards(deriveInitialFocusCards(department));
    setInitiativeItems(deriveInitialInitiatives(department));
    setNewFocusTitle('');
    setNewFocusDesc('');
    setNewInitTitle('');
    setNewInitSummary('');
    setError(null);
    setSavedNotice(null);
    setIconPopoverOpen(false);
    setIconQuery('');
  }, [department?.id, department?.updatedAt, defaultKind]);

  useEffect(() => {
    if (!iconPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (iconPopoverRef.current && !iconPopoverRef.current.contains(e.target as Node)) {
        setIconPopoverOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIconPopoverOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [iconPopoverOpen]);

  const filteredGlyphs = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return GLYPH_OPTIONS;
    return GLYPH_OPTIONS.filter(
      opt => opt.label.toLowerCase().includes(q) || opt.id.toLowerCase().includes(q)
    );
  }, [iconQuery]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing || !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleAddFocus = () => {
    const cleanTitle = newFocusTitle.trim();
    if (!cleanTitle) return;
    setFocusCards(prev => [
      ...prev,
      {
        id: `focus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        description: newFocusDesc.trim()
      }
    ]);
    setNewFocusTitle('');
    setNewFocusDesc('');
  };

  const handleAddInitiative = () => {
    const cleanTitle = newInitTitle.trim();
    if (!cleanTitle) return;
    setInitiativeItems(prev => [
      ...prev,
      {
        id: `init-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        status: newInitStatus,
        summary: newInitSummary.trim()
      }
    ]);
    setNewInitTitle('');
    setNewInitSummary('');
  };

  const uploadImageField = (
    file: File | undefined,
    altLabel: string,
    setBusy: (v: boolean) => void,
    onUploaded: (url: string) => void
  ) => {
    if (!file) return;
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      setError('SVG uploads are disabled for security reasons. Please upload PNG, JPG, GIF, or WebP.');
      return;
    }
    setError(null);
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async evt => {
      const dataUrl = evt.target?.result as string;
      if (!dataUrl) {
        setBusy(false);
        return;
      }
      try {
        const uploaded = await api.uploadMedia({
          name: file.name,
          dataUrl,
          altText: altLabel
        });
        onUploaded(uploaded.url);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to upload image.');
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`${isSectorUnit ? 'Sector' : 'Department'} name is required`);
      return;
    }

    setSaving(true);
    setError(null);
    setSavedNotice(null);

    try {
      const cleanName = name.trim();
      const cleanedFocusCards = focusCards
        .map(c => ({ ...c, title: c.title.trim(), description: (c.description || '').trim() }))
        .filter(c => c.title);
      const cleanedInitiatives = initiativeItems
        .map(i => ({
          ...i,
          title: i.title.trim(),
          summary: (i.summary || '').trim(),
          owner: (i.owner || '').trim(),
          link: (i.link || '').trim()
        }))
        .filter(i => i.title);

      await onSave({
        name: cleanName,
        shortName: cleanName,
        slug:
          slug.trim() ||
          cleanName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, ''),
        kind: unitKind,
        parentDepartmentId: isSectorUnit
          ? department?.parentDepartmentId || parentDepartment?.id || 'dept-rdd'
          : undefined,
        isRdd: isRddUnit ? true : department?.isRdd,
        tagline: tagline.trim(),
        iconGlyph,
        iconUrl: iconUrl.trim(),
        colorHex,
        iconBgHex,
        customLogoUrl: customLogoUrl.trim(),
        heroImage: heroImage.trim(),
        galleryImages: galleryImages.filter(u => Boolean(u.trim())),
        introduction,
        purpose,
        mission,
        areasOfFocus: cleanedFocusCards.map(c => c.title),
        structuredAreasOfFocus: cleanedFocusCards,
        initiatives: cleanedInitiatives.map(i => i.title),
        structuredInitiatives: cleanedInitiatives,
        seoTitle,
        seoDescription,
        seoShareImage: seoShareImage.trim(),
        published,
        showInTree
      });
      setSavedNotice('Changes saved.');
      setTimeout(() => setSavedNotice(null), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save unit');
    } finally {
      setSaving(false);
    }
  };

  const routePrefix = isSectorUnit ? '/departments/rdd/' : '/departments/';
  const previewHref = department
    ? getUnitHref(department)
    : `${routePrefix}${slug || 'unit'}`;

  const previewUnit: Department = {
    id: department?.id || 'preview',
    name: name || (isSectorUnit ? 'Sector Name' : 'Department Name'),
    shortName: name || (isSectorUnit ? 'Sector Name' : 'Department Name'),
    slug: slug || 'unit',
    kind: unitKind,
    isRdd: isRddUnit,
    tagline: tagline || undefined,
    iconGlyph,
    iconUrl: iconUrl || undefined,
    colorHex,
    iconBgHex,
    customLogoUrl: customLogoUrl.trim(),
    introduction,
    purpose,
    mission,
    areasOfFocus: focusCards.map(c => c.title).filter(Boolean),
    structuredAreasOfFocus: focusCards,
    initiatives: initiativeItems.map(i => i.title).filter(Boolean),
    structuredInitiatives: initiativeItems,
    galleryImages,
    published,
    showInTree,
    displayOrder: department?.displayOrder || 1,
    createdAt: department?.createdAt || '',
    updatedAt: department?.updatedAt || ''
  };

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EDE9E0]/15 ${
          embedded ? 'lg:sticky lg:top-0 lg:z-20 lg:bg-[#06302F]/95 lg:backdrop-blur-md lg:pt-1' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {!embedded && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#EDE9E0]/70 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#25CDB6] font-bold">
                {isSectorUnit ? 'RDD Sector' : isRddUnit ? 'RDD Division' : 'Department'}
              </span>
              {savedNotice && (
                <span className="text-xs text-[#25CDB6] font-semibold">{savedNotice}</span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#EDE9E0] truncate mt-1">
              {isEditing
                ? department?.name
                : isSectorUnit
                ? 'New RDD Sector'
                : 'New Department'}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditing && onViewLive && department && (
            <button
              type="button"
              onClick={() => onViewLive(previewHref)}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#25CDB6]" />
              <span>View Live</span>
            </button>
          )}
          {isEditing && onDelete && department && !isRddUnit && (
            <DeleteButton
              onClick={() => onDelete(department)}
              label="Trash"
              title="Move to Trash"
            />
          )}
          {!isEditing && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#EDE9E0]/80 hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#06302F] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSectorUnit ? 'Save Sector' : 'Save Department'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Main Multi-Card Form Workspace */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Card 1: Core Identity & Visibility */}
        <section className="rounded-2xl bg-[#031D1C] border border-white/10 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#25CDB6] font-bold">
                1. Core Identity &amp; Visibility
              </h3>
              <p className="text-[11px] text-[#EDE9E0]/55 mt-0.5">
                Primary title, public route slug, and organizational visibility controls.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                {isSectorUnit ? 'Sector Name *' : 'Department Name *'}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder={isSectorUnit ? 'e.g. Science & Engineering' : 'e.g. Applied Research Division'}
                required
                className="w-full min-h-[38px] bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                URL Slug
              </label>
              <div className="flex items-center min-h-[38px] bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs focus-within:border-[#25CDB6]">
                <span className="text-[#EDE9E0]/45 font-mono">{routePrefix}</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  className="flex-1 bg-transparent text-xs text-[#25CDB6] font-mono focus:outline-none pl-1"
                />
              </div>
              {isEditing && department?.slug !== slug && (
                <p className="text-[11px] text-[#CA7952] mt-1">
                  Changing this automatically preserves a redirect rule from {routePrefix}{department?.slug}.
                </p>
              )}
            </div>
          </div>

          {!isSectorUnit && (
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                Department Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Concise positioning tagline displayed under the department name..."
                className="w-full min-h-[38px] bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
          )}

          {/* Side-by-side Stylized Visibility Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={published}
              onClick={() => setPublished(prev => !prev)}
              className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                published
                  ? 'bg-[#17A491]/10 border-[#25CDB6]/40'
                  : 'bg-[#06302F]/60 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#EDE9E0] block">
                  Published (Visible publicly)
                </span>
                <span className="text-[11px] text-[#EDE9E0]/55 block">
                  {published ? 'Live on public directory & detail routes' : 'Hidden as internal draft'}
                </span>
              </div>
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  published ? 'bg-[#17A491]' : 'bg-white/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    published ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={showInTree}
              onClick={() => setShowInTree(prev => !prev)}
              className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                showInTree
                  ? 'bg-[#17A491]/10 border-[#25CDB6]/40'
                  : 'bg-[#06302F]/60 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#EDE9E0] block">
                  Show in Hierarchy Tree
                </span>
                <span className="text-[11px] text-[#EDE9E0]/55 block">
                  {showInTree ? 'Rendered in orbital ring & hierarchy tree' : 'Excluded from hierarchy visualizations'}
                </span>
              </div>
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  showInTree ? 'bg-[#17A491]' : 'bg-white/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    showInTree ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>
          </div>
        </section>

        {/* Card 2: Visual Identity & Media */}
        <section className="rounded-2xl bg-[#031D1C] border border-white/10 p-5 sm:p-6 space-y-5">
          <div className="pb-3 border-b border-white/10">
            <h3 className="text-xs uppercase tracking-wider text-[#CA7952] font-bold">
              2. Visual Identity &amp; Media
            </h3>
            <p className="text-[11px] text-[#EDE9E0]/55 mt-0.5">
              Logos, icons, hero banner cover, and signature palette styling.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {!isSectorUnit && (
              <div className="p-4 rounded-xl bg-[#06302F]/55 border border-white/10 space-y-3">
                <label className="block text-xs font-semibold text-[#EDE9E0]/85">
                  Department Logo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[#031D1C] border border-white/10 flex items-center justify-center shrink-0">
                    <DepartmentLogo department={previewUnit} size={44} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      value={customLogoUrl}
                      onChange={e => setCustomLogoUrl(e.target.value)}
                      placeholder="/5320.jpg or /uploads/..."
                      className="w-full min-h-[36px] bg-[#031D1C] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPickerTarget('logo')}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                      >
                        Library
                      </button>
                      <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingLogo ? 'Uploading...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            uploadImageField(f, `${name || 'Department'} logo`, setUploadingLogo, setCustomLogoUrl);
                          }}
                        />
                      </label>
                      {customLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setCustomLogoUrl('')}
                          className={DESTRUCTIVE_LABEL_BTN_CLASS}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Banner Image */}
            <div className={`p-4 rounded-xl bg-[#06302F]/55 border border-white/10 space-y-3 ${isSectorUnit ? 'xl:col-span-2' : ''}`}>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85">
                Banner Image (Optional)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-14 rounded-xl overflow-hidden bg-[#031D1C] border border-white/10 flex items-center justify-center shrink-0">
                  {heroImage && sanitizeSafeUrl(heroImage) ? (
                    <img
                      src={sanitizeSafeUrl(heroImage)}
                      alt="Banner thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image className="w-5 h-5 text-[#EDE9E0]/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="text"
                    value={heroImage}
                    onChange={e => setHeroImage(e.target.value)}
                    placeholder="/uploads/... or https://..."
                    className="w-full min-h-[36px] bg-[#031D1C] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerTarget('hero')}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                    >
                      Library
                    </button>
                    <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingHero ? 'Uploading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          uploadImageField(f, `${name || 'Unit'} hero banner`, setUploadingHero, setHeroImage);
                        }}
                      />
                    </label>
                    {heroImage && (
                      <button
                        type="button"
                        onClick={() => setHeroImage('')}
                        className={DESTRUCTIVE_LABEL_BTN_CLASS}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Media Showcase Gallery */}
          <div className="p-4 rounded-xl bg-[#06302F]/55 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/85">
                  Media Showcase Gallery
                </label>
                <p className="text-[11px] text-[#EDE9E0]/50">
                  Visual photography, diagrams, or showcase frames displayed inside the department overview page.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerTarget('gallery')}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                >
                  + Add from Library
                </button>
                <label className="px-3 py-1.5 rounded-xl bg-[#17A491]/20 hover:bg-[#17A491]/30 border border-[#25CDB6]/40 text-xs font-semibold text-[#25CDB6] cursor-pointer inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingGallery ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      uploadImageField(f, `${name || 'Department'} gallery`, setUploadingGallery, url => {
                        setGalleryImages(prev => (prev.includes(url) ? prev : [...prev, url]));
                      });
                    }}
                  />
                </label>
              </div>
            </div>

            {galleryImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {galleryImages.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-[#031D1C] border border-white/10"
                  >
                    <img
                      src={sanitizeSafeUrl(imgUrl)}
                      alt={`Gallery ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove gallery image"
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-red-950/85 border border-red-400/40 text-red-200 hover:bg-red-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Icon Glyph Popover Picker + Custom Icon URL */}
          <div className="p-4 rounded-xl bg-[#06302F]/55 border border-white/10 space-y-3">
            <label className="block text-xs font-semibold text-[#EDE9E0]/85">
              Icon Glyph {iconUrl ? '(Custom Icon URL active)' : ''}
            </label>
            <div className="flex flex-wrap items-center gap-3 relative" ref={iconPopoverRef}>
              <button
                type="button"
                onClick={() => setIconPopoverOpen(prev => !prev)}
                aria-expanded={iconPopoverOpen}
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#031D1C] border border-white/15 hover:border-[#25CDB6] text-xs font-semibold text-[#EDE9E0] cursor-pointer"
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: iconBgHex, color: colorHex }}
                >
                  <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={18} color={colorHex} />
                </span>
                <span>
                  {GLYPH_OPTIONS.find(g => g.id === iconGlyph)?.label || 'Choose Icon'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#EDE9E0]/60" />
              </button>

              {iconPopoverOpen && (
                <div className="absolute left-0 top-full mt-2 z-30 w-[300px] p-3 rounded-2xl bg-[#031D1C] border border-white/20 shadow-2xl space-y-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#EDE9E0]/45 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={iconQuery}
                      onChange={e => setIconQuery(e.target.value)}
                      placeholder="Search icons..."
                      autoFocus
                      className="w-full bg-[#06302F] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 max-h-52 overflow-y-auto">
                    {filteredGlyphs.map(opt => {
                      const isSelected = !iconUrl && iconGlyph === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setIconGlyph(opt.id as DepartmentGlyph);
                            setIconUrl('');
                            setIconPopoverOpen(false);
                          }}
                          title={opt.label}
                          aria-label={opt.label}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#17A491]/25 border-2 border-[#25CDB6]'
                              : 'bg-white/5 border border-white/5 hover:bg-white/15'
                          }`}
                        >
                          <DepartmentIcon glyph={opt.id} size={18} color={isSelected ? colorHex : '#EDE9E0'} />
                        </button>
                      );
                    })}
                    {filteredGlyphs.length === 0 && (
                      <p className="col-span-6 py-3 text-center text-xs text-[#EDE9E0]/50">
                        No matching icons
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-[220px] flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={iconUrl}
                  onChange={e => setIconUrl(e.target.value)}
                  placeholder="Or custom icon URL (/uploads/...)"
                  className="flex-1 min-w-[160px] min-h-[38px] bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('icon')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Library
                </button>
                <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                  <Image className="w-3.5 h-3.5" />
                  <span>{uploadingIcon ? '...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      uploadImageField(f, `${name || 'Unit'} icon`, setUploadingIcon, setIconUrl);
                    }}
                  />
                </label>
                {iconUrl && (
                  <button
                    type="button"
                    onClick={() => setIconUrl('')}
                    className={DESTRUCTIVE_LABEL_BTN_CLASS}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Color controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#06302F]/55 border border-white/10">
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-2">
                Icon Foreground Color
              </label>
              <div className="flex items-center gap-2 bg-[#031D1C] border border-white/10 rounded-xl p-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={e => setColorHex(e.target.value)}
                  className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={colorHex}
                  onChange={e => setColorHex(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-mono text-[#EDE9E0] focus:outline-none uppercase"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {['#25CDB6', '#CA7952', '#D0A873', '#FFFFFF', '#06302F', '#C0392B', '#6B8AFF'].map(swatch => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColorHex(swatch)}
                    className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-125 cursor-pointer shadow-sm"
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#06302F]/55 border border-white/10">
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-2">
                Icon Badge Background
              </label>
              <div className="flex items-center gap-2 bg-[#031D1C] border border-white/10 rounded-xl p-2">
                <input
                  type="color"
                  value={iconBgHex}
                  onChange={e => setIconBgHex(e.target.value)}
                  className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={iconBgHex}
                  onChange={e => setIconBgHex(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-mono text-[#EDE9E0] focus:outline-none uppercase"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {['#FFFFFF', '#06302F', '#042423', '#D0A873', '#2A335E', '#5E8DA0', '#A32B2B', '#EBF5F1'].map(swatch => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setIconBgHex(swatch)}
                    className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-125 cursor-pointer shadow-sm"
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Card 3: Editorial Content & SEO */}
        <section className="rounded-2xl bg-[#031D1C] border border-white/10 p-5 sm:p-6 space-y-5">
          <div className="pb-3 border-b border-white/10">
            <h3 className="text-xs uppercase tracking-wider text-[#6B8AFF] font-bold">
              3. Editorial Content &amp; SEO
            </h3>
            <p className="text-[11px] text-[#EDE9E0]/55 mt-0.5">
              Public overview copy, structured focus metadata, and search engine previews.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
              Overview / Introduction
            </label>
            <textarea
              rows={3}
              value={introduction}
              onChange={e => setIntroduction(e.target.value)}
              placeholder="Add an overview..."
              className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none leading-relaxed"
            />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                  Mandate &amp; Purpose
                </label>
                <textarea
                  rows={3}
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="Core institutional mandate and purpose..."
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                  Mission
                </label>
                <textarea
                  rows={3}
                  value={mission}
                  onChange={e => setMission(e.target.value)}
                  placeholder="Strategic mission statement..."
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
            </div>

            {/* Structured Areas of Focus Cards */}
            <div className="space-y-3 p-4 rounded-xl bg-[#06302F]/45 border border-white/10">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/85">
                  Areas of Focus Cards
                </label>
                <p className="text-[11px] text-[#EDE9E0]/50">
                  Displayed as highlighted capability/focus cards on the detail page.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  value={newFocusTitle}
                  onChange={e => setNewFocusTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFocus();
                    }
                  }}
                  placeholder="Focus title..."
                  className="sm:col-span-2 min-h-[38px] bg-[#031D1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <input
                  type="text"
                  value={newFocusDesc}
                  onChange={e => setNewFocusDesc(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFocus();
                    }
                  }}
                  placeholder="Short description (optional)..."
                  className="sm:col-span-2 min-h-[38px] bg-[#031D1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddFocus}
                  className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Focus</span>
                </button>
              </div>

              {focusCards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {focusCards.map((card, i) => (
                    <div
                      key={card.id || i}
                      className="p-3 rounded-xl bg-[#031D1C] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#25CDB6] shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <input
                          type="text"
                          value={card.title}
                          onChange={e =>
                            setFocusCards(prev =>
                              prev.map((c, idx) => (idx === i ? { ...c, title: e.target.value } : c))
                            )
                          }
                          placeholder="Focus title"
                          className="flex-1 bg-[#06302F] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                        />
                        <DeleteButton
                          onClick={() => setFocusCards(focusCards.filter((_, idx) => idx !== i))}
                          title="Remove focus card"
                          ariaLabel={`Remove focus ${card.title}`}
                        />
                      </div>
                      <input
                        type="text"
                        value={card.description}
                        onChange={e =>
                          setFocusCards(prev =>
                            prev.map((c, idx) =>
                              idx === i ? { ...c, description: e.target.value } : c
                            )
                          )
                        }
                        placeholder="Supporting description..."
                        className="w-full bg-[#06302F] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#EDE9E0]/80 focus:border-[#25CDB6] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Structured Key Initiatives */}
            <div className="space-y-3 p-4 rounded-xl bg-[#06302F]/45 border border-white/10">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/85">
                  Key Initiatives
                </label>
                <p className="text-[11px] text-[#EDE9E0]/50">
                  Displayed below Areas of Focus with status, summary, and optional lead/link.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <input
                  type="text"
                  value={newInitTitle}
                  onChange={e => setNewInitTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInitiative();
                    }
                  }}
                  placeholder="Initiative title..."
                  className="sm:col-span-2 min-h-[38px] bg-[#031D1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <select
                  value={newInitStatus}
                  onChange={e => setNewInitStatus(e.target.value as InitiativeItem['status'])}
                  className="sm:col-span-1 min-h-[38px] bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="In Development">In Development</option>
                  <option value="Planned">Planned</option>
                  <option value="Completed">Completed</option>
                </select>
                <input
                  type="text"
                  value={newInitSummary}
                  onChange={e => setNewInitSummary(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInitiative();
                    }
                  }}
                  placeholder="Summary (optional)..."
                  className="sm:col-span-2 min-h-[38px] bg-[#031D1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddInitiative}
                  className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#CA7952] hover:bg-[#D0A873] text-[#031D1C] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {initiativeItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  {initiativeItems.map((act, i) => (
                    <div
                      key={act.id || i}
                      className="p-3 rounded-xl bg-[#031D1C] border border-white/10 space-y-2"
                    >
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        <span className="text-[11px] font-mono text-[#CA7952] shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <input
                          type="text"
                          value={act.title}
                          onChange={e =>
                            setInitiativeItems(prev =>
                              prev.map((it, idx) =>
                                idx === i ? { ...it, title: e.target.value } : it
                              )
                            )
                          }
                          placeholder="Initiative title"
                          className="flex-1 min-w-[160px] bg-[#06302F] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                        />
                        <select
                          value={act.status}
                          onChange={e =>
                            setInitiativeItems(prev =>
                              prev.map((it, idx) =>
                                idx === i
                                  ? { ...it, status: e.target.value as InitiativeItem['status'] }
                                  : it
                              )
                            )
                          }
                          className="bg-[#06302F] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#25CDB6] focus:border-[#25CDB6] focus:outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="In Development">In Development</option>
                          <option value="Planned">Planned</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <DeleteButton
                          onClick={() =>
                            setInitiativeItems(initiativeItems.filter((_, idx) => idx !== i))
                          }
                          title="Remove initiative"
                          ariaLabel={`Remove initiative ${act.title}`}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={act.summary || ''}
                          onChange={e =>
                            setInitiativeItems(prev =>
                              prev.map((it, idx) =>
                                idx === i ? { ...it, summary: e.target.value } : it
                              )
                            )
                          }
                          placeholder="Initiative summary..."
                          className="sm:col-span-2 bg-[#06302F] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#EDE9E0]/80 focus:border-[#25CDB6] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={act.link || ''}
                          onChange={e =>
                            setInitiativeItems(prev =>
                              prev.map((it, idx) =>
                                idx === i ? { ...it, link: e.target.value } : it
                              )
                            )
                          }
                          placeholder="Optional URL (/projects/...)"
                          className="bg-[#06302F] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#EDE9E0]/75 focus:border-[#25CDB6] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10">
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                SEO Meta Title (Optional)
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                placeholder={name ? `${name} — Masters Of All` : 'Custom search engine title...'}
                className="w-full min-h-[38px] bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                SEO Share Image (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seoShareImage}
                  onChange={e => setSeoShareImage(e.target.value)}
                  placeholder="Select from library or paste image URL..."
                  className="flex-1 min-h-[38px] bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('seoShareImage')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Library
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                SEO Meta Description (Optional)
              </label>
              <textarea
                rows={2}
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                placeholder="Summary shown in search engine results..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
          </div>
        </section>
      </form>

      {/* Collapsible 3-Card Live Preview Panel */}
      <div className="rounded-2xl bg-[#031D1C] border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setPreviewsOpen(prev => !prev)}
          aria-expanded={previewsOpen}
          className="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-xs font-bold text-[#25CDB6] hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <span>4. Live Site Previews (Tree · Card · Header)</span>
          </span>
          {previewsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {previewsOpen && (
          <div className="p-5 sm:p-6 pt-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10">
            {/* 1. Tree Node Preview */}
            <div className="bg-[#042423] p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[11px] uppercase font-bold text-[#EDE9E0]/60 block">
                1. Tree Node
              </span>
              <div className="py-4 flex flex-col items-center justify-center bg-[#06302F]/60 rounded-xl border border-dashed border-white/10">
                {isSectorUnit ? (
                  <div
                    className="w-[46px] h-[46px] rounded-full flex items-center justify-center shadow-lg border border-white/20"
                    style={{ backgroundColor: iconBgHex, color: colorHex }}
                  >
                    <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={20} color={colorHex} />
                  </div>
                ) : (
                  <DepartmentLogo department={previewUnit} size={isRddUnit ? 72 : 68} />
                )}
                <span className="mt-2.5 text-[13px] font-semibold text-[#EDE9E0] text-center px-2 line-clamp-2">
                  {name || (isSectorUnit ? 'Sector' : 'Department')}
                </span>
              </div>
            </div>

            {/* 2. Directory / Sector Card Preview */}
            <div className="bg-[#042423] p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[11px] uppercase font-bold text-[#EDE9E0]/60 block">
                2. {isSectorUnit ? 'Sector Card' : 'Executive Directory Card'}
              </span>
              {isSectorUnit ? (
                <div className="p-4 rounded-xl bg-[#06302F] border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shadow shrink-0"
                      style={{ backgroundColor: iconBgHex, color: colorHex }}
                    >
                      <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={20} color={colorHex} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#EDE9E0] truncate">
                        {name || 'Sector Name'}
                      </h4>
                      <p className="text-xs text-[#EDE9E0]/65 line-clamp-1 mt-0.5">
                        {introduction || 'Add an overview'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0" />
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#06302F] border border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <DepartmentLogo department={previewUnit} size={42} showBorder />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#EDE9E0] truncate">
                      {name || 'Department Name'}
                    </h4>
                    {tagline && <p className="text-[11px] text-[#CA7952] truncate">{tagline}</p>}
                    {introduction && (
                      <p className="text-[11px] text-[#EDE9E0]/65 line-clamp-2">{introduction}</p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-[#25CDB6]">
                    <span>Open department</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Page Header Preview */}
            <div className="bg-[#042423] p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[11px] uppercase font-bold text-[#EDE9E0]/60 block">
                3. Page Header
              </span>
              <div className="relative p-4 rounded-xl bg-[#06302F] border border-white/10 space-y-3 overflow-hidden">
                {heroImage && sanitizeSafeUrl(heroImage) && (
                  <img
                    src={sanitizeSafeUrl(heroImage)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                  />
                )}
                <div className="relative z-10 flex items-center gap-1.5 text-[11px] text-[#EDE9E0]/65 flex-wrap">
                  <span>Masters Of All</span>
                  <ChevronRight className="w-3 h-3" />
                  {isSectorUnit ? (
                    <>
                      <span>RDD</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-white truncate">{name || 'Sector'}</span>
                    </>
                  ) : (
                    <span className="text-white truncate">{name || 'Department'}</span>
                  )}
                </div>
                <div className="relative z-10 flex items-center gap-3">
                  {isSectorUnit ? (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-md shrink-0"
                      style={{ backgroundColor: iconBgHex, color: colorHex }}
                    >
                      <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={22} color={colorHex} />
                    </div>
                  ) : (
                    <DepartmentLogo department={previewUnit} size={56} />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-[#EDE9E0] leading-tight truncate">
                      {name || (isSectorUnit ? 'Sector Name' : 'Department Name')}
                    </h3>
                    {!isSectorUnit && tagline && (
                      <span className="text-[11px] text-[#CA7952] font-semibold block truncate">
                        {tagline}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <MediaPicker
        isOpen={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        onSelect={(asset: MediaAsset) => {
          if (pickerTarget === 'logo') setCustomLogoUrl(asset.url);
          else if (pickerTarget === 'icon') setIconUrl(asset.url);
          else if (pickerTarget === 'hero') setHeroImage(asset.url);
          else if (pickerTarget === 'gallery') {
            setGalleryImages(prev => (prev.includes(asset.url) ? prev : [...prev, asset.url]));
          } else if (pickerTarget === 'seoShareImage') setSeoShareImage(asset.url);
          setPickerTarget(null);
        }}
        allowedTypes={['image']}
        title={
          pickerTarget === 'logo'
            ? 'Select Department Logo'
            : pickerTarget === 'icon'
            ? 'Select Custom Icon'
            : pickerTarget === 'hero'
            ? 'Select Banner Image'
            : pickerTarget === 'gallery'
            ? 'Add Gallery Showcase Image'
            : 'Select SEO Share Image'
        }
        currentUrl={
          pickerTarget === 'logo'
            ? customLogoUrl
            : pickerTarget === 'icon'
            ? iconUrl
            : pickerTarget === 'hero'
            ? heroImage
            : pickerTarget === 'seoShareImage'
            ? seoShareImage
            : undefined
        }
      />
    </div>
  );
};
