import React, { useState, useEffect, useRef } from 'react';
import { Project, Department, ContentBlock, UserRole } from '../../types';
import { api } from '../../services/api';
import {
  ArrowLeft,
  Save,
  Send,
  Globe,
  Archive,
  Copy,
  Clock,
  History,
  Eye,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Upload,
  Calendar,
  Building,
  AlertCircle,
  CheckCircle2,
  FileText,
  Play,
  Volume2,
  ExternalLink
} from 'lucide-react';

interface ProjectEditorProps {
  project?: Project | null;
  departments: Department[];
  currentUserRole: UserRole | string;
  statuses?: string[];
  onSave: (payload: Partial<Project>) => Promise<Project>;
  onPublish?: (id: string) => Promise<void>;
  onCancel: () => void;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({
  project,
  departments,
  currentUserRole,
  statuses = ['Concept', 'In Development', 'Active', 'Completed', 'On Hold'],
  onSave,
  onPublish,
  onCancel
}) => {
  const isAdmin = ['admin', 'Admin', 'owner', 'Owner', 'editor', 'Editor'].includes(currentUserRole);
  const isEditing = Boolean(project?.id);

  // Form State
  const [title, setTitle] = useState(project?.title || '');
  const [slug, setSlug] = useState(project?.slug || '');
  const [category, setCategory] = useState(project?.category || 'General');
  const [status, setStatus] = useState<string>(project?.status || 'Active');
  const [publicationStatus, setPublicationStatus] = useState<Project['publicationStatus']>(
    project?.publicationStatus || 'Draft'
  );
  const [departmentIds, setDepartmentIds] = useState<string[]>(project?.departmentIds || []);
  const [shortDescription, setShortDescription] = useState(project?.shortDescription || '');
  const [fullDescription, setFullDescription] = useState(project?.fullDescription || '');
  const [coverImage, setCoverImage] = useState(project?.coverImage || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(project?.galleryImages || []);
  const [videoUrl, setVideoUrl] = useState(project?.videoUrl || '');
  const [audioUrl, setAudioUrl] = useState(project?.audioUrl || '');
  const [pdfUrl, setPdfUrl] = useState(project?.pdfUrl || '');
  const [startDate, setStartDate] = useState(project?.startDate || new Date().toISOString().substring(0, 10));
  const [completionDate, setCompletionDate] = useState(project?.completionDate || '');
  const [scheduledPublishDate, setScheduledPublishDate] = useState(project?.scheduledPublishDate || '');
  const [credits, setCredits] = useState(project?.credits || '');
  const [seoTitle, setSeoTitle] = useState(project?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(project?.seoDescription || '');

  // Content Blocks
  const [blocks, setBlocks] = useState<ContentBlock[]>(project?.blocks || []);

  // UI State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Mark changes as dirty
  const markDirty = () => setHasUnsavedChanges(true);

  // Handle auto slug
  const handleTitleChange = (val: string) => {
    setTitle(val);
    markDirty();
    if (!isEditing || !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  // Warn on unsaved changes before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle Cover Image Upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const uploaded = await api.uploadMedia({
          name: file.name,
          dataUrl,
          altText: `${title || 'Project'} cover visual`
        });
        setCoverImage(uploaded.url);
        markDirty();
      } catch {
        setCoverImage(dataUrl);
        markDirty();
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle Department Checkbox
  const toggleDepartment = (deptId: string) => {
    if (departmentIds.includes(deptId)) {
      setDepartmentIds(departmentIds.filter(id => id !== deptId));
    } else {
      setDepartmentIds([...departmentIds, deptId]);
    }
    markDirty();
  };

  // Block Builder Helpers
  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: `blk-${Date.now()}`,
      type,
      content: type === 'text' || type === 'quote' ? '' : type === 'gallery' ? [] : {}
    };
    setBlocks([...blocks, newBlock]);
    markDirty();
  };

  const updateBlockContent = (id: string, content: any) => {
    setBlocks(blocks.map(b => (b.id === id ? { ...b, content } : b)));
    markDirty();
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    markDirty();
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIdx, 0, moved);
    setBlocks(newBlocks);
    markDirty();
  };

