import React, { useState, useEffect } from 'react';
import {
  Project,
  Department,
  ContentBlock,
  UserRole,
  StoryBlockContent,
  StoryBlockImageContent,
  ProjectVersion,
  MediaAsset
} from '../../types';
import { api } from '../../services/api';
import { ConfirmDialog } from './ConfirmDialog';
import { MediaPicker } from '../MediaPicker';
import { parseVideoEmbed, sanitizeSafeUrl } from '../../shared/url';
import {
  ArrowLeft,
  Save,
  Send,
  Globe,
  Copy,
  History,
  Eye,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Upload,
  Building,
  AlertCircle,
  CheckCircle2,
  FileText,
  Play,
  Volume2,
  X,
  RotateCcw,
  Star,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Check,
  XCircle
} from 'lucide-react';

interface ProjectEditorProps {
  project?: Project | null;
  departments: Department[];
  currentUserRole: UserRole | string;
  canPublish?: boolean;
  statuses?: string[];
  onSave: (payload: Partial<Project>) => Promise<Project>;
  onProjectUpdated?: (updated: Project) => void;
  onCancel: () => void;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({
  project,
  departments,
  currentUserRole,
  canPublish,
  statuses = ['Concept', 'In Development', 'Active', 'Completed', 'On Hold'],
  onSave,
  onProjectUpdated,
  onCancel
}) => {
  const isAdmin = canPublish ?? ['admin', 'Admin', 'owner', 'Owner'].includes(currentUserRole);
  const [currentProject, setCurrentProject] = useState<Project | null>(project || null);
  const isEditing = Boolean(currentProject?.id);

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
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState(project?.videoUrl || '');
  const [audioUrl, setAudioUrl] = useState(project?.audioUrl || '');
  const [pdfUrl, setPdfUrl] = useState(project?.pdfUrl || '');
  const [tags, setTags] = useState<string[]>(project?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [featured, setFeatured] = useState<boolean>(Boolean(project?.featured));
  const [externalLinks, setExternalLinks] = useState<{ label: string; url: string }[]>(
    project?.externalLinks || []
  );
  const [newExtLabel, setNewExtLabel] = useState('');
  const [newExtUrl, setNewExtUrl] = useState('');
  const [startDate, setStartDate] = useState(project?.startDate || new Date().toISOString().substring(0, 10));
  const [completionDate, setCompletionDate] = useState(project?.completionDate || '');
  const [scheduledPublishDate, setScheduledPublishDate] = useState(project?.scheduledPublishDate || '');
  const [credits, setCredits] = useState(project?.credits || '');
  const [seoTitle, setSeoTitle] = useState(project?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(project?.seoDescription || '');
  const [seoShareImage, setSeoShareImage] = useState(project?.seoShareImage || '');

  // Content Blocks
  const [blocks, setBlocks] = useState<ContentBlock[]>(project?.blocks || []);

  // UI State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    'cover' | 'gallery' | 'pdf' | 'seoShareImage' | { blockId: string } | null
  >(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Review workflow state
  const [reviewCommentInput, setReviewCommentInput] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Version restore confirmation
  const [pendingRestoreVersion, setPendingRestoreVersion] = useState<ProjectVersion | null>(null);
  const [restoringVersion, setRestoringVersion] = useState(false);

  const applyProjectToFields = (p: Project) => {
    setCurrentProject(p);
    setTitle(p.title || '');
    setSlug(p.slug || '');
    setCategory(p.category || 'General');
    setStatus(p.status || 'Active');
    setPublicationStatus(p.publicationStatus || 'Draft');
    setDepartmentIds(p.departmentIds || []);
    setShortDescription(p.shortDescription || '');
    setFullDescription(p.fullDescription || '');
    setCoverImage(p.coverImage || '');
    setGalleryImages(p.galleryImages || []);
    setVideoUrl(p.videoUrl || '');
    setAudioUrl(p.audioUrl || '');
    setPdfUrl(p.pdfUrl || '');
    setTags(p.tags || []);
    setFeatured(Boolean(p.featured));
    setExternalLinks(p.externalLinks || []);
    setStartDate(p.startDate || new Date().toISOString().substring(0, 10));
    setCompletionDate(p.completionDate || '');
    setScheduledPublishDate(p.scheduledPublishDate || '');
    setCredits(p.credits || '');
    setSeoTitle(p.seoTitle || '');
    setSeoDescription(p.seoDescription || '');
    setSeoShareImage(p.seoShareImage || '');
    setBlocks(p.blocks || []);
    setHasUnsavedChanges(false);
  };

  useEffect(() => {
    if (project) {
      applyProjectToFields(project);
    }
  }, [project?.id]);

  const markDirty = () => {
    setHasUnsavedChanges(true);
    setNotice(null);
  };

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

  // Upload Cover Image (blocks SVG, never falls back to raw dataUrl)
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      setError('SVG uploads are disabled for security reasons. Please upload PNG, JPG, GIF, or WebP.');
      return;
    }
    setError(null);
    setUploadingCover(true);
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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to upload cover image.');
      } finally {
        setUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      setError('SVG uploads are disabled for security reasons. Please upload PNG, JPG, GIF, or WebP.');
      return;
    }
    setError(null);
    setUploadingGallery(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const uploaded = await api.uploadMedia({
          name: file.name,
          dataUrl,
          altText: `${title || 'Project'} gallery image`
        });
        setGalleryImages(prev => [...prev, uploaded.url]);
        markDirty();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to upload gallery image.');
      } finally {
        setUploadingGallery(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF documents can be uploaded here.');
      return;
    }
    setError(null);
    setUploadingPdf(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const uploaded = await api.uploadMedia({
          name: file.name,
          dataUrl,
          altText: `${title || 'Project'} research brief PDF`
        });
        setPdfUrl(uploaded.url);
        markDirty();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to upload PDF document.');
      } finally {
        setUploadingPdf(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleDepartment = (deptId: string) => {
    if (departmentIds.includes(deptId)) {
      setDepartmentIds(departmentIds.filter(id => id !== deptId));
    } else {
      setDepartmentIds([...departmentIds, deptId]);
    }
    markDirty();
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: `blk-${Date.now()}`,
      type,
      content: type === 'text' || type === 'quote' ? '' : type === 'gallery' ? [] : {}
    };
    setBlocks([...blocks, newBlock]);
    markDirty();
  };

  const updateBlockContent = (id: string, content: StoryBlockContent) => {
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

  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
      markDirty();
    }
    setTagInput('');
  };

  const handleAddExternalLink = () => {
    const label = newExtLabel.trim();
    const url = newExtUrl.trim();
    if (!label || !url) return;
    setExternalLinks([...externalLinks, { label, url }]);
    setNewExtLabel('');
    setNewExtUrl('');
    markDirty();
  };

  const handleSaveProject = async (targetPubStatus?: Project['publicationStatus']) => {
    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const resolvedPubStatus = targetPubStatus || publicationStatus;
    const payload: Partial<Project> = {
      title: title.trim(),
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)+/g, ''),
      category,
      status,
      publicationStatus: resolvedPubStatus,
      departmentIds,
      shortDescription,
      fullDescription,
      coverImage,
      galleryImages,
      videoUrl,
      audioUrl,
      pdfUrl,
      tags,
      featured,
      externalLinks,
      startDate,
      completionDate,
      scheduledPublishDate,
      credits,
      seoTitle,
      seoDescription,
      seoShareImage: seoShareImage.trim() || undefined,
      blocks
    };

    try {
      const saved = await onSave(payload);
      setCurrentProject(saved);
      setPublicationStatus(saved.publicationStatus);
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setError(null);
    try {
      await onSave({
        title: `${title} (Copy)`,
        slug: `${slug || 'project'}-copy-${Date.now().toString(36)}`,
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
        tags,
        externalLinks,
        startDate: new Date().toISOString().substring(0, 10),
        credits,
        seoTitle,
        seoDescription,
        blocks
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate project');
    }
  };

  const handleAdminReview = async (action: 'approved' | 'rejected' | 'requested_changes') => {
    if (!currentProject?.id) return;
    setReviewSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.reviewProject(currentProject.id, {
        action,
        comment: reviewCommentInput.trim() || undefined
      });
      applyProjectToFields(updated);
      setReviewCommentInput('');
      setNotice(
        action === 'approved'
          ? 'Project approved and published live.'
          : action === 'requested_changes'
          ? 'Returned to draft with requested changes.'
          : 'Project review rejected and returned to draft.'
      );
      onProjectUpdated?.(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Review action failed.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleConfirmRestoreVersion = async () => {
    if (!currentProject?.id || !pendingRestoreVersion) return;
    setRestoringVersion(true);
    setError(null);
    try {
      const updated = await api.restoreProjectVersion(
        currentProject.id,
        pendingRestoreVersion.versionId
      );
      applyProjectToFields(updated);
      setPendingRestoreVersion(null);
      setShowHistory(false);
      setNotice(`Restored snapshot from ${new Date(pendingRestoreVersion.timestamp).toLocaleString()}.`);
      onProjectUpdated?.(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restore version snapshot.');
    } finally {
      setRestoringVersion(false);
    }
  };

  const versions = currentProject?.versions || [];
  const reviewHistory = currentProject?.reviewHistory || [];

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
                {isEditing ? `Edit: ${currentProject?.title}` : 'Create New Project'}
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

          {versions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-[#EDE9E0]/70 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({versions.length})</span>
            </button>
          )}

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

          <button
            type="button"
            onClick={() => handleSaveProject('Draft')}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {!isAdmin && (
            <button
              type="button"
              onClick={() => handleSaveProject('Pending Review')}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Review</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleSaveProject('Published')}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-[#17A491]/25 cursor-pointer disabled:opacity-50"
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

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-[#25CDB6]/40 text-[#25CDB6] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Editorial Review Feedback Banner (Visible to Author & Admin) */}
      {(currentProject?.reviewComment || reviewHistory.length > 0) && (
        <div className="p-4 rounded-2xl bg-[#031D1C] border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <MessageSquare className="w-4 h-4" />
            <span>Editorial Review Notes</span>
          </div>
          {currentProject?.reviewComment && (
            <p className="text-xs text-[#EDE9E0]/85 bg-black/20 p-3 rounded-xl border border-white/5">
              Latest note: {currentProject.reviewComment}
            </p>
          )}
          {reviewHistory.length > 0 && (
            <div className="space-y-1 pt-1">
              {reviewHistory.slice(0, 3).map(entry => (
                <div key={entry.id} className="text-[11px] text-[#EDE9E0]/60 flex items-center justify-between gap-2">
                  <span>
                    <strong className="text-[#EDE9E0]">{entry.reviewer}</strong> — {entry.action.replace('_', ' ')}
                    {entry.comment ? `: "${entry.comment}"` : ''}
                  </span>
                  <span className="font-mono shrink-0">{new Date(entry.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Pending Review Decision Panel */}
      {isAdmin && isEditing && publicationStatus === 'Pending Review' && (
        <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-amber-200">Pending Editorial Review</h3>
              <p className="text-xs text-[#EDE9E0]/70">
                Submitted by {currentProject?.authorName || 'Contributor'} ({currentProject?.authorEmail || 'member'}). Approve to publish or return with feedback.
              </p>
            </div>
          </div>
          <textarea
            rows={2}
            value={reviewCommentInput}
            onChange={e => setReviewCommentInput(e.target.value)}
            placeholder="Optional review comment for the author..."
            className="w-full bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={reviewSubmitting}
              onClick={() => handleAdminReview('approved')}
              className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve &amp; Publish</span>
            </button>
            <button
              type="button"
              disabled={reviewSubmitting}
              onClick={() => handleAdminReview('requested_changes')}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Request Changes</span>
            </button>
            <button
              type="button"
              disabled={reviewSubmitting}
              onClick={() => handleAdminReview('rejected')}
              className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile/Tablet View Switcher */}
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

      {/* Main split grid */}
      <div className={`grid grid-cols-1 ${showPreview ? 'lg:grid-cols-12' : ''} gap-8 items-start`}>
        {/* Editor Form */}
        <div className={`${showPreview ? 'lg:col-span-7' : 'w-full'} space-y-6 bg-[#031D1C]/50 p-4 sm:p-6 rounded-2xl border border-white/10 ${showPreview && mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-[#25CDB6] font-bold">
              Project Overview
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  URL Slug
                </label>
                <div className="flex items-center bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="text-[#EDE9E0]/40 font-mono">/projects/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''));
                      markDirty();
                    }}
                    placeholder="project-slug"
                    className="flex-1 bg-transparent text-xs text-[#25CDB6] font-mono focus:outline-none pl-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                    Publication Status
                  </label>
                  <select
                    value={publicationStatus}
                    onChange={e => {
                      setPublicationStatus(e.target.value as Project['publicationStatus']);
                      markDirty();
                    }}
                    className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Published">Published</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              )}
            </div>

            {/* Multiple Departments Checklist */}
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#25CDB6]" />
                <span>Departments</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-[#06302F] border border-white/10">
                {departments.filter(d => !d.deletedAt && d.published).map(dept => {
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

            {/* Tags & Featured */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-semibold text-[#EDE9E0]/80">
                  Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tag and press Enter..."
                    className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(t => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-white/5 border border-white/10 text-[#EDE9E0]"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTags(tags.filter(item => item !== t));
                            markDirty();
                          }}
                          className="text-white/40 hover:text-red-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#06302F] border border-white/10 cursor-pointer mt-5">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={e => {
                    setFeatured(e.target.checked);
                    markDirty();
                  }}
                  className="rounded text-[#17A491] focus:ring-[#17A491]"
                />
                <Star className={`w-3.5 h-3.5 ${featured ? 'text-amber-400 fill-amber-400' : 'text-white/40'}`} />
                <span className="text-xs font-semibold text-[#EDE9E0]">Featured Project</span>
              </label>
            </div>
          </div>

          {/* Media Assets: Cover, Gallery, Video, Audio, PDF */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs uppercase tracking-wider text-[#CA7952] font-bold">
              Media &amp; Artifacts
            </h3>

            {/* Cover Image */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#EDE9E0]/80">
                Cover Image (PNG, JPG, WebP, GIF or URL)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {coverImage && (
                  <img src={coverImage} alt="Cover preview" className="w-16 h-12 object-cover rounded-lg bg-black border border-white/10 shrink-0" />
                )}
                <input
                  type="text"
                  value={coverImage}
                  onChange={e => {
                    setCoverImage(e.target.value);
                    markDirty();
                  }}
                  placeholder="/uploads/... or https://..."
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('cover')}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Library
                </button>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-[#17A491] bg-[#06302F] text-xs font-semibold text-[#EDE9E0]/80 cursor-pointer shrink-0">
                  <Upload className="w-4 h-4 text-[#25CDB6]" />
                  <span>{uploadingCover ? 'Uploading...' : 'Upload File'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#25CDB6]" />
                <span>Gallery Images ({galleryImages.length})</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newGalleryUrl}
                  onChange={e => setNewGalleryUrl(e.target.value)}
                  placeholder="Paste gallery image URL..."
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newGalleryUrl.trim()) return;
                    setGalleryImages([...galleryImages, newGalleryUrl.trim()]);
                    setNewGalleryUrl('');
                    markDirty();
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                >
                  Add URL
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTarget('gallery')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                >
                  Library
                </button>
                <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer flex items-center justify-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#25CDB6]" />
                  <span>{uploadingGallery ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                  {galleryImages.map((img, i) => (
                    <div key={`${img}-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/30">
                      <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryImages(galleryImages.filter((_, idx) => idx !== i));
                          markDirty();
                        }}
                        className="absolute top-1 right-1 p-1 rounded bg-black/80 text-red-300 opacity-80 hover:opacity-100 cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video, Audio, PDF URLs */}
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
                  <span>Audio URL (MP3/M4A)</span>
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

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#25CDB6]" />
                <span>PDF Brief / Publication URL</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pdfUrl}
                  onChange={e => {
                    setPdfUrl(e.target.value);
                    markDirty();
                  }}
                  placeholder="/uploads/... or https://..."
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('pdf')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Library
                </button>
                <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer flex items-center gap-1.5 shrink-0">
                  <Upload className="w-3.5 h-3.5 text-[#25CDB6]" />
                  <span>{uploadingPdf ? 'Uploading...' : 'Upload PDF'}</span>
                  <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Full Narrative & Block Builder */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider text-[#6B8AFF] font-bold">
                Narrative &amp; Block Builder
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

            {blocks.map((block, idx) => {
              const imgContent =
                block.type === 'image' && typeof block.content === 'object' && !Array.isArray(block.content)
                  ? (block.content as StoryBlockImageContent)
                  : {};
              return (
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
                        className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, 'down')}
                        disabled={idx === blocks.length - 1}
                        className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="p-1 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {block.type === 'text' && (
                    <textarea
                      rows={3}
                      value={typeof block.content === 'string' ? block.content : ''}
                      onChange={e => updateBlockContent(block.id, e.target.value)}
                      placeholder="Enter section text..."
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#EDE9E0] focus:outline-none"
                    />
                  )}

                  {block.type === 'quote' && (
                    <input
                      type="text"
                      value={typeof block.content === 'string' ? block.content : ''}
                      onChange={e => updateBlockContent(block.id, e.target.value)}
                      placeholder="Enter pullquote statement..."
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#EDE9E0] italic focus:outline-none"
                    />
                  )}

                  {block.type === 'image' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={imgContent.url || ''}
                          onChange={e => updateBlockContent(block.id, { ...imgContent, url: e.target.value })}
                          placeholder="Image URL..."
                          className="flex-1 bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#EDE9E0] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setPickerTarget({ blockId: block.id })}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer shrink-0"
                        >
                          Library
                        </button>
                      </div>
                      <input
                        type="text"
                        value={imgContent.caption || ''}
                        onChange={e => updateBlockContent(block.id, { ...imgContent, caption: e.target.value })}
                        placeholder="Optional caption..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[#EDE9E0] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dates, Credits, External Links & SEO */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
              Dates, References &amp; SEO
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  Completion Date
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

              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  Scheduled Publish
                </label>
                <input
                  type="date"
                  value={scheduledPublishDate}
                  onChange={e => {
                    setScheduledPublishDate(e.target.value);
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

            {/* External Links */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#CA7952]" />
                <span>External References ({externalLinks.length})</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  value={newExtLabel}
                  onChange={e => setNewExtLabel(e.target.value)}
                  placeholder="Link label (e.g. GitHub Repo)"
                  className="sm:col-span-2 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <input
                  type="text"
                  value={newExtUrl}
                  onChange={e => setNewExtUrl(e.target.value)}
                  placeholder="https://..."
                  className="sm:col-span-2 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddExternalLink}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                >
                  Add Link
                </button>
              </div>
              {externalLinks.length > 0 && (
                <div className="space-y-1.5">
                  {externalLinks.map((lnk, idx) => (
                    <div key={`${lnk.url}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#06302F] border border-white/10 text-xs">
                      <span className="truncate">
                        <strong className="text-[#EDE9E0]">{lnk.label}</strong>
                        <span className="text-[#EDE9E0]/50 font-mono ml-2">{lnk.url}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setExternalLinks(externalLinks.filter((_, i) => i !== idx));
                          markDirty();
                        }}
                        className="text-white/40 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEO Title & Description */}
            <div className="grid grid-cols-1 gap-3 pt-2 border-t border-white/5">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                  SEO Meta Title (Optional)
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={e => {
                    setSeoTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder={title ? `${title} — Masters Of All` : 'Custom search engine title...'}
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
                  onChange={e => {
                    setSeoDescription(e.target.value);
                    markDirty();
                  }}
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
                    onChange={e => {
                      setSeoShareImage(e.target.value);
                      markDirty();
                    }}
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
              {coverImage && sanitizeSafeUrl(coverImage) ? (
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-black/40 border border-white/10">
                  <img src={sanitizeSafeUrl(coverImage)} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] rounded-xl bg-[#06302F] border border-dashed border-white/10 flex items-center justify-center text-xs text-[#EDE9E0]/30">
                  No cover visual uploaded
                </div>
              )}

              {(() => {
                const videoEmbed = parseVideoEmbed(videoUrl);
                if (!videoEmbed) return null;
                return (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    {videoEmbed.kind === 'iframe' ? (
                      <iframe src={videoEmbed.src} title="Video preview" className="w-full h-full" allowFullScreen />
                    ) : (
                      <video src={videoEmbed.src} controls className="w-full h-full object-cover" />
                    )}
                  </div>
                );
              })()}

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

              <h3 className="text-xl font-bold text-[#EDE9E0] leading-snug">
                {title || 'Untitled Project'}
              </h3>

              {shortDescription && (
                <p className="text-xs text-[#EDE9E0]/80 italic font-serif leading-relaxed">
                  {shortDescription}
                </p>
              )}

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

              {fullDescription && (
                <div className="pt-2 border-t border-white/10 text-xs text-[#EDE9E0]/70 leading-relaxed whitespace-pre-line">
                  {fullDescription}
                </div>
              )}

              {blocks.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-3">
                  {blocks.map(b => {
                    const imgContent =
                      b.type === 'image' && typeof b.content === 'object' && !Array.isArray(b.content)
                        ? (b.content as StoryBlockImageContent)
                        : {};
                    return (
                      <div key={b.id} className="text-xs text-[#EDE9E0]/80">
                        {b.type === 'quote' && (
                          <blockquote className="border-l-2 border-[#CA7952] pl-3 italic text-[#EDE9E0]/90">
                            &ldquo;{typeof b.content === 'string' ? b.content : ''}&rdquo;
                          </blockquote>
                        )}
                        {b.type === 'text' && <p>{typeof b.content === 'string' ? b.content : ''}</p>}
                        {b.type === 'image' && imgContent.url && (
                          <div className="rounded-lg overflow-hidden border border-white/10">
                            <img src={imgContent.url} alt="" className="w-full object-cover" />
                            {imgContent.caption && (
                              <p className="text-[10px] p-1 text-center text-[#EDE9E0]/50">{imgContent.caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Version History Drawer/Modal */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-md h-full bg-[#031D1C] border-l border-white/10 p-6 flex flex-col justify-between text-[#EDE9E0] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#25CDB6]" />
                <h3 className="text-sm font-bold text-[#EDE9E0]">Version History ({versions.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {versions.map((v, idx) => (
                <div
                  key={v.versionId}
                  className="p-3.5 rounded-2xl bg-[#06302F] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#25CDB6]">
                      {idx === 0 ? 'Latest Snapshot' : `Snapshot ${versions.length - idx}`}
                    </span>
                    <span className="text-[10px] font-mono text-[#EDE9E0]/50">
                      {new Date(v.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#EDE9E0]/85">{v.summary || 'Project revision'}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#EDE9E0]/50">
                      By {v.author} ({v.authorEmail})
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setPendingRestoreVersion(v)}
                        className="px-2.5 py-1 rounded-lg bg-[#17A491]/20 hover:bg-[#17A491]/30 text-[#25CDB6] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 text-[11px] text-[#EDE9E0]/50">
              {isAdmin
                ? 'Restoring a snapshot preserves a backup of the current content first.'
                : 'Version snapshots are retained automatically. Contact an admin to restore an earlier snapshot.'}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingRestoreVersion)}
        title="Restore Project Snapshot"
        message={
          pendingRestoreVersion
            ? `Restore content fields from the snapshot saved on ${new Date(pendingRestoreVersion.timestamp).toLocaleString()}? Your current content will be saved as a new snapshot before restoring.`
            : ''
        }
        confirmLabel={restoringVersion ? 'Restoring...' : 'Restore Snapshot'}
        isDestructive={false}
        onConfirm={handleConfirmRestoreVersion}
        onCancel={() => setPendingRestoreVersion(null)}
      />

      <MediaPicker
        isOpen={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        onSelect={(asset: MediaAsset) => {
          if (pickerTarget === 'cover') setCoverImage(asset.url);
          else if (pickerTarget === 'gallery') {
            if (!galleryImages.includes(asset.url)) setGalleryImages([...galleryImages, asset.url]);
          } else if (pickerTarget === 'pdf') setPdfUrl(asset.url);
          else if (pickerTarget === 'seoShareImage') setSeoShareImage(asset.url);
          else if (pickerTarget && typeof pickerTarget === 'object' && 'blockId' in pickerTarget) {
            const targetBlock = blocks.find(b => b.id === pickerTarget.blockId);
            const prevObj =
              targetBlock && typeof targetBlock.content === 'object' && !Array.isArray(targetBlock.content)
                ? (targetBlock.content as StoryBlockImageContent)
                : {};
            updateBlockContent(pickerTarget.blockId, { ...prevObj, url: asset.url });
          }
          markDirty();
          setPickerTarget(null);
        }}
        allowedTypes={pickerTarget === 'pdf' ? ['document'] : ['image']}
        title={
          pickerTarget === 'pdf'
            ? 'Select PDF Document'
            : pickerTarget === 'gallery'
              ? 'Add Gallery Image'
              : 'Select Image Asset'
        }
      />
    </div>
  );
};
