import fs from 'fs';
import path from 'path';
import type { DatabaseState } from '../db/schema';
import type { MediaAsset } from '../../src/types/index';

export interface DetectedMediaInfo {
  ext: string;
  mimeType: string;
  type: MediaAsset['type'];
  maxBytes: number;
}

function parseMbLimit(envName: string, fallbackMb: number): number {
  const raw = Number(process.env[envName]);
  const mb = Number.isFinite(raw) && raw > 0 ? raw : fallbackMb;
  return Math.round(mb * 1024 * 1024);
}

export function getUploadLimits(): Record<MediaAsset['type'], number> {
  return {
    image: parseMbLimit('MAX_UPLOAD_IMAGE_MB', 25),
    document: parseMbLimit('MAX_UPLOAD_DOCUMENT_MB', 100),
    audio: parseMbLimit('MAX_UPLOAD_AUDIO_MB', 100),
    video: parseMbLimit('MAX_UPLOAD_VIDEO_MB', 100)
  };
}

export function getMaxPossibleUploadBytes(): number {
  const limits = getUploadLimits();
  return Math.max(limits.image, limits.document, limits.audio, limits.video);
}

export function detectMediaByMagicBytes(
  buffer: Buffer,
  declaredMime: string,
  filename: string
): { ok: true; info: DetectedMediaInfo } | { ok: false; error: string } {
  const limits = getUploadLimits();
  if (buffer.length < 4) {
    return { ok: false, error: 'File is empty or truncated.' };
  }

  const lowerName = filename.toLowerCase();
  const lowerMime = declaredMime.toLowerCase();

  // Block SVG explicitly (prevents stored XSS)
  const headText = buffer.subarray(0, Math.min(512, buffer.length)).toString('utf-8').trim().toLowerCase();
  if (
    lowerMime.includes('svg') ||
    lowerName.endsWith('.svg') ||
    headText.startsWith('<svg') ||
    (headText.startsWith('<?xml') && headText.includes('<svg'))
  ) {
    return { ok: false, error: 'SVG uploads are disabled for security reasons. Please upload PNG, JPG, GIF, or WebP.' };
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return { ok: true, info: { ext: 'png', mimeType: 'image/png', type: 'image', maxBytes: limits.image } };
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ok: true, info: { ext: 'jpg', mimeType: 'image/jpeg', type: 'image', maxBytes: limits.image } };
  }

  // GIF
  if (buffer.length >= 6) {
    const sig6 = buffer.subarray(0, 6).toString('ascii');
    if (sig6 === 'GIF87a' || sig6 === 'GIF89a') {
      return { ok: true, info: { ext: 'gif', mimeType: 'image/gif', type: 'image', maxBytes: limits.image } };
    }
  }

  // RIFF (WebP or WAV)
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF') {
    const fourcc = buffer.subarray(8, 12).toString('ascii');
    if (fourcc === 'WEBP') {
      return { ok: true, info: { ext: 'webp', mimeType: 'image/webp', type: 'image', maxBytes: limits.image } };
    }
    if (fourcc === 'WAVE') {
      return { ok: true, info: { ext: 'wav', mimeType: 'audio/wav', type: 'audio', maxBytes: limits.audio } };
    }
  }

  // PDF
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { ok: true, info: { ext: 'pdf', mimeType: 'application/pdf', type: 'document', maxBytes: limits.document } };
  }

  // Legacy DOC
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 && buffer[5] === 0xb1 && buffer[6] === 0x1a && buffer[7] === 0xe1
  ) {
    return { ok: true, info: { ext: 'doc', mimeType: 'application/msword', type: 'document', maxBytes: limits.document } };
  }

  // DOCX
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const isDocxPayload = buffer.includes(Buffer.from('word/')) || buffer.includes(Buffer.from('[Content_Types].xml'));
    const isDocxDeclared = lowerName.endsWith('.docx') || lowerMime.includes('wordprocessingml');
    if (isDocxPayload && isDocxDeclared) {
      return {
        ok: true,
        info: {
          ext: 'docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          type: 'document',
          maxBytes: limits.document
        }
      };
    }
    return { ok: false, error: 'Unsupported archive format. Only DOCX documents are permitted.' };
  }

  // WebM
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    const headerSlice = buffer.subarray(0, Math.min(128, buffer.length));
    if (headerSlice.includes(Buffer.from('webm'))) {
      if (lowerMime.startsWith('audio/')) {
        return { ok: true, info: { ext: 'webm', mimeType: 'audio/webm', type: 'audio', maxBytes: limits.audio } };
      }
      return { ok: true, info: { ext: 'webm', mimeType: 'video/webm', type: 'video', maxBytes: limits.video } };
    }
  }

  // MP4 / M4A
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (
      brand === 'M4A ' ||
      brand === 'M4B ' ||
      lowerMime === 'audio/mp4' ||
      lowerMime === 'audio/x-m4a' ||
      lowerName.endsWith('.m4a')
    ) {
      return { ok: true, info: { ext: 'm4a', mimeType: 'audio/mp4', type: 'audio', maxBytes: limits.audio } };
    }
    return { ok: true, info: { ext: 'mp4', mimeType: 'video/mp4', type: 'video', maxBytes: limits.video } };
  }

  // OGG
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') {
    return { ok: true, info: { ext: 'ogg', mimeType: 'audio/ogg', type: 'audio', maxBytes: limits.audio } };
  }

  // MP3
  if (
    buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
    (buffer[0] === 0xff && (buffer[1] & 0xe6) === 0xe2 && (lowerMime.includes('audio') || lowerName.endsWith('.mp3')))
  ) {
    return { ok: true, info: { ext: 'mp3', mimeType: 'audio/mpeg', type: 'audio', maxBytes: limits.audio } };
  }

  return {
    ok: false,
    error: 'Unsupported or unrecognized file format. Allowed: PNG, JPG, GIF, WebP, MP4, WebM, MP3, M4A, WAV, OGG, PDF, DOC, DOCX.'
  };
}

