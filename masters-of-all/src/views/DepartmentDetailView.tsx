import React, { useMemo, useState, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  Department,
  Project,
  Publication,
  Product,
  SiteContent,
  AreaOfFocusCard,
  InitiativeItem
} from '../types';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { DepartmentLogo } from '../components/DepartmentLogo';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { sanitizeSafeUrl } from '../shared/url';
import { getUnitHref, isRddDepartment, isSector, splitOrgUnits } from '../utils/orgHelpers';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FileText,
  Layers,
  Package,
  ExternalLink,
  Compass,
  Sparkles,
  Image as ImageIcon,
  X
} from 'lucide-react';

interface DepartmentDetailViewProps {
  department: Department;
  allDepartments?: Department[];
  relatedProjects: Project[];
  relatedPublications?: Publication[];
  relatedProducts?: Product[];
  content?: SiteContent;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  onUpdateDepartment?: (departmentId: string, patch: Partial<Department>) => void;
  rddLogoUrl?: string;
  onNavigate: (path: string) => void;
}

type RelatedTab = 'all' | 'projects' | 'publications' | 'products';

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STATUS_DOT_CLASSES: Record<string, string> = {
  Active: 'bg-[#25CDB6]',
  'In Development': 'bg-[#D0A873]',
  Planned: 'bg-[#CA7952]',
  Completed: 'bg-[#EDE9E0]'
};

