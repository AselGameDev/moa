export function isSafeUrl(raw: unknown, allowMailto = false): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // Disallow control characters / embedded whitespace tricks
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false;

  // Reject protocol-relative // URLs
  if (trimmed.startsWith('//')) return false;

  // Allow safe root-relative paths
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('/\\');
  }

  // Allow hash links
  if (trimmed.startsWith('#')) return true;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') return true;
    if (allowMailto && protocol === 'mailto:') return true;
    return false;
  } catch {
    return false;
  }
}

export function sanitizeSafeUrl(raw: unknown, allowMailto = false): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return isSafeUrl(trimmed, allowMailto) ? trimmed : '';
}

export function isHttpUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed || /[\x00-\x1F\x7F]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeSlug(raw: unknown, fallbackPrefix = 'item'): string {
  const cleaned = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `${fallbackPrefix}-${Date.now()}`;
}

export interface VideoEmbedResult {
  kind: 'iframe' | 'video';
  src: string;
}

const SAFE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{4,64}$/;
const SAFE_VIMEO_ID_RE = /^[0-9]{4,20}$/;

export function parseVideoEmbed(raw: unknown): VideoEmbedResult | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || /[\x00-\x1F\x7F]/.test(trimmed)) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { kind: 'video', src: trimmed };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const parts = parsed.pathname.split('/').filter(Boolean);

  // YouTube handling
  if (
    host === 'youtu.be' ||
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = parts[0] || '';
    } else if (parts[0] === 'watch') {
      videoId = parsed.searchParams.get('v') || '';
    } else if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
      videoId = parts[1] || '';
    }
    if (SAFE_VIDEO_ID_RE.test(videoId)) {
      return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${videoId}` };
    }
    return null;
  }

  // Vimeo handling
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    let videoId = '';
    if (host === 'player.vimeo.com' && parts[0] === 'video') {
      videoId = parts[1] || '';
    } else {
      videoId = parts[parts.length - 1] || '';
    }
    if (SAFE_VIMEO_ID_RE.test(videoId)) {
      return { kind: 'iframe', src: `https://player.vimeo.com/video/${videoId}` };
    }
    return null;
  }

  // Direct video file URL (must end with a known video extension or be a local upload)
  const lowerPath = parsed.pathname.toLowerCase();
  if (
    lowerPath.endsWith('.mp4') ||
    lowerPath.endsWith('.webm') ||
    lowerPath.endsWith('.mov') ||
    lowerPath.endsWith('.ogg') ||
    lowerPath.endsWith('.m4v') ||
    lowerPath.includes('/uploads/')
  ) {
    return { kind: 'video', src: parsed.toString() };
  }

  return null;
}
