import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  FileText,
  Upload,
  Search,
  Filter,
  Trash2,
  Copy,
  ExternalLink,
  Tag,
  Folder,
  HardDrive,
  Check,
  AlertCircle
} from 'lucide-react';
import { MediaAsset } from '../../../types';

export type MediaSubTab = 'library' | 'brandkit' | 'documents';

interface MediaTabProps {
  initialSubTab?: MediaSubTab;
  media: MediaAsset[];
  onUploadMedia: (dataUrl: string, name: string, altText: string) => Promise<void>;
  onDeleteMedia: (id: string) => Promise<void>;
}

export const MediaTab: React.FC<MediaTabProps> = ({
  initialSubTab = 'library',
  media,
  onUploadMedia,
  onDeleteMedia
}) => {
  const [subTab, setSubTab] = useState<MediaSubTab>(initialSubTab);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [missingAltOnly, setMissingAltOnly] = useState<boolean>(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadDataUrl, setUploadDataUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Filter media
  const filteredMedia = useMemo(() => {
    return media.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (missingAltOnly && item.altText && item.altText.trim().length > 0) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.altText && item.altText.toLowerCase().includes(q));
    });
  }, [media, filterType, missingAltOnly, searchQuery]);

  // Total storage used
  const totalBytes = useMemo(() => {
    return media.reduce((acc, cur) => acc + (cur.size || 0), 0);
  }, [media]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    setUploadAlt(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    const reader = new FileReader();
    reader.onload = () => {
      setUploadDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-[#031D1C] rounded-2xl border border-white/10 text-xs">
          {[
            { id: 'library', label: 'Media Library', icon: ImageIcon, count: media.length },
            { id: 'brandkit', label: 'Brand Kit', icon: Sparkles },
            { id: 'documents', label: 'Documents', icon: FileText, count: media.filter(m => m.type === 'document').length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as MediaSubTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#17A491] text-[#06302F] shadow-sm'
                    : 'text-[#EDE9E0]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 rounded-full ${isActive ? 'bg-[#06302F]/30 text-[#06302F]' : 'bg-white/5 text-[#EDE9E0]/50'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Asset</span>
        </button>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!uploadDataUrl) return;
              setUploading(true);
              try {
                await onUploadMedia(uploadDataUrl, uploadName, uploadAlt);
                setUploadModalOpen(false);
                setUploadDataUrl('');
                setUploadName('');
                setUploadAlt('');
              } finally {
                setUploading(false);
              }
            }}
            className="w-full max-w-md bg-[#031D1C] border border-white/15 rounded-3xl p-6 space-y-4 text-[#EDE9E0] shadow-2xl"
          >
            <h3 className="text-base font-bold text-[#EDE9E0]">Upload Media Asset</h3>

            <div className="p-6 border-2 border-dashed border-white/20 rounded-2xl text-center space-y-2 bg-[#06302F]/50">
              <input type="file" onChange={handleFileUpload} required className="hidden" id="fileUploadInput" />
              <label htmlFor="fileUploadInput" className="cursor-pointer block space-y-1">
                <Upload className="w-6 h-6 text-[#25CDB6] mx-auto mb-1" />
                <span className="text-xs font-bold text-[#EDE9E0] block">Choose file or drag here</span>
                <span className="text-[10px] text-[#EDE9E0]/50 block">PNG, JPG, WebP, SVG, MP4, MP3, PDF</span>
              </label>
              {uploadName && <span className="text-xs text-[#25CDB6] font-mono block truncate">{uploadName}</span>}
            </div>

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

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !uploadDataUrl}
                className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Save to Library'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================
          1. SUB-TAB: MEDIA LIBRARY
          =================================================================== */}
      {subTab === 'library' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#EDE9E0]">Media Library</h2>
              <p className="text-xs text-[#EDE9E0]/60">
                {formatBytes(totalBytes)} used across {media.length} visual and document assets.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 text-xs">
              {(['all', 'image', 'video', 'document'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-colors cursor-pointer ${
                    filterType === type ? 'bg-[#17A491]/20 text-[#25CDB6] border border-[#17A491]/40' : 'text-white/50 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}

              <button
                onClick={() => setMissingAltOnly(!missingAltOnly)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                  missingAltOnly ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-white/40 hover:text-white'
                }`}
              >
                Missing Alt Text
              </button>
            </div>
          </div>

          {/* Media Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredMedia.map(item => (
              <div
                key={item.id}
                className="group p-2.5 rounded-2xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors flex flex-col justify-between gap-2"
              >
                <div className="h-28 rounded-xl bg-white/5 overflow-hidden flex items-center justify-center relative">
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.altText || item.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-8 h-8 text-white/30" />
                  )}
                  {!item.altText && (
                    <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-400" title="Missing alt text" />
                  )}
                </div>

                <div className="truncate">
                  <span className="text-[11px] font-bold text-[#EDE9E0] block truncate">{item.name}</span>
                  <span className="text-[10px] text-[#EDE9E0]/50 font-mono block">{formatBytes(item.size)}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(item.url);
                      alert('Asset URL copied to clipboard');
                    }}
                    className="p-1 rounded text-white/40 hover:text-white"
                    title="Copy URL"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete media asset "${item.name}"?`)) {
                        onDeleteMedia(item.id);
                      }
                    }}
                    className="p-1 rounded text-white/40 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          2. SUB-TAB: BRAND KIT
          =================================================================== */}
      {subTab === 'brandkit' && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#EDE9E0]">Official MoA Brand Kit</h2>
            <p className="text-xs text-[#EDE9E0]/60">
              Institutional insignia, emblem assets, and official brand specifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#06302F]/60 border border-white/10 space-y-3 text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-[#D0A873]/60 bg-[#06302F]">
                <img src="/drawing1.png" alt="Emblem" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xs font-bold text-[#EDE9E0]">Primary Nucleus Emblem</h3>
              <span className="text-[10px] text-[#25CDB6] font-mono block">/drawing1.png</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#06302F]/60 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-[#EDE9E0]">Palette Governance</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Deep Canvas</span>
                  <code className="text-[#25CDB6]">#06302F</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Primary Emerald</span>
                  <code className="text-[#25CDB6]">#17A491</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Teal Glow</span>
                  <code className="text-[#25CDB6]">#25CDB6</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Copper Accent</span>
                  <code className="text-[#CA7952]">#CA7952</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cream Typography</span>
                  <code className="text-[#EDE9E0]">#EDE9E0</code>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#06302F]/60 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-[#EDE9E0]">Typography Constitution</h3>
              <div className="space-y-1.5 text-xs text-[#EDE9E0]/80">
                <p><strong>Display:</strong> Cormorant Garamond / Plus Jakarta Sans</p>
                <p><strong>Body:</strong> Manrope (Strict $\ge$ 13px)</p>
                <p><strong>Data & Metrics:</strong> Tabular Numerals (font-mono)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          3. SUB-TAB: DOCUMENTS
          =================================================================== */}
      {subTab === 'documents' && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#EDE9E0]">Institutional Documents</h2>
            <p className="text-xs text-[#EDE9E0]/60">
              Charters, research monographs, whitepapers, and public PDFs.
            </p>
          </div>

          <div className="divide-y divide-white/5 rounded-2xl bg-[#06302F]/40 border border-white/10 overflow-hidden">
            {media.filter(m => m.type === 'document').length === 0 ? (
              <div className="py-16 text-center text-xs text-[#EDE9E0]/50 space-y-1">
                <p>No document files uploaded yet.</p>
                <p>Upload PDFs from the top-right button.</p>
              </div>
            ) : (
              media
                .filter(m => m.type === 'document')
                .map(doc => (
                  <div key={doc.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="w-5 h-5 text-[#25CDB6] shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-[#EDE9E0] block truncate">{doc.name}</span>
                        <span className="text-[10px] text-[#EDE9E0]/50 font-mono">{formatBytes(doc.size)}</span>
                      </div>
                    </div>

                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#25CDB6] flex items-center gap-1"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
