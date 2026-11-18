import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  Check,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { MediaAsset, MediaType } from '../types';
import { api } from '../services/api';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  allowedTypes?: MediaType[];
  title?: string;
  currentUrl?: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  allowedTypes,
  title = 'Select Media Asset',
  currentUrl
}) => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>(
    allowedTypes && allowedTypes.length === 1 ? allowedTypes[0] : 'all'
  );
  const [folderFilter, setFolderFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTypeFilter(allowedTypes && allowedTypes.length === 1 ? allowedTypes[0] : 'all');
    setSearch('');
    setFolderFilter('all');
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getMedia()
      .then(list => {
        if (active) setAssets(list);
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load media library.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, allowedTypes]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const folders = useMemo(() => {
    const set = new Set<string>();
    assets.forEach(a => {
      if (a.folder) set.add(a.folder);
    });
    return ['all', ...Array.from(set).sort()];
  }, [assets]);

  const filtered = useMemo(() => {
    return assets.filter(asset => {
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(asset.type)) {
        return false;
      }
      if (typeFilter !== 'all' && asset.type !== typeFilter) return false;
      if (folderFilter !== 'all' && (asset.folder || 'General') !== folderFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${asset.name} ${asset.altText || ''} ${(asset.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, allowedTypes, typeFilter, folderFilter, search]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const uploaded = await api.uploadMedia(
        {
          file,
          name: file.name,
          altText: file.name.replace(/\.[^.]+$/, ''),
          folder: folderFilter !== 'all' ? folderFilter : 'General'
        },
        pct => setUploadProgress(pct)
      );
      setAssets(prev => [uploaded, ...prev]);
      if (!allowedTypes || allowedTypes.includes(uploaded.type)) {
        onSelect(uploaded);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const acceptAttr =
    allowedTypes && allowedTypes.length === 1
      ? allowedTypes[0] === 'image'
        ? 'image/*'
        : allowedTypes[0] === 'document'
          ? 'application/pdf,.pdf'
          : allowedTypes[0] === 'video'
            ? 'video/*'
            : 'audio/*'
      : 'image/*,video/*,audio/*,application/pdf,.pdf';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-[#031D1C] border border-white/15 rounded-3xl shadow-2xl overflow-hidden text-[#EDE9E0]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-[#EDE9E0]">{title}</h3>
            <p className="text-xs text-[#EDE9E0]/55">
              Choose an existing asset from the Media Library or upload a new file.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              onChange={handleUploadFile}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{uploading ? `Uploading ${uploadProgress}%` : 'Upload New'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close media picker"
              className="p-2 rounded-xl text-[#EDE9E0]/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-white/10 flex flex-wrap items-center gap-3 bg-[#06302F]/50">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#EDE9E0]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search filename, alt text, tags..."
              className="w-full bg-[#031D1C] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
            />
          </div>

          {(!allowedTypes || allowedTypes.length > 1) && (
            <div className="flex items-center gap-1 bg-[#031D1C] p-1 rounded-xl border border-white/10">
              {(['all', 'image', 'document', 'video', 'audio'] as const)
                .filter(t => t === 'all' || !allowedTypes || allowedTypes.includes(t))
                .map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                      typeFilter === t ? 'bg-[#17A491] text-[#031D1C]' : 'text-[#EDE9E0]/60 hover:text-[#EDE9E0]'
                    }`}
                  >
                    {t === 'document' ? 'PDFs' : t}
                  </button>
                ))}
            </div>
          )}

          {folders.length > 1 && (
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-[#EDE9E0]/45" />
              <select
                value={folderFilter}
                onChange={e => setFolderFilter(e.target.value)}
                className="bg-[#031D1C] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
              >
                {folders.map(f => (
                  <option key={f} value={f}>
                    {f === 'all' ? 'All folders' : f}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[#CA7952]/15 border border-[#CA7952]/40 text-xs text-[#EDE9E0]">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-[#EDE9E0]/55 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#25CDB6]" />
              <span className="text-xs">Loading Media Library...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-[#EDE9E0]/55">
              <p className="text-sm font-medium text-[#EDE9E0]/75">No matching media assets found.</p>
              <p className="text-xs">Upload a new file using the button above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filtered.map(asset => {
                const isSelected = Boolean(currentUrl && asset.url === currentUrl);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSelect(asset);
                      onClose();
                    }}
                    className={`group text-left rounded-2xl border overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#25CDB6] bg-[#17A491]/15 ring-1 ring-[#25CDB6]'
                        : 'border-white/10 bg-[#06302F]/60 hover:border-[#25CDB6]/50'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-[#031D1C] flex items-center justify-center relative overflow-hidden">
                      {asset.type === 'image' ? (
                        <img
                          src={asset.url}
                          alt={asset.altText || asset.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : asset.type === 'document' ? (
                        <FileText className="w-8 h-8 text-[#D0A873]" />
                      ) : asset.type === 'video' ? (
                        <Film className="w-8 h-8 text-[#25CDB6]" />
                      ) : (
                        <Music className="w-8 h-8 text-[#17A491]" />
                      )}
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#25CDB6] text-[#031D1C] flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {asset.type === 'image' && (
                        <span className="sr-only">
                          <ImageIcon />
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-0.5">
                      <p className="text-xs font-semibold text-[#EDE9E0] truncate">{asset.name}</p>
                      <p className="text-[10px] font-mono text-[#EDE9E0]/45 truncate">
                        {asset.type} · {(asset.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