function normalizeUrlBase(url: string): string {
  return url.split('?')[0].trim();
}

function collectStringsFromUnknown(val: unknown, target: string[]): void {
  if (typeof val === 'string') {
    target.push(val);
    return;
  }
  if (Array.isArray(val)) {
    for (const item of val) collectStringsFromUnknown(item, target);
    return;
  }
  if (val && typeof val === 'object') {
    for (const v of Object.values(val as Record<string, unknown>)) {
      collectStringsFromUnknown(v, target);
    }
  }
}

export function getMediaReferences(db: DatabaseState, rawUrl: string): string[] {
  const cleanUrl = normalizeUrlBase(rawUrl);
  if (!cleanUrl) return [];

  const refs: string[] = [];
  const matchesUrl = (candidate: unknown): boolean => {
    if (typeof candidate !== 'string') return false;
    return normalizeUrlBase(candidate) === cleanUrl || candidate.includes(cleanUrl);
  };

  // 1. Settings (incl. nested fields)
  const s = db.settings;
  if (matchesUrl(s.moaLogoUrl)) refs.push('settings.moaLogoUrl');
  if (matchesUrl(s.loaderLogoUrl)) refs.push('settings.loaderLogoUrl');
  if (matchesUrl(s.rddLogoUrl)) refs.push('settings.rddLogoUrl');
  if (matchesUrl(s.faviconUrl)) refs.push('settings.faviconUrl');
  if (matchesUrl(s.shareImageUrl)) refs.push('settings.shareImageUrl');
  if (s.announcementBar && matchesUrl(s.announcementBar.linkUrl)) refs.push('settings.announcementBar');

  // 2. PageContent strings
  const pcStrings: string[] = [];
  collectStringsFromUnknown(db.pageContent, pcStrings);
  if (pcStrings.some(str => matchesUrl(str))) {
    refs.push('pageContent');
  }

  // 3. Departments & Sectors
  for (const d of db.departments || []) {
    const fields = [d.iconUrl, d.customLogoUrl, d.heroImage, d.seoShareImage, ...(d.galleryImages || [])];
    if (fields.some(f => matchesUrl(f))) {
      refs.push(`department:${d.id}`);
    }
  }
  for (const sec of db.sectors || []) {
    const fields = [sec.iconUrl, sec.customLogoUrl, sec.heroImage, sec.seoShareImage, ...(sec.galleryImages || [])];
    if (fields.some(f => matchesUrl(f))) {
      refs.push(`sector:${sec.id}`);
    }
  }

  // 4. Projects & all nested blocks/documents
  for (const p of db.projects || []) {
    const projectStrings: string[] = [];
    collectStringsFromUnknown(
      [
        p.coverImage,
        p.videoUrl,
        p.audioUrl,
        p.pdfUrl,
        p.seoShareImage,
        p.galleryImages,
        p.documents,
        p.externalLinks,
        p.blocks,
        p.storyBlocks
      ],
      projectStrings
    );
    if (projectStrings.some(str => matchesUrl(str))) {
      refs.push(`project:${p.id}`);
    }
  }

  // 5. Publications
  for (const pub of db.publications || []) {
    if ([pub.pdfUrl, pub.thumbnailUrl, pub.doiOrUrl, pub.seoShareImage].some(f => matchesUrl(f))) {
      refs.push(`publication:${pub.id}`);
    }
  }

  // 6. Products
  for (const prod of db.products || []) {
    const prodStrings: string[] = [];
    collectStringsFromUnknown(
      [prod.coverImage, prod.galleryImages, prod.demoVideoUrl, prod.links, prod.seoShareImage],
      prodStrings
    );
    if (prodStrings.some(str => matchesUrl(str))) {
      refs.push(`product:${prod.id}`);
    }
  }

  // 7. Custom Pages
  for (const pg of db.pages || []) {
    const pageStrings: string[] = [];
    collectStringsFromUnknown([pg.seo, pg.blocks], pageStrings);
    if (pageStrings.some(str => matchesUrl(str))) {
      refs.push(`page:${pg.id}`);
    }
  }

  return refs;
}