const SafeWorkMedia: React.FC<{ src?: string; alt: string; fallbackIcon: React.ReactNode }> = ({
  src,
  alt,
  fallbackIcon
}) => {
  const [failed, setFailed] = useState(false);
  const safeSrc = sanitizeSafeUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [safeSrc]);

  if (!safeSrc || failed) {
    return (
      <div className="aspect-[16/10] w-full rounded-xl bg-[#06302F]/55 border border-white/10 flex items-center justify-center text-[#25CDB6]/75">
        {fallbackIcon}
      </div>
    );
  }

  return (
    <div className="aspect-[16/10] w-full rounded-xl overflow-hidden border border-white/10 bg-[#021413]">
      <img
        src={safeSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
};

export const DepartmentDetailView: React.FC<DepartmentDetailViewProps> = ({
  department,
  allDepartments = [],
  relatedProjects,
  relatedPublications = [],
  relatedProducts = [],
  content: rawContent,
  isEditMode = false,
  onUpdateContent = () => {},
  onUpdateDepartment = () => {},
  rddLogoUrl = '',
  onNavigate
}) => {
  const { content } = useContent(rawContent);
  const prefersReducedMotion = useReducedMotion();
  const unitIsSector = isSector(department);
  const unitIsRdd = !unitIsSector && isRddDepartment(department);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Portal-ordered siblings (RDD last for departments; displayOrder for sectors)
  const { departments: orderedDepts, sectors: orderedSectors } = useMemo(
    () => splitOrgUnits(allDepartments.filter(d => d.published && !d.deletedAt)),
    [allDepartments]
  );

  const siblings = unitIsSector ? orderedSectors : orderedDepts;
  const currentIndex = siblings.findIndex(d => d.id === department.id);
  const prevUnit =
    siblings.length > 1
      ? currentIndex > 0
        ? siblings[currentIndex - 1]
        : siblings[siblings.length - 1]
      : null;
  const nextUnit =
    siblings.length > 1
      ? currentIndex < siblings.length - 1
        ? siblings[currentIndex + 1]
        : siblings[0]
      : null;

  // Normalize Areas of Focus (prefer structured cards when present, fallback to flat string array)
  const focusCards: AreaOfFocusCard[] = useMemo(() => {
    const structured = (department.structuredAreasOfFocus || []).filter(
      item => item && (item.title?.trim() || item.description?.trim())
    );
    if (structured.length > 0) {
      return structured;
    }
    return (department.areasOfFocus || [])
      .map(s => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean)
      .map((title, idx) => ({
        id: `focus-legacy-${idx}`,
        title,
        description: ''
      }));
  }, [department.structuredAreasOfFocus, department.areasOfFocus]);

  // Normalize Initiatives (prefer structured items when present, fallback to flat string array)
  const initiativeItems: InitiativeItem[] = useMemo(() => {
    const structured = (department.structuredInitiatives || []).filter(
      item => item && item.title?.trim()
    );
    if (structured.length > 0) {
      return structured;
    }
    return (department.initiatives || [])
      .map(s => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean)
      .map((title, idx) => ({
        id: `init-legacy-${idx}`,
        title,
        status: 'Active' as const,
        summary: '',
        link: ''
      }));
  }, [department.structuredInitiatives, department.initiatives]);

  // Sanitized media showcase gallery URLs (deduplicated)
  const galleryList: string[] = useMemo(() => {
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const raw of department.galleryImages || []) {
      const safe = sanitizeSafeUrl(raw);
      if (safe && !seen.has(safe)) {
        seen.add(safe);
        urls.push(safe);
      }
    }
    return urls;
  }, [department.galleryImages]);

  const totalWorkCount =
    relatedProjects.length + relatedPublications.length + relatedProducts.length;
  const hasRelatedWork = totalWorkCount > 0;

  const availableWorkTabs = useMemo(() => {
    const list: Array<{ id: RelatedTab; label: string; count: number }> = [];
    const categoryCount =
      (relatedProjects.length > 0 ? 1 : 0) +
      (relatedPublications.length > 0 ? 1 : 0) +
      (relatedProducts.length > 0 ? 1 : 0);

    if (categoryCount > 1) {
      list.push({ id: 'all', label: 'All Work', count: totalWorkCount });
    }
    if (relatedProjects.length > 0) {
      list.push({ id: 'projects', label: 'Projects', count: relatedProjects.length });
    }
    if (relatedPublications.length > 0) {
      list.push({ id: 'publications', label: 'Publications', count: relatedPublications.length });
    }
    if (relatedProducts.length > 0) {
      list.push({ id: 'products', label: 'Products', count: relatedProducts.length });
    }
    return list;
  }, [
    relatedProjects.length,
    relatedPublications.length,
    relatedProducts.length,
    totalWorkCount
  ]);

  const [activeWorkTab, setActiveWorkTab] = useState<RelatedTab>(
    () => availableWorkTabs[0]?.id || 'all'
  );

  // Reset active tab when switching units or when available tabs change
  useEffect(() => {
    if (availableWorkTabs.length === 0) return;
    setActiveWorkTab(prev =>
      availableWorkTabs.some(t => t.id === prev) ? prev : availableWorkTabs[0].id
    );
  }, [department.id, availableWorkTabs]);

  useEffect(() => {
    setActiveWorkTab(availableWorkTabs[0]?.id || 'all');
  }, [department.id]);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxImage]);

  // Child sectors belonging to this department (e.g. RDD sectors)
  const childSectors = useMemo(
    () => orderedSectors.filter(d => d.parentDepartmentId === department.id || unitIsRdd),
    [orderedSectors, department.id, unitIsRdd]
  );

  // Department & Sector dynamic chapter outlines
  const aboutText = (department.introduction || '').trim();
  const purposeText = (department.purpose || '').trim();
  const missionText = (department.mission || '').trim();
  const hasOverview = Boolean(aboutText || purposeText || missionText || galleryList.length > 0 || isEditMode);

  const deptChapters = useMemo(() => {
    if (unitIsSector) return [];
    const list: Array<{ id: string; num: string; label: string; count?: number }> = [];
    const pushSec = (id: string, label: string, count?: number) => {
      list.push({ id, num: String(list.length + 1).padStart(2, '0'), label, count });
    };
    if (hasOverview) pushSec('dept-overview', 'Overview & Charter');
    if (focusCards.length > 0) pushSec('dept-focus', 'Areas of Focus', focusCards.length);
    if (initiativeItems.length > 0) pushSec('dept-initiatives', 'Initiatives', initiativeItems.length);
    if (childSectors.length > 0) pushSec('dept-sectors', 'Research Sectors', childSectors.length);
    if (hasRelatedWork) pushSec('dept-related-work', 'Related Work', totalWorkCount);
    return list;
  }, [
    unitIsSector,
    hasOverview,
    focusCards.length,
    initiativeItems.length,
    childSectors.length,
    hasRelatedWork,
    totalWorkCount
  ]);

  const sectorSections = useMemo(() => {
    if (!unitIsSector) return [];
    const list: Array<{ id: string; num: string; label: string }> = [];
    const pushSec = (id: string, label: string) => {
      list.push({ id, num: String(list.length + 1).padStart(2, '0'), label });
    };
    if (aboutText || isEditMode) pushSec('overview', 'Overview');
    if (purposeText) pushSec('purpose', 'Purpose');
    if (missionText) pushSec('mission', 'Mission');
    if (galleryList.length > 0) pushSec('media', 'Media Gallery');
    if (focusCards.length > 0) pushSec('focus', 'Areas of Focus');
    if (initiativeItems.length > 0) pushSec('initiatives', 'Initiatives');
    if (hasRelatedWork) pushSec('related-work', 'Related Work');
    return list;
  }, [
    unitIsSector,
    aboutText,
    purposeText,
    missionText,
    galleryList.length,
    focusCards.length,
    initiativeItems.length,
    hasRelatedWork,
    isEditMode
  ]);

  const [activeSectorSection, setActiveSectorSection] = useState<string>(
    () => sectorSections[0]?.id || 'overview'
  );

  useEffect(() => {
    if (sectorSections.length > 0 && !sectorSections.some(s => s.id === activeSectorSection)) {
      setActiveSectorSection(sectorSections[0].id);
    }
  }, [sectorSections, activeSectorSection]);

  // Track visible section while scrolling on Sector page
  useEffect(() => {
    if (!unitIsSector || sectorSections.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible?.target?.id) {
          setActiveSectorSection(visible.target.id);
        }
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: 0.05 }
    );
    sectorSections.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [unitIsSector, sectorSections]);

  // Helper to render gallery showcase grid
  const renderGalleryShowcase = (sectionId?: string) => {
    if (galleryList.length === 0) return null;
    return (
      <div id={sectionId} className="scroll-mt-sticky space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-mono uppercase tracking-wider font-semibold text-[#25CDB6] flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            <span>Media Showcase</span>
          </h3>
          <span className="text-[12px] font-mono text-[#EDE9E0]/55 tabular-nums">
            {galleryList.length} {galleryList.length === 1 ? 'frame' : 'frames'}
          </span>
        </div>

        <div
          className={`grid gap-4 ${
            galleryList.length === 1
              ? 'grid-cols-1'
              : galleryList.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {galleryList.map((imgUrl, idx) => (
            <motion.button
              key={`${imgUrl}-${idx}`}
              type="button"
              onClick={() => setLightboxImage(imgUrl)}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{
                duration: 0.32,
                delay: Math.min(idx * 0.05, 0.25),
                ease: EASE_OUT_EXPO
              }}
              className="group relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-white/10 bg-[#031D1C] hover:border-[#25CDB6]/65 transition-colors cursor-pointer text-left"
              aria-label={`View media frame ${idx + 1} for ${department.name}`}
            >
              <img
                src={imgUrl}
                alt={`${department.name} media showcase ${idx + 1}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#031D1C]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <span className="absolute bottom-3 left-3 font-mono text-[11px] uppercase tracking-wider text-[#EDE9E0]/90 opacity-0 group-hover:opacity-100 transition-opacity">
                {String(idx + 1).padStart(2, '0')} &middot; Expand
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  // Render clean modern editorial work cards (supports Projects, Publications, and Products simultaneously)
  const renderWorkLists = (filterTab?: RelatedTab) => {
    const activeFilter = filterTab && filterTab !== 'all' ? filterTab : undefined;
    const showProj = (!activeFilter || activeFilter === 'projects') && relatedProjects.length > 0;
    const showPub = (!activeFilter || activeFilter === 'publications') && relatedPublications.length > 0;
    const showProd = (!activeFilter || activeFilter === 'products') && relatedProducts.length > 0;

    return (
      <div className="space-y-10">
        {showProj && (
          <div className="space-y-4">
            {!activeFilter && (
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-mono uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>Projects</span>
                </h3>
                <span className="text-[12px] font-mono text-[#EDE9E0]/55 tabular-nums">
                  {relatedProjects.length}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedProjects.map((proj, idx) => (
                <motion.div
                  key={proj.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(idx * 0.045, 0.22),
                    ease: EASE_OUT_EXPO
                  }}
                >
                  <SpaLink
                    href={`/projects/${proj.slug}`}
                    onNavigate={onNavigate}
                    className="group p-4 rounded-2xl bg-[#031D1C]/90 border border-white/10 hover:border-[#25CDB6]/65 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between gap-4 h-full"
                  >
                    <div className="space-y-3.5">
                      <SafeWorkMedia
                        src={proj.coverImage}
                        alt={proj.title}
                        fallbackIcon={<Layers className="w-7 h-7" />}
                      />
                      <div className="space-y-2 px-1">
                        <div className="flex items-center justify-between gap-2 text-[12px] font-mono text-[#EDE9E0]/60">
                          <span className="text-[#25CDB6]">{proj.status}</span>
                          {proj.startDate && (
                            <span className="tabular-nums">{proj.startDate.slice(0, 7)}</span>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug">
                          {proj.title}
                        </h4>
                        {proj.shortDescription && (
                          <p className="text-[13px] text-[#EDE9E0]/75 line-clamp-2 leading-relaxed">
                            {proj.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#25CDB6] px-1 pt-1">
                      <span>Read brief</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </SpaLink>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {showPub && (
          <div className="space-y-4">
            {!activeFilter && (
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-mono uppercase tracking-wider text-[#D0A873] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Publications</span>
                </h3>
                <span className="text-[12px] font-mono text-[#EDE9E0]/55 tabular-nums">
                  {relatedPublications.length}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedPublications.map((pub, idx) => {
                const pubUrl = sanitizeSafeUrl(pub.pdfUrl) || sanitizeSafeUrl(pub.doiOrUrl);
                const cardBody = (
                  <>
                    <div className="space-y-3.5">
                      <SafeWorkMedia
                        src={pub.thumbnailUrl}
                        alt={pub.title}
                        fallbackIcon={<FileText className="w-7 h-7 text-[#D0A873]/80" />}
                      />
                      <div className="space-y-1.5 px-1">
                        <div className="flex items-center justify-between gap-2 text-[12px] font-mono">
                          <span className="uppercase tracking-wider text-[#D0A873]">
                            {pub.publicationType || 'Paper'}
                          </span>
                          {pub.publicationDate && (
                            <span className="text-[#EDE9E0]/55 tabular-nums">
                              {pub.publicationDate.slice(0, 7)}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-[#EDE9E0] group-hover:text-[#D0A873] leading-snug transition-colors">
                          {pub.title}
                        </h4>
                        {pub.authors && (
                          <p className="text-[13px] text-[#EDE9E0]/70">{pub.authors}</p>
                        )}
                        {pub.abstract && (
                          <p className="text-[13px] text-[#EDE9E0]/65 line-clamp-2 leading-relaxed">
                            {pub.abstract}
                          </p>
                        )}
                      </div>
                    </div>
                    {pubUrl && (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#D0A873] px-1 pt-1">
                        <span>Open publication</span>
                        <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    )}
                  </>
                );

                return (
                  <motion.div
                    key={pub.id}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(idx * 0.045, 0.22),
                      ease: EASE_OUT_EXPO
                    }}
                  >
                    {pubUrl ? (
                      <a
                        href={pubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-4 rounded-2xl bg-[#031D1C]/90 border border-white/10 hover:border-[#D0A873]/70 hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-4 h-full cursor-pointer"
                      >
                        {cardBody}
                      </a>
                    ) : (
                      <div className="group p-4 rounded-2xl bg-[#031D1C]/90 border border-white/10 flex flex-col justify-between gap-4 h-full">
                        {cardBody}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {showProd && (
          <div className="space-y-4">
            {!activeFilter && (
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-mono uppercase tracking-wider text-[#25CDB6] flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>Products</span>
                </h3>
                <span className="text-[12px] font-mono text-[#EDE9E0]/55 tabular-nums">
                  {relatedProducts.length}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedProducts.map((prod, idx) => (
                <motion.div
                  key={prod.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(idx * 0.045, 0.22),
                    ease: EASE_OUT_EXPO
                  }}
                >
                  <SpaLink
                    href={`/products/${prod.slug}`}
                    onNavigate={onNavigate}
                    className="group p-4 rounded-2xl bg-[#031D1C]/90 border border-white/10 hover:border-[#25CDB6]/65 hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-4 h-full cursor-pointer"
                  >
                    <div className="space-y-3.5">
                      <SafeWorkMedia
                        src={prod.coverImage}
                        alt={prod.name}
                        fallbackIcon={<Package className="w-7 h-7" />}
                      />
                      <div className="space-y-1.5 px-1">
                        <div className="flex items-center justify-between text-[12px] font-mono text-[#EDE9E0]/60">
                          <span className="text-[#25CDB6]">{prod.status}</span>
                          {prod.version && <span className="tabular-nums">v{prod.version}</span>}
                        </div>
                        <h4 className="font-bold text-base text-[#EDE9E0] group-hover:text-[#25CDB6] leading-snug transition-colors">
                          {prod.name}
                        </h4>
                        {(prod.tagline || prod.shortDescription) && (
                          <p className="text-[13px] text-[#EDE9E0]/70 line-clamp-2 leading-relaxed">
                            {prod.tagline || prod.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#25CDB6] px-1 pt-1">
                      <span>Explore product</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </SpaLink>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Lightbox overlay (shared between department & sector views)
  const lightboxOverlay = (
    <AnimatePresence>
      {lightboxImage && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-[#021211]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded media frame"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close expanded media"
            className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-[#031D1C] border border-white/15 text-[#EDE9E0] hover:border-[#25CDB6] hover:text-[#25CDB6] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <motion.img
            src={lightboxImage}
            alt={department.name}
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
            initial={prefersReducedMotion ? false : { scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
            className="max-h-[85vh] max-w-5xl w-auto rounded-2xl border border-white/15 object-contain shadow-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  // =====================================================================
  // PAGE TYPE 1: DEPARTMENT DETAIL (/departments/<slug>)
  // =====================================================================
  if (!unitIsSector) {
    const deptWithLogo =
      unitIsRdd && department.customLogoUrl === undefined
        ? { ...department, customLogoUrl: rddLogoUrl }
        : department;

    const hasSectors = childSectors.length > 0;
    const isCompletelyEmpty =
      !hasOverview &&
      focusCards.length === 0 &&
      initiativeItems.length === 0 &&
      !hasSectors &&
      !hasRelatedWork;

    const safeHeroBanner = sanitizeSafeUrl(department.heroImage);
    const deptEmptyCopy =
      content.detailFallback?.departmentEmpty || 'More information will appear here soon.';

    const metaFacts: string[] = [];
    if (focusCards.length > 0) {
      metaFacts.push(`${focusCards.length} ${focusCards.length === 1 ? 'Focus Area' : 'Focus Areas'}`);
    }
    if (initiativeItems.length > 0) {
      metaFacts.push(
        `${initiativeItems.length} ${initiativeItems.length === 1 ? 'Initiative' : 'Initiatives'}`
      );
    }
    if (hasSectors) metaFacts.push(`${childSectors.length} Research Sectors`);
    if (relatedProjects.length > 0) {
      metaFacts.push(`${relatedProjects.length} ${relatedProjects.length === 1 ? 'Project' : 'Projects'}`);
    }
    if (relatedPublications.length > 0) {
      metaFacts.push(
        `${relatedPublications.length} ${relatedPublications.length === 1 ? 'Publication' : 'Publications'}`
      );
    }
    if (relatedProducts.length > 0) {
      metaFacts.push(
        `${relatedProducts.length} ${relatedProducts.length === 1 ? 'Product' : 'Products'}`
      );
    }

    let chapterCounter = 0;
    const nextChapterNum = () => String(++chapterCounter).padStart(2, '0');
    const overviewNum = hasOverview ? nextChapterNum() : '01';
    const focusNum = focusCards.length > 0 ? nextChapterNum() : '';
    const initiativesNum = initiativeItems.length > 0 ? nextChapterNum() : '';
    const sectorsNum = hasSectors ? nextChapterNum() : '';
    const workNum = hasRelatedWork ? nextChapterNum() : '';

    return (
      <div className="min-h-screen">
        {lightboxOverlay}

        {/* 1. Editorial Hero Header */}
        <AtmosphericBackground
          intensity="subtle"
          fadeToColor="transparent"
          className="scroll-mt-sticky relative overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-white/10"
        >
          {safeHeroBanner && (
            <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
              <img
                src={safeHeroBanner}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#06302F]/50 via-[#06302F]/85 to-[#06302F]" />
            </div>
          )}

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}
            className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7"
          >
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 text-[13px] text-[#EDE9E0]/65"
            >
              <SpaLink
                href="/home"
                onNavigate={onNavigate}
                className="hover:text-[#25CDB6] transition-colors cursor-pointer"
              >
                Masters Of All
              </SpaLink>
              <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
              <SpaLink
                href="/departments"
                onNavigate={onNavigate}
                className="hover:text-[#25CDB6] transition-colors cursor-pointer"
              >
                Departments
              </SpaLink>
              <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
              <span className="text-[#EDE9E0] font-medium break-words">{department.name}</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.08, ease: EASE_OUT_EXPO }}
                className="relative shrink-0 self-start sm:self-center"
              >
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-full border border-[#25CDB6]/20 pointer-events-none"
                />
                <DepartmentLogo department={deptWithLogo} size={92} showBorder />
              </motion.div>

              <div className="space-y-2.5 min-w-0 flex-1">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight leading-[1.12] text-balance">
                  <EditableText
                    value={department.name}
                    fieldPath={`department.${department.id}.name`}
                    label="Department Name"
                    isEditMode={isEditMode}
                    onUpdate={(_, val) => onUpdateDepartment(department.id, { name: val })}
                  />
                </h1>

                {(department.tagline?.trim() || isEditMode) && (
                  <div className="text-base sm:text-lg font-medium text-[#CA7952] leading-snug">
                    <EditableText
                      value={(department.tagline || '').trim()}
                      fieldPath={`department.${department.id}.tagline`}
                      label="Department Tagline"
                      isEditMode={isEditMode}
                      onUpdate={(_, val) => onUpdateDepartment(department.id, { tagline: val })}
                      as="p"
                    >
                      {department.tagline?.trim() || (isEditMode ? 'Add tagline...' : '')}
                    </EditableText>
                  </div>
                )}

                {metaFacts.length > 0 && (
                  <p className="text-sm text-[#EDE9E0]/65 pt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
                    {metaFacts.map((fact, idx) => (
                      <React.Fragment key={fact}>
                        {idx > 0 && <span aria-hidden="true" className="text-[#EDE9E0]/30">&middot;</span>}
                        <span>{fact}</span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </AtmosphericBackground>

        {/* 2. Architectural Body */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pb-24 space-y-16">
          {isCompletelyEmpty && !isEditMode ? (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
              className="max-w-xl mx-auto py-12 text-center space-y-6 border-y border-white/10"
            >
              <EditableText
                value={deptEmptyCopy}
                fieldPath="detailFallback.departmentEmpty"
                label="Empty Department Notice"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
                as="p"
                className="text-base text-[#EDE9E0]/75 leading-relaxed"
              />
              <div>
                <SpaLink
                  href="/departments"
                  onNavigate={onNavigate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-[#031D1C] hover:border-[#25CDB6]/60 text-sm font-semibold text-[#25CDB6] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>All departments</span>
                </SpaLink>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Section 01: Stylized Overview, Charter Cards & Media Showcase */}
              {hasOverview && (
                <section
                  id="dept-overview"
                  className="scroll-mt-sticky grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
                >
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.36, ease: EASE_OUT_EXPO }}
                    className="lg:col-span-4 space-y-5 lg:sticky"
                    style={{ top: 'var(--sticky-stack-offset, 96px)' }}
                  >
                    <div className="space-y-1.5">
                      <span className="text-[13px] font-mono tabular-nums text-[#25CDB6] block">
                        {overviewNum}. Overview
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#EDE9E0] tracking-tight">
                        About &amp; Charter
                      </h2>
                    </div>

                    {deptChapters.length > 1 && (
                      <nav
                        aria-label="Department sections"
                        className="pt-4 border-t border-white/10 space-y-1.5 text-sm"
                      >
                        {deptChapters.map(chap => (
                          <a
                            key={chap.id}
                            href={`#${chap.id}`}
                            onClick={e => {
                              e.preventDefault();
                              document
                                .getElementById(chap.id)
                                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="flex items-center justify-between py-1.5 text-[#EDE9E0]/75 hover:text-[#25CDB6] transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-[12px] text-[#25CDB6]/70 tabular-nums">
                                {chap.num}
                              </span>
                              <span>{chap.label}</span>
                            </span>
                            {chap.count !== undefined && (
                              <span className="font-mono text-[13px] text-[#EDE9E0]/75 tabular-nums">
                                {chap.count}
                              </span>
                            )}
                          </a>
                        ))}
                      </nav>
                    )}

                    <div className="pt-2 border-t border-white/10">
                      <SpaLink
                        href="/departments"
                        onNavigate={onNavigate}
                        className="inline-flex items-center gap-2 pt-2 text-[13px] font-semibold text-[#EDE9E0]/75 hover:text-[#25CDB6] transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>All departments</span>
                      </SpaLink>
                    </div>
                  </motion.div>

                  <div className="lg:col-span-8 space-y-8 min-w-0">
                    {(aboutText || isEditMode) && (
                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        transition={{ duration: 0.38, ease: EASE_OUT_EXPO }}
                        className="p-6 sm:p-8 rounded-2xl bg-[#031D1C]/80 border border-white/10 text-base sm:text-lg text-[#EDE9E0]/90 leading-[1.8] whitespace-pre-line"
                      >
                        <EditableText
                          value={aboutText}
                          fieldPath={`department.${department.id}.introduction`}
                          label="Department Description"
                          isEditMode={isEditMode}
                          multiline
                          onUpdate={(_, val) =>
                            onUpdateDepartment(department.id, { introduction: val })
                          }
                          as="p"
                        >
                          {aboutText || (isEditMode ? 'Add overview description...' : '')}
                        </EditableText>
                      </motion.div>
                    )}

                    {(purposeText || missionText) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {purposeText && (
                          <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.15 }}
                            transition={{ duration: 0.36, delay: 0.05, ease: EASE_OUT_EXPO }}
                            className="p-6 rounded-2xl bg-[#031D1C]/85 border border-white/10 space-y-2.5 flex flex-col justify-between"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 text-[13px] font-mono uppercase tracking-wider font-bold text-[#CA7952]">
                                <Compass className="w-4 h-4 shrink-0" />
                                <h3>Mandate &amp; Purpose</h3>
                              </div>
                              <p className="text-[15px] text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line">
                                {purposeText}
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {missionText && (
                          <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.15 }}
                            transition={{ duration: 0.36, delay: 0.1, ease: EASE_OUT_EXPO }}
                            className="p-6 rounded-2xl bg-[#031D1C]/85 border border-white/10 space-y-2.5 flex flex-col justify-between"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 text-[13px] font-mono uppercase tracking-wider font-bold text-[#25CDB6]">
                                <Sparkles className="w-4 h-4 shrink-0" />
                                <h3>Mission</h3>
                              </div>
                              <p className="text-[15px] text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line">
                                {missionText}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {renderGalleryShowcase('dept-media')}
                  </div>
                </section>
              )}

              {/* Section 02: Areas of Focus Cards Grid */}
              {focusCards.length > 0 && (
                <section
                  id="dept-focus"
                  className="scroll-mt-sticky pt-10 border-t border-white/10 space-y-6"
                >
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    className="flex flex-wrap items-end justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <span className="text-[13px] font-mono tabular-nums text-[#25CDB6] block">
                        {focusNum}. Core Pillars
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#EDE9E0] tracking-tight">
                        Areas of Focus
                      </h2>
                    </div>
                    <span className="text-[13px] font-mono text-[#EDE9E0]/55 tabular-nums">
                      {focusCards.length} {focusCards.length === 1 ? 'pillar' : 'pillars'}
                    </span>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {focusCards.map((card, idx) => (
                      <motion.div
                        key={card.id || idx}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.12 }}
                        transition={{
                          duration: 0.32,
                          delay: Math.min(idx * 0.05, 0.28),
                          ease: EASE_OUT_EXPO
                        }}
                        className="p-6 rounded-2xl bg-[#031D1C]/90 border border-white/10 hover:border-[#25CDB6]/55 transition-colors flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                          <span className="font-mono text-[13px] text-[#25CDB6] tabular-nums font-semibold">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[11px] font-mono uppercase tracking-wider text-[#EDE9E0]/45">
                            Focus Pillar
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-[#EDE9E0] leading-snug break-words">
                          {card.title}
                        </h3>
                        {card.description?.trim() && (
                          <p className="text-sm text-[#EDE9E0]/75 leading-relaxed whitespace-pre-line">
                            {card.description}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Section 03: Initiatives Below Areas of Focus */}
              {initiativeItems.length > 0 && (
                <section
                  id="dept-initiatives"
                  className="scroll-mt-sticky pt-10 border-t border-white/10 space-y-6"
                >
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    className="flex flex-wrap items-end justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <span className="text-[13px] font-mono tabular-nums text-[#CA7952] block">
                        {initiativesNum}. Programmes &amp; Active Tracks
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#EDE9E0] tracking-tight">
                        Key Initiatives
                      </h2>
                    </div>
                    <span className="text-[13px] font-mono text-[#EDE9E0]/55 tabular-nums">
                      {initiativeItems.length}{' '}
                      {initiativeItems.length === 1 ? 'initiative' : 'initiatives'}
                    </span>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {initiativeItems.map((init, idx) => {
                      const safeLink = sanitizeSafeUrl(init.link);
                      const isInternalLink = Boolean(
                        safeLink && (safeLink.startsWith('/') || safeLink.startsWith('#'))
                      );
                      const dotClass = STATUS_DOT_CLASSES[init.status] || 'bg-[#25CDB6]';

                      return (
                        <motion.div
                          key={init.id || idx}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.12 }}
                          transition={{
                            duration: 0.32,
                            delay: Math.min(idx * 0.05, 0.25),
                            ease: EASE_OUT_EXPO
                          }}
                          className="p-6 rounded-2xl bg-[#031D1C]/90 border border-white/10 hover:border-[#CA7952]/55 transition-colors flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-mono">
                              <span className="text-[#CA7952] tabular-nums font-semibold">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="inline-flex items-center gap-2 text-[#EDE9E0]/75 uppercase tracking-wider">
                                <span
                                  aria-hidden="true"
                                  className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
                                />
                                <span>{init.status || 'Active'}</span>
                              </span>
                            </div>

                            <h3 className="text-lg font-bold text-[#EDE9E0] leading-snug break-words">
                              {init.title}
                            </h3>

                            {init.summary?.trim() && (
                              <p className="text-sm text-[#EDE9E0]/75 leading-relaxed whitespace-pre-line">
                                {init.summary}
                              </p>
                            )}
                          </div>

                          {(init.owner?.trim() || safeLink) && (
                            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[13px]">
                              {init.owner?.trim() ? (
                                <span className="text-[#EDE9E0]/60">Lead: {init.owner}</span>
                              ) : (
                                <span />
                              )}

                              {safeLink &&
                                (isInternalLink ? (
                                  <SpaLink
                                    href={safeLink}
                                    onNavigate={onNavigate}
                                    className="inline-flex items-center gap-1.5 font-semibold text-[#25CDB6] hover:text-white transition-colors cursor-pointer"
                                  >
                                    <span>Explore initiative</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </SpaLink>
                                ) : (
                                  <a
                                    href={safeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 font-semibold text-[#25CDB6] hover:text-white transition-colors cursor-pointer"
                                  >
                                    <span>View reference</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Section 04: Full-Width Research Sectors Showcase (RDD) */}
              {hasSectors && (
                <section
                  id="dept-sectors"
                  className="scroll-mt-sticky pt-10 border-t border-white/10 space-y-6"
                >
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[13px] font-mono tabular-nums text-[#25CDB6] block">
                        {sectorsNum}. Sectors
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#EDE9E0] tracking-tight">
                        Research Sectors
                      </h2>
                    </div>

                    <SpaLink
                      href="/departments#sectors"
                      onNavigate={onNavigate}
                      className="text-sm font-semibold text-[#25CDB6] hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>View in directory</span>
                      <ArrowRight className="w-4 h-4" />
                    </SpaLink>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {childSectors.map((sector, idx) => (
                      <motion.div
                        key={sector.id}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{
                          duration: 0.28,
                          delay: Math.min(idx * 0.035, 0.25),
                          ease: EASE_OUT_EXPO
                        }}
                      >
                        <SpaLink
                          href={getUnitHref(sector)}
                          onNavigate={onNavigate}
                          className="group p-4 rounded-2xl bg-[#031D1C]/90 border border-white/10 hover:border-[#25CDB6]/65 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(37,205,182,0.28)] transition-all flex items-center gap-3.5 cursor-pointer h-full"
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow border border-white/10"
                            style={{
                              backgroundColor: sector.iconBgHex || '#FFFFFF',
                              color: sector.colorHex || '#06302F'
                            }}
                          >
                            <DepartmentIcon
                              glyph={sector.iconGlyph}
                              iconUrl={sector.iconUrl}
                              size={22}
                              color={sector.colorHex || '#06302F'}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-semibold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug break-words">
                              {sector.name}
                            </h3>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </SpaLink>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Section 05: Related Work (All Projects, Publications & Products visible by default) */}
              {hasRelatedWork && (
                <section
                  id="dept-related-work"
                  className="scroll-mt-sticky pt-10 border-t border-white/10 space-y-6"
                >
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[13px] font-mono tabular-nums text-[#25CDB6] block">
                        {workNum}. Published Output
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#EDE9E0] tracking-tight">
                        Related Work
                      </h2>
                    </div>

                    {availableWorkTabs.length > 1 && (
                      <div
                        role="tablist"
                        aria-label="Related work categories"
                        className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#031D1C] border border-white/10"
                      >
                        {availableWorkTabs.map(tab => {
                          const active = activeWorkTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => setActiveWorkTab(tab.id)}
                              className={`relative min-h-[38px] px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                                active ? 'text-[#031D1C]' : 'text-[#EDE9E0]/80 hover:text-[#EDE9E0]'
                              }`}
                            >
                              {active && (
                                <motion.span
                                  layoutId="deptWorkTabIndicator"
                                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                  className="absolute inset-0 rounded-lg bg-[#17A491]"
                                />
                              )}
                              <span className="relative z-10">
                                {tab.label} ({tab.count})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {renderWorkLists(activeWorkTab)}
                </section>
              )}
            </>
          )}

          {/* Bottom Prev / Next Architectural Navigation */}
          {siblings.length > 1 && (
            <div className="pt-10 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prevUnit ? (
                <SpaLink
                  href={getUnitHref(prevUnit)}
                  onNavigate={onNavigate}
                  className="group p-5 rounded-2xl bg-[#031D1C]/80 border border-white/10 hover:border-[#25CDB6]/65 transition-all text-left flex items-center gap-4 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#25CDB6] shrink-0 transition-transform group-hover:-translate-x-0.5" />
                  <div className="min-w-0">
                    <span className="text-[13px] text-[#EDE9E0]/60 block">
                      Previous department
                    </span>
                    <span className="text-base font-bold text-[#EDE9E0] group-hover:text-white block truncate">
                      {prevUnit.name}
                    </span>
                  </div>
                </SpaLink>
              ) : (
                <div />
              )}

              {nextUnit && (
                <SpaLink
                  href={getUnitHref(nextUnit)}
                  onNavigate={onNavigate}
                  className="group p-5 rounded-2xl bg-[#031D1C]/80 border border-white/10 hover:border-[#25CDB6]/65 transition-all text-right flex items-center justify-end gap-4 cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="text-[13px] text-[#EDE9E0]/60 block">
                      Next department
                    </span>
                    <span className="text-base font-bold text-[#EDE9E0] group-hover:text-white block truncate">
                      {nextUnit.name}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0 transition-transform group-hover:translate-x-0.5" />
                </SpaLink>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================================
  // PAGE TYPE 2: SECTOR DETAIL (/departments/rdd/<sector-slug>)
  // =====================================================================
  const otherSectors = orderedSectors.filter(s => s.id !== department.id);
  const sectorEmptyCopy =
    content.detailFallback?.sectorEmpty || 'Details for this sector will appear here soon.';
  const safeSectorBanner = sanitizeSafeUrl(department.heroImage);

  return (
    <div className="min-h-screen">
      {lightboxOverlay}

      <AtmosphericBackground
        intensity="subtle"
        fadeToColor="transparent"
        className="scroll-mt-sticky relative overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-white/10"
      >
        {safeSectorBanner && (
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
            <img
              src={safeSectorBanner}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#06302F]/50 via-[#06302F]/85 to-[#06302F]" />
          </div>
        )}

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}
          className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7"
        >
          {/* Breadcrumb: Masters Of All > RDD > Sector */}
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-[13px] text-[#EDE9E0]/65"
          >
            <SpaLink
              href="/home"
              onNavigate={onNavigate}
              className="hover:text-[#25CDB6] transition-colors cursor-pointer"
            >
              Masters Of All
            </SpaLink>
            <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
            <SpaLink
              href="/departments#sectors"
              onNavigate={onNavigate}
              className="hover:text-[#25CDB6] transition-colors cursor-pointer"
            >
              RDD
            </SpaLink>
            <ChevronRight className="w-3.5 h-3.5 text-[#EDE9E0]/35 shrink-0" />
            <span className="text-[#EDE9E0] font-medium break-words">{department.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.42, delay: 0.06, ease: EASE_OUT_EXPO }}
              className="relative shrink-0 self-start sm:self-center"
            >
              <div
                aria-hidden="true"
                className="absolute -inset-2 rounded-full border border-white/15 pointer-events-none"
              />
              <DepartmentIcon
                glyph={department.iconGlyph}
                iconUrl={department.iconUrl}
                color={department.colorHex}
                bgColor={department.iconBgHex}
                showBg
                size={76}
              />
            </motion.div>

            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight leading-[1.12] text-balance">
                <EditableText
                  value={department.name}
                  fieldPath={`department.${department.id}.name`}
                  label="Sector Name"
                  isEditMode={isEditMode}
                  onUpdate={(_, val) => onUpdateDepartment(department.id, { name: val })}
                />
              </h1>

              {(department.tagline?.trim() || isEditMode) && (
                <div className="text-base sm:text-lg font-medium text-[#CA7952] leading-snug">
                  <EditableText
                    value={(department.tagline || '').trim()}
                    fieldPath={`department.${department.id}.tagline`}
                    label="Sector Tagline"
                    isEditMode={isEditMode}
                    onUpdate={(_, val) => onUpdateDepartment(department.id, { tagline: val })}
                    as="p"
                  >
                    {department.tagline?.trim() || (isEditMode ? 'Add sector tagline...' : '')}
                  </EditableText>
                </div>
              )}

              {hasRelatedWork && (
                <p className="text-sm text-[#EDE9E0]/60 tabular-nums">
                  {totalWorkCount} published {totalWorkCount === 1 ? 'entry' : 'entries'}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </AtmosphericBackground>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pb-24 space-y-16">
        {sectorSections.length === 0 ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
            className="max-w-xl mx-auto py-10 text-center space-y-6 border-y border-white/10"
          >
            <EditableText
              value={sectorEmptyCopy}
              fieldPath="detailFallback.sectorEmpty"
              label="Empty Sector Notice"
              isEditMode={isEditMode}
              onUpdate={onUpdateContent}
              as="p"
              className="text-base text-[#EDE9E0]/75 leading-relaxed"
            />
            <div>
              <SpaLink
                href="/departments#sectors"
                onNavigate={onNavigate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-[#031D1C] hover:border-[#25CDB6]/60 text-sm font-semibold text-[#25CDB6] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to sectors</span>
              </SpaLink>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Sticky Left Chapter Outline Rail */}
            <aside
              className="lg:col-span-3 lg:sticky space-y-3"
              style={{ top: 'var(--sticky-stack-offset, 96px)' }}
            >
              <span className="text-[13px] uppercase tracking-wider text-[#25CDB6] font-bold block px-1">
                Chapters
              </span>
              <nav
                aria-label="Sector outline"
                className="flex lg:flex-col overflow-x-auto lg:overflow-visible no-scrollbar gap-1.5 pb-2 lg:pb-0 lg:border-l lg:border-white/10"
              >
                {sectorSections.map(sec => {
                  const isActive = activeSectorSection === sec.id;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={e => {
                        e.preventDefault();
                        setActiveSectorSection(sec.id);
                        document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`relative min-h-[38px] flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        isActive
                          ? 'text-[#25CDB6] bg-[#17A491]/12 border border-[#25CDB6]/35'
                          : 'text-[#EDE9E0]/65 hover:text-[#EDE9E0] hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="font-mono text-[12px] opacity-70 tabular-nums">{sec.num}</span>
                      <span>{sec.label}</span>
                    </a>
                  );
                })}
              </nav>
            </aside>

            {/* Open Long-Form Reading Canvas */}
            <div className="lg:col-span-9 space-y-12 min-w-0">
              {(aboutText || isEditMode) && (
                <motion.section
                  id="overview"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.36, ease: EASE_OUT_EXPO }}
                  className="scroll-mt-sticky space-y-4"
                >
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight">Overview</h2>
                  <div className="p-6 sm:p-7 rounded-2xl bg-[#031D1C]/80 border border-white/10 text-base sm:text-lg text-[#EDE9E0]/90 leading-[1.8] whitespace-pre-line">
                    <EditableText
                      value={aboutText}
                      fieldPath={`department.${department.id}.introduction`}
                      label="Sector Overview"
                      isEditMode={isEditMode}
                      multiline
                      onUpdate={(_, val) =>
                        onUpdateDepartment(department.id, { introduction: val })
                      }
                      as="p"
                    >
                      {aboutText || (isEditMode ? 'Add sector overview...' : '')}
                    </EditableText>
                  </div>
                </motion.section>
              )}

              {(purposeText || missionText) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  {purposeText && (
                    <motion.section
                      id="purpose"
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                      className="scroll-mt-sticky p-6 rounded-2xl bg-[#031D1C]/85 border border-white/10 space-y-2.5"
                    >
                      <h2 className="text-[13px] font-mono uppercase tracking-wider font-bold text-[#CA7952] flex items-center gap-2">
                        <Compass className="w-4 h-4 shrink-0" />
                        <span>Purpose</span>
                      </h2>
                      <p className="text-base text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line">
                        {purposeText}
                      </p>
                    </motion.section>
                  )}

                  {missionText && (
                    <motion.section
                      id="mission"
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.35, delay: 0.06, ease: EASE_OUT_EXPO }}
                      className="scroll-mt-sticky p-6 rounded-2xl bg-[#031D1C]/85 border border-white/10 space-y-2.5"
                    >
                      <h2 className="text-[13px] font-mono uppercase tracking-wider font-bold text-[#25CDB6] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Mission</span>
                      </h2>
                      <p className="text-base text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line">
                        {missionText}
                      </p>
                    </motion.section>
                  )}
                </div>
              )}

              {renderGalleryShowcase('media')}

              {focusCards.length > 0 && (
                <section
                  id="focus"
                  className="scroll-mt-sticky pt-8 border-t border-white/10 space-y-5"
                >
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight">
                    Areas of Focus
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {focusCards.map((card, idx) => (
                      <motion.div
                        key={card.id || idx}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{
                          duration: 0.3,
                          delay: Math.min(idx * 0.05, 0.25),
                          ease: EASE_OUT_EXPO
                        }}
                        className="p-5 rounded-2xl bg-[#031D1C]/85 border border-white/10 space-y-2"
                      >
                        <div className="flex items-center gap-2 text-[#25CDB6] font-mono text-[13px] tabular-nums">
                          <span>{String(idx + 1).padStart(2, '0')}.</span>
                        </div>
                        <h3 className="text-base font-bold text-[#EDE9E0] leading-snug break-words">
                          {card.title}
                        </h3>
                        {card.description?.trim() && (
                          <p className="text-sm text-[#EDE9E0]/75 leading-relaxed whitespace-pre-line">
                            {card.description}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {initiativeItems.length > 0 && (
                <section
                  id="initiatives"
                  className="scroll-mt-sticky pt-8 border-t border-white/10 space-y-5"
                >
                  <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight">Initiatives</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {initiativeItems.map((init, idx) => {
                      const safeLink = sanitizeSafeUrl(init.link);
                      const isInternalLink = Boolean(
                        safeLink && (safeLink.startsWith('/') || safeLink.startsWith('#'))
                      );
                      const dotClass = STATUS_DOT_CLASSES[init.status] || 'bg-[#25CDB6]';

                      return (
                        <motion.div
                          key={init.id || idx}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.1 }}
                          transition={{
                            duration: 0.3,
                            delay: Math.min(idx * 0.05, 0.25),
                            ease: EASE_OUT_EXPO
                          }}
                          className="p-5 rounded-2xl bg-[#031D1C]/85 border border-white/10 flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 text-[12px] font-mono">
                              <span className="text-[#D0A873] tabular-nums">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[#EDE9E0]/75 uppercase">
                                <span
                                  aria-hidden="true"
                                  className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
                                />
                                <span>{init.status || 'Active'}</span>
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-[#EDE9E0] leading-snug break-words">
                              {init.title}
                            </h3>
                            {init.summary?.trim() && (
                              <p className="text-sm text-[#EDE9E0]/75 leading-relaxed whitespace-pre-line">
                                {init.summary}
                              </p>
                            )}
                          </div>

                          {safeLink &&
                            (isInternalLink ? (
                              <SpaLink
                                href={safeLink}
                                onNavigate={onNavigate}
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#25CDB6] hover:text-white transition-colors cursor-pointer"
                              >
                                <span>Explore</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </SpaLink>
                            ) : (
                              <a
                                href={safeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#25CDB6] hover:text-white transition-colors cursor-pointer"
                              >
                                <span>Open link</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ))}
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {hasRelatedWork && (
                <section
                  id="related-work"
                  className="scroll-mt-sticky space-y-6 pt-8 border-t border-white/10"
                >
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <h2 className="text-2xl font-bold text-[#EDE9E0] tracking-tight">Related Work</h2>
                    {availableWorkTabs.length > 1 && (
                      <div
                        role="tablist"
                        aria-label="Sector related work categories"
                        className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#031D1C] border border-white/10"
                      >
                        {availableWorkTabs.map(tab => {
                          const active = activeWorkTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => setActiveWorkTab(tab.id)}
                              className={`relative min-h-[36px] px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                                active ? 'text-[#031D1C]' : 'text-[#EDE9E0]/80 hover:text-[#EDE9E0]'
                              }`}
                            >
                              {active && (
                                <motion.span
                                  layoutId="sectorWorkTabIndicator"
                                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                  className="absolute inset-0 rounded-lg bg-[#17A491]"
                                />
                              )}
                              <span className="relative z-10">
                                {tab.label} ({tab.count})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {renderWorkLists(activeWorkTab)}
                </section>
              )}
            </div>
          </div>
        )}

        {/* Always show "More sectors" architectural strip below */}
        {otherSectors.length > 0 && (
          <section className="pt-10 border-t border-white/10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[#EDE9E0] tracking-tight">More sectors</h2>
              <SpaLink
                href="/departments#sectors"
                onNavigate={onNavigate}
                className="text-sm font-semibold text-[#25CDB6] hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>All sectors</span>
                <ArrowRight className="w-4 h-4" />
              </SpaLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {otherSectors.map(sec => (
                <SpaLink
                  key={sec.id}
                  href={getUnitHref(sec)}
                  onNavigate={onNavigate}
                  className="group p-3.5 rounded-xl bg-[#031D1C]/85 border border-white/10 hover:border-[#25CDB6]/65 hover:-translate-y-0.5 transition-all flex items-center gap-3 cursor-pointer"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                    style={{
                      backgroundColor: sec.iconBgHex || '#FFFFFF',
                      color: sec.colorHex || '#06302F'
                    }}
                  >
                    <DepartmentIcon
                      glyph={sec.iconGlyph}
                      iconUrl={sec.iconUrl}
                      size={18}
                      color={sec.colorHex || '#06302F'}
                    />
                  </div>
                  <span className="flex-1 min-w-0 text-[13px] font-semibold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug break-words">
                    {sec.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#25CDB6] shrink-0 transition-transform group-hover:translate-x-0.5" />
                </SpaLink>
              ))}
            </div>
          </section>
        )}

        {/* Prev / Next Sector Footer */}
        {siblings.length > 1 && (
          <div className="pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevUnit ? (
              <SpaLink
                href={getUnitHref(prevUnit)}
                onNavigate={onNavigate}
                className="group p-5 rounded-2xl bg-[#031D1C]/80 border border-white/10 hover:border-[#25CDB6]/65 transition-all text-left flex items-center gap-4 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#25CDB6] shrink-0 transition-transform group-hover:-translate-x-0.5" />
                <div className="min-w-0">
                  <span className="text-[13px] text-[#EDE9E0]/60 block">Previous sector</span>
                  <span className="text-base font-bold text-[#EDE9E0] group-hover:text-white block truncate">
                    {prevUnit.name}
                  </span>
                </div>
              </SpaLink>
            ) : (
              <div />
            )}

            {nextUnit && (
              <SpaLink
                href={getUnitHref(nextUnit)}
                onNavigate={onNavigate}
                className="group p-5 rounded-2xl bg-[#031D1C]/80 border border-white/10 hover:border-[#25CDB6]/65 transition-all text-right flex items-center justify-end gap-4 cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="text-[13px] text-[#EDE9E0]/60 block">Next sector</span>
                  <span className="text-base font-bold text-[#EDE9E0] group-hover:text-white block truncate">
                    {nextUnit.name}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#25CDB6] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </SpaLink>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
