import { useMemo } from 'react';
import type { SiteContent } from '../types';
import { INITIAL_SITE_CONTENT } from '../data/initialData';

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function mergeDeep<T>(base: T, override?: Partial<T> | null): T {
  if (override === undefined || override === null) {
    return base;
  }
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override as T;
  }
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const nextVal = (override as Record<string, unknown>)[key];
    if (nextVal === undefined) continue;
    const prevVal = result[key];
    if (Array.isArray(nextVal)) {
      result[key] = nextVal;
    } else if (isPlainObject(prevVal) && isPlainObject(nextVal)) {
      result[key] = mergeDeep(prevVal, nextVal);
    } else {
      result[key] = nextVal;
    }
  }
  return result as T;
}

export function getContentByPath<T = string>(
  source: SiteContent,
  fieldPath: string,
  fallback?: T
): T {
  const parts = fieldPath.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      current = undefined;
      break;
    }
  }
  if (current === undefined) {
    // Also check INITIAL_SITE_CONTENT fallback
    let initCurr: unknown = INITIAL_SITE_CONTENT;
    for (const part of parts) {
      if (initCurr && typeof initCurr === 'object' && part in (initCurr as Record<string, unknown>)) {
        initCurr = (initCurr as Record<string, unknown>)[part];
      } else {
        initCurr = undefined;
        break;
      }
    }
    if (fallback !== undefined) return fallback;
    return initCurr as T;
  }
  return current as T;
}

export function useContent(
  siteContent?: SiteContent | null,
  draftContent?: Partial<SiteContent> | null
) {
  const content = useMemo(() => {
    const withSaved = mergeDeep(INITIAL_SITE_CONTENT, siteContent);
    return mergeDeep(withSaved, draftContent);
  }, [siteContent, draftContent]);

  const getText = (fieldPath: string, fallback = ''): string => {
    const val = getContentByPath<unknown>(content, fieldPath);
    return typeof val === 'string' ? val : fallback;
  };

  return { content, getText };
}
