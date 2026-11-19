import React, { useState, useMemo, useEffect } from 'react';
import {
  Image as ImageIcon,
  FileText,
  Upload,
  Copy,
  ExternalLink,
  Check,
  AlertCircle,
  Video,
  Volume2,
  Edit3,
  RefreshCw,
  X,
  FolderOpen,
  Search
} from 'lucide-react';
import { MediaAsset, MediaUploadLimits, RoleDefinition, SiteSettings, User } from '../../../types';
import { api } from '../../../services/api';
import { can } from '../../../shared/permissions';
import { ConfirmDialog } from '../ConfirmDialog';
import { DeleteButton } from '../DeleteButton';

interface MediaTabProps {
  media: MediaAsset[];
  currentUser: User;
  roles?: RoleDefinition[];
  settings?: SiteSettings;
  onUploadMedia: (
    payload: {
      dataUrl: string;
      name: string;
      altText: string;
      caption?: string;
      credit?: string;
      folder?: string;
      tags?: string[];
    },
    onProgress?: (percent: number) => void
  ) => Promise<void>;
  onUpdateMedia: (id: string, payload: Partial<MediaAsset>) => Promise<void>;
  onReplaceMedia: (id: string, payload: { dataUrl: string; name?: string }) => Promise<void>;
  onDeleteMedia: (id: string) => Promise<void>;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file'));
    reader.readAsDataURL(file);
  });
}

