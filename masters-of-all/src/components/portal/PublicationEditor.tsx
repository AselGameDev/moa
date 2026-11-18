import React, { useState, useRef } from 'react';
import {
  Publication,
  Department,
  Project,
  PublicationStatus,
  MediaAsset
} from '../../types';
import { api } from '../../services/api';
import { normalizeSlug, sanitizeSafeUrl } from '../../shared/url';
import { renderPdfPageOneDataUrl } from '../../utils/pdfThumbnail';
import { MediaPicker } from '../MediaPicker';
import { OrgAssignmentPicker } from './OrgAssignmentPicker';
import { DESTRUCTIVE_LABEL_BTN_CLASS } from './DeleteButton';
import {
  ArrowLeft,
  Save,
  Send,
  FileText,
  Image as ImageIcon,
  X,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye
} from 'lucide-react';

const PUB_TYPES = ['Paper', 'Monograph', 'Whitepaper', 'Report'];

interface PublicationEditorProps {
  publication?: Publication | null;
  departments: Department[];
  projects: Project[];
  canPublish: boolean;
  onSave: (payload: Partial<Publication>) => Promise<Publication | void>;
  onReview?: (
    id: string,
    action: 'approved' | 'rejected' | 'requested_changes',
    comment?: string
  ) => Promise<void>;
  onCancel: () => void;
}

