import type { MainTab } from './portalRegistry';
import type { WebsiteSubTab } from './views/WebsiteTab';
import type { ContentSubTab } from './views/ContentTab';
import type { SettingsSubTab } from './views/SettingsTab';

export type TeamSubTab = 'members' | 'roles' | 'invitations';

export interface PortalSessionState {
  activeTab: MainTab;
  websiteSubTab: WebsiteSubTab;
  contentSubTab: ContentSubTab;
  teamSubTab: TeamSubTab;
  settingsSubTab: SettingsSubTab;
  selectedOrgUnitId: string | null;
}

const PORTAL_COOKIE_NAME = 'moa_portal_state';
const PORTAL_STORAGE_KEY = 'moa_portal_state';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const DEFAULT_PORTAL_SESSION_STATE: PortalSessionState = {
  activeTab: 'overview',
  websiteSubTab: 'pages',
  contentSubTab: 'departments',
  teamSubTab: 'members',
  settingsSubTab: 'organization',
  selectedOrgUnitId: null
};

const VALID_MAIN_TABS = new Set<MainTab>([
  'overview',
  'website',
  'content',
  'media',
  'team',
  'settings'
]);
const VALID_WEBSITE_SUBS = new Set<WebsiteSubTab>([
  'pages',
  'editor',
  'navigation',
  'footer',
  'seo'
]);
const VALID_CONTENT_SUBS = new Set<ContentSubTab>([
  'departments',
  'projects',
  'publications',
  'products'
]);
const VALID_TEAM_SUBS = new Set<TeamSubTab>(['members', 'roles', 'invitations']);
const VALID_SETTINGS_SUBS = new Set<SettingsSubTab>([
  'organization',
  'security',
  'inbox',
  'audit',
  'health',
  'backups',
  'trash'
]);

function readCookieRaw(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function writeCookieRaw(name: string, value: string, maxAge = COOKIE_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // Ignore cookie errors in restricted contexts
  }
}

function normalizeState(raw: Partial<PortalSessionState> | null | undefined): PortalSessionState {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PORTAL_SESSION_STATE };
  }
  return {
    activeTab: raw.activeTab && VALID_MAIN_TABS.has(raw.activeTab)
      ? raw.activeTab
      : DEFAULT_PORTAL_SESSION_STATE.activeTab,
    websiteSubTab: raw.websiteSubTab && VALID_WEBSITE_SUBS.has(raw.websiteSubTab)
      ? raw.websiteSubTab
      : DEFAULT_PORTAL_SESSION_STATE.websiteSubTab,
    contentSubTab: raw.contentSubTab && VALID_CONTENT_SUBS.has(raw.contentSubTab)
      ? raw.contentSubTab
      : DEFAULT_PORTAL_SESSION_STATE.contentSubTab,
    teamSubTab: raw.teamSubTab && VALID_TEAM_SUBS.has(raw.teamSubTab)
      ? raw.teamSubTab
      : DEFAULT_PORTAL_SESSION_STATE.teamSubTab,
    settingsSubTab: raw.settingsSubTab && VALID_SETTINGS_SUBS.has(raw.settingsSubTab)
      ? raw.settingsSubTab
      : DEFAULT_PORTAL_SESSION_STATE.settingsSubTab,
    selectedOrgUnitId:
      typeof raw.selectedOrgUnitId === 'string' && raw.selectedOrgUnitId.trim()
        ? raw.selectedOrgUnitId
        : null
  };
}

export function loadPortalSessionState(): PortalSessionState {
  if (typeof window === 'undefined') return { ...DEFAULT_PORTAL_SESSION_STATE };
  const cookieRaw = readCookieRaw(PORTAL_COOKIE_NAME);
  if (cookieRaw) {
    try {
      return normalizeState(JSON.parse(cookieRaw) as Partial<PortalSessionState>);
    } catch {
      // Fallback to sessionStorage
    }
  }
  try {
    const storageRaw = window.sessionStorage.getItem(PORTAL_STORAGE_KEY);
    if (storageRaw) {
      return normalizeState(JSON.parse(storageRaw) as Partial<PortalSessionState>);
    }
  } catch {
    // Ignore storage access errors
  }
  return { ...DEFAULT_PORTAL_SESSION_STATE };
}

export function savePortalSessionState(patch: Partial<PortalSessionState>): PortalSessionState {
  const current = loadPortalSessionState();
  const next = normalizeState({ ...current, ...patch });
  const serialized = JSON.stringify(next);
  writeCookieRaw(PORTAL_COOKIE_NAME, serialized);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(PORTAL_STORAGE_KEY, serialized);
    } catch {
      // Ignore storage access errors
    }
  }
  return next;
}

export function resetPortalActiveTabOnExit(): void {
  const resetState: PortalSessionState = { ...DEFAULT_PORTAL_SESSION_STATE };
  const serialized = JSON.stringify(resetState);
  writeCookieRaw(PORTAL_COOKIE_NAME, serialized);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(PORTAL_STORAGE_KEY, serialized);
    } catch {
      // Ignore storage access errors
    }
  }
}

export function clearPortalSessionState(): void {
  writeCookieRaw(PORTAL_COOKIE_NAME, '', 0);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(PORTAL_STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }
}
