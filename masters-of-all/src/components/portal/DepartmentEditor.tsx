import React, { useState } from 'react';
import { Department, DepartmentGlyph, MediaAsset } from '../../types';
import { api } from '../../services/api';
import { DepartmentIcon, GLYPH_OPTIONS } from '../DepartmentIcon';
import { MediaPicker } from '../MediaPicker';
import {
  ArrowLeft,
  Save,
  Eye,
  Image,
  Plus,
  Trash2,
  ChevronRight,
  ArrowRight,
  Upload
} from 'lucide-react';

interface DepartmentEditorProps {
  department?: Department | null;
  onSave: (payload: Partial<Department>) => Promise<void>;
  onCancel: () => void;
  allDepartments?: Department[];
}

export const DepartmentEditor: React.FC<DepartmentEditorProps> = ({
  department,
  onSave,
  onCancel
}) => {
  const isEditing = Boolean(department?.id);

  const [name, setName] = useState(department?.name || '');
  const [shortName, setShortName] = useState(department?.shortName || department?.name || '');
  const [slug, setSlug] = useState(department?.slug || '');
  const [iconGlyph, setIconGlyph] = useState<DepartmentGlyph>(department?.iconGlyph || 'tech');
  const [iconUrl, setIconUrl] = useState(department?.iconUrl || '');
  const [colorHex, setColorHex] = useState(department?.colorHex || '#25CDB6');
  const [iconBgHex, setIconBgHex] = useState(department?.iconBgHex || '#06302F');
  const [customLogoUrl] = useState(department?.customLogoUrl || '');
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

  const [pickerTarget, setPickerTarget] = useState<'icon' | 'hero' | 'seoShareImage' | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!shortName) setShortName(val);
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

  const handleRemoveFocus = (idx: number) => {
    setAreasOfFocus(areasOfFocus.filter((_, i) => i !== idx));
  };

  const handleAddInitiative = () => {
    if (!newInitiative.trim()) return;
    setInitiatives([...initiatives, newInitiative.trim()]);
    setNewInitiative('');
  };

  const handleRemoveInitiative = (idx: number) => {
    setInitiatives(initiatives.filter((_, i) => i !== idx));
  };

  const handleIconFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      setError('SVG uploads are disabled for security reasons. Please upload PNG, JPG, GIF, or WebP.');
      return;
    }
    setError(null);
    setUploadingIcon(true);
    const reader = new FileReader();
    reader.onload = async evt => {
      const dataUrl = evt.target?.result as string;
      if (!dataUrl) {
        setUploadingIcon(false);
        return;
      }
      try {
        const uploaded = await api.uploadMedia({
          name: file.name,
          dataUrl,
          altText: `${name || 'Department'} icon`
        });
        setIconUrl(uploaded.url);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to upload custom icon.');
      } finally {
        setUploadingIcon(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleHeroFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      setError('SVG uploads are disabled for security reasons. Please upload PNG, JPG, GIF, or WebP.');
      return;
    }
    setError(null);
    setUploadingHero(true);
    const reader = new FileReader();
    reader.onload = async evt => {
      const dataUrl = evt.target?.result as string;
      if (!dataUrl) {
        setUploadingHero(false);
        return;
      }
      try {
        const uploaded = await api.uploadMedia({
          name: file.name,
          dataUrl,
          altText: `${name || 'Department'} hero banner`
        });
        setHeroImage(uploaded.url);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to upload hero image.');
      } finally {
        setUploadingHero(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Department name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        shortName: shortName.trim() || name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        iconGlyph,
        iconUrl,
        colorHex,
        iconBgHex,
        customLogoUrl,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EDE9E0]/15">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#EDE9E0]/70 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-[#EDE9E0]">
              {isEditing ? `Edit: ${department?.name}` : 'Create New Department'}
            </h2>
            <p className="text-xs text-[#EDE9E0]/60">
              Changes reflect dynamically across the Tree, Orbit, Directory, and Footer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#EDE9E0]/80 hover:bg-white/5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#06302F] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Department</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Mobile/Tablet View Switcher */}
      <div className="lg:hidden flex items-center p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        <button
          type="button"
          onClick={() => setMobileView('form')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileView === 'form' ? 'bg-[#17A491] text-[#06302F] shadow' : 'text-[#EDE9E0]/70 hover:text-white'
          }`}
        >
          Department Form
        </button>
        <button
          type="button"
          onClick={() => setMobileView('preview')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            mobileView === 'preview' ? 'bg-[#17A491] text-[#06302F] shadow' : 'text-[#EDE9E0]/70 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Previews</span>
        </button>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleSubmit} className={`lg:col-span-7 space-y-6 bg-[#031D1C]/50 p-4 sm:p-6 rounded-2xl border border-white/10 ${mobileView === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Identity & Slugs */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-[#25CDB6] font-bold">
              Core Identity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  Full Department Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Cognitive Systems & AI"
                  required
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  Short Name (for tree &amp; tabs)
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={e => setShortName(e.target.value)}
                  placeholder="e.g. AI & Cognition"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                URL Slug
              </label>
              <div className="flex items-center bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs">
                <span className="text-[#EDE9E0]/40 font-mono">/departments/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  className="flex-1 bg-transparent text-xs text-[#25CDB6] font-mono focus:outline-none pl-1"
                />
              </div>
              {isEditing && department?.slug !== slug && (
                <p className="text-[11px] text-[#CA7952] mt-1">
                  Changing this will automatically preserve a redirect rule from /departments/{department?.slug}.
                </p>
              )}
            </div>
          </div>

          {/* Visuals: Icon & Colors */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs uppercase tracking-wider text-[#CA7952] font-bold">
              Iconography &amp; Colors
            </h3>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#EDE9E0]/80">
                  Select Department Icon Glyph
                </label>
                {iconUrl ? (
                  <span className="text-[11px] text-amber-300 font-medium">Using Custom Icon URL</span>
                ) : (
                  <span className="text-[11px] text-[#25CDB6] font-medium">Preset Glyph Selected</span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-2 bg-[#06302F] rounded-xl border border-white/10">
                {GLYPH_OPTIONS.map(opt => {
                  const isSelected = !iconUrl && iconGlyph === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setIconGlyph(opt.id as DepartmentGlyph);
                        setIconUrl('');
                      }}
                      className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#17A491]/25 border-2 border-[#25CDB6] shadow-md'
                          : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20'
                      }`}
                      title={opt.label}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shadow"
                        style={{
                          backgroundColor: isSelected ? iconBgHex : '#06302F',
                          color: isSelected ? colorHex : '#EDE9E0'
                        }}
                      >
                        <DepartmentIcon glyph={opt.id} size={20} color={isSelected ? colorHex : '#EDE9E0'} />
                      </div>
                      <span className="text-[10px] font-semibold text-[#EDE9E0]/80 truncate w-full text-center">
                        {opt.label.split('(')[0].trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Icon URL or Upload */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-[#EDE9E0]/80">
                Or Use Custom Icon (PNG / JPG / WebP / GIF)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={iconUrl}
                  onChange={e => setIconUrl(e.target.value)}
                  placeholder="Paste image link (https://... or /uploads/...)"
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
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
                  <span>{uploadingIcon ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleIconFileUpload}
                  />
                </label>
                {iconUrl && (
                  <button
                    type="button"
                    onClick={() => setIconUrl('')}
                    className="px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold cursor-pointer"
                    title="Clear custom icon"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Hero Image */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-[#EDE9E0]/80">
                Department Banner / Hero Image (Optional)
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
                  <span>{uploadingHero ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleHeroFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* Color controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
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
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
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

            {/* Visibility Toggles */}
            <div className="grid grid-cols-2 gap-4 pt-2">
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
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Introduction
              </label>
              <textarea
                rows={2}
                value={introduction}
                onChange={e => setIntroduction(e.target.value)}
                placeholder="Brief introduction displayed in directory..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Purpose
              </label>
              <textarea
                rows={3}
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Foundational rationale and philosophical purpose of the department..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Mission &amp; Objectives
              </label>
              <textarea
                rows={3}
                value={mission}
                onChange={e => setMission(e.target.value)}
                placeholder="Mission statement and long-term milestones..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
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
                      onClick={() => handleRemoveFocus(i)}
                      className="text-[#EDE9E0]/40 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Activities &amp; Initiatives
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
                      onClick={() => handleRemoveInitiative(i)}
                      className="text-[#EDE9E0]/40 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 border-t border-white/5">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
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
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
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
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
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

        {/* Live Side-by-Side Previews */}
        <div className={`lg:col-span-5 space-y-6 lg:sticky lg:top-6 ${mobileView === 'form' ? 'hidden lg:block' : 'block'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#25CDB6] font-bold flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>Live Site Previews</span>
            </span>
            <span className="text-[10px] text-[#EDE9E0]/50 font-mono">Live preview</span>
          </div>

          {/* 1. Tree Node Preview */}
          <div className="bg-[#031D1C] p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#EDE9E0]/40 block">
              1. Hierarchy Tree Node Preview
            </span>
            <div className="py-4 flex flex-col items-center justify-center bg-[#06302F]/60 rounded-xl border border-dashed border-white/10">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-white/20"
                style={{
                  backgroundColor: iconBgHex,
                  color: colorHex
                }}
              >
                <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={20} color={colorHex} />
              </div>
              <span className="mt-2 text-xs font-semibold text-[#EDE9E0] text-center px-2">
                {shortName || name || 'Department'}
              </span>
            </div>
          </div>

          {/* 2. Directory Row Preview */}
          <div className="bg-[#031D1C] p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#EDE9E0]/40 block">
              2. Directory Row Preview
            </span>
            <div
              className="p-4 rounded-xl border border-white/10 flex items-center justify-between transition-colors"
              style={{
                backgroundColor: `${colorHex}15`,
                borderLeft: `4px solid ${colorHex}`
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow shrink-0"
                  style={{ backgroundColor: iconBgHex, color: colorHex }}
                >
                  <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={18} color={colorHex} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#EDE9E0]">
                    {name || 'Department Name'}
                  </h4>
                  <p className="text-[11px] text-[#EDE9E0]/60 line-clamp-1">
                    {introduction || 'Department mandate and research focus...'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#25CDB6]" />
            </div>
          </div>

          {/* 3. Page Header Preview */}
          <div className="bg-[#031D1C] p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#EDE9E0]/40 block">
              3. Department Page Header Preview
            </span>
            <div className="p-4 rounded-xl bg-[#06302F] border border-white/10 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] text-[#EDE9E0]/50">
                <span>Departments</span>
                <ChevronRight className="w-3 h-3" />
                <span>RDD</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white truncate">{name || 'Department'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-md shrink-0"
                  style={{ backgroundColor: iconBgHex, color: colorHex }}
                >
                  <DepartmentIcon glyph={iconGlyph} iconUrl={iconUrl} size={22} color={colorHex} />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#CA7952] font-semibold">
                    RDD Research Department
                  </span>
                  <h3 className="text-lg font-extrabold text-[#EDE9E0] leading-tight">
                    {name || 'Department Name'}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaPicker
        isOpen={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        onSelect={(asset: MediaAsset) => {
          if (pickerTarget === 'icon') setIconUrl(asset.url);
          else if (pickerTarget === 'hero') setHeroImage(asset.url);
          else if (pickerTarget === 'seoShareImage') setSeoShareImage(asset.url);
          setPickerTarget(null);
        }}
        allowedTypes={['image']}
        title={
          pickerTarget === 'icon'
            ? 'Select Custom Department Icon'
            : pickerTarget === 'hero'
              ? 'Select Department Banner'
              : 'Select SEO Share Image'
        }
        currentUrl={
          pickerTarget === 'icon' ? iconUrl : pickerTarget === 'hero' ? heroImage : seoShareImage
        }
      />
    </div>
  );
};