export const MediaTab: React.FC<MediaTabProps> = ({
  media,
  currentUser,
  roles,
  onUploadMedia,
  onUpdateMedia,
  onReplaceMedia,
  onDeleteMedia
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadTagsText, setUploadTagsText] = useState('');
  const [uploadDataUrl, setUploadDataUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mediaLimits, setMediaLimits] = useState<MediaUploadLimits | null>(null);

  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [editName, setEditName] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editCredit, setEditCredit] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editTagsText, setEditTagsText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [replacingFile, setReplacingFile] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canUpload = can(currentUser, 'media.upload', roles) || can(currentUser, 'media.manage', roles);
  const canManageAll = can(currentUser, 'media.manage', roles);

  useEffect(() => {
    let active = true;
    api
      .getMediaLimits()
      .then(limits => {
        if (active) setMediaLimits(limits);
      })
      .catch(() => {
        // fallback handled cleanly if limits endpoint unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  const folders = useMemo(() => {
    const set = new Set<string>();
    media.forEach(m => {
      if (m.folder?.trim()) set.add(m.folder.trim());
    });
    return Array.from(set).sort();
  }, [media]);

  const filteredMedia = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return media.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (folderFilter !== 'all' && (item.folder || '') !== folderFilter) return false;
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesAlt = (item.altText || '').toLowerCase().includes(q);
        const matchesFolder = (item.folder || '').toLowerCase().includes(q);
        const matchesTag = (item.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchesName && !matchesAlt && !matchesFolder && !matchesTag) return false;
      }
      return true;
    });
  }, [media, filterType, folderFilter, searchQuery]);

  const totalBytes = useMemo(() => {
    return media.reduce((acc, cur) => acc + (cur.size || 0), 0);
  }, [media]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatLimitLabel = (bytes?: number) => {
    if (!bytes) return '';
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      setUploadError('SVG uploads are disabled for security reasons. Please choose PNG, JPG, GIF, or WebP.');
      return;
    }
    if (mediaLimits) {
      const lower = file.name.toLowerCase();
      const maxBytes =
        file.type.startsWith('video/') || /\.(mp4|webm)$/.test(lower)
          ? mediaLimits.video
          : file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg)$/.test(lower)
          ? mediaLimits.audio
          : file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(lower)
          ? mediaLimits.image
          : mediaLimits.document;
      if (maxBytes && file.size > maxBytes) {
        setUploadError(
          `File size (${formatBytes(file.size)}) exceeds the ${formatLimitLabel(maxBytes)} upload limit for this file type.`
        );
        return;
      }
    }
    setUploadName(file.name);
    setUploadAlt(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    const reader = new FileReader();
    reader.onload = () => {
      setUploadDataUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const openEditModal = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setEditName(asset.name || '');
    setEditAlt(asset.altText || '');
    setEditCaption(asset.caption || '');
    setEditCredit(asset.credit || '');
    setEditFolder(asset.folder || '');
    setEditTagsText((asset.tags || []).join(', '));
    setActionError(null);
  };

  const handleSaveEditMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setSavingEdit(true);
    setActionError(null);
    try {
      await onUpdateMedia(editingAsset.id, {
        name: editName.trim() || editingAsset.name,
        altText: editAlt.trim(),
        caption: editCaption.trim(),
        credit: editCredit.trim(),
        folder: editFolder.trim(),
        tags: editTagsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      });
      setEditingAsset(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update media metadata.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReplaceAssetFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingAsset) return;
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      setActionError('SVG uploads are disabled for security reasons.');
      return;
    }
    setReplacingFile(true);
    setActionError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await onReplaceMedia(editingAsset.id, { dataUrl, name: file.name });
      setEditingAsset(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to replace media file.');
    } finally {
      setReplacingFile(false);
    }
  };

  const handleCopyUrl = (item: MediaAsset) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(prev => (prev === item.id ? null : prev)), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Unified Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#EDE9E0]">Media Library</h2>
          <p className="text-xs text-[#EDE9E0]/60">
            {formatBytes(totalBytes)} used across {media.length} images, videos, audio clips, and documents.
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setUploadModalOpen(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap transition-all cursor-pointer self-start sm:self-auto"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.25] shrink-0" />
            <span>Upload Asset</span>
          </button>
        )}
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

      {/* Consistent Search & Filter Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="flex-1 p-3 rounded-2xl bg-[#031D1C] border border-white/10 relative w-full">
          <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-6 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search media by filename, folder, alt text, or tag..."
            className="w-full h-9 bg-[#06302F] border border-white/10 rounded-xl pl-10 pr-4 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#031D1C] border border-white/10 text-xs max-w-full overflow-x-auto no-scrollbar">
            {(['all', 'image', 'video', 'audio', 'document'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`h-9 px-3 rounded-xl font-bold capitalize transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === type
                    ? 'bg-[#17A491] text-[#06302F] shadow-sm'
                    : 'text-[#EDE9E0]/65 hover:text-white hover:bg-white/5'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {folders.length > 0 && (
            <select
              value={folderFilter}
              onChange={e => setFolderFilter(e.target.value)}
              className="h-11 px-3.5 rounded-2xl bg-[#031D1C] border border-white/10 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none cursor-pointer"
            >
              <option value="all">All Folders</option>
              {folders.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Unified Media Grid / Empty State */}
      {filteredMedia.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-[#031D1C] border border-white/10 space-y-3">
          <ImageIcon className="w-8 h-8 text-[#25CDB6] mx-auto opacity-70" />
          <h3 className="text-sm font-bold text-[#EDE9E0]">
            {media.length === 0 ? 'No media assets yet' : 'No matching media assets'}
          </h3>
          <p className="text-xs text-[#EDE9E0]/50 max-w-sm mx-auto">
            {media.length === 0
              ? 'Upload images, PDFs, videos, or audio files to reuse across departments, projects, and publications.'
              : 'Try adjusting your search query or active media filters.'}
          </p>
          {canUpload && media.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                setUploadModalOpen(true);
              }}
              className="h-9 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload First Asset</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredMedia.map(item => {
            const canModifyThis = canManageAll || item.uploadedBy === currentUser?.id;
            return (
              <div
                key={item.id}
                className="group p-2.5 rounded-2xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors flex flex-col justify-between gap-2"
              >
                <div className="h-28 rounded-xl bg-white/5 overflow-hidden flex items-center justify-center relative">
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.altText || item.name} className="w-full h-full object-cover" />
                  ) : item.type === 'video' ? (
                    <Video className="w-8 h-8 text-[#25CDB6]/70" />
                  ) : item.type === 'audio' ? (
                    <Volume2 className="w-8 h-8 text-[#D0A873]/70" />
                  ) : (
                    <FileText className="w-8 h-8 text-white/30" />
                  )}
                  {!item.altText && (
                    <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-400" title="Missing alt text" />
                  )}
                  {typeof item.usedInCount === 'number' && (
                    <span
                      className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                        item.usedInCount > 0 ? 'bg-[#031D1C]/85 text-[#25CDB6]' : 'bg-black/60 text-white/50'
                      }`}
                      title="Number of references across site"
                    >
                      {item.usedInCount} used
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <span className="text-[11px] font-bold text-[#EDE9E0] block truncate">{item.name}</span>
                  <div className="flex items-center justify-between gap-1 text-[10px] text-[#EDE9E0]/50 font-mono">
                    <span>{formatBytes(item.size)}</span>
                    {item.folder && (
                      <span className="inline-flex items-center gap-0.5 truncate text-[#25CDB6]/80">
                        <FolderOpen className="w-2.5 h-2.5 shrink-0" />
                        {item.folder}
                      </span>
                    )}
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-[#EDE9E0]/60">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(item)}
                      className="inline-flex items-center gap-1 p-1 rounded text-white/50 hover:text-white text-[10px] cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-white/40 hover:text-[#25CDB6]"
                      title="Open asset in new tab"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    {canModifyThis && (
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1 rounded text-white/40 hover:text-[#25CDB6] cursor-pointer"
                        title="Edit metadata / replace file"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                    {!item.isLocked && canModifyThis && (
                      <DeleteButton
                        onClick={() => setPendingDelete(item)}
                        title="Delete media asset"
                        ariaLabel={`Delete ${item.name}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!uploadDataUrl) return;
              setUploading(true);
              setUploadProgress(0);
              setUploadError(null);
              try {
                await onUploadMedia(
                  {
                    dataUrl: uploadDataUrl,
                    name: uploadName,
                    altText: uploadAlt,
                    folder: uploadFolder.trim(),
                    tags: uploadTagsText
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                  },
                  percent => setUploadProgress(percent)
                );
                setUploadModalOpen(false);
                setUploadDataUrl('');
                setUploadName('');
                setUploadAlt('');
                setUploadFolder('');
                setUploadTagsText('');
              } catch (err: unknown) {
                setUploadError(err instanceof Error ? err.message : 'Failed to upload asset.');
              } finally {
                setUploading(false);
                setUploadProgress(null);
              }
            }}
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[#031D1C] border border-white/15 rounded-3xl p-4 sm:p-6 space-y-4 text-[#EDE9E0] shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#EDE9E0]">Upload Media Asset</h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="p-6 border-2 border-dashed border-white/20 rounded-2xl text-center space-y-2 bg-[#06302F]/50">
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mp3,.m4a,.wav,.ogg,.pdf,.doc,.docx,image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                required
                className="hidden"
                id="fileUploadInput"
              />
              <label htmlFor="fileUploadInput" className="cursor-pointer block space-y-1">
                <Upload className="w-6 h-6 text-[#25CDB6] mx-auto mb-1" />
                <span className="text-xs font-bold text-[#EDE9E0] block">Choose file or click here</span>
                <span className="text-[11px] text-[#EDE9E0]/65 block">PNG, JPG, GIF, WebP, MP4, WebM, MP3, M4A, WAV, OGG, PDF, DOC, DOCX</span>
              </label>
              {mediaLimits && (
                <div className="text-[11px] font-mono text-[#EDE9E0]/70 pt-1">
                  Limits: Image {formatLimitLabel(mediaLimits.image)} · Document {formatLimitLabel(mediaLimits.document)} · Audio {formatLimitLabel(mediaLimits.audio)} · Video {formatLimitLabel(mediaLimits.video)}
                </div>
              )}
              {uploadName && <span className="text-xs text-[#25CDB6] font-mono block truncate">{uploadName}</span>}
            </div>

            {uploading && uploadProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#25CDB6]">
                  <span>Uploading asset...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#06302F] overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-[#25CDB6] transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Descriptive Alt Text</label>
              <input
                type="text"
                value={uploadAlt}
                onChange={e => setUploadAlt(e.target.value)}
                placeholder="Accessibility description..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Folder (optional)</label>
                <input
                  type="text"
                  value={uploadFolder}
                  onChange={e => setUploadFolder(e.target.value)}
                  placeholder="e.g. publications"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#EDE9E0]/70 block">Tags (comma separated)</label>
                <input
                  type="text"
                  value={uploadTagsText}
                  onChange={e => setUploadTagsText(e.target.value)}
                  placeholder="hero, research"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setUploadError(null);
                  setUploadModalOpen(false);
                }}
                className="h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0]/80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !uploadDataUrl}
                className="h-9 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs disabled:opacity-50 cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Save to Library'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Metadata & Replace File Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEditMetadata}
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-[#031D1C] border border-white/15 rounded-3xl p-4 sm:p-6 space-y-4 text-[#EDE9E0] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-[#EDE9E0]">Edit Media Metadata</h3>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[#EDE9E0]/70 font-semibold block">Asset Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[#EDE9E0]/70 font-semibold block">Alt Text</label>
                <input
                  type="text"
                  value={editAlt}
                  onChange={e => setEditAlt(e.target.value)}
                  placeholder="Describe this asset for screen readers"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#EDE9E0]/70 font-semibold block">Caption</label>
                <input
                  type="text"
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                  placeholder="Optional caption"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#EDE9E0]/70 font-semibold block">Credit / Attribution</label>
                <input
                  type="text"
                  value={editCredit}
                  onChange={e => setEditCredit(e.target.value)}
                  placeholder="Optional source credit"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#EDE9E0]/70 font-semibold block">Folder</label>
                <input
                  type="text"
                  value={editFolder}
                  onChange={e => setEditFolder(e.target.value)}
                  placeholder="e.g. publications"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#EDE9E0]/70 font-semibold block">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editTagsText}
                  onChange={e => setEditTagsText(e.target.value)}
                  placeholder="tag1, tag2"
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
            </div>

            {!editingAsset.isLocked && (
              <div className="p-3.5 rounded-2xl bg-[#06302F]/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-[#EDE9E0] block">Replace Underlying File</span>
                  <span className="text-[11px] text-[#EDE9E0]/50">
                    Keeps existing links pointing to this asset URL intact.
                  </span>
                </div>
                <label className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#25CDB6] cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                  <RefreshCw className={`w-3.5 h-3.5 ${replacingFile ? 'animate-spin' : ''}`} />
                  <span>{replacingFile ? 'Replacing...' : 'Replace File'}</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mp3,.m4a,.wav,.ogg,.pdf,.doc,.docx"
                    onChange={handleReplaceAssetFile}
                    disabled={replacingFile}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0]/80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="h-9 px-4 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save Metadata'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete Media Asset"
        message={
          pendingDelete
            ? `Permanently delete "${pendingDelete.name}" from storage? Any items referencing this URL will stop displaying it.`
            : ''
        }
        confirmLabel="Delete Asset"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const target = pendingDelete;
          setPendingDelete(null);
          try {
            await onDeleteMedia(target.id);
          } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete media asset.');
          }
        }}
      />
    </div>
  );
};
