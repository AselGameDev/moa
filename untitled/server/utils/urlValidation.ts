import { isSafeUrl } from '../../src/shared/url';

/**
 * Recursively validates known URL-bearing fields and rejects unsafe javascript:/data:/vbscript: schemes.
 * Returns null if valid, or a descriptive error string if invalid.
 */
export function validateSafeUrlField(val: unknown, label: string, allowMailto = false): string | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val !== 'string') return `${label} must be a valid URL string.`;
  if (!isSafeUrl(val, allowMailto)) {
    return `${label} contains an unsafe or invalid URL scheme.`;
  }
  return null;
}

export function validateUrlList(list: unknown, label: string): string | null {
  if (!Array.isArray(list)) return null;
  for (let i = 0; i < list.length; i++) {
    const err = validateSafeUrlField(list[i], `${label}[${i}]`);
    if (err) return err;
  }
  return null;
}

export function validateDocumentsAndLinks(
  documents: unknown,
  externalLinks: unknown
): string | null {
  if (Array.isArray(documents)) {
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i] as Record<string, unknown> | undefined;
      if (doc && typeof doc === 'object') {
        const err = validateSafeUrlField(doc.url, `documents[${i}].url`);
        if (err) return err;
      }
    }
  }
  if (Array.isArray(externalLinks)) {
    for (let i = 0; i < externalLinks.length; i++) {
      const link = externalLinks[i] as Record<string, unknown> | undefined;
      if (link && typeof link === 'object') {
        const err = validateSafeUrlField(link.url, `externalLinks[${i}].url`, true);
        if (err) return err;
      }
    }
  }
  return null;
}

const URL_KEY_RE = /(?:^url$|Url$|Link$|href$|src$|Src$|Image$|Pdf$|^download$|^website$|^repository$|^canonical$)/;

/**
 * Deeply walks blocks / arbitrary structured records and rejects any URL-looking key whose value is unsafe.
 */
export function validateBlocksUrls(blocks: unknown, prefix = 'blocks'): string | null {
  if (!blocks || typeof blocks !== 'object') return null;
  if (Array.isArray(blocks)) {
    for (let i = 0; i < blocks.length; i++) {
      const err = validateBlocksUrls(blocks[i], `${prefix}[${i}]`);
      if (err) return err;
    }
    return null;
  }

  for (const [k, v] of Object.entries(blocks as Record<string, unknown>)) {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed) {
        if (/^(javascript|vbscript|data):/i.test(trimmed)) {
          return `${prefix}.${k} contains a disallowed URL scheme.`;
        }
        if (URL_KEY_RE.test(k) && !isSafeUrl(trimmed, true)) {
          return `${prefix}.${k} must use a safe http(s) or relative URL.`;
        }
      }
    } else if (v && typeof v === 'object') {
      const err = validateBlocksUrls(v, `${prefix}.${k}`);
      if (err) return err;
    }
  }
  return null;
}

export function validateNavigationUrls(nav: unknown): string | null {
  if (!Array.isArray(nav)) return null;
  for (let i = 0; i < nav.length; i++) {
    const item = nav[i] as Record<string, unknown> | undefined;
    if (!item || typeof item !== 'object') continue;
    const err = validateSafeUrlField(item.path, `navigation[${i}].path`);
    if (err) return err;
    if (Array.isArray(item.children)) {
      for (let j = 0; j < item.children.length; j++) {
        const child = item.children[j] as Record<string, unknown> | undefined;
        if (child && typeof child === 'object') {
          const childErr = validateSafeUrlField(child.path, `navigation[${i}].children[${j}].path`);
          if (childErr) return childErr;
        }
      }
    }
  }
  return null;
}

export function validateFooterColumnsUrls(cols: unknown): string | null {
  if (!Array.isArray(cols)) return null;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i] as Record<string, unknown> | undefined;
    if (!col || typeof col !== 'object' || !Array.isArray(col.links)) continue;
    for (let j = 0; j < col.links.length; j++) {
      const link = col.links[j] as Record<string, unknown> | undefined;
      if (link && typeof link === 'object') {
        const err = validateSafeUrlField(link.url, `footerColumns[${i}].links[${j}].url`, true);
        if (err) return err;
      }
    }
  }
  return null;
}
