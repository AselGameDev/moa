import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MEMORY_CACHE = new Map<string, string>();
const IN_FLIGHT = new Map<string, Promise<string | null>>();
const STORAGE_PREFIX = 'moa_pdf_thumb_v1:';

export async function renderPdfPageOneDataUrl(
  source: string | Uint8Array,
  options: { scale?: number; format?: 'image/png' | 'image/jpeg'; quality?: number } = {}
): Promise<string> {
  const scale = options.scale ?? 1.25;
  const format = options.format ?? 'image/png';
  const quality = options.quality ?? 0.85;

  const loadingTask =
    typeof source === 'string'
      ? pdfjsLib.getDocument({ url: source, withCredentials: false })
      : pdfjsLib.getDocument({ data: source });

  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL(format, quality);
  } finally {
    const maybeDestroy = (pdf as unknown as { destroy?: () => Promise<void> }).destroy;
    if (typeof maybeDestroy === 'function') {
      await maybeDestroy.call(pdf).catch(() => undefined);
    }
  }
}

function readCachedStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

function writeCachedStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export async function getOrGeneratePdfThumbnail(
  idOrUrl: string,
  maybePdfUrl?: string
): Promise<string | null> {
  const cleanUrl = (maybePdfUrl ?? idOrUrl)?.trim();
  if (!cleanUrl) return null;
  const cacheKey = maybePdfUrl ? `${idOrUrl}:${cleanUrl}` : cleanUrl;

  const mem = MEMORY_CACHE.get(cacheKey);
  if (mem) return mem;

  const stored = readCachedStorage(cacheKey);
  if (stored) {
    MEMORY_CACHE.set(cacheKey, stored);
    return stored;
  }

  const pending = IN_FLIGHT.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    try {
      const dataUrl = await renderPdfPageOneDataUrl(cleanUrl, {
        scale: 0.9,
        format: 'image/jpeg',
        quality: 0.8
      });
      MEMORY_CACHE.set(cacheKey, dataUrl);
      writeCachedStorage(cacheKey, dataUrl);
      return dataUrl;
    } catch {
      return null;
    } finally {
      IN_FLIGHT.delete(cacheKey);
    }
  })();

  IN_FLIGHT.set(cacheKey, task);
  return task;
}
