import React, { useState } from 'react';
import {
  Product,
  ProductStage,
  ProductPricingType,
  ProductSpec,
  Department,
  Project,
  PublicationStatus,
  MediaAsset
} from '../../types';
import { normalizeSlug, parseVideoEmbed, sanitizeSafeUrl } from '../../shared/url';
import { MediaPicker } from '../MediaPicker';
import { OrgAssignmentPicker } from './OrgAssignmentPicker';
import { DeleteButton, DESTRUCTIVE_LABEL_BTN_CLASS } from './DeleteButton';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Image as ImageIcon,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';

interface ProductEditorProps {
  product?: Product | null;
  departments: Department[];
  projects: Project[];
  canPublish: boolean;
  onSave: (payload: Partial<Product>) => Promise<Product | void>;
  onReview?: (
    id: string,
    action: 'approved' | 'rejected' | 'requested_changes',
    comment?: string
  ) => Promise<void>;
  onCancel: () => void;
}

const PRODUCT_STAGES: ProductStage[] = ['Concept', 'In development', 'Released'];

export const ProductEditor: React.FC<ProductEditorProps> = ({
  product,
  departments,
  projects,
  canPublish,
  onSave,
  onReview,
  onCancel
}) => {
  const isEditing = Boolean(product?.id);

  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [tagline, setTagline] = useState(product?.tagline || '');
  const [category, setCategory] = useState(product?.category || 'Software & Tools');
  const [status, setStatus] = useState<ProductStage>(product?.status || 'Concept');
  const [version, setVersion] = useState(product?.version || '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription || '');
  const [fullDescription, setFullDescription] = useState(product?.fullDescription || '');
  const [keyFeatures, setKeyFeatures] = useState<string[]>(product?.keyFeatures || []);
  const [newFeature, setNewFeature] = useState('');
  const [specs, setSpecs] = useState<ProductSpec[]>(product?.specs || []);
  const [coverImage, setCoverImage] = useState(product?.coverImage || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(product?.galleryImages || []);
  const [demoVideoUrl, setDemoVideoUrl] = useState(product?.demoVideoUrl || '');
  const [releaseDate, setReleaseDate] = useState(product?.releaseDate || '');
  const [availabilityPricing, setAvailabilityPricing] = useState<ProductPricingType>(
    product?.availabilityPricing || 'free'
  );
  const [priceText, setPriceText] = useState(product?.priceText || '');
  const [downloadUrl, setDownloadUrl] = useState(product?.links?.download || '');
  const [websiteUrl, setWebsiteUrl] = useState(product?.links?.website || '');
  const [repoUrl, setRepoUrl] = useState(product?.links?.repository || '');
  const [docPdfUrl, setDocPdfUrl] = useState(product?.links?.documentationPdf || '');
  const [departmentIds, setDepartmentIds] = useState<string[]>(product?.departmentIds || []);
  const [sectorIds, setSectorIds] = useState<string[]>(product?.sectorIds || []);
  const [relatedProjectIds, setRelatedProjectIds] = useState<string[]>(product?.relatedProjectIds || []);
  const [credits, setCredits] = useState(product?.credits || '');
  const [tags, setTags] = useState<string[]>(product?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [scheduledPublishDate, setScheduledPublishDate] = useState(product?.scheduledPublishDate || '');
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription || '');
  const [seoShareImage, setSeoShareImage] = useState(product?.seoShareImage || '');
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>(
    product?.publicationStatus || 'Draft'
  );

  const [pickerTarget, setPickerTarget] = useState<
    'cover' | 'gallery' | 'docPdf' | 'seoShareImage' | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setSlug(normalizeSlug(val, 'product'));
    }
  };

  const handleMediaSelect = (asset: MediaAsset) => {
    if (pickerTarget === 'cover') setCoverImage(asset.url);
    else if (pickerTarget === 'gallery') {
      if (!galleryImages.includes(asset.url)) {
        setGalleryImages([...galleryImages, asset.url]);
      }
    } else if (pickerTarget === 'docPdf') setDocPdfUrl(asset.url);
    else if (pickerTarget === 'seoShareImage') setSeoShareImage(asset.url);
    setPickerTarget(null);
  };

  const handleAddFeature = () => {
    const f = newFeature.trim();
    if (!f) return;
    setKeyFeatures([...keyFeatures, f]);
    setNewFeature('');
  };

  const handleAddSpec = () => {
    setSpecs([...specs, { label: '', value: '' }]);
  };

  const handleToggleId = (list: string[], setter: (v: string[]) => void, id: string) => {
    setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const handleSubmit = async (targetPubStatus: PublicationStatus) => {
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<Product> = {
        name: name.trim(),
        slug: normalizeSlug(slug || name, 'product'),
        tagline: tagline.trim(),
        category: category.trim(),
        status,
        version: version.trim() || undefined,
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim(),
        keyFeatures,
        specs: specs.filter(s => s.label.trim() && s.value.trim()),
        galleryImages,
        demoVideoUrl: demoVideoUrl.trim() || undefined,
        coverImage: coverImage.trim(),
        releaseDate: releaseDate || undefined,
        availabilityPricing,
        priceText: availabilityPricing === 'paid' ? priceText.trim() || undefined : undefined,
        links: {
          download: downloadUrl.trim() || undefined,
          website: websiteUrl.trim() || undefined,
          repository: repoUrl.trim() || undefined,
          documentationPdf: docPdfUrl.trim() || undefined
        },
        departmentIds,
        sectorIds,
        relatedProjectIds,
        credits: credits.trim() || undefined,
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
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewAction = async (action: 'approved' | 'rejected' | 'requested_changes') => {
    if (!product?.id || !onReview) return;
    setSaving(true);
    setError(null);
    try {
      await onReview(product.id, action, reviewComment.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review action failed.');
    } finally {
      setSaving(false);
    }
  };

  const demoEmbed = parseVideoEmbed(demoVideoUrl);

  return (
    <div className="space-y-6 pb-20">
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
              {isEditing ? `Edit Product: ${product?.name}` : 'New Product'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[#EDE9E0]/80 font-semibold">
                {publicationStatus}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#17A491]/15 text-[#25CDB6] font-semibold">
                {status}
              </span>
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
                Submitted by {product?.authorName || 'Contributor'}
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

      {showPreview && (
        <div className="lg:hidden flex items-center p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'editor' ? 'bg-[#17A491] text-[#06302F] shadow' : 'text-[#EDE9E0]/70 hover:text-white'
            }`}
          >
            Product Form
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
        <div
          className={`${
            showPreview ? 'lg:col-span-8' : 'lg:col-span-12'
          } bg-[#031D1C] rounded-2xl border border-white/10 p-6 space-y-5 ${
            showPreview && mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Civic Policy Explorer"
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">URL Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                placeholder="civic-policy-explorer"
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#25CDB6] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Short one-line product positioning statement"
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Software & Tools, Dataset, Hardware..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Stage</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ProductStage)}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
                >
                  {PRODUCT_STAGES.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  placeholder="v1.0.0"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Short Description</label>
            <textarea
              rows={2}
              value={shortDescription}
              onChange={e => setShortDescription(e.target.value)}
              placeholder="Summary displayed on product cards..."
              className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Full Description</label>
            <textarea
              rows={5}
              value={fullDescription}
              onChange={e => setFullDescription(e.target.value)}
              placeholder="Detailed overview of capabilities, architecture, and usage..."
              className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none leading-relaxed"
            />
          </div>

          {/* Media: Cover, Gallery, Demo Video */}
          <div className="p-4 rounded-2xl bg-[#06302F]/60 border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#25CDB6]">Visual Media</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#EDE9E0]/75 block">Cover Image</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={coverImage}
                    onChange={e => setCoverImage(e.target.value)}
                    placeholder="Select or paste image URL..."
                    className="flex-1 bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPickerTarget('cover')}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Pick</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#EDE9E0]/75 block">Demo Video URL</label>
                <input
                  type="text"
                  value={demoVideoUrl}
                  onChange={e => setDemoVideoUrl(e.target.value)}
                  placeholder="YouTube, Vimeo, or MP4 URL..."
                  className="w-full bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
            </div>

            {demoEmbed && (
              <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40">
                {demoEmbed.kind === 'iframe' ? (
                  <iframe
                    src={demoEmbed.src}
                    title="Demo Video Preview"
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <video src={demoEmbed.src} controls className="w-full h-full object-cover" />
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#EDE9E0]/75">
                  Gallery Images ({galleryImages.length})
                </label>
                <button
                  type="button"
                  onClick={() => setPickerTarget('gallery')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Gallery Image</span>
                </button>
              </div>
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {galleryImages.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/30">
                      <img src={sanitizeSafeUrl(url)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key Features & Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#EDE9E0]/80 block">
                Key Features ({keyFeatures.length})
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={e => setNewFeature(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                  placeholder="Add key feature..."
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
              {keyFeatures.length > 0 && (
                <div className="space-y-1.5">
                  {keyFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#06302F] border border-white/10 text-xs"
                    >
                      <span className="truncate">{feat}</span>
                      <DeleteButton
                        onClick={() => setKeyFeatures(keyFeatures.filter((_, i) => i !== idx))}
                        title="Remove key feature"
                        ariaLabel="Remove key feature"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#EDE9E0]/80">
                  Specifications ({specs.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddSpec}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Spec</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {specs.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={spec.label}
                      onChange={e => {
                        const next = [...specs];
                        next[idx] = { ...spec, label: e.target.value };
                        setSpecs(next);
                      }}
                      placeholder="Label"
                      className="w-1/2 bg-[#06302F] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#EDE9E0] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={e => {
                        const next = [...specs];
                        next[idx] = { ...spec, value: e.target.value };
                        setSpecs(next);
                      }}
                      placeholder="Value"
                      className="w-1/2 bg-[#06302F] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#EDE9E0] focus:outline-none"
                    />
                    <DeleteButton
                      onClick={() => setSpecs(specs.filter((_, i) => i !== idx))}
                      title="Remove specification"
                      ariaLabel="Remove specification"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Availability & Distribution Links */}
          <div className="p-4 rounded-2xl bg-[#06302F]/60 border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D0A873]">
              Availability, Pricing &amp; Distribution Links
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#EDE9E0]/75 block mb-1">Availability</label>
                <select
                  value={availabilityPricing}
                  onChange={e => setAvailabilityPricing(e.target.value as ProductPricingType)}
                  className="w-full bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] cursor-pointer"
                >
                  <option value="free">Free / Open Access</option>
                  <option value="paid">Paid / License</option>
                  <option value="contact">Contact Organization</option>
                </select>
              </div>
              {availabilityPricing === 'paid' && (
                <div>
                  <label className="text-[11px] font-semibold text-[#EDE9E0]/75 block mb-1">Price Text</label>
                  <input
                    type="text"
                    value={priceText}
                    onChange={e => setPriceText(e.target.value)}
                    placeholder="e.g. $49 / institutional license"
                    className="w-full bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
                  />
                </div>
              )}
              <div>
                <label className="text-[11px] font-semibold text-[#EDE9E0]/75 block mb-1">Release Date</label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={e => setReleaseDate(e.target.value)}
                  className="w-full bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={downloadUrl}
                onChange={e => setDownloadUrl(e.target.value)}
                placeholder="Download URL (https://...)"
                className="bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
              />
              <input
                type="text"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="Live Website URL (https://...)"
                className="bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
              />
              <input
                type="text"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="Repository URL (https://...)"
                className="bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={docPdfUrl}
                  onChange={e => setDocPdfUrl(e.target.value)}
                  placeholder="Documentation PDF URL"
                  className="flex-1 bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
                />
                <button
                  type="button"
                  onClick={() => setPickerTarget('docPdf')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          <OrgAssignmentPicker
            departments={departments}
            selectedDepartmentIds={departmentIds}
            selectedSectorIds={sectorIds}
            onChangeDepartments={setDepartmentIds}
            onChangeSectors={setSectorIds}
          />

          {projects.filter(p => !p.deletedAt).length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-2">
                Related Projects ({relatedProjectIds.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {projects
                  .filter(p => !p.deletedAt)
                  .map(p => {
                    const selected = relatedProjectIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleId(relatedProjectIds, setRelatedProjectIds, p.id)}
                        className={`px-3 py-2 rounded-xl border text-left text-xs truncate transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#D0A873]/15 border-[#D0A873] text-[#D0A873]'
                            : 'bg-[#06302F] border-white/10 text-[#EDE9E0]/70 hover:border-white/25'
                        }`}
                      >
                        {p.title}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">Credits (Optional)</label>
              <input
                type="text"
                value={credits}
                onChange={e => setCredits(e.target.value)}
                placeholder="Lead engineers, contributors..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#EDE9E0]/80 mb-1.5">
                Scheduled Publish (Optional)
              </label>
              <input
                type="date"
                value={scheduledPublishDate}
                onChange={e => setScheduledPublishDate(e.target.value)}
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0]"
              />
            </div>
          </div>

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
                    const t = newTag.trim();
                    if (t && !tags.includes(t)) {
                      setTags([...tags, t]);
                      setNewTag('');
                    }
                  }
                }}
                placeholder="Add keyword tag..."
                className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0]"
              />
              <button
                type="button"
                onClick={() => {
                  const t = newTag.trim();
                  if (t && !tags.includes(t)) {
                    setTags([...tags, t]);
                    setNewTag('');
                  }
                }}
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

          {/* SEO */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-[#25CDB6]">SEO Metadata</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                placeholder="SEO Meta Title (Optional)"
                className="bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seoShareImage}
                  onChange={e => setSeoShareImage(e.target.value)}
                  placeholder="Share Image URL (Optional)"
                  className="flex-1 bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0]"
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
              className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0]"
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
                <span>Product Preview</span>
              </span>
              <span className="text-[11px] font-mono text-[#64B5D9]">{status}</span>
            </div>

            <div className="rounded-2xl bg-[#06302F] border border-white/10 overflow-hidden">
              {coverImage && sanitizeSafeUrl(coverImage) ? (
                <div className="aspect-[16/9] bg-black/30 overflow-hidden">
                  <img src={sanitizeSafeUrl(coverImage)} alt={name || 'Product'} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-black/20 flex items-center justify-center text-xs text-[#EDE9E0]/35">
                  No cover image
                </div>
              )}

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#25CDB6]">
                  <span>{category}</span>
                  {version && <span>{version}</span>}
                </div>
                <h4 className="text-base font-bold text-[#EDE9E0]">{name || 'Untitled Product'}</h4>
                {tagline && <p className="text-xs text-[#D0A873]">{tagline}</p>}
                {shortDescription && (
                  <p className="text-xs text-[#EDE9E0]/70 line-clamp-3">{shortDescription}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <MediaPicker
        isOpen={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        onSelect={handleMediaSelect}
        allowedTypes={pickerTarget === 'docPdf' ? ['document'] : ['image']}
        title={
          pickerTarget === 'docPdf'
            ? 'Select Documentation PDF'
            : pickerTarget === 'gallery'
              ? 'Add Gallery Image'
              : pickerTarget === 'cover'
                ? 'Select Cover Image'
                : 'Select SEO Share Image'
        }
        currentUrl={
          pickerTarget === 'cover'
            ? coverImage
            : pickerTarget === 'docPdf'
              ? docPdfUrl
              : seoShareImage
        }
      />
    </div>
  );
};
