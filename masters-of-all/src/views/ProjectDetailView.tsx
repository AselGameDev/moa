import React, { useState, useEffect, useMemo } from 'react';
import { Project, Department, StoryBlockImageContent, SiteContent } from '../types';
import { SpaLink } from '../components/SpaLink';
import { EditableText } from '../components/EditableText';
import { parseVideoEmbed, sanitizeSafeUrl } from '../shared/url';
import { getUnitHref } from '../utils/orgHelpers';
import {
  ChevronRight,
  Calendar,
  ExternalLink,
  FileText,
  Play,
  Volume2,
  Share2,
  Check,
  Building,
  X
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: Project;
  departments: Department[];
  relatedProjects?: Project[];
  content?: SiteContent;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  onNavigate: (path: string) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  departments,
  relatedProjects = [],
  content,
  isEditMode = false,
  onUpdateContent = () => {},
  onNavigate
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGalleryImg) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedGalleryImg(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGalleryImg]);

  const unitMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach(d => map.set(d.id, d));
    return map;
  }, [departments]);

  const projectUnits = (project.departmentIds || [])
    .map(id => unitMap.get(id))
    .filter(Boolean) as Department[];
  const projectDepts = projectUnits.filter(u => u.kind !== 'sector');
  const projectSectors = [
    ...(project.sectorIds || []).map(id => unitMap.get(id)),
    ...projectUnits.filter(u => u.kind === 'sector')
  ].filter(
    (u, idx, arr): u is Department =>
      Boolean(u && arr.findIndex(x => x?.id === u.id) === idx)
  );

  const videoEmbed = parseVideoEmbed(project.videoUrl);
  const safeCover = sanitizeSafeUrl(project.coverImage);
  const safeAudio = sanitizeSafeUrl(project.audioUrl);
  const safePdf = sanitizeSafeUrl(project.pdfUrl);

  const nonEmptyBlocks = useMemo(() => {
    return (project.blocks || []).filter(block => {
      if (block.type === 'divider') return true;
      if (typeof block.content === 'string') return block.content.trim().length > 0;
      if (Array.isArray(block.content)) return block.content.length > 0;
      if (block.content && typeof block.content === 'object') {
        const vals = Object.values(block.content);
        return vals.some(v => (typeof v === 'string' ? v.trim().length > 0 : Boolean(v)));
      }
      return false;
    });
  }, [project.blocks]);

  const hasBodyDetails = Boolean(
    safeCover ||
      project.shortDescription?.trim() ||
      project.fullDescription?.trim() ||
      nonEmptyBlocks.length > 0 ||
      videoEmbed ||
      safeAudio ||
      safePdf ||
      (project.galleryImages && project.galleryImages.length > 0) ||
      (project.documents && project.documents.length > 0) ||
      (project.externalLinks && project.externalLinks.length > 0)
  );

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fallbackText =
    content?.detailFallback?.moreDetailsComingSoon || 'More details coming soon.';

  return (
    <div className="min-h-screen py-10 lg:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb: Projects > Title */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#EDE9E0]/70"
        >
          <SpaLink
            href="/projects"
            onNavigate={onNavigate}
            className="hover:text-[#25CDB6] transition-colors cursor-pointer"
          >
            {content?.detailFallback?.backToProjectsLabel || 'Projects'}
          </SpaLink>
          <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
          <span className="text-[#EDE9E0] font-medium truncate max-w-[260px] sm:max-w-none">
            {project.title}
          </span>
        </nav>

        {/* Title & Meta Row */}
        <div className="space-y-6 border-b border-[#EDE9E0]/10 pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#17A491]/20 text-[#25CDB6] border border-[#17A491]/30">
              {project.status || 'Active'}
            </span>
            {project.category && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-[#EDE9E0]/75">
                {project.category}
              </span>
            )}
            {project.publicationStatus && project.publicationStatus !== 'Published' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {project.publicationStatus}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#EDE9E0] tracking-tight leading-tight">
            {project.title}
          </h1>

          {project.shortDescription?.trim() && (
            <p className="text-lg sm:text-xl text-[#EDE9E0]/85 leading-relaxed font-serif italic max-w-3xl">
              {project.shortDescription}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-[#EDE9E0]/70">
            <div className="flex flex-wrap items-center gap-6">
              {project.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#CA7952]" />
                  <span>
                    {project.startDate}
                    {project.completionDate ? ` — ${project.completionDate}` : ''}
                  </span>
                </div>
              )}

              {(projectDepts.length > 0 || projectSectors.length > 0) && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#25CDB6] shrink-0" />
                  <div className="flex flex-wrap gap-2">
                    {projectDepts.map(d => (
                      <SpaLink
                        key={d.id}
                        href={getUnitHref(d)}
                        onNavigate={onNavigate}
                        className="hover:text-white underline decoration-dotted cursor-pointer"
                      >
                        {d.name}
                      </SpaLink>
                    ))}
                    {projectSectors.map(s => (
                      <SpaLink
                        key={s.id}
                        href={getUnitHref(s)}
                        onNavigate={onNavigate}
                        className="text-[#CA7952] hover:text-white underline decoration-dotted cursor-pointer"
                      >
                        {s.name}
                      </SpaLink>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-[#EDE9E0] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Minimal entry quiet fallback (D6) */}
        {!hasBodyDetails && (
          <div className="py-8 text-sm text-[#EDE9E0]/65 italic">
            <EditableText
              value={fallbackText}
              fieldPath="detailFallback.moreDetailsComingSoon"
              label="Detail Fallback Copy"
              isEditMode={isEditMode}
              onUpdate={onUpdateContent}
            />
          </div>
        )}

        {safeCover && (
          <div className="w-full h-72 sm:h-96 md:h-[420px] rounded-2xl overflow-hidden border border-[#EDE9E0]/15 shadow-2xl relative bg-black/40">
            <img src={safeCover} alt={project.title} className="w-full h-full object-cover" />
          </div>
        )}

        {videoEmbed && (
          <div className="p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>Project Video</span>
            </h2>
            {videoEmbed.kind === 'iframe' ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden">
                <iframe
                  src={videoEmbed.src}
                  title="Project Video"
                  className="w-full h-full"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <video src={videoEmbed.src} controls className="w-full max-h-[480px] rounded-xl bg-black" />
            )}
          </div>
        )}

        {safeAudio && (
          <div className="p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>Audio Recording</span>
            </h2>
            <audio src={safeAudio} controls className="w-full" />
          </div>
        )}

        {nonEmptyBlocks.length > 0 && (
          <div className="space-y-6 max-w-[70ch]">
            {nonEmptyBlocks.map(block => {
              if (block.type === 'heading') {
                return (
                  <h2 key={block.id} className="text-2xl font-bold text-[#EDE9E0] pt-2">
                    {typeof block.content === 'string' ? block.content : ''}
                  </h2>
                );
              }
              if (block.type === 'text') {
                return (
                  <div
                    key={block.id}
                    className="prose prose-invert max-w-none text-base text-[#EDE9E0]/85 whitespace-pre-wrap leading-relaxed"
                  >
                    {typeof block.content === 'string' ? block.content : ''}
                  </div>
                );
              }
              if (block.type === 'quote') {
                return (
                  <blockquote
                    key={block.id}
                    className="border-l-4 border-[#CA7952] pl-6 py-2 my-6 font-serif italic text-xl text-[#EDE9E0]/90"
                  >
                    &ldquo;{typeof block.content === 'string' ? block.content : ''}&rdquo;
                  </blockquote>
                );
              }
              if (block.type === 'callout') {
                return (
                  <div
                    key={block.id}
                    className="p-5 rounded-xl bg-[#031D1C] border border-[#25CDB6]/30 text-sm sm:text-base text-[#EDE9E0]/90 leading-relaxed"
                  >
                    {typeof block.content === 'string' ? block.content : ''}
                  </div>
                );
              }
              if (block.type === 'divider') {
                return <hr key={block.id} className="border-[#EDE9E0]/15 my-6" />;
              }
              if (block.type === 'image') {
                const imgObj =
                  typeof block.content === 'object' && !Array.isArray(block.content)
                    ? (block.content as StoryBlockImageContent)
                    : null;
                const rawSrc = imgObj?.url || (typeof block.content === 'string' ? block.content : '');
                const imgSrc = sanitizeSafeUrl(rawSrc);
                if (!imgSrc) return null;
                return (
                  <div key={block.id} className="my-6 rounded-xl overflow-hidden border border-white/10">
                    <img src={imgSrc} alt={imgObj?.alt || 'Project visual'} className="w-full object-cover" />
                    {imgObj?.caption && (
                      <p className="p-3 text-xs text-center text-[#EDE9E0]/70 bg-black/30">{imgObj.caption}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {project.fullDescription?.trim() && (
          <div className="space-y-4 pt-4 border-t border-[#EDE9E0]/10 max-w-[70ch]">
            <h2 className="text-xl font-bold text-[#EDE9E0]">Overview</h2>
            <div className="text-base text-[#EDE9E0]/85 leading-relaxed space-y-4 whitespace-pre-line">
              {project.fullDescription}
            </div>
          </div>
        )}

        {project.galleryImages && project.galleryImages.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#EDE9E0]/10">
            <h2 className="text-xl font-bold text-[#EDE9E0]">Project Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {project.galleryImages
                .map(img => sanitizeSafeUrl(img))
                .filter(Boolean)
                .map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedGalleryImg(img)}
                    className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-[#17A491] transition-all cursor-pointer group"
                  >
                    <img
                      src={img}
                      alt={`Gallery asset ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </button>
                ))}
            </div>
          </div>
        )}

        {safePdf && (
          <div className="pt-4">
            <a
              href={safePdf}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#25CDB6] text-xs font-bold text-[#EDE9E0] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#25CDB6]" />
              <span>View Project PDF Brief</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#25CDB6]" />
            </a>
          </div>
        )}

        {((project.documents && project.documents.length > 0) ||
          (project.externalLinks && project.externalLinks.length > 0)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[#EDE9E0]/10">
            {project.documents && project.documents.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Documents &amp; Publications</span>
                </h3>
                <ul className="space-y-2">
                  {project.documents.map((doc, idx) => {
                    const href = sanitizeSafeUrl(doc.url);
                    if (!href) return null;
                    return (
                      <li key={idx}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#17A491] flex items-center justify-between text-xs font-semibold text-[#EDE9E0] transition-colors"
                        >
                          <span className="truncate">{doc.label}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#25CDB6]" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {project.externalLinks && project.externalLinks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#CA7952] flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>External References</span>
                </h3>
                <ul className="space-y-2">
                  {project.externalLinks.map((link, idx) => {
                    const href = sanitizeSafeUrl(link.url);
                    if (!href) return null;
                    return (
                      <li key={idx}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#CA7952] flex items-center justify-between text-xs font-semibold text-[#EDE9E0] transition-colors"
                        >
                          <span className="truncate">{link.label}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#CA7952]" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {relatedProjects.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#EDE9E0]/10">
            <h2 className="text-xl font-bold text-[#EDE9E0]">Related Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedProjects.map(rel => (
                <SpaLink
                  key={rel.id}
                  href={`/projects/${rel.slug}`}
                  onNavigate={onNavigate}
                  className="p-5 rounded-2xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6] transition-colors block space-y-1.5 cursor-pointer"
                >
                  <h3 className="font-bold text-[#EDE9E0]">{rel.title}</h3>
                  {rel.shortDescription && (
                    <p className="text-xs text-[#EDE9E0]/70 line-clamp-2">{rel.shortDescription}</p>
                  )}
                </SpaLink>
              ))}
            </div>
          </div>
        )}

        {project.credits && (
          <div className="pt-6 border-t border-[#EDE9E0]/10 text-xs text-[#EDE9E0]/70 space-y-1">
            <span className="font-bold uppercase tracking-wider text-[#EDE9E0]/55 block">Credits</span>
            <p>{project.credits}</p>
          </div>
        )}
      </div>

      {selectedGalleryImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery preview"
          onClick={() => setSelectedGalleryImg(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedGalleryImg(null)}
            aria-label="Close gallery preview"
            className="fixed top-5 right-5 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={selectedGalleryImg}
            alt="Gallery preview"
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
