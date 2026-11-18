import React, { useState, useEffect } from 'react';
import {
  Search,
  FolderKanban,
  BookOpen,
  Package,
  Building,
  Image,
  FileText,
  Video,
  Volume2,
  X
} from 'lucide-react';
import {
  Project,
  Publication,
  Product,
  Department,
  Sector,
  MediaAsset,
  SiteContent,
  User,
  RoleDefinition
} from '../../types';
import { can } from '../../shared/permissions';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  roles?: RoleDefinition[];
  projects: Project[];
  publications: Publication[];
  products: Product[];
  departments: Department[];
  sectors?: Sector[];
  media: MediaAsset[];
  siteContent: SiteContent;
  onSelectAction: (tab: string, itemId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  roles,
  projects,
  publications,
  products,
  departments,
  sectors = [],
  media,
  siteContent,
  onSelectAction
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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

  const canProjects =
    can(currentUser, 'projects.create', roles) ||
    can(currentUser, 'projects.editOwn', roles) ||
    can(currentUser, 'projects.editAll', roles) ||
    can(currentUser, 'projects.publish', roles);
  const canPublications =
    can(currentUser, 'publications.manage', roles) ||
    can(currentUser, 'projects.publish', roles);
  const canProducts =
    can(currentUser, 'products.manage', roles) ||
    can(currentUser, 'projects.publish', roles);
  const canDepartments = can(currentUser, 'departments.manage', roles);
  const canMedia = can(currentUser, 'media.upload', roles) || can(currentUser, 'media.manage', roles);
  const canWebsite = can(currentUser, 'website.edit', roles);

  const matchedProjects =
    q && canProjects
      ? projects
          .filter(
            p =>
              !p.deletedAt &&
              (p.title.toLowerCase().includes(q) ||
                (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q)))
          )
          .slice(0, 5)
      : [];

  const matchedPublications =
    q && canPublications
      ? publications
          .filter(
            pub =>
              !pub.deletedAt &&
              (pub.title.toLowerCase().includes(q) ||
                (pub.authors && pub.authors.toLowerCase().includes(q)) ||
                (pub.publicationType && pub.publicationType.toLowerCase().includes(q)))
          )
          .slice(0, 5)
      : [];

  const matchedProducts =
    q && canProducts
      ? products
          .filter(
            prod =>
              !prod.deletedAt &&
              (prod.name.toLowerCase().includes(q) ||
                (prod.tagline && prod.tagline.toLowerCase().includes(q)) ||
                (prod.category && prod.category.toLowerCase().includes(q)))
          )
          .slice(0, 5)
      : [];

  const matchedDepartments =
    q && canDepartments
      ? departments
          .filter(
            d =>
              !d.deletedAt &&
              (d.name.toLowerCase().includes(q) ||
                d.slug.toLowerCase().includes(q) ||
                (d.shortName && d.shortName.toLowerCase().includes(q)))
          )
          .slice(0, 5)
      : [];

  const matchedSectors =
    q && canDepartments
      ? sectors
          .filter(
            s =>
              !s.deletedAt &&
              (s.name.toLowerCase().includes(q) ||
                s.slug.toLowerCase().includes(q) ||
                (s.shortName && s.shortName.toLowerCase().includes(q)))
          )
          .slice(0, 5)
      : [];

  const matchedMedia =
    q && canMedia
      ? media
          .filter(
            m =>
              m.name.toLowerCase().includes(q) ||
              (m.altText && m.altText.toLowerCase().includes(q)) ||
              (m.folder && m.folder.toLowerCase().includes(q))
          )
          .slice(0, 5)
      : [];

  const matchedContent: { label: string; key: string; value: string }[] = [];
  if (q && canWebsite) {
    if (siteContent?.home?.heroHeadlineLine1?.toLowerCase().includes(q)) {
      matchedContent.push({
        label: 'Hero Headline Line 1',
        key: 'home.heroHeadlineLine1',
        value: siteContent.home.heroHeadlineLine1
      });
    }
    if (siteContent?.home?.heroHeadlineLine2?.toLowerCase().includes(q)) {
      matchedContent.push({
        label: 'Hero Headline Line 2',
        key: 'home.heroHeadlineLine2',
        value: siteContent.home.heroHeadlineLine2
      });
    }
    if (siteContent?.about?.founderStatement?.toLowerCase().includes(q)) {
      matchedContent.push({
        label: 'Founder Statement',
        key: 'about.founderStatement',
        value: siteContent.about.founderStatement
      });
    }
    if (siteContent?.departments?.rddIntro?.toLowerCase().includes(q)) {
      matchedContent.push({
        label: 'RDD Introduction',
        key: 'departments.rddIntro',
        value: siteContent.departments.rddIntro
      });
    }
  }

  const hasResults =
    matchedProjects.length > 0 ||
    matchedPublications.length > 0 ||
    matchedProducts.length > 0 ||
    matchedDepartments.length > 0 ||
    matchedSectors.length > 0 ||
    matchedMedia.length > 0 ||
    matchedContent.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Global Control Room Search"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0A3D3C] border border-[#25CDB6]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#EDE9E0]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-[#EDE9E0]/15 gap-3 bg-[#06302F]">
          <Search className="w-5 h-5 text-[#25CDB6] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search permitted workspace records... (Esc to close)"
            className="flex-1 bg-transparent text-sm text-[#EDE9E0] placeholder-[#EDE9E0]/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 rounded-lg text-[#EDE9E0]/50 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!q && (
            <div className="py-8 text-center text-xs text-[#EDE9E0]/50 space-y-1">
              <p>Type keywords to search across your permitted Control Room sections.</p>
              <p className="font-mono text-[11px] text-[#25CDB6]">Press Ctrl+K (or ⌘K) anytime</p>
            </div>
          )}

          {q && !hasResults && (
            <div className="py-8 text-center text-xs text-[#EDE9E0]/60">
              No results found for &ldquo;<span className="text-[#25CDB6]">{query}</span>&rdquo;.
            </div>
          )}

          {matchedProjects.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#CA7952] font-bold px-2 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Projects ({matchedProjects.length})</span>
              </span>
              {matchedProjects.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelectAction('projects', p.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs cursor-pointer"
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

          {matchedPublications.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#D0A873] font-bold px-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Publications ({matchedPublications.length})</span>
              </span>
              {matchedPublications.map(pub => (
                <button
                  key={pub.id}
                  type="button"
                  onClick={() => {
                    onSelectAction('publications', pub.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-[#EDE9E0] block">{pub.title}</span>
                    <span className="text-[#EDE9E0]/60 text-[11px] line-clamp-1">{pub.authors || pub.publicationType}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#D0A873]/20 text-[#D0A873] font-semibold">
                    {pub.publicationStatus}
                  </span>
                </button>
              ))}
            </div>
          )}

          {matchedProducts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#64B5D9] font-bold px-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Products ({matchedProducts.length})</span>
              </span>
              {matchedProducts.map(prod => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => {
                    onSelectAction('products', prod.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-[#EDE9E0] block">{prod.name}</span>
                    <span className="text-[#EDE9E0]/60 text-[11px] line-clamp-1">{prod.tagline || prod.category}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#64B5D9]/20 text-[#64B5D9] font-semibold">
                    {prod.publicationStatus}
                  </span>
                </button>
              ))}
            </div>
          )}

          {matchedDepartments.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#25CDB6] font-bold px-2 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>Departments ({matchedDepartments.length})</span>
              </span>
              {matchedDepartments.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onSelectAction('departments', d.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="font-bold text-[#EDE9E0]">{d.name}</span>
                  <span className="text-[#EDE9E0]/50 text-[11px] font-mono">/departments/{d.slug}</span>
                </button>
              ))}
            </div>
          )}

          {matchedSectors.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#25CDB6] font-bold px-2 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>RDD Sectors ({matchedSectors.length})</span>
              </span>
              {matchedSectors.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelectAction('sectors', s.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="font-bold text-[#EDE9E0]">{s.name}</span>
                  <span className="text-[#EDE9E0]/50 text-[11px] font-mono">/departments/rdd/{s.slug}</span>
                </button>
              ))}
            </div>
          )}

          {matchedMedia.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-[#6B8AFF] font-bold px-2 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />
                <span>Media Assets ({matchedMedia.length})</span>
              </span>
              {matchedMedia.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelectAction('media', m.id);
                    onClose();
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-3 text-xs cursor-pointer"
                >
                  {m.type === 'image' ? (
                    <img src={m.url} alt={m.name} className="w-8 h-8 rounded object-cover bg-black/40 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                      {m.type === 'video' ? (
                        <Video className="w-4 h-4 text-[#25CDB6]" />
                      ) : m.type === 'audio' ? (
                        <Volume2 className="w-4 h-4 text-[#CA7952]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#D0A873]" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-[#EDE9E0] block truncate">{m.name}</span>
                    <span className="text-[10px] text-[#EDE9E0]/50">{m.mimeType} · {Math.round(m.size / 1024)} KB</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {matchedContent.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold px-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Site Content Matches ({matchedContent.length})</span>
              </span>
              {matchedContent.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectAction('site-content', c.key);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs space-y-1 cursor-pointer"
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
