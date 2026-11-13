import React, { useState, useEffect } from 'react';
import { Search, FolderKanban, Building, Image, FileText, ArrowRight, X } from 'lucide-react';
import { Project, Department, MediaAsset, SiteContent } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  departments: Department[];
  media: MediaAsset[];
  siteContent: SiteContent;
  onSelectAction: (tab: string, itemId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  projects,
  departments,
  media,
  siteContent,
  onSelectAction
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search results
  const matchedProjects = q ? projects.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.shortDescription.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  ).slice(0, 5) : [];

  const matchedDepartments = q ? departments.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.slug.toLowerCase().includes(q) ||
    (d.shortName && d.shortName.toLowerCase().includes(q))
  ).slice(0, 5) : [];

  const matchedMedia = q ? media.filter(m =>
    m.name.toLowerCase().includes(q) ||
    (m.altText && m.altText.toLowerCase().includes(q)) ||
    (m.folder && m.folder.toLowerCase().includes(q))
  ).slice(0, 5) : [];

  // Content text matches
  const matchedContent: { label: string; key: string; value: string }[] = [];
  if (q) {
    if (siteContent?.home?.heroHeadlineLine1?.toLowerCase().includes(q)) {
      matchedContent.push({ label: 'Hero Headline Line 1', key: 'home.heroHeadlineLine1', value: siteContent.home.heroHeadlineLine1 });
    }
    if (siteContent?.home?.heroHeadlineLine2?.toLowerCase().includes(q)) {
      matchedContent.push({ label: 'Hero Headline Line 2', key: 'home.heroHeadlineLine2', value: siteContent.home.heroHeadlineLine2 });
    }
    if (siteContent?.about?.founderStatement?.toLowerCase().includes(q)) {
      matchedContent.push({ label: 'Founder Statement', key: 'about.founderStatement', value: siteContent.about.founderStatement });
    }
    if (siteContent?.departments?.rddIntro?.toLowerCase().includes(q)) {
      matchedContent.push({ label: 'RDD Introduction', key: 'departments.rddIntro', value: siteContent.departments.rddIntro });
    }
  }

  const hasResults = matchedProjects.length > 0 || matchedDepartments.length > 0 || matchedMedia.length > 0 || matchedContent.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0A3D3C] border border-[#25CDB6]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#EDE9E0]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#EDE9E0]/15 gap-3 bg-[#06302F]">
          <Search className="w-5 h-5 text-[#25CDB6] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, departments, media, and site content... (Esc to close)"
            className="flex-1 bg-transparent text-sm text-[#EDE9E0] placeholder-[#EDE9E0]/40 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#EDE9E0]/50 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!q && (
            <div className="py-8 text-center text-xs text-[#EDE9E0]/50 space-y-1">
              <p>Type keywords to search across the Control Room.</p>
              <p className="font-mono text-[11px] text-[#25CDB6]">Pro-tip: Press Ctrl+K (or ⌘K) anytime</p>
            </div>
          )}

          {q && !hasResults && (
            <div className="py-8 text-center text-xs text-[#EDE9E0]/60">
              No results found for &ldquo;<span className="text-[#25CDB6]">{query}</span>&rdquo;.
            </div>
          )}

          {/* Projects */}
          {matchedProjects.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#CA7952] font-bold px-2 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Projects ({matchedProjects.length})</span>
              </span>
              {matchedProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectAction('projects', p.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#EDE9E0] block">{p.title}</span>
                    <span className="text-[#EDE9E0]/60 text-[11px] line-clamp-1">{p.shortDescription || p.category}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#17A491]/20 text-[#25CDB6] font-semibold">
                    {p.publicationStatus}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Departments */}
          {matchedDepartments.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#25CDB6] font-bold px-2 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>Departments ({matchedDepartments.length})</span>
              </span>
              {matchedDepartments.map(d => (
                <button
                  key={d.id}
                  onClick={() => {
                    onSelectAction('departments', d.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-[#EDE9E0]">{d.name}</span>
                  <span className="text-[#EDE9E0]/50 text-[11px] font-mono">/departments/{d.slug}</span>
                </button>
              ))}
            </div>
          )}

          {/* Media */}
          {matchedMedia.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#6B8AFF] font-bold px-2 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />
                <span>Media Assets ({matchedMedia.length})</span>
              </span>
              {matchedMedia.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectAction('media', m.id);
                    onClose();
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-3 text-xs"
                >
                  <img src={m.url} alt={m.name} className="w-8 h-8 rounded object-cover bg-black/40" />
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-[#EDE9E0] block truncate">{m.name}</span>
                    <span className="text-[10px] text-[#EDE9E0]/50">{m.mimeType} · {Math.round(m.size / 1024)} KB</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Content Text */}
          {matchedContent.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold px-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Site Content Matches ({matchedContent.length})</span>
              </span>
              {matchedContent.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectAction('content', c.key);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs space-y-1"
                >
                  <span className="font-bold text-[#25CDB6] text-[11px] block">{c.label}</span>
                  <p className="text-[#EDE9E0]/70 text-[11px] line-clamp-2 italic">&ldquo;{c.value}&rdquo;</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
