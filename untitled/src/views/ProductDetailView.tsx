import React, { useState, useEffect, useMemo } from 'react';
import { Product, Project, Department, SiteContent } from '../types';
import { SpaLink } from '../components/SpaLink';
import { EditableText } from '../components/EditableText';
import { parseVideoEmbed, sanitizeSafeUrl } from '../shared/url';
import { getUnitHref } from '../utils/orgHelpers';
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  ExternalLink,
  Download,
  Globe,
  Code,
  FileText,
  Play,
  Share2,
  Check,
  Building,
  CheckCircle2,
  X,
  Tag
} from 'lucide-react';

interface ProductDetailViewProps {
  product: Product;
  departments: Department[];
  projects?: Project[];
  content?: SiteContent;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  onNavigate: (path: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  departments,
  projects = [],
  content,
  isEditMode = false,
  onUpdateContent = () => {},
  onNavigate
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const safeCover = sanitizeSafeUrl(product.coverImage);
  const galleryList = useMemo(
    () => (product.galleryImages || []).map(img => sanitizeSafeUrl(img)).filter(Boolean) as string[],
    [product.galleryImages]
  );

  // Hero media slides: coverImage (if any) or gallery carousel
  const heroSlides = useMemo(() => {
    if (safeCover) return [safeCover];
    return galleryList;
  }, [safeCover, galleryList]);

  useEffect(() => {
    setCarouselIdx(0);
  }, [product.id]);

  useEffect(() => {
    if (!selectedGalleryImg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedGalleryImg(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedGalleryImg]);

  const unitMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach(d => map.set(d.id, d));
    return map;
  }, [departments]);

  const productUnits = (product.departmentIds || [])
    .map(id => unitMap.get(id))
    .filter(Boolean) as Department[];
  const productDepts = productUnits.filter(u => u.kind !== 'sector');
  const productSectors = [
    ...(product.sectorIds || []).map(id => unitMap.get(id)),
    ...productUnits.filter(u => u.kind === 'sector')
  ].filter(
    (u, idx, arr): u is Department =>
      Boolean(u && arr.findIndex(x => x?.id === u.id) === idx)
  );

  const relatedProjects = projects.filter(
    p => !p.deletedAt && (product.relatedProjectIds || []).includes(p.id)
  );
  const demoEmbed = parseVideoEmbed(product.demoVideoUrl);

  const downloadHref = sanitizeSafeUrl(product.links?.download);
  const websiteHref = sanitizeSafeUrl(product.links?.website);
  const repoHref = sanitizeSafeUrl(product.links?.repository);
  const docPdfHref = sanitizeSafeUrl(product.links?.documentationPdf);

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasDetailContent = Boolean(
    heroSlides.length > 0 ||
      demoEmbed ||
      product.fullDescription?.trim() ||
      product.shortDescription?.trim() ||
      (product.keyFeatures && product.keyFeatures.length > 0) ||
      (product.specs && product.specs.length > 0) ||
      relatedProjects.length > 0 ||
      downloadHref ||
      websiteHref ||
      repoHref ||
      docPdfHref
  );

  const fallbackText =
    content?.detailFallback?.moreDetailsComingSoon || 'More details coming soon.';

  return (
    <div className="min-h-screen py-10 lg:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb: Products > Name */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#EDE9E0]/70"
        >
          <SpaLink
            href="/products"
            onNavigate={onNavigate}
            className="hover:text-[#25CDB6] transition-colors cursor-pointer"
          >
            Products
          </SpaLink>
          <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
          <span className="text-[#EDE9E0] font-medium truncate max-w-[260px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* Header */}
        <div className="space-y-6 border-b border-[#EDE9E0]/10 pb-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#17A491]/20 text-[#25CDB6] border border-[#17A491]/30">
              {product.status}
            </span>
            {product.version && (
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-[#D0A873]">
                v{product.version}
              </span>
            )}
            {product.category && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-[#EDE9E0]/75">
                {product.category}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#EDE9E0] tracking-tight leading-tight">
            {product.name}
          </h1>

          {product.tagline && (
            <p className="text-lg sm:text-xl text-[#EDE9E0]/85 leading-relaxed font-serif italic max-w-3xl">
              {product.tagline}
            </p>
          )}

          {/* Meta row + Share */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-[#EDE9E0]/70">
            <div className="flex flex-wrap items-center gap-6">
              {product.releaseDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#CA7952]" />
                  <span>{product.releaseDate}</span>
                </div>
              )}

              {(productDepts.length > 0 || productSectors.length > 0) && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#25CDB6] shrink-0" />
                  <div className="flex flex-wrap gap-2">
                    {productDepts.map(d => (
                      <SpaLink
                        key={d.id}
                        href={getUnitHref(d)}
                        onNavigate={onNavigate}
                        className="hover:text-white underline decoration-dotted cursor-pointer"
                      >
                        {d.name}
                      </SpaLink>
                    ))}
                    {productSectors.map(s => (
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

          {/* Primary CTA (Download or Visit) + optional links */}
          {(downloadHref || websiteHref || repoHref || docPdfHref) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {downloadHref ? (
                <a
                  href={downloadHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              ) : websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null}

              {downloadHref && websiteHref && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#EDE9E0] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#25CDB6]" />
                  <span>Visit Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {repoHref && (
                <a
                  href={repoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#EDE9E0] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Code className="w-4 h-4 text-[#D0A873]" />
                  <span>Repository</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {docPdfHref && (
                <a
                  href={docPdfHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#EDE9E0] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#CA7952]" />
                  <span>Documentation</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Minimal entry quiet fallback (D6) */}
        {!hasDetailContent && (
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

        {/* Hero Cover or Gallery Carousel */}
        {heroSlides.length > 0 && (
          <div className="relative w-full aspect-[16/9] max-h-[460px] rounded-2xl overflow-hidden border border-[#EDE9E0]/15 shadow-2xl bg-black/30">
            <img
              src={heroSlides[carouselIdx] || heroSlides[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {heroSlides.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() =>
                    setCarouselIdx(prev => (prev - 1 + heroSlides.length) % heroSlides.length)
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#031D1C]/80 hover:bg-[#031D1C] border border-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => setCarouselIdx(prev => (prev + 1) % heroSlides.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#031D1C]/80 hover:bg-[#031D1C] border border-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        )}

        {demoEmbed && (
          <div className="p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>Demo Video</span>
            </h2>
            {demoEmbed.kind === 'iframe' ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden">
                <iframe
                  src={demoEmbed.src}
                  title="Product Demo"
                  className="w-full h-full"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <video src={demoEmbed.src} controls className="w-full max-h-[480px] rounded-xl bg-black" />
            )}
          </div>
        )}

        {(product.fullDescription?.trim() || product.shortDescription?.trim()) && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#EDE9E0]">About {product.name}</h2>
            <div className="text-base text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line max-w-[70ch]">
              {product.fullDescription || product.shortDescription}
            </div>
          </div>
        )}

        {product.keyFeatures && product.keyFeatures.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#EDE9E0]/10">
            <h2 className="text-xl font-bold text-[#EDE9E0]">Key Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.keyFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#031D1C] border border-white/10 flex items-start gap-3 text-sm text-[#EDE9E0]/85"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#25CDB6] shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {product.specs && product.specs.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#EDE9E0]/10">
            <h2 className="text-xl font-bold text-[#EDE9E0]">Specifications</h2>
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#031D1C] divide-y divide-white/10">
              {product.specs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-5 py-3.5 text-sm">
                  <span className="font-semibold text-[#25CDB6]">{spec.label}</span>
                  <span className="sm:col-span-2 text-[#EDE9E0]/85">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {safeCover && galleryList.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#EDE9E0]/10">
            <h2 className="text-xl font-bold text-[#EDE9E0]">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {galleryList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedGalleryImg(img)}
                  className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-[#17A491] transition-all cursor-pointer group"
                >
                  <img
                    src={img}
                    alt={`${product.name} screenshot ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {relatedProjects.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#EDE9E0]/10">
            <h2 className="text-xl font-bold text-[#EDE9E0]">Related Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedProjects.map(proj => (
                <SpaLink
                  key={proj.id}
                  href={`/projects/${proj.slug}`}
                  onNavigate={onNavigate}
                  className="p-5 rounded-2xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6] transition-colors block space-y-1.5 cursor-pointer"
                >
                  <h3 className="font-bold text-[#EDE9E0]">{proj.title}</h3>
                  {proj.shortDescription && (
                    <p className="text-xs text-[#EDE9E0]/70 line-clamp-2">{proj.shortDescription}</p>
                  )}
                </SpaLink>
              ))}
            </div>
          </div>
        )}

        {((product.tags && product.tags.length > 0) || product.credits) && (
          <div className="pt-6 border-t border-[#EDE9E0]/10 space-y-4">
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-[#EDE9E0]/60" />
                {product.tags.map((t, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs text-[#EDE9E0]/75"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {product.credits && (
              <div className="text-xs text-[#EDE9E0]/70 space-y-1">
                <span className="font-bold uppercase tracking-wider text-[#EDE9E0]/55 block">Credits</span>
                <p>{product.credits}</p>
              </div>
            )}
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