  // Save Project Action
  const handleSaveProject = async (targetPubStatus?: Project['publicationStatus']) => {
    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<Project> = {
      title: title.trim(),
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9-]+/g, ''),
      category,
      status,
      publicationStatus: targetPubStatus || publicationStatus,
      departmentIds,
      shortDescription,
      fullDescription,
      coverImage,
      galleryImages,
      videoUrl,
      audioUrl,
      pdfUrl,
      startDate,
      completionDate,
      scheduledPublishDate,
      credits,
      seoTitle,
      seoDescription,
      blocks
    };

    try {
      const saved = await onSave(payload);
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date().toLocaleTimeString());
      if (targetPubStatus) setPublicationStatus(targetPubStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  // Duplicate Project
  const handleDuplicate = async () => {
    await onSave({
      title: `${title} (Copy)`,
      slug: `${slug}-copy-${Math.floor(Math.random() * 1000)}`,
      category,
      status: 'Concept',
      publicationStatus: 'Draft',
      departmentIds,
      shortDescription,
      fullDescription,
      coverImage,
      galleryImages,
      videoUrl,
      audioUrl,
      pdfUrl,
      startDate: new Date().toISOString().substring(0, 10),
      credits,
      blocks
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
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
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#EDE9E0]">
                {isEditing ? `Edit: ${project?.title}` : 'Create New Project'}
              </h2>
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-xs text-[#EDE9E0]/60">
              {lastSavedTime ? `Last saved at ${lastSavedTime}` : 'Autosave & manual review'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preview Toggle */}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showPreview
                ? 'bg-[#17A491]/20 border-[#25CDB6]/40 text-[#25CDB6]'
                : 'border-white/10 text-[#EDE9E0]/70 hover:bg-white/5'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? 'Hide Preview' : 'Live Preview'}</span>
          </button>

          {/* History */}
          {project?.versions && project.versions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#EDE9E0]/70 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({project.versions.length})</span>
            </button>
          )}

          {/* Duplicate */}
          {isEditing && (
            <button
              type="button"
              onClick={handleDuplicate}
              className="px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#EDE9E0]/70 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
          )}

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleSaveProject('Draft')}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {/* Submit for Review (Members or Non-admins) */}
          {!isAdmin && (
            <button
              type="button"
              onClick={() => handleSaveProject('Pending Review')}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Review</span>
            </button>
          )}

          {/* Publish Action (Admin / Owner Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleSaveProject('Published')}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-[#17A491]/25 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Publish Now</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mobile/Tablet View Switcher (< 1024px) */}
      {showPreview && (
        <div className="lg:hidden flex items-center p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'editor' ? 'bg-[#17A491] text-[#06302F] shadow' : 'text-[#EDE9E0]/70 hover:text-white'
            }`}
          >
            Project Form
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mobileTab === 'preview' ? 'bg-[#17A491] text-[#06302F] shadow' : 'text-[#EDE9E0]/70 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>
      )}

      {/* Main split grid: Editor (left) + Live Preview Pane (right) */}
      <div className={`grid grid-cols-1 ${showPreview ? 'lg:grid-cols-12' : ''} gap-8 items-start`}>
        {/* Editor Form */}
        <div className={`${showPreview ? 'lg:col-span-7' : 'w-full'} space-y-6 bg-[#031D1C]/50 p-4 sm:p-6 rounded-2xl border border-white/10 ${showPreview && mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-[#25CDB6] font-bold">
              Project Overview
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Project Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. Autonomous Ecological Monitoring Rover"
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value);
                    markDirty();
                  }}
                  placeholder="e.g. Applied Robotics"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  Development Status
                </label>
                <select
                  value={status}
                  onChange={e => {
                    setStatus(e.target.value);
                    markDirty();
                  }}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
                >
                  {statuses.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Multiple Departments Checklist */}
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#25CDB6]" />
                <span>Departments</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-[#06302F] border border-white/10">
                {departments.filter(d => d.published).map(dept => {
                  const checked = departmentIds.includes(dept.id);
                  return (
                    <label
                      key={dept.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        checked ? 'bg-[#17A491]/20 text-[#25CDB6]' : 'text-[#EDE9E0]/70 hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDepartment(dept.id)}
                        className="rounded text-[#17A491] focus:ring-[#17A491]"
                      />
                      <span className="truncate">{dept.shortName || dept.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Short Description / Lead Abstract
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={e => {
                  setShortDescription(e.target.value);
                  markDirty();
                }}
                placeholder="Clear 1-2 sentence overview shown on project cards..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
          </div>

          {/* Media Assets: Cover, Video, Audio, Docs */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs uppercase tracking-wider text-[#CA7952] font-bold">
              Media & Artifacts
            </h3>

            {/* Cover Image */}
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Cover Image
              </label>
              <div className="flex items-center gap-3">
                {coverImage && (
                  <img src={coverImage} alt="Cover preview" className="w-16 h-12 object-cover rounded-lg bg-black border border-white/10" />
                )}
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-[#17A491] bg-[#06302F] text-xs font-semibold text-[#EDE9E0]/80 cursor-pointer">
                  <Upload className="w-4 h-4 text-[#25CDB6]" />
                  <span>Upload Cover Image (or paste URL)</span>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Video & Audio URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-[#25CDB6]" />
                  <span>Video URL (MP4 or YouTube/Vimeo)</span>
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={e => {
                    setVideoUrl(e.target.value);
                    markDirty();
                  }}
                  placeholder="https://..."
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#25CDB6]" />
                  <span>Audio URL (MP3)</span>
                </label>
                <input
                  type="text"
                  value={audioUrl}
                  onChange={e => {
                    setAudioUrl(e.target.value);
                    markDirty();
                  }}
                  placeholder="https://..."
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Full Narrative & Block Builder */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-[#6B8AFF] font-bold">
                Narrative & Block Builder
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#EDE9E0] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('quote')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#EDE9E0] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-[#EDE9E0] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Image</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Story
              </label>
              <textarea
                rows={5}
                value={fullDescription}
                onChange={e => {
                  setFullDescription(e.target.value);
                  markDirty();
                }}
                placeholder="In-depth description of technical scope, hypotheses, experiments, and results..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Custom Blocks List */}
            {blocks.map((block, idx) => (
              <div key={block.id} className="p-3.5 rounded-xl bg-[#06302F] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
                  <span className="font-bold uppercase tracking-wider text-[#25CDB6] text-[10px]">
                    Block {idx + 1}: {block.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:text-white disabled:opacity-30"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(idx, 'down')}
                      disabled={idx === blocks.length - 1}
                      className="p-1 hover:text-white disabled:opacity-30"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="p-1 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {block.type === 'text' && (
                  <textarea
                    rows={3}
                    value={block.content}
                    onChange={e => updateBlockContent(block.id, e.target.value)}
                    placeholder="Enter section text..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#EDE9E0] focus:outline-none"
                  />
                )}

                {block.type === 'quote' && (
                  <input
                    type="text"
                    value={block.content}
                    onChange={e => updateBlockContent(block.id, e.target.value)}
                    placeholder="Enter pullquote statement..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#EDE9E0] italic focus:outline-none"
                  />
                )}

                {block.type === 'image' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={block.content?.url || ''}
                      onChange={e => updateBlockContent(block.id, { ...block.content, url: e.target.value })}
                      placeholder="Image URL..."
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#EDE9E0] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={block.content?.caption || ''}
                      onChange={e => updateBlockContent(block.id, { ...block.content, caption: e.target.value })}
                      placeholder="Optional caption..."
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#EDE9E0] focus:outline-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dates & Credits */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
              Dates & Attribution
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    markDirty();
                  }}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  Completion Date (Optional)
                </label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={e => {
                    setCompletionDate(e.target.value);
                    markDirty();
                  }}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Credits (Only if supplied)
              </label>
              <input
                type="text"
                value={credits}
                onChange={e => {
                  setCredits(e.target.value);
                  markDirty();
                }}
                placeholder="Contributors, research partners, technical labs..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live Preview Pane */}
        {showPreview && (
          <div className={`lg:col-span-5 space-y-4 lg:sticky lg:top-6 ${mobileTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#25CDB6] font-bold flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>Live Reader Preview</span>
              </span>
              <span className="text-[10px] text-[#EDE9E0]/50 font-mono">Preview</span>
            </div>

            <div className="bg-[#031D1C] rounded-2xl border border-white/10 p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Cover preview */}
              {coverImage ? (
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-black/40 border border-white/10">
                  <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] rounded-xl bg-[#06302F] border border-dashed border-white/10 flex items-center justify-center text-xs text-[#EDE9E0]/30">
                  No cover visual uploaded
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#17A491]/20 text-[#25CDB6]">
                  {status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-[#EDE9E0]/70">
                  {category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300">
                  {publicationStatus}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-[#EDE9E0] leading-snug">
                {title || 'Untitled Project'}
              </h3>

              {/* Short description */}
              {shortDescription && (
                <p className="text-xs text-[#EDE9E0]/80 italic font-serif leading-relaxed">
                  {shortDescription}
                </p>
              )}

              {/* Departments */}
              {departmentIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                  {departmentIds.map(dId => {
                    const d = departments.find(dep => dep.id === dId);
                    if (!d) return null;
                    return (
                      <span key={d.id} className="text-[10px] px-2 py-0.5 rounded bg-[#06302F] text-[#25CDB6] border border-white/10">
                        {d.shortName || d.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Full Description preview */}
              {fullDescription && (
                <div className="pt-2 border-t border-white/10 text-xs text-[#EDE9E0]/70 leading-relaxed whitespace-pre-line">
                  {fullDescription}
                </div>
              )}

              {/* Blocks Preview */}
              {blocks.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-3">
                  {blocks.map(b => (
                    <div key={b.id} className="text-xs text-[#EDE9E0]/80">
                      {b.type === 'quote' && (
                        <blockquote className="border-l-2 border-[#CA7952] pl-3 italic text-[#EDE9E0]/90">
                          &ldquo;{b.content}&rdquo;
                        </blockquote>
                      )}
                      {b.type === 'text' && <p>{b.content}</p>}
                      {b.type === 'image' && b.content?.url && (
                        <div className="rounded-lg overflow-hidden border border-white/10">
                          <img src={b.content.url} alt="" className="w-full object-cover" />
                          {b.content.caption && <p className="text-[10px] p-1 text-center text-[#EDE9E0]/50">{b.content.caption}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