export function isMediaInUse(db: DatabaseState, url: string): boolean {
  return getMediaReferences(db, url).length > 0;
}

function replaceStringInUnknown(val: unknown, oldUrl: string, newUrl: string): unknown {
  if (typeof val === 'string') {
    return val === oldUrl ? newUrl : val;
  }
  if (Array.isArray(val)) {
    return val.map(item => replaceStringInUnknown(item, oldUrl, newUrl));
  }
  if (val && typeof val === 'object') {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      next[k] = replaceStringInUnknown(v, oldUrl, newUrl);
    }
    return next;
  }
  return val;
}

export function replaceAllUrlReferences(db: DatabaseState, oldUrl: string, newUrl: string): void {
  if (!oldUrl || oldUrl === newUrl) return;
  const s = db.settings;
  if (s.moaLogoUrl === oldUrl) s.moaLogoUrl = newUrl;
  if (s.loaderLogoUrl === oldUrl) s.loaderLogoUrl = newUrl;
  if (s.rddLogoUrl === oldUrl) s.rddLogoUrl = newUrl;
  if (s.faviconUrl === oldUrl) s.faviconUrl = newUrl;
  if (s.shareImageUrl === oldUrl) s.shareImageUrl = newUrl;

  for (const dept of db.departments || []) {
    if (dept.iconUrl === oldUrl) dept.iconUrl = newUrl;
    if (dept.customLogoUrl === oldUrl) dept.customLogoUrl = newUrl;
    if (dept.heroImage === oldUrl) dept.heroImage = newUrl;
    if (dept.seoShareImage === oldUrl) dept.seoShareImage = newUrl;
    if (Array.isArray(dept.galleryImages)) {
      dept.galleryImages = dept.galleryImages.map(u => (u === oldUrl ? newUrl : u));
    }
  }

  for (const sec of db.sectors || []) {
    if (sec.iconUrl === oldUrl) sec.iconUrl = newUrl;
    if (sec.customLogoUrl === oldUrl) sec.customLogoUrl = newUrl;
    if (sec.heroImage === oldUrl) sec.heroImage = newUrl;
    if (sec.seoShareImage === oldUrl) sec.seoShareImage = newUrl;
    if (Array.isArray(sec.galleryImages)) {
      sec.galleryImages = sec.galleryImages.map(u => (u === oldUrl ? newUrl : u));
    }
  }

  for (const proj of db.projects || []) {
    if (proj.coverImage === oldUrl) proj.coverImage = newUrl;
    if (proj.videoUrl === oldUrl) proj.videoUrl = newUrl;
    if (proj.audioUrl === oldUrl) proj.audioUrl = newUrl;
    if (proj.pdfUrl === oldUrl) proj.pdfUrl = newUrl;
    if (proj.seoShareImage === oldUrl) proj.seoShareImage = newUrl;
    if (Array.isArray(proj.galleryImages)) {
      proj.galleryImages = proj.galleryImages.map(u => (u === oldUrl ? newUrl : u));
    }
    if (Array.isArray(proj.documents)) {
      proj.documents = proj.documents.map(doc => (doc.url === oldUrl ? { ...doc, url: newUrl } : doc));
    }
    if (Array.isArray(proj.blocks)) {
      proj.blocks = proj.blocks.map(b => replaceStringInUnknown(b, oldUrl, newUrl) as typeof b);
    }
    if (Array.isArray(proj.storyBlocks)) {
      proj.storyBlocks = proj.storyBlocks.map(b => replaceStringInUnknown(b, oldUrl, newUrl) as typeof b);
    }
  }

  for (const pub of db.publications || []) {
    if (pub.pdfUrl === oldUrl) pub.pdfUrl = newUrl;
    if (pub.thumbnailUrl === oldUrl) pub.thumbnailUrl = newUrl;
    if (pub.seoShareImage === oldUrl) pub.seoShareImage = newUrl;
  }

  for (const prod of db.products || []) {
    if (prod.coverImage === oldUrl) prod.coverImage = newUrl;
    if (prod.demoVideoUrl === oldUrl) prod.demoVideoUrl = newUrl;
    if (prod.seoShareImage === oldUrl) prod.seoShareImage = newUrl;
    if (prod.links?.documentationPdf === oldUrl) prod.links.documentationPdf = newUrl;
    if (Array.isArray(prod.galleryImages)) {
      prod.galleryImages = prod.galleryImages.map(u => (u === oldUrl ? newUrl : u));
    }
  }

  for (const pg of db.pages || []) {
    if (pg.seo?.shareImage === oldUrl) pg.seo.shareImage = newUrl;
    if (Array.isArray(pg.blocks)) {
      pg.blocks = pg.blocks.map(b => replaceStringInUnknown(b, oldUrl, newUrl) as typeof b);
    }
  }
}