export const PublicationEditor: React.FC<PublicationEditorProps> = ({
  publication,
  departments,
  projects,
  canPublish,
  onSave,
  onReview,
  onCancel
}) => {
  const isEditing = Boolean(publication?.id);

  const [title, setTitle] = useState(publication?.title || '');
  const [slug, setSlug] = useState(publication?.slug || '');
  const [authors, setAuthors] = useState(publication?.authors || '');
  const [abstract, setAbstract] = useState(publication?.abstract || '');
  const [publicationDate, setPublicationDate] = useState(
    publication?.publicationDate || new Date().toISOString().split('T')[0]
  );
  const [publicationType, setPublicationType] = useState(publication?.publicationType || 'Paper');
  const [pdfUrl, setPdfUrl] = useState(publication?.pdfUrl || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(publication?.thumbnailUrl || '');
  const [doiOrUrl, setDoiOrUrl] = useState(publication?.doiOrUrl || '');
  const [departmentIds, setDepartmentIds] = useState<string[]>(publication?.departmentIds || []);
  const [sectorIds, setSectorIds] = useState<string[]>(publication?.sectorIds || []);
  const [relatedProjectId, setRelatedProjectId] = useState(publication?.relatedProjectId || '');
  const [tags, setTags] = useState<string[]>(publication?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [scheduledPublishDate, setScheduledPublishDate] = useState(
    publication?.scheduledPublishDate || ''
  );
  const [seoTitle, setSeoTitle] = useState(publication?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(publication?.seoDescription || '');
  const [seoShareImage, setSeoShareImage] = useState(publication?.seoShareImage || '');
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>(
    publication?.publicationStatus || 'Draft'
  );

  const [pickerTarget, setPickerTarget] = useState<'pdf' | 'thumbnail' | 'seoShareImage' | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [thumbNotice, setThumbNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing) {
      setSlug(normalizeSlug(val, 'publication'));
    }
  };

  const generateThumbnailFromSource = async (source: string | Uint8Array, baseName: string) => {
    setGeneratingThumb(true);
    setThumbNotice(null);
    try {
      const pngDataUrl = await renderPdfPageOneDataUrl(source);
      const uploaded = await api.uploadMedia({
        name: `${normalizeSlug(baseName, 'publication')}-page1.png`,
        dataUrl: pngDataUrl,
        altText: `${title || baseName} first page thumbnail`,
        folder: 'Publications'
      });
      setThumbnailUrl(uploaded.url);
      setThumbNotice('Generated page 1 thumbnail from PDF.');
    } catch (err) {
      setThumbNotice(
        err instanceof Error
          ? `Could not auto-generate thumbnail (${err.message}). You can upload a manual cover instead.`
          : 'Could not auto-generate thumbnail. You can upload a manual cover instead.'
      );
    } finally {
      setGeneratingThumb(false);
    }
  };

  const handleDirectPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Only PDF documents are supported for publication files.');
      return;
    }
    setUploadingPdf(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.readAsDataURL(file);
      });
      const uploaded = await api.uploadMedia({
        name: file.name,
        dataUrl,
        altText: title || file.name.replace(/\.pdf$/i, ''),
        folder: 'Publications'
      });
      setPdfUrl(uploaded.url);
      if (!thumbnailUrl) {
        const buf = new Uint8Array(await file.arrayBuffer());
        await generateThumbnailFromSource(buf, title || file.name.replace(/\.pdf$/i, ''));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF upload failed.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleMediaSelected = async (asset: MediaAsset) => {
    if (pickerTarget === 'pdf') {
      setPdfUrl(asset.url);
      if (!thumbnailUrl) {
        await generateThumbnailFromSource(asset.url, title || asset.name.replace(/\.pdf$/i, ''));
      }
    } else if (pickerTarget === 'thumbnail') {
      setThumbnailUrl(asset.url);
      setThumbNotice(null);
    } else if (pickerTarget === 'seoShareImage') {
      setSeoShareImage(asset.url);
    }
    setPickerTarget(null);
  };

  const handleAddTag = () => {
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setNewTag('');
  };

  const handleSubmit = async (targetPubStatus: PublicationStatus) => {
    if (!title.trim()) {
      setError('Publication title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<Publication> = {
        title: title.trim(),
        slug: normalizeSlug(slug || title, 'publication'),
        authors: authors.trim(),
        abstract: abstract.trim(),
        publicationDate,
        publicationType,
        pdfUrl: pdfUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        doiOrUrl: doiOrUrl.trim() || undefined,
        departmentIds,
        sectorIds,
        relatedProjectId: relatedProjectId || undefined,
        tags,
        scheduledPublishDate: scheduledPublishDate || undefined,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        seoShareImage: seoShareImage.trim() || undefined,
        publicationStatus: targetPubStatus
      };
      setPublicationStatus(targetPubStatus);
      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save publication.');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewAction = async (action: 'approved' | 'rejected' | 'requested_changes') => {
    if (!publication?.id || !onReview) return;
    setSaving(true);
    setError(null);
    try {
      await onReview(publication.id, action, reviewComment.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review action failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#EDE9E0]/70 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#EDE9E0]">
              {isEditing ? `Edit Publication: ${publication?.title}` : 'New Publication'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[#EDE9E0]/80 font-semibold">
                {publicationStatus}
              </span>
              {publication?.updatedAt && (
                <span className="text-[#EDE9E0]/45 font-mono">
                  Updated {new Date(publication.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(prev => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showPreview
                ? 'bg-[#17A491]/20 border-[#25CDB6]/40 text-[#25CDB6]'
                : 'border-white/10 text-[#EDE9E0]/70 hover:bg-white/5'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('Draft')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {canPublish ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('Published')}
              className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Publish Now</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('Pending Review')}
              className="px-4 py-2 rounded-xl bg-[#D0A873] hover:bg-[#D0A873]/90 text-[#031D1C] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Review</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {publicationStatus === 'Pending Review' && canPublish && isEditing && onReview && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-300 block">Pending Editorial Review</span>
              <span className="text-[11px] text-[#EDE9E0]/65">
                Submitted by {publication?.authorName || 'Contributor'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleReviewAction('approved')}
                className="px-3 py-1.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] text-xs font-bold cursor-pointer"
              >
                Approve &amp; Publish
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleReviewAction('requested_changes')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold cursor-pointer"
              >
                Request Changes
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleReviewAction('rejected')}
                className={DESTRUCTIVE_LABEL_BTN_CLASS}
              >
                Reject
              </button>
            </div>
          </div>
          <input
            type="text"
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            placeholder="Optional reviewer note or feedback..."
            className="w-full bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-amber-400 focus:outline-none"
          />
        </div>
      )}

      {publication?.reviewComment && (
        <div className="p-3.5 rounded-2xl bg-[#031D1C] border border-[#CA7952]/40 text-xs text-[#EDE9E0]/85">
          <strong className="text-[#CA7952]">Reviewer feedback: </strong>
          {publication.reviewComment}
        </div>
      )}

      {showPreview && (
        <div className="lg:hidden flex items-center p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'editor' ? 'bg-[#17A491] text-[#06302F] shadow' : 'text-[#EDE9E0]/70 hover:text-white'
            }`}
          >
            Publication Form
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div
          className={`${
            showPreview ? 'lg:col-span-8' : 'lg:col-span-12'
          } bg-[#031D1C] rounded-2xl border border-white/10 p-6 space-y-5 ${
            showPreview && mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. Foundations of Constitutional Governance"
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">URL Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                placeholder="foundations-constitutional-governance"
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#25CDB6] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Type</label>
              <select
                value={publicationType}
                onChange={e => setPublicationType(e.target.value)}
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
              >
                {PUB_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Authors</label>
              <input
                type="text"
                value={authors}
                onChange={e => setAuthors(e.target.value)}
                placeholder="e.g. A. Verma, K. Mensah"
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Publication Date</label>
              <input
                type="date"
                value={publicationDate}
                onChange={e => setPublicationDate(e.target.value)}
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Abstract</label>
            <textarea
              rows={4}
              value={abstract}
              onChange={e => setAbstract(e.target.value)}
              placeholder="Concise summary of scope, methodology, and conclusions..."
              className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none leading-relaxed"
            />
          </div>

          {/* PDF Document + Page 1 Thumbnail */}
          <div className="p-4 rounded-2xl bg-[#06302F]/60 border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#D0A873] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>PDF Document &amp; Cover Thumbnail</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleDirectPdfUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-[#D0A873] hover:bg-[#D0A873]/90 text-[#031D1C] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploadingPdf ? 'Uploading PDF...' : 'Upload PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTarget('pdf')}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#EDE9E0] cursor-pointer"
                >
                  Choose PDF from Library
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#EDE9E0]/60 mb-1">PDF URL</label>
              <input
                type="text"
                value={pdfUrl}
                onChange={e => setPdfUrl(e.target.value)}
                placeholder="/uploads/paper.pdf or https://..."
                className="w-full bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#25CDB6] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2 border-t border-white/10">
              <div className="space-y-2">
                <label className="block text-[11px] text-[#EDE9E0]/75 font-semibold">
                  Cover Thumbnail Image
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!pdfUrl || generatingThumb}
                    onClick={() => generateThumbnailFromSource(pdfUrl, title || 'publication')}
                    className="px-3 py-1.5 rounded-xl bg-[#17A491]/20 hover:bg-[#17A491]/30 border border-[#17A491]/40 text-[#25CDB6] text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    {generatingThumb ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{generatingThumb ? 'Rendering Page 1...' : 'Generate from PDF Page 1'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerTarget('thumbnail')}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Override via Library</span>
                  </button>
                </div>
                {thumbNotice && (
                  <p className="text-[11px] text-[#EDE9E0]/65">{thumbNotice}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {thumbnailUrl && sanitizeSafeUrl(thumbnailUrl) ? (
                  <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-white/15 bg-[#031D1C]">
                    <img
                      src={sanitizeSafeUrl(thumbnailUrl)}
                      alt="Publication thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl('')}
                      aria-label="Remove thumbnail"
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-32 rounded-xl border border-dashed border-white/15 bg-[#031D1C] flex items-center justify-center text-[10px] text-[#EDE9E0]/35 text-center px-2">
                    No thumbnail
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Relations, DOI & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">DOI or External URL</label>
              <input
                type="text"
                value={doiOrUrl}
                onChange={e => setDoiOrUrl(e.target.value)}
                placeholder="https://doi.org/10.xxxx/..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Related Project (Optional)</label>
              <select
                value={relatedProjectId}
                onChange={e => setRelatedProjectId(e.target.value)}
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
              >
                <option value="">None linked</option>
                {projects
                  .filter(p => !p.deletedAt)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <OrgAssignmentPicker
            departments={departments}
            selectedDepartmentIds={departmentIds}
            selectedSectorIds={sectorIds}
            onChangeDepartments={setDepartmentIds}
            onChangeSectors={setSectorIds}
          />

          {/* Tags & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#EDE9E0]/80">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add keyword tag..."
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter(t => t !== tag))}
                        className="text-white/40 hover:text-red-300 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Scheduled Publish Date (Optional)
              </label>
              <input
                type="date"
                value={scheduledPublishDate}
                onChange={e => setScheduledPublishDate(e.target.value)}
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>
          </div>

          {/* SEO Fields */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#25CDB6]">SEO Metadata</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                placeholder="SEO Meta Title (Optional)"
                className="bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seoShareImage}
                  onChange={e => setSeoShareImage(e.target.value)}
                  placeholder="Share Image URL (Optional)"
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('seoShareImage')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer"
                >
                  Pick
                </button>
              </div>
            </div>
            <textarea
              rows={2}
              value={seoDescription}
              onChange={e => setSeoDescription(e.target.value)}
              placeholder="SEO Meta Description (Optional)"
              className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
            />
          </div>
        </div>

        {/* Live Card Preview */}
        {showPreview && (
          <div
            className={`lg:col-span-4 bg-[#031D1C] rounded-2xl border border-white/10 p-5 space-y-4 lg:sticky lg:top-6 ${
              mobileTab === 'editor' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#25CDB6] flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>Card Preview</span>
              </span>
              <span className="text-[11px] font-mono text-[#D0A873]">{publicationType}</span>
            </div>

            <div className="rounded-2xl bg-[#06302F] border border-white/10 overflow-hidden">
              {thumbnailUrl && sanitizeSafeUrl(thumbnailUrl) ? (
                <div className="aspect-[16/10] bg-black/30 overflow-hidden">
                  <img
                    src={sanitizeSafeUrl(thumbnailUrl)}
                    alt={title || 'Thumbnail'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[16/10] bg-black/20 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-[#D0A873]/50" />
                </div>
              )}

              <div className="p-4 space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#D0A873]">
                  {publicationType} · {publicationDate}
                </span>
                <h4 className="text-base font-bold text-[#EDE9E0] leading-snug">
                  {title || 'Untitled Publication'}
                </h4>
                {authors && <p className="text-xs text-[#25CDB6] font-medium">{authors}</p>}
                {abstract && (
                  <p className="text-xs text-[#EDE9E0]/70 line-clamp-4 leading-relaxed">{abstract}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <MediaPicker
        isOpen={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        onSelect={handleMediaSelected}
        allowedTypes={pickerTarget === 'pdf' ? ['document'] : ['image']}
        title={
          pickerTarget === 'pdf'
            ? 'Select Publication PDF'
            : pickerTarget === 'thumbnail'
              ? 'Select Cover Thumbnail'
              : 'Select SEO Share Image'
        }
        currentUrl={
          pickerTarget === 'pdf'
            ? pdfUrl
            : pickerTarget === 'thumbnail'
              ? thumbnailUrl
              : seoShareImage
        }
      />
    </div>
  );
};
