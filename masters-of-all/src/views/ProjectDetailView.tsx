import React, { useState, useEffect } from 'react';
import { Project, Department, StoryBlockImageContent } from '../types';
import { SpaLink } from '../components/SpaLink';
import { parseVideoEmbed, sanitizeSafeUrl } from '../shared/url';
import {
  ArrowLeft,
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
  onNavigate: (path: string) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  departments,
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

  const projectDepts = departments.filter(d => (project.departmentIds || []).includes(d.id));
  const videoEmbed = parseVideoEmbed(project.videoUrl);
  const safeCover = sanitizeSafeUrl(project.coverImage);
  const safeAudio = sanitizeSafeUrl(project.audioUrl);
  const safePdf = sanitizeSafeUrl(project.pdfUrl);

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen py-10 lg:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <SpaLink
          href="/projects"
          onNavigate={onNavigate}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#25CDB6] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Our Work</span>
        </SpaLink>

        <div className="space-y-6 border-b border-[#EDE9E0]/10 pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#17A491]/20 text-[#25CDB6] border border-[#17A491]/30">
              {project.status || 'Active'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-[#EDE9E0]/70">
              {project.category || 'Initiative'}
            </span>
            {project.publicationStatus && project.publicationStatus !== 'Published' && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {project.publicationStatus}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#EDE9E0] tracking-tight leading-tight">
            {project.title}
          </h1>

          {project.shortDescription && (
            <p className="text-lg sm:text-xl text-[#EDE9E0]/80 leading-relaxed font-serif italic max-w-3xl">
              {project.shortDescription}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-[#EDE9E0]/60">
            <div className="flex flex-wrap items-center gap-6">
              {project.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#CA7952]" />
                  <span>
                    {project.startDate}
                    {project.completionDate ? ` — ${project.completionDate}` : ' (Ongoing)'}
                  </span>
                </div>
              )}

              {projectDepts.length > 0 && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#25CDB6]" />
                  <div className="flex flex-wrap gap-1.5">
                    {projectDepts.map(d => (
                      <SpaLink
                        key={d.id}
                        href={`/departments/${d.slug}`}
                        onNavigate={onNavigate}
                        className="hover:text-white underline decoration-dotted cursor-pointer"
                      >
                        {d.shortName || d.name}
                      </SpaLink>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-[#EDE9E0] transition-colors cursor-pointer"
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

        {safeCover && (
          <div className="w-full h-72 sm:h-96 md:h-[420px] rounded-2xl overflow-hidden border border-[#EDE9E0]/15 shadow-2xl relative bg-black/40">
            <img src={safeCover} alt={project.title} className="w-full h-full object-cover" />
          </div>
        )}

        {videoEmbed && (
          <div className="p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>Project Video</span>
            </h3>
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>Audio Recording</span>
            </h3>
            <audio src={safeAudio} controls className="w-full" />
          </div>
        )}

        {project.blocks && project.blocks.length > 0 && (
          <div className="space-y-6">
            {project.blocks.map(block => {
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
                      <p className="p-3 text-xs text-center text-[#EDE9E0]/60 bg-black/30">{imgObj.caption}</p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {project.fullDescription && (
          <div className="space-y-4 pt-4 border-t border-[#EDE9E0]/10">
            <h3 className="text-xl font-bold text-[#EDE9E0]">Overview &amp; Scope</h3>
            <div className="text-base text-[#EDE9E0]/85 leading-relaxed space-y-4 whitespace-pre-line">
              {project.fullDescription}
            </div>
          </div>
        )}

        {project.galleryImages && project.galleryImages.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#EDE9E0]/10">
            <h3 className="text-xl font-bold text-[#EDE9E0]">Project Gallery</h3>
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
              className="inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#25CDB6] text-xs font-bold text-[#EDE9E0] transition-colors"
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
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Documents &amp; Publications</span>
                </h4>
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
                          className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#17A491] flex items-center justify-between text-xs font-semibold text-[#EDE9E0] transition-colors"
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
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#CA7952] flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>External References</span>
                </h4>
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
                          className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#CA7952] flex items-center justify-between text-xs font-semibold text-[#EDE9E0] transition-colors"
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

        {project.credits && (
          <div className="pt-6 border-t border-[#EDE9E0]/10 text-xs text-[#EDE9E0]/60 space-y-1">
            <span className="font-bold uppercase tracking-wider text-[#EDE9E0]/40 block">Credits</span>
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
            className="fixed top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
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