export function deleteUploadFileIfUnused(db: DatabaseState, uploadsDir: string, candidateUrl?: string): void {
  if (!candidateUrl || typeof candidateUrl !== 'string') return;
  const baseUrl = normalizeUrlBase(candidateUrl);
  if (!baseUrl.startsWith('/uploads/')) return;
  if (isMediaInUse(db, baseUrl)) return;

  // Remove any matching MediaAsset records ONLY when deleting from uploads? No: keep Media Library reuseable unless caller deletes media asset.
  // Only delete disk file if no other media asset or content references it.
  const otherMediaUsing = (db.media || []).some(m => normalizeUrlBase(m.url) === baseUrl);
  if (otherMediaUsing) return;

  try {
    const filePath = path.join(uploadsDir, path.basename(baseUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore file unlink errors
  }
}

export function collectUploadUrlsFromItems(items: Array<unknown>): string[] {
  const strings: string[] = [];
  collectStringsFromUnknown(items, strings);
  return Array.from(
    new Set(
      strings
        .map(s => normalizeUrlBase(s))
        .filter(s => s.startsWith('/uploads/'))
    )
  );
}

export function purgeOrphanUploadUrls(db: DatabaseState, uploadsDir: string, urls: string[]): void {
  for (const rawUrl of urls) {
    const baseUrl = normalizeUrlBase(rawUrl);
    if (!baseUrl.startsWith('/uploads/')) continue;
    if (isMediaInUse(db, baseUrl)) continue;
    // Remove MediaAsset entries for files that were solely attached to purged trash items?
    // Item 16: "Empty Trash" and "Delete permanently" remove the records AND their uploaded files from the database and disk.
    db.media = (db.media || []).filter(m => normalizeUrlBase(m.url) !== baseUrl);
    try {
      const filePath = path.join(uploadsDir, path.basename(baseUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore file unlink errors
    }
  }
}
