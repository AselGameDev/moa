import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Department, DepartmentGlyph, MediaAsset } from '../../types';
import { api } from '../../services/api';
import { getUnitHref, isRddDepartment } from '../../utils/orgHelpers';
import { DepartmentIcon, GLYPH_OPTIONS } from '../DepartmentIcon';
import { DepartmentLogo } from '../DepartmentLogo';
import { MediaPicker } from '../MediaPicker';
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
  const [introduction, setIntroduction] = useState(department?.introduction || '');
  const [purpose, setPurpose] = useState(department?.purpose || '');
  const [mission, setMission] = useState(department?.mission || '');
  const [seoTitle, setSeoTitle] = useState(department?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(department?.seoDescription || '');
  const [seoShareImage, setSeoShareImage] = useState(department?.seoShareImage || '');
  const [published, setPublished] = useState(department?.published !== false);
  const [showInTree, setShowInTree] = useState(department?.showInTree !== false);

  const [areasOfFocus, setAreasOfFocus] = useState<string[]>(department?.areasOfFocus || []);
  const [newFocus, setNewFocus] = useState('');

  const [initiatives, setInitiatives] = useState<string[]>(department?.initiatives || []);
  const [newInitiative, setNewInitiative] = useState('');

  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState('');
  const iconPopoverRef = useRef<HTMLDivElement | null>(null);

  const [previewsOpen, setPreviewsOpen] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<'logo' | 'icon' | 'hero' | 'seoShareImage' | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
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
    setIntroduction(department?.introduction || '');
    setPurpose(department?.purpose || '');
    setMission(department?.mission || '');
    setSeoTitle(department?.seoTitle || '');
    setSeoDescription(department?.seoDescription || '');
    setSeoShareImage(department?.seoShareImage || '');
    setPublished(department?.published !== false);
    setShowInTree(department?.showInTree !== false);
    setAreasOfFocus(department?.areasOfFocus || []);
    setInitiatives(department?.initiatives || []);
    setError(null);
    setSavedNotice(null);
    setIconPopoverOpen(false);
    setIconQuery('');
  }, [department?.id, defaultKind]);

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
    if (!newFocus.trim()) return;
    setAreasOfFocus([...areasOfFocus, newFocus.trim()]);
    setNewFocus('');
  };

  const handleAddInitiative = () => {
    if (!newInitiative.trim()) return;
    setInitiatives([...initiatives, newInitiative.trim()]);
    setNewInitiative('');
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
        tagline: tagline.trim() || undefined,
        iconGlyph,
        iconUrl,
        colorHex,
        iconBgHex,
        customLogoUrl: customLogoUrl.trim() || undefined,
        heroImage,
        introduction,
        purpose,
        mission,
        areasOfFocus,
        initiatives,
        seoTitle,
        seoDescription,
        seoShareImage: seoShareImage.trim() || undefined,
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

  const routePrefix = isSectorUnit ? '/sectors/' : '/departments/';
  const previewHref = department
    ? getUnitHref(department)
    : `${routePrefix}${slug || 'unit'}`;

  const previewUnit: Department = {
    id: department?.id || 'preview',
    name: name || (isSectorUnit ? 'Sector Name' : 'Department Name'),
    shortName: name || (isSectorUnit ? 'Sector Name' : 'Department Name'),
    slug: slug || 'unit',
    kind: unitKind,
    tagline: tagline || undefined,
    iconGlyph,
    iconUrl: iconUrl || undefined,
    colorHex,
    iconBgHex,
    customLogoUrl: customLogoUrl || undefined,
    introduction,
    purpose,
    mission,
    areasOfFocus,
    initiatives,
    published,
    showInTree,
    displayOrder: department?.displayOrder || 1,
    createdAt: department?.createdAt || '',
    updatedAt: department?.updatedAt || ''
  };

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EDE9E0]/15">
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
            <button
              type="button"
              onClick={() => onDelete(department)}
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash</span>
            </button>
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
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Main Editor Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-[#031D1C]/60 p-4 sm:p-6 rounded-2xl border border-white/10">
        {/* Identity */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-[#25CDB6] font-bold">
            Core Identity
          </h3>

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
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                URL Slug
              </label>
              <div className="flex items-center bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs">
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
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Visuals: Logo (for departments) + Icon Popover + Colors */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-xs uppercase tracking-wider text-[#CA7952] font-bold">
            {isSectorUnit ? 'Sector Iconography & Palette' : 'Department Logo, Icon & Palette'}
          </h3>

          {!isSectorUnit && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#EDE9E0]/85">
                Department Logo (Displayed in Hero Rings, Tree &amp; Department Card)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <DepartmentLogo department={previewUnit} size={44} />
                <input
                  type="text"
                  value={customLogoUrl}
                  onChange={e => setCustomLogoUrl(e.target.value)}
                  placeholder="/5320.jpg or /uploads/..."
                  className="flex-1 min-w-[180px] bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('logo')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Library
                </button>
                <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer flex items-center gap-1.5 shrink-0">
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
                    className="px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Icon Glyph Popover Picker (Searchable 6-col grid with 40px cells) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#EDE9E0]/85">
              Icon Glyph {iconUrl ? '(Custom Icon URL active)' : ''}
            </label>
            <div className="flex flex-wrap items-center gap-3 relative" ref={iconPopoverRef}>
              <button
                type="button"
                onClick={() => setIconPopoverOpen(prev => !prev)}
                aria-expanded={iconPopoverOpen}
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#06302F] border border-white/15 hover:border-[#25CDB6] text-xs font-semibold text-[#EDE9E0] cursor-pointer"
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

              <div className="flex-1 min-w-[200px] flex items-center gap-2">
                <input
                  type="text"
                  value={iconUrl}
                  onChange={e => setIconUrl(e.target.value)}
                  placeholder="Or custom icon URL (/uploads/...)"
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('icon')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Library
                </button>
                <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer flex items-center gap-1.5 shrink-0">
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
              </div>
            </div>
          </div>

          {/* Color controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                Icon Foreground Color
              </label>
              <div className="flex items-center gap-2 bg-[#06302F] border border-white/10 rounded-xl p-2">
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
              <div className="flex items-center gap-1.5 mt-2">
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

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                Icon Badge Background
              </label>
              <div className="flex items-center gap-2 bg-[#06302F] border border-white/10 rounded-xl p-2">
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
              <div className="flex items-center gap-1.5 mt-2">
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

          {/* Hero Banner */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#EDE9E0]/85">
              Banner Image (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={heroImage}
                onChange={e => setHeroImage(e.target.value)}
                placeholder="/uploads/... or https://..."
                className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPickerTarget('hero')}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
              >
                Library
              </button>
              <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer flex items-center gap-1.5 shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingHero ? '...' : 'Upload'}</span>
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
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={e => setPublished(e.target.checked)}
                className="rounded w-4 h-4 text-[#17A491] focus:ring-[#17A491]"
              />
              <span className="text-xs font-semibold text-[#EDE9E0]">
                Published (Visible publicly)
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={showInTree}
                onChange={e => setShowInTree(e.target.checked)}
                className="rounded w-4 h-4 text-[#17A491] focus:ring-[#17A491]"
              />
              <span className="text-xs font-semibold text-[#EDE9E0]">
                Show in Hierarchy Tree
              </span>
            </label>
          </div>
        </div>

        {/* Editorial Content & SEO */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-xs uppercase tracking-wider text-[#6B8AFF] font-bold">
            Editorial Content &amp; SEO
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
              Overview / Introduction
            </label>
            <textarea
              rows={2}
              value={introduction}
              onChange={e => setIntroduction(e.target.value)}
              placeholder="Add an overview..."
              className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
            />
          </div>

          {isSectorUnit && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                  Purpose
                </label>
                <textarea
                  rows={3}
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="Add purpose..."
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
                  placeholder="Add mission statement..."
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                  Areas of Focus
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newFocus}
                    onChange={e => setNewFocus(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFocus();
                      }
                    }}
                    placeholder="Add a focus area and press Enter..."
                    className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddFocus}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {areasOfFocus.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-[#EDE9E0]"
                    >
                      <span>{f}</span>
                      <button
                        type="button"
                        onClick={() => setAreasOfFocus(areasOfFocus.filter((_, idx) => idx !== i))}
                        className="text-[#EDE9E0]/45 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                  Initiatives
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newInitiative}
                    onChange={e => setNewInitiative(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInitiative();
                      }
                    }}
                    placeholder="Add an initiative and press Enter..."
                    className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddInitiative}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {initiatives.map((act, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs text-[#EDE9E0]"
                    >
                      <span>{act}</span>
                      <button
                        type="button"
                        onClick={() => setInitiatives(initiatives.filter((_, idx) => idx !== i))}
                        className="text-[#EDE9E0]/45 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-white/5">
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/85 mb-1.5">
                SEO Meta Title (Optional)
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                placeholder={name ? `${name} — Masters Of All` : 'Custom search engine title...'}
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
            <div>
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
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
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
          </div>
        </div>
      </form>

      {/* Collapsible 3-Card Live Preview Panel */}
      <div className="rounded-2xl bg-[#031D1C] border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setPreviewsOpen(prev => !prev)}
          aria-expanded={previewsOpen}
          className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-bold text-[#25CDB6] hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <span>Live Site Previews (Tree · Card · Header)</span>
          </span>
          {previewsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {previewsOpen && (
          <div className="p-5 pt-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10">
            {/* 1. Tree Node Preview */}
            <div className="bg-[#042423] p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[11px] uppercase font-bold text-[#EDE9E0]/60 block">
                1. Tree Node
              </span>
              <div className="py-4 flex flex-col items-center justify-center bg-[#06302F]/60 rounded-xl border border-dashed border-white/10">
                {isSectorUnit ? (
                  <div
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg border border-white/20"
                    style={{ backgroundColor: iconBgHex, color: colorHex }}
                  >
                    <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={24} color={colorHex} />
                  </div>
                ) : (
                  <DepartmentLogo department={previewUnit} size={isRddUnit ? 72 : 64} />
                )}
                <span className="mt-2.5 text-[13px] font-semibold text-[#EDE9E0] text-center px-2 line-clamp-2">
                  {name || (isSectorUnit ? 'Sector' : 'Department')}
                </span>
              </div>
            </div>

            {/* 2. Directory / Sector Card Preview */}
            <div className="bg-[#042423] p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[11px] uppercase font-bold text-[#EDE9E0]/60 block">
                2. {isSectorUnit ? 'Sector Card' : 'Directory Card'}
              </span>
              <div className="p-4 rounded-xl bg-[#06302F] border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isSectorUnit ? (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow shrink-0"
                      style={{ backgroundColor: iconBgHex, color: colorHex }}
                    >
                      <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={22} color={colorHex} />
                    </div>
                  ) : (
                    <DepartmentLogo department={previewUnit} size={48} />
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#EDE9E0] truncate">
                      {name || (isSectorUnit ? 'Sector Name' : 'Department Name')}
                    </h4>
                    {!isSectorUnit && tagline && (
                      <p className="text-[11px] text-[#CA7952] truncate">{tagline}</p>
                    )}
                    <p className="text-xs text-[#EDE9E0]/65 line-clamp-1 mt-0.5">
                      {introduction || 'Add an overview'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0" />
              </div>
            </div>

            {/* 3. Page Header Preview */}
            <div className="bg-[#042423] p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[11px] uppercase font-bold text-[#EDE9E0]/60 block">
                3. Page Header
              </span>
              <div className="p-4 rounded-xl bg-[#06302F] border border-white/10 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] text-[#EDE9E0]/65 flex-wrap">
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
                <div className="flex items-center gap-3">
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
          else if (pickerTarget === 'seoShareImage') setSeoShareImage(asset.url);
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
            : 'Select SEO Share Image'
        }
        currentUrl={
          pickerTarget === 'logo'
            ? customLogoUrl
            : pickerTarget === 'icon'
            ? iconUrl
            : pickerTarget === 'hero'
            ? heroImage
            : seoShareImage
        }
      />
    </div>
  );
};
