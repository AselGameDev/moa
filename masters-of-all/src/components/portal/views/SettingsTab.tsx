import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  ShieldCheck,
  Inbox,
  Database,
  History,
  Activity,
  Trash2,
  Save,
  Check,
  Download,
  Upload,
  Search,
  ExternalLink,
  Lock,
  Share2,
  Plus,
  RefreshCw,
  CheckCircle2,
  Shield,
  KeyRound,
  AlertCircle,
  Archive,
  Copy,
  MoveUp,
  MoveDown,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  MailOpen
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../../../services/api';
import {
  FormSubmission,
  SiteSettings,
  Department,
  Project,
  SiteContent,
  SocialLink,
  User,
  RoleDefinition,
  BackupFileInfo,
  ActivityRecord,
  SecurityLogRecord,
  SiteHealthItem,
  TrashItemsResponse
} from '../../../types';
import { can } from '../../../shared/permissions';
import { isSafeUrl, sanitizeSafeUrl } from '../../../shared/url';
import { getVisibleSubTabs } from '../portalRegistry';
import { getPlatformIcon } from '../../SocialIcons';
import { ConfirmDialog } from '../ConfirmDialog';
import { DeleteButton, DESTRUCTIVE_LABEL_BTN_CLASS } from '../DeleteButton';

export type SettingsSubTab =
  | 'organization'
  | 'security'
  | 'inbox'
  | 'audit'
  | 'health'
  | 'backups'
  | 'trash';

interface SettingsTabProps {
  currentSubTab: SettingsSubTab;
  onSubTabChange: (sub: SettingsSubTab) => void;
  currentUser: User;
  roles?: RoleDefinition[];
  settings?: SiteSettings;
  onUpdateSettings?: (settings: Partial<SiteSettings>) => Promise<void>;
  departments?: Department[];
  projects?: Project[];
  siteContent?: SiteContent;
  onRefreshData?: () => Promise<void>;
  onNavigateTab?: (tab: string, subTab?: string) => void;
  onUserUpdated?: (user: User) => void;
}

type TrashEntityType = 'department' | 'project' | 'publication' | 'product' | 'page';

interface FlattenedTrashItem {
  id: string;
  entityType: TrashEntityType;
  labelType: 'Department' | 'Project' | 'Publication' | 'Product' | 'Page';
  title: string;
  deletedAt: string;
  daysLeftLabel: string;
}

const SUBTAB_ICONS: Record<SettingsSubTab, React.ComponentType<{ className?: string }>> = {
  organization: Building2,
  security: ShieldCheck,
  inbox: Inbox,
  audit: History,
  health: Activity,
  backups: Database,
  trash: Trash2
};

function escapeCsvCell(value: string): string {
  let clean = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(clean)) {
    clean = `'${clean}`;
  }
  return `"${clean.replace(/"/g, '""')}"`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentSubTab,
  onSubTabChange,
  currentUser,
  roles,
  settings,
  onUpdateSettings,
  onRefreshData,
  onNavigateTab,
  onUserUpdated
}) => {
  const canManageSettings = can(currentUser, 'settings.manage', roles);
  const canViewInbox = can(currentUser, 'inbox.view', roles);
  const canViewAudit = can(currentUser, 'audit.view', roles);
  const canManageBackups = can(currentUser, 'backups.manage', roles);
  const canManageTrash = can(currentUser, 'trash.manage', roles);

  const visibleSubTabs = useMemo(
    () => getVisibleSubTabs('settings', currentUser, roles),
    [currentUser, roles]
  );

  // Global status/error feedback
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setBannerError(null);
    setBannerSuccess(msg);
    setTimeout(() => setBannerSuccess(prev => (prev === msg ? null : prev)), 4000);
  };

  // 1. Organization, Announcement Bar & Social Links State
  const [orgData, setOrgData] = useState({
    name: settings?.siteName || 'Masters Of All',
    tagline: settings?.tagline || '',
    contactEmail: settings?.contactEmail || '',
    organizationAddress: settings?.organizationAddress || '',
    timezone: settings?.timezone || 'UTC',
    primaryLanguage: settings?.language || 'en-GB',
    maintenanceMode: Boolean(settings?.maintenanceMode),
    alwaysShowProducts: Boolean(settings?.alwaysShowProducts),
    maintenanceAllowlistText: (settings?.maintenanceAllowlist || []).join('\n'),
    footerText: settings?.footerText || '',
    announcementEnabled: Boolean(settings?.announcementBar?.enabled),
    announcementText: settings?.announcementBar?.text || '',
    announcementLinkUrl: settings?.announcementBar?.linkUrl || '',
    announcementLinkLabel: settings?.announcementBar?.linkLabel || '',
    announcementExpiresAt: settings?.announcementBar?.expiresAt || ''
  });

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => settings?.socialLinks || []);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformUrl, setNewPlatformUrl] = useState('');
  const [isAddingSocial, setIsAddingSocial] = useState(false);
  const [orgSaving, setOrgSaving] = useState(false);

  // 2. Security Policy State
  const [securityConfig, setSecurityConfig] = useState({
    enforce2FAForAdmins: settings?.securityPolicy?.enforce2FAForAdmins ?? false,
    minPasswordLength: Math.max(12, settings?.securityPolicy?.minPasswordLength ?? 12),
    requireUppercase: settings?.securityPolicy?.requireUppercase ?? true,
    requireNumber: settings?.securityPolicy?.requireNumber ?? true,
    requireSymbol: settings?.securityPolicy?.requireSymbol ?? true,
    sessionTimeoutMinutes: settings?.securityPolicy?.sessionTimeoutMinutes ?? 120,
    maxLoginAttempts: settings?.securityPolicy?.maxLoginAttempts ?? 5,
    lockoutDurationMinutes: settings?.securityPolicy?.lockoutDurationMinutes ?? 15
  });
  const [securitySaving, setSecuritySaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setOrgData({
        name: settings.siteName || 'Masters Of All',
        tagline: settings.tagline || '',
        contactEmail: settings.contactEmail || '',
        organizationAddress: settings.organizationAddress || '',
        timezone: settings.timezone || 'UTC',
        primaryLanguage: settings.language || 'en-GB',
        maintenanceMode: Boolean(settings.maintenanceMode),
        alwaysShowProducts: Boolean(settings.alwaysShowProducts),
        maintenanceAllowlistText: (settings.maintenanceAllowlist || []).join('\n'),
        footerText: settings.footerText || '',
        announcementEnabled: Boolean(settings.announcementBar?.enabled),
        announcementText: settings.announcementBar?.text || '',
        announcementLinkUrl: settings.announcementBar?.linkUrl || '',
        announcementLinkLabel: settings.announcementBar?.linkLabel || '',
        announcementExpiresAt: settings.announcementBar?.expiresAt || ''
      });
      setSocialLinks(settings.socialLinks || []);
      if (settings.securityPolicy) {
        setSecurityConfig({
          enforce2FAForAdmins: Boolean(settings.securityPolicy.enforce2FAForAdmins),
          minPasswordLength: Math.max(12, settings.securityPolicy.minPasswordLength ?? 12),
          requireUppercase: Boolean(settings.securityPolicy.requireUppercase),
          requireNumber: Boolean(settings.securityPolicy.requireNumber),
          requireSymbol: Boolean(settings.securityPolicy.requireSymbol),
          sessionTimeoutMinutes: settings.securityPolicy.sessionTimeoutMinutes ?? 120,
          maxLoginAttempts: settings.securityPolicy.maxLoginAttempts ?? 5,
          lockoutDurationMinutes: settings.securityPolicy.lockoutDurationMinutes ?? 15
        });
      }
    }
  }, [settings]);

  // 2b. Personal Account Email & Password State
  const [credEmail, setCredEmail] = useState<string>(currentUser?.email || '');
  const [credCurrentPassword, setCredCurrentPassword] = useState('');
  const [credNewPassword, setCredNewPassword] = useState('');
  const [credConfirmPassword, setCredConfirmPassword] = useState('');
  const [credSaving, setCredSaving] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.email) {
      setCredEmail(currentUser.email);
    }
  }, [currentUser?.email]);

  // 2c. Personal Account TOTP 2FA State
  const [totpEnabled, setTotpEnabled] = useState<boolean>(
    Boolean(currentUser?.twoFactorEnabled ?? api.getCurrentUser()?.twoFactorEnabled)
  );
  const [totpSetupData, setTotpSetupData] = useState<{
    secret: string;
    qrDataUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpSuccess, setTotpSuccess] = useState<string | null>(null);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    if (typeof currentUser?.twoFactorEnabled === 'boolean') {
      setTotpEnabled(currentUser.twoFactorEnabled);
    }
  }, [currentUser?.twoFactorEnabled]);

  // 3. Read-Only Contact Inbox State
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'new' | 'read' | 'archived'>('all');
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxTotalPages, setInboxTotalPages] = useState(1);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<FormSubmission | null>(null);

  // 4. Backups State
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [pendingImportPayload, setPendingImportPayload] = useState<{
    filename: string;
    data: unknown;
  } | null>(null);

  // 5. Audit & Security Log State
  const [auditView, setAuditView] = useState<'activity' | 'security'>('activity');
  const [auditLogs, setAuditLogs] = useState<ActivityRecord[]>([]);
  const [auditArea, setAuditArea] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [securityLogs, setSecurityLogs] = useState<SecurityLogRecord[]>([]);
  const [securityLogsLoading, setSecurityLogsLoading] = useState(false);

  // 6. Site Health State
  const [healthItems, setHealthItems] = useState<SiteHealthItem[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // 7. Trash State
  const [trashData, setTrashData] = useState<TrashItemsResponse>({
    departments: [],
    projects: [],
    publications: [],
    products: [],
    pages: []
  });
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError, setTrashError] = useState<string | null>(null);
  const [confirmDeleteTrashItem, setConfirmDeleteTrashItem] = useState<FlattenedTrashItem | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  // Load real operational data
  const loadSubmissions = useCallback(async () => {
    if (!canViewInbox) return;
    setInboxLoading(true);
    setInboxError(null);
    try {
      const res = await api.getSubmissions({
        page: inboxPage,
        limit: 20,
        status: inboxFilter,
        q: inboxSearch.trim() || undefined
      });
      if (Array.isArray(res)) {
        setSubmissions(res);
        setInboxTotalPages(1);
        setInboxUnreadCount(res.filter(s => s.status === 'new').length);
      } else {
        setSubmissions(res.items || []);
        setInboxTotalPages(res.totalPages || 1);
        setInboxUnreadCount(res.unreadCount ?? 0);
      }
    } catch (err: unknown) {
      setInboxError(err instanceof Error ? err.message : 'Could not fetch contact inbox.');
    } finally {
      setInboxLoading(false);
    }
  }, [canViewInbox, inboxPage, inboxFilter, inboxSearch]);

  const loadBackups = useCallback(async () => {
    if (!canManageBackups) return;
    setBackupLoading(true);
    setBackupError(null);
    try {
      const list = await api.listBackups();
      setBackups(list);
    } catch (err: unknown) {
      setBackupError(err instanceof Error ? err.message : 'Could not fetch server backups.');
    } finally {
      setBackupLoading(false);
    }
  }, [canManageBackups]);

  const loadAuditLogs = useCallback(async () => {
    if (!canViewAudit) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await api.getActivityLog({
        page: auditPage,
        limit: 25,
        area: auditArea,
        q: auditSearch.trim() || undefined
      });
      if (Array.isArray(res)) {
        setAuditLogs(res);
        setAuditTotalPages(1);
      } else {
        setAuditLogs(res.items || []);
        setAuditTotalPages(res.totalPages || 1);
      }
    } catch (err: unknown) {
      setAuditError(err instanceof Error ? err.message : 'Could not load activity log.');
    } finally {
      setAuditLoading(false);
    }
  }, [canViewAudit, auditPage, auditArea, auditSearch]);

  const loadSecurityLogs = useCallback(async () => {
    if (!canViewAudit) return;
    setSecurityLogsLoading(true);
    setAuditError(null);
    try {
      const list = await api.getSecurityLog();
      setSecurityLogs(list);
    } catch (err: unknown) {
      setAuditError(err instanceof Error ? err.message : 'Could not load security event log.');
    } finally {
      setSecurityLogsLoading(false);
    }
  }, [canViewAudit]);

  const loadHealth = useCallback(async () => {
    if (!canViewAudit) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const list = await api.getSiteHealth();
      setHealthItems(list);
    } catch (err: unknown) {
      setHealthError(err instanceof Error ? err.message : 'Could not run site health check.');
    } finally {
      setHealthLoading(false);
    }
  }, [canViewAudit]);

  const loadTrash = useCallback(async () => {
    if (!canManageTrash) return;
    setTrashLoading(true);
    setTrashError(null);
    try {
      const data = await api.getTrashItems();
      setTrashData({
        departments: data.departments || [],
        projects: data.projects || [],
        publications: data.publications || [],
        products: data.products || [],
        pages: data.pages || []
      });
    } catch (err: unknown) {
      setTrashError(err instanceof Error ? err.message : 'Could not load Trash items.');
    } finally {
      setTrashLoading(false);
    }
  }, [canManageTrash]);

  useEffect(() => {
    if (canViewInbox) void loadSubmissions();
    if (canManageTrash) void loadTrash();
    if (canViewAudit) void loadHealth();
  }, [canViewInbox, canManageTrash, canViewAudit, loadSubmissions, loadTrash, loadHealth]);

  useEffect(() => {
    if (currentSubTab === 'backups') void loadBackups();
    if (currentSubTab === 'audit') {
      if (auditView === 'activity') void loadAuditLogs();
      else void loadSecurityLogs();
    }
    if (currentSubTab === 'health') void loadHealth();
    if (currentSubTab === 'trash') void loadTrash();
    if (currentSubTab === 'inbox') void loadSubmissions();
  }, [currentSubTab, auditView, loadBackups, loadAuditLogs, loadSecurityLogs, loadHealth, loadTrash, loadSubmissions]);

  // 2FA Handlers
  const handleStart2FASetup = async () => {
    setTotpLoading(true);
    setTotpError(null);
    setTotpSuccess(null);
    try {
      const data = await api.setup2FA();
      const qrDataUrl = await QRCode.toDataURL(data.otpauthUri, { width: 192, margin: 1 });
      setTotpSetupData({
        secret: data.secret,
        qrDataUrl,
        recoveryCodes: data.recoveryCodes
      });
      setTotpCode('');
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : 'Failed to initialize 2FA setup.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim()) return;
    setTotpLoading(true);
    setTotpError(null);
    try {
      const res = await api.verify2FA(totpCode.trim());
      setTotpEnabled(Boolean(res.twoFactorEnabled));
      if (res.user && onUserUpdated) onUserUpdated(res.user);
      setTotpSetupData(null);
      setTotpCode('');
      setTotpSuccess('Two-factor authentication is now enabled on your account.');
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword || !disableCode.trim()) {
      setTotpError('Password and current 2FA or recovery code are required.');
      return;
    }
    setTotpLoading(true);
    setTotpError(null);
    try {
      const res = await api.disable2FA(disablePassword, disableCode.trim());
      setTotpEnabled(Boolean(res.twoFactorEnabled));
      if (res.user && onUserUpdated) onUserUpdated(res.user);
      setShowDisable2FA(false);
      setDisablePassword('');
      setDisableCode('');
      setTotpSuccess('Two-factor authentication has been disabled.');
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : 'Could not disable 2FA.');
    } finally {
      setTotpLoading(false);
    }
  };

  // Account Email & Password Update Handler
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);

    const normalizedNextEmail = credEmail.trim().toLowerCase();
    const currentNormalizedEmail = (currentUser?.email || '').trim().toLowerCase();
    const emailChanged = Boolean(normalizedNextEmail && normalizedNextEmail !== currentNormalizedEmail);
    const passwordChanged = Boolean(credNewPassword);

    if (!credCurrentPassword) {
      setCredError('Enter your current password to confirm credential changes.');
      return;
    }

    if (!emailChanged && !passwordChanged) {
      setCredError('Change your email address or enter a new password before saving.');
      return;
    }

    if (passwordChanged && credNewPassword !== credConfirmPassword) {
      setCredError('New password and confirmation do not match.');
      return;
    }

    setCredSaving(true);
    try {
      const res = await api.updateCredentials({
        currentPassword: credCurrentPassword,
        newEmail: emailChanged ? normalizedNextEmail : undefined,
        newPassword: passwordChanged ? credNewPassword : undefined
      });
      if (res.user && onUserUpdated) {
        onUserUpdated(res.user);
      }
      setCredCurrentPassword('');
      setCredNewPassword('');
      setCredConfirmPassword('');
      setCredSuccess(res.message || 'Account credentials updated.');
      showSuccess(res.message || 'Account credentials updated.');
    } catch (err: unknown) {
      setCredError(err instanceof Error ? err.message : 'Could not update credentials.');
    } finally {
      setCredSaving(false);
    }
  };

  // Organization Save
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);

    if (orgData.announcementEnabled && orgData.announcementLinkUrl.trim() && !isSafeUrl(orgData.announcementLinkUrl.trim())) {
      setBannerError('Announcement bar link must be a valid http://, https://, or relative URL.');
      return;
    }

    for (const s of socialLinks) {
      if (!s.url.trim() || !isSafeUrl(s.url.trim(), false)) {
        setBannerError(`Social link "${s.platform}" must use http:// or https://.`);
        return;
      }
    }

    setOrgSaving(true);
    try {
      const allowlist = orgData.maintenanceAllowlistText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);

      const updatedSettings: Partial<SiteSettings> = {
        siteName: orgData.name.trim(),
        tagline: orgData.tagline.trim(),
        contactEmail: orgData.contactEmail.trim(),
        organizationAddress: orgData.organizationAddress.trim(),
        language: orgData.primaryLanguage.trim() || 'en-GB',
        timezone: orgData.timezone.trim() || 'UTC',
        maintenanceMode: orgData.maintenanceMode,
        alwaysShowProducts: orgData.alwaysShowProducts,
        maintenanceAllowlist: allowlist,
        footerText: orgData.footerText.trim(),
        announcementBar: {
          enabled: orgData.announcementEnabled,
          text: orgData.announcementText.trim(),
          linkUrl: orgData.announcementLinkUrl.trim() || undefined,
          linkLabel: orgData.announcementLinkLabel.trim() || undefined,
          expiresAt: orgData.announcementExpiresAt.trim() || undefined
        },
        socialLinks
      };

      if (onUpdateSettings) {
        await onUpdateSettings(updatedSettings);
      } else {
        await api.updateSettings(updatedSettings);
      }
      if (onRefreshData) await onRefreshData();
      showSuccess('Organization profile, announcement bar, and social channels saved live.');
    } catch (err: unknown) {
      setBannerError(err instanceof Error ? err.message : 'Failed to save organization settings.');
    } finally {
      setOrgSaving(false);
    }
  };

  const handleSocialUrlChange = (id: string, newUrl: string) => {
    setSocialLinks(prev => prev.map(s => (s.id === id ? { ...s, url: newUrl } : s)));
  };

  const handleMoveSocial = (index: number, dir: -1 | 1) => {
    setSocialLinks(prev => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const handleRemoveSocial = (id: string) => {
    setSocialLinks(prev => prev.filter(s => s.id !== id));
  };

  const handleAddSocial = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlatform = newPlatformName.trim();
    const cleanUrl = newPlatformUrl.trim();
    if (!cleanPlatform || !cleanUrl) return;
    if (!isSafeUrl(cleanUrl, false)) {
      setBannerError('Social channel URL must begin with http:// or https://.');
      return;
    }
    const newLink: SocialLink = {
      id: `soc-${Date.now()}`,
      platform: cleanPlatform,
      icon: cleanPlatform.toLowerCase().replace(/[^a-z]/g, ''),
      url: cleanUrl
    };
    setSocialLinks(prev => [...prev, newLink]);
    setNewPlatformName('');
    setNewPlatformUrl('');
    setIsAddingSocial(false);
    setBannerError(null);
  };

  // Security Policy Save
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySaving(true);
    setBannerError(null);
    try {
      const updatedSettings: Partial<SiteSettings> = {
        securityPolicy: {
          minPasswordLength: Math.max(12, Number(securityConfig.minPasswordLength)),
          requireUppercase: Boolean(securityConfig.requireUppercase),
          requireNumber: Boolean(securityConfig.requireNumber),
          requireSymbol: Boolean(securityConfig.requireSymbol),
          sessionTimeoutMinutes: Number(securityConfig.sessionTimeoutMinutes),
          enforce2FAForAdmins: Boolean(securityConfig.enforce2FAForAdmins),
          maxLoginAttempts: Number(securityConfig.maxLoginAttempts),
          lockoutDurationMinutes: Number(securityConfig.lockoutDurationMinutes)
        }
      };

      if (onUpdateSettings) {
        await onUpdateSettings(updatedSettings);
      } else {
        await api.updateSettings(updatedSettings);
      }
      if (onRefreshData) await onRefreshData();
      showSuccess('Security and authentication policy saved.');
    } catch (err: unknown) {
      setBannerError(err instanceof Error ? err.message : 'Failed to save security configuration.');
    } finally {
      setSecuritySaving(false);
    }
  };

  // Backups
  const triggerJsonDownload = (payload: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBackup = async () => {
    setBackupInProgress(true);
    setBannerError(null);
    try {
      const exported = await api.exportEverything();
      triggerJsonDownload(exported, `moa_backup_${new Date().toISOString().split('T')[0]}.json`);
      showSuccess('Sanitized snapshot exported from server.');
    } catch (err: unknown) {
      setBannerError(err instanceof Error ? err.message : 'Failed to export system backup.');
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleDownloadServerBackup = async (filename: string) => {
    setBannerError(null);
    try {
      const data = await api.downloadBackup(filename);
      triggerJsonDownload(data, filename);
      showSuccess(`Downloaded server snapshot ${filename}.`);
    } catch (err: unknown) {
      setBannerError(err instanceof Error ? err.message : 'Could not download server backup.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBannerError(null);

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || !parsed.departments || !parsed.settings) {
          setBannerError('Invalid backup format. Expected a valid MoA backup export containing departments and settings.');
          return;
        }
        setPendingImportPayload({ filename: file.name, data: parsed });
      } catch {
        setBannerError('Could not parse valid JSON from the selected backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Read-Only Inbox Status Updates
  const handleUpdateSubmissionStatus = async (sub: FormSubmission, status: FormSubmission['status']) => {
    setBannerError(null);
    try {
      const updated = await api.updateSubmission(sub.id, { status });
      setSubmissions(prev => prev.map(s => (s.id === sub.id ? updated : s)));
      if (selectedSubmission?.id === sub.id) {
        setSelectedSubmission(updated);
      }
      await loadSubmissions();
      if (onRefreshData) await onRefreshData();
      showSuccess(`Inquiry marked as ${status}.`);
    } catch (err: unknown) {
      setBannerError(err instanceof Error ? err.message : 'Failed to update inquiry status.');
    }
  };

  const handleSelectSubmission = (sub: FormSubmission) => {
    setSelectedSubmission(sub);
    setCopiedEmail(false);
    if (sub.status === 'new') {
      void handleUpdateSubmissionStatus(sub, 'read');
    }
  };

  const handleCopySenderEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      setBannerError('Could not copy email address to clipboard.');
    }
  };

  // Trash Flattening & Actions
  const flattenedTrash: FlattenedTrashItem[] = useMemo(() => {
    const calcRemaining = (deletedAt?: string) => {
      if (!deletedAt) return '30 days left';
      const elapsedDays = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, 30 - elapsedDays);
      return `${remaining} day${remaining === 1 ? '' : 's'} left`;
    };

    return [
      ...(trashData.departments || []).map(d => ({
        id: d.id,
        entityType: 'department' as const,
        labelType: 'Department' as const,
        title: d.name,
        deletedAt: d.deletedAt || '',
        daysLeftLabel: calcRemaining(d.deletedAt)
      })),
      ...(trashData.projects || []).map(p => ({
        id: p.id,
        entityType: 'project' as const,
        labelType: 'Project' as const,
        title: p.title,
        deletedAt: p.deletedAt || '',
        daysLeftLabel: calcRemaining(p.deletedAt)
      })),
      ...(trashData.publications || []).map(pub => ({
        id: pub.id,
        entityType: 'publication' as const,
        labelType: 'Publication' as const,
        title: pub.title,
        deletedAt: pub.deletedAt || '',
        daysLeftLabel: calcRemaining(pub.deletedAt)
      })),
      ...(trashData.products || []).map(prod => ({
        id: prod.id,
        entityType: 'product' as const,
        labelType: 'Product' as const,
        title: prod.name,
        deletedAt: prod.deletedAt || '',
        daysLeftLabel: calcRemaining(prod.deletedAt)
      })),
      ...(trashData.pages || []).map(pg => ({
        id: pg.id,
        entityType: 'page' as const,
        labelType: 'Page' as const,
        title: pg.title,
        deletedAt: pg.deletedAt || '',
        daysLeftLabel: calcRemaining(pg.deletedAt)
      }))
    ];
  }, [trashData]);

  const handleRestoreTrash = async (item: FlattenedTrashItem) => {
    setBannerError(null);
    try {
      await api.restoreTrashItem(item.entityType, item.id);
      await loadTrash();
      if (onRefreshData) await onRefreshData();
      showSuccess(`Restored ${item.labelType.toLowerCase()} "${item.title}" to workspace.`);
    } catch (err: unknown) {
      setBannerError(err instanceof Error ? err.message : 'Failed to restore item from Trash.');
    }
  };

  const healthScore = Math.max(0, 100 - healthItems.length * 10);

  const tabCounts: Partial<Record<SettingsSubTab, number>> = {
    inbox: inboxUnreadCount,
    health: healthItems.length,
    trash: flattenedTrash.length
  };

  const isCurrentTabAllowed = visibleSubTabs.some(st => st.id === currentSubTab);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0f4440]/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDE9E0]">System Settings &amp; Foundation</h1>
          <p className="text-sm text-[#EDE9E0]/60 mt-1">
            Configure organization details, official social channels, security policy, and workspace diagnostics.
          </p>
        </div>
      </div>

      {/* Global Status Feedback Banners */}
      {bannerError && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button type="button" onClick={() => setBannerError(null)} className="text-red-300 hover:text-white cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {bannerSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{bannerSuccess}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#0f4440] pb-2">
        {visibleSubTabs.map(tabDef => {
          const key = tabDef.id as SettingsSubTab;
          const Icon = SUBTAB_ICONS[key] || Building2;
          const active = currentSubTab === key;
          const count = tabCounts[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSubTabChange(key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#25CDB6]/15 text-[#25CDB6] border border-[#25CDB6]/40 shadow-xs'
                  : 'text-[#EDE9E0]/60 hover:text-[#EDE9E0] hover:bg-[#073635]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tabDef.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    active ? 'bg-[#25CDB6] text-[#06302F]' : 'bg-[#0f4440] text-[#EDE9E0]/70'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!isCurrentTabAllowed && (
        <div className="p-10 rounded-2xl bg-[#052827] border border-[#0f4440] text-center space-y-3">
          <Lock className="w-8 h-8 text-[#D0A873] mx-auto" />
          <h3 className="text-base font-bold text-[#EDE9E0]">Access Restricted</h3>
          <p className="text-xs text-[#EDE9E0]/60 max-w-md mx-auto">
            Your current role does not grant access to this settings panel. You can still configure your personal two-factor authentication in Security &amp; Auth.
          </p>
          <button
            type="button"
            onClick={() => onSubTabChange('security')}
            className="px-4 py-2 rounded-xl bg-[#25CDB6] text-[#06302F] text-xs font-bold cursor-pointer"
          >
            Go to Security &amp; Auth
          </button>
        </div>
      )}

      {/* ===================================================================
          1. SUB-TAB: ORGANIZATION & OFFICIAL SOCIAL CHANNELS
          =================================================================== */}
      {canManageSettings && currentSubTab === 'organization' && (
        <form onSubmit={handleSaveOrg} className="space-y-8">
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#0f4440] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#EDE9E0]">Organization Profile</h3>
                <p className="text-xs text-[#EDE9E0]/60">Public identity, maintenance state, and contact coordinates.</p>
              </div>
              <span className="text-[11px] font-mono text-[#25CDB6] bg-[#25CDB6]/10 px-2.5 py-1 rounded-full font-bold">
                Live on Public Website
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Public Name</label>
                <input
                  type="text"
                  value={orgData.name}
                  onChange={e => setOrgData({ ...orgData, name: e.target.value })}
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Official Tagline</label>
                <input
                  type="text"
                  value={orgData.tagline}
                  onChange={e => setOrgData({ ...orgData, tagline: e.target.value })}
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Primary Contact Email</label>
                <input
                  type="email"
                  value={orgData.contactEmail}
                  onChange={e => setOrgData({ ...orgData, contactEmail: e.target.value })}
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Address (optional)</label>
                <input
                  type="text"
                  value={orgData.organizationAddress}
                  onChange={e => setOrgData({ ...orgData, organizationAddress: e.target.value })}
                  placeholder="Leave blank if hidden from public Contact & Footer"
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-[#06302F] border border-[#0f4440] rounded-xl text-xs">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-[#EDE9E0] block">Maintenance Mode</span>
                  <span className="text-[11px] text-[#EDE9E0]/60 block">
                    Serves the maintenance page to unauthenticated visitors and returns 503 for public content APIs, while signed-in portal users and /login remain accessible.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={orgData.maintenanceMode}
                  onChange={e => setOrgData({ ...orgData, maintenanceMode: e.target.checked })}
                  className="w-4 h-4 accent-[#25CDB6] cursor-pointer shrink-0"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">
                  Maintenance Bypass Allowlist Paths (one per line)
                </label>
                <textarea
                  rows={2}
                  value={orgData.maintenanceAllowlistText}
                  onChange={e => setOrgData({ ...orgData, maintenanceAllowlistText: e.target.value })}
                  placeholder="/contact&#10;/press"
                  className="w-full bg-[#042423] border border-[#0f4440] rounded-xl px-3 py-2 text-xs font-mono text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#0f4440]">
                <div>
                  <span className="font-bold text-[#EDE9E0] block">Always Show Products Page</span>
                  <span className="text-[11px] text-[#EDE9E0]/60 block">
                    Keeps the /products page and navigation link active even when zero products are published.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={orgData.alwaysShowProducts}
                  onChange={e => setOrgData({ ...orgData, alwaysShowProducts: e.target.checked })}
                  className="w-4 h-4 accent-[#25CDB6] cursor-pointer shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Announcement Bar */}
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#0f4440] pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#25CDB6]" />
                <div>
                  <h3 className="text-base font-bold text-[#EDE9E0]">Sitewide Announcement Bar</h3>
                  <p className="text-xs text-[#EDE9E0]/60">Displayed at the top of public pages until disabled or past expiration.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={orgData.announcementEnabled}
                onChange={e => setOrgData({ ...orgData, announcementEnabled: e.target.checked })}
                className="w-4 h-4 accent-[#25CDB6] cursor-pointer"
                aria-label="Enable announcement bar"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Announcement Text</label>
                <input
                  type="text"
                  value={orgData.announcementText}
                  onChange={e => setOrgData({ ...orgData, announcementText: e.target.value })}
                  placeholder="Enter a short public announcement..."
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>
              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Link URL (optional)</label>
                <input
                  type="text"
                  value={orgData.announcementLinkUrl}
                  onChange={e => setOrgData({ ...orgData, announcementLinkUrl: e.target.value })}
                  placeholder="/projects or https://..."
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 font-mono text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>
              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Link Label (optional)</label>
                <input
                  type="text"
                  value={orgData.announcementLinkLabel}
                  onChange={e => setOrgData({ ...orgData, announcementLinkLabel: e.target.value })}
                  placeholder="Learn more"
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>
              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Expires At (ISO timestamp or YYYY-MM-DD, optional)</label>
                <input
                  type="text"
                  value={orgData.announcementExpiresAt}
                  onChange={e => setOrgData({ ...orgData, announcementExpiresAt: e.target.value })}
                  placeholder="2027-01-01T00:00:00Z"
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 font-mono text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>
            </div>
          </div>

          {/* Official Social Channels & Links */}
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0f4440] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#25CDB6]" />
                  <h3 className="text-base font-bold text-[#EDE9E0]">Official Social Channels &amp; Links</h3>
                </div>
                <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                  Powers social icons across Navbar, Footer, Home, and Contact. Reorder or add verified http/https URLs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingSocial(true)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#25CDB6] flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Channel</span>
              </button>
            </div>

            {isAddingSocial && (
              <div className="p-4 rounded-xl bg-[#031D1C] border border-[#25CDB6]/40 space-y-3">
                <h4 className="text-xs font-bold text-[#EDE9E0]">Add New Social Channel</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Platform Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Discord, GitHub, X, LinkedIn..."
                      value={newPlatformName}
                      onChange={e => setNewPlatformName(e.target.value)}
                      className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>
                  <div>
                    <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Target URL (https://)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newPlatformUrl}
                      onChange={e => setNewPlatformUrl(e.target.value)}
                      className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingSocial(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSocial}
                    className="px-3.5 py-1.5 rounded-lg bg-[#25CDB6] text-[#06302F] font-bold text-xs hover:bg-[#25CDB6]/90 cursor-pointer"
                  >
                    Add Channel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {socialLinks.map((item, idx) => {
                const IconComponent = getPlatformIcon(item.platform || item.icon || '');
                const safeHref = sanitizeSafeUrl(item.url, false);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#06302F]/60 border border-[#0f4440] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-[#042423] border border-[#0f4440] flex items-center justify-center text-[#25CDB6] shadow-xs">
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-[#EDE9E0] block">{item.platform}</span>
                        <span className="text-[10px] text-[#EDE9E0]/50 font-mono">Channel #{idx + 1}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-xl">
                      <input
                        type="url"
                        value={item.url}
                        onChange={e => handleSocialUrlChange(item.id, e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#042423] border border-[#0f4440] rounded-xl px-3 py-2 text-xs font-mono text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                      />

                      <button
                        type="button"
                        onClick={() => handleMoveSocial(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${item.platform} up`}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveSocial(idx, 1)}
                        disabled={idx === socialLinks.length - 1}
                        aria-label={`Move ${item.platform} down`}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      {safeHref && (
                        <a
                          href={safeHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-[#25CDB6] transition-colors shrink-0"
                          aria-label={`Open ${item.platform} link`}
                          title="Open link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <DeleteButton
                        onClick={() => handleRemoveSocial(item.id)}
                        title="Remove channel"
                        ariaLabel={`Remove ${item.platform}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={orgSaving}
              className="px-6 py-2.5 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{orgSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ===================================================================
          2. SUB-TAB: SECURITY & AUTH
          =================================================================== */}
      {currentSubTab === 'security' && (
        <div className="space-y-6">
          {canManageSettings && (
            <form onSubmit={handleSaveSecurity} className="space-y-6">
              <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-6">
                <div className="border-b border-[#0f4440] pb-3">
                  <h3 className="text-base font-bold text-[#EDE9E0]">Access &amp; Security Policy</h3>
                  <p className="text-xs text-[#EDE9E0]/60">
                    Authentication parameters enforced by the server: password policy, session timeout, and login lockout thresholds.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#06302F] border border-[#0f4440] rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-[#EDE9E0] block">Enforce Two-Factor Authentication (2FA)</span>
                      <span className="text-[11px] text-[#EDE9E0]/60 block">
                        Require TOTP authentication for administrative accounts before Control Room access (enforced globally in production).
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={securityConfig.enforce2FAForAdmins}
                      onChange={e => setSecurityConfig({ ...securityConfig, enforce2FAForAdmins: e.target.checked })}
                      className="w-4 h-4 accent-[#25CDB6] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <label className="flex items-center justify-between p-3.5 bg-[#06302F] border border-[#0f4440] rounded-xl cursor-pointer">
                      <span className="font-semibold text-[#EDE9E0]">Require Uppercase (A-Z)</span>
                      <input
                        type="checkbox"
                        checked={securityConfig.requireUppercase}
                        onChange={e => setSecurityConfig({ ...securityConfig, requireUppercase: e.target.checked })}
                        className="w-4 h-4 accent-[#25CDB6]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3.5 bg-[#06302F] border border-[#0f4440] rounded-xl cursor-pointer">
                      <span className="font-semibold text-[#EDE9E0]">Require Number (0-9)</span>
                      <input
                        type="checkbox"
                        checked={securityConfig.requireNumber}
                        onChange={e => setSecurityConfig({ ...securityConfig, requireNumber: e.target.checked })}
                        className="w-4 h-4 accent-[#25CDB6]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3.5 bg-[#06302F] border border-[#0f4440] rounded-xl cursor-pointer">
                      <span className="font-semibold text-[#EDE9E0]">Require Symbol (!@#...)</span>
                      <input
                        type="checkbox"
                        checked={securityConfig.requireSymbol}
                        onChange={e => setSecurityConfig({ ...securityConfig, requireSymbol: e.target.checked })}
                        className="w-4 h-4 accent-[#25CDB6]"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Minimum Password Length (12–64)</label>
                      <input
                        type="number"
                        min={12}
                        max={64}
                        value={securityConfig.minPasswordLength}
                        onChange={e => setSecurityConfig({ ...securityConfig, minPasswordLength: Number(e.target.value) })}
                        className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                      />
                    </div>

                    <div>
                      <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Session Timeout (Minutes)</label>
                      <input
                        type="number"
                        min={15}
                        max={1440}
                        value={securityConfig.sessionTimeoutMinutes}
                        onChange={e => setSecurityConfig({ ...securityConfig, sessionTimeoutMinutes: Number(e.target.value) })}
                        className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                      />
                    </div>

                    <div>
                      <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Max Failed Login Attempts</label>
                      <input
                        type="number"
                        min={3}
                        max={20}
                        value={securityConfig.maxLoginAttempts}
                        onChange={e => setSecurityConfig({ ...securityConfig, maxLoginAttempts: Number(e.target.value) })}
                        className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                      />
                    </div>

                    <div>
                      <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Lockout Duration (Minutes)</label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={securityConfig.lockoutDurationMinutes}
                        onChange={e => setSecurityConfig({ ...securityConfig, lockoutDurationMinutes: Number(e.target.value) })}
                        className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-[#0f4440] flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={securitySaving}
                    className="px-6 py-2.5 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{securitySaving ? 'Saving...' : 'Save Security Policy'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Personal Account Email & Password (SQLite-Persisted) */}
          <form onSubmit={handleUpdateCredentials} className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0f4440] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#25CDB6]" />
                  <h3 className="text-base font-bold text-[#EDE9E0]">Admin Account Email &amp; Password</h3>
                </div>
                <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                  Update the sign-in email or password for your Control Room account. Changes persist in the database across restarts.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#25CDB6] bg-[#25CDB6]/10 border border-[#25CDB6]/25 px-2.5 py-1 rounded-full font-bold self-start sm:self-auto">
                {currentUser.email}
              </span>
            </div>

            {credError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{credError}</span>
              </div>
            )}

            {credSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{credSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Sign-In Email Address</label>
                <input
                  type="email"
                  required
                  value={credEmail}
                  onChange={e => setCredEmail(e.target.value)}
                  placeholder="admin@mastersofall.org"
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Current Password (Required)</label>
                <input
                  type="password"
                  required
                  value={credCurrentPassword}
                  onChange={e => setCredCurrentPassword(e.target.value)}
                  placeholder="Enter current password to confirm"
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">
                  New Password (optional — leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={credNewPassword}
                  onChange={e => setCredNewPassword(e.target.value)}
                  placeholder={`Minimum ${securityConfig.minPasswordLength} characters`}
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Confirm New Password</label>
                <input
                  type="password"
                  value={credConfirmPassword}
                  onChange={e => setCredConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>
            </div>

            <div className="pt-5 border-t border-[#0f4440] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-[#EDE9E0]/55">
                Requires at least {securityConfig.minPasswordLength} characters
                {securityConfig.requireUppercase ? ', uppercase' : ''}
                {securityConfig.requireNumber ? ', number' : ''}
                {securityConfig.requireSymbol ? ', symbol' : ''}.
              </span>
              <button
                type="submit"
                disabled={credSaving}
                className="px-6 py-2.5 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 self-end sm:self-auto"
              >
                <Save className="w-4 h-4" />
                <span>{credSaving ? 'Updating...' : 'Update Email & Password'}</span>
              </button>
            </div>
          </form>

          {/* Personal Account TOTP Two-Factor Authentication */}
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0f4440] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#25CDB6]" />
                  <h3 className="text-base font-bold text-[#EDE9E0]">My Account Two-Factor Authentication (TOTP)</h3>
                </div>
                <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                  Protect your Control Room sign-in with an RFC 6238 authenticator app and single-use recovery codes.
                </p>
              </div>
              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-full font-bold self-start sm:self-auto ${
                  totpEnabled
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {totpEnabled ? '2FA Enabled' : '2FA Not Enrolled'}
              </span>
            </div>

            {totpError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{totpError}</span>
              </div>
            )}

            {totpSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{totpSuccess}</span>
              </div>
            )}

            {!totpEnabled && !totpSetupData && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#06302F] border border-[#0f4440]">
                <div className="text-xs text-[#EDE9E0]/80 space-y-1">
                  <p className="font-bold text-[#EDE9E0]">Authenticator App Enrollment</p>
                  <p className="text-[#EDE9E0]/60">
                    Generate a secret QR code compatible with Google Authenticator, 1Password, or Authy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStart2FASetup}
                  disabled={totpLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#25CDB6] text-[#06302F] text-xs font-bold hover:bg-[#25CDB6]/90 transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{totpLoading ? 'Initializing...' : 'Set Up 2FA'}</span>
                </button>
              </div>
            )}

            {!totpEnabled && totpSetupData && (
              <form onSubmit={handleVerify2FA} className="space-y-4 p-4 rounded-xl bg-[#06302F] border border-[#25CDB6]/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#031D1C] border border-white/10">
                    <img
                      src={totpSetupData.qrDataUrl}
                      alt="TOTP Authenticator QR Code"
                      className="w-40 h-40 rounded-lg bg-white p-2"
                    />
                    <span className="text-[10px] uppercase tracking-wider text-[#EDE9E0]/50">Manual Base32 Key</span>
                    <code className="text-xs font-mono text-[#25CDB6] break-all select-all text-center">
                      {totpSetupData.secret}
                    </code>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#031D1C] border border-amber-500/30 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                        Single-Use Recovery Codes (save securely)
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-[#EDE9E0]/90 select-all">
                        {totpSetupData.recoveryCodes.map(rc => (
                          <span key={rc}>{rc}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">
                        Enter 6-digit verification code from your app
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value)}
                        required
                        placeholder="123456"
                        className="w-full bg-[#031D1C] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={totpLoading}
                        className="px-4 py-2 rounded-xl bg-[#25CDB6] text-[#06302F] font-bold text-xs hover:bg-[#25CDB6]/90 cursor-pointer disabled:opacity-50"
                      >
                        {totpLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTotpSetupData(null);
                          setTotpCode('');
                          setTotpError(null);
                        }}
                        className="px-3 py-2 rounded-xl text-xs text-[#EDE9E0]/60 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {totpEnabled && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#06302F] border border-emerald-500/20">
                  <div className="text-xs">
                    <p className="font-bold text-[#EDE9E0]">Authenticator App Active</p>
                    <p className="text-[#EDE9E0]/60 mt-0.5">
                      Every sign-in requires a time-based 6-digit code or an unused recovery code.
                    </p>
                  </div>
                  {!showDisable2FA && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDisable2FA(true);
                        setTotpError(null);
                      }}
                      className={`${DESTRUCTIVE_LABEL_BTN_CLASS} self-start sm:self-auto`}
                    >
                      Disable 2FA
                    </button>
                  )}
                </div>

                {showDisable2FA && (
                  <form onSubmit={handleDisable2FA} className="p-4 rounded-xl bg-[#06302F] border border-red-500/30 space-y-3 text-xs">
                    <p className="font-bold text-red-300">Confirm Identity to Disable 2FA</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Current Password</label>
                        <input
                          type="password"
                          value={disablePassword}
                          onChange={e => setDisablePassword(e.target.value)}
                          required
                          className="w-full bg-[#031D1C] border border-[#0f4440] rounded-xl px-3.5 py-2 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                        />
                      </div>
                      <div>
                        <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">6-Digit TOTP or Recovery Code</label>
                        <input
                          type="text"
                          value={disableCode}
                          onChange={e => setDisableCode(e.target.value)}
                          required
                          placeholder="123456"
                          className="w-full bg-[#031D1C] border border-[#0f4440] rounded-xl px-3.5 py-2 font-mono text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={totpLoading}
                        className={DESTRUCTIVE_LABEL_BTN_CLASS}
                      >
                        {totpLoading ? 'Disabling...' : 'Confirm Disable 2FA'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDisable2FA(false);
                          setDisablePassword('');
                          setDisableCode('');
                          setTotpError(null);
                        }}
                        className="px-3 py-2 rounded-xl text-xs text-[#EDE9E0]/60 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          3. SUB-TAB: INBOX (READ-ONLY CONTACT SUBMISSIONS)
          =================================================================== */}
      {canViewInbox && currentSubTab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#EDE9E0]/40" />
              <input
                type="text"
                placeholder="Search contact submissions..."
                value={inboxSearch}
                onChange={e => {
                  setInboxSearch(e.target.value);
                  setInboxPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#052827] border border-[#0f4440] rounded-xl text-xs text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {(['all', 'new', 'read', 'archived'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setInboxFilter(tab);
                    setInboxPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize cursor-pointer ${
                    inboxFilter === tab
                      ? 'bg-[#25CDB6] text-[#06302F]'
                      : 'bg-[#052827] text-[#EDE9E0]/60 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void loadSubmissions()}
                className="p-2 rounded-lg bg-[#052827] border border-[#0f4440] text-[#EDE9E0]/70 hover:text-white cursor-pointer"
                aria-label="Refresh inbox"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${inboxLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {inboxError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2">
              <span>{inboxError}</span>
              <button
                type="button"
                onClick={() => void loadSubmissions()}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* List Column */}
            <div className="lg:col-span-5 bg-[#052827] border border-[#0f4440] rounded-2xl overflow-hidden flex flex-col justify-between">
              <div className="divide-y divide-[#0f4440]">
                {inboxLoading ? (
                  <div className="p-8 text-center text-xs text-[#EDE9E0]/50">Loading submissions...</div>
                ) : submissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#EDE9E0]/50">
                    No contact submissions matching current filter.
                  </div>
                ) : (
                  submissions.map(sub => {
                    const dateLabel = new Date(sub.createdAt || sub.submittedAt || Date.now()).toLocaleDateString();
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSubmission(sub)}
                        className={`w-full text-left p-4 cursor-pointer transition block ${
                          selectedSubmission?.id === sub.id
                            ? 'bg-[#093a38] border-l-4 border-[#25CDB6]'
                            : 'hover:bg-[#073635]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[#EDE9E0] truncate">{sub.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                sub.status === 'new'
                                  ? 'bg-[#25CDB6]/20 text-[#25CDB6]'
                                  : sub.status === 'read'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-white/10 text-white/50'
                              }`}
                            >
                              {sub.status}
                            </span>
                            <span className="text-[10px] text-[#EDE9E0]/40 font-mono">{dateLabel}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#25CDB6] font-mono block truncate">{sub.email}</span>
                        {sub.subject && (
                          <span className="text-[11px] text-[#EDE9E0]/80 font-semibold block truncate mt-0.5">
                            {sub.subject}
                          </span>
                        )}
                        <p className="text-xs text-[#EDE9E0]/60 line-clamp-2 mt-1 leading-relaxed">
                          {sub.message}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>

              {inboxTotalPages > 1 && (
                <div className="p-3 border-t border-[#0f4440] flex items-center justify-between text-[11px] text-[#EDE9E0]/60">
                  <button
                    type="button"
                    disabled={inboxPage <= 1}
                    onClick={() => setInboxPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <span className="font-mono">
                    Page {inboxPage} / {inboxTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={inboxPage >= inboxTotalPages}
                    onClick={() => setInboxPage(p => Math.min(inboxTotalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Detail Column (Read-Only) */}
            <div className="lg:col-span-7 p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-5">
              {selectedSubmission ? (
                <div className="space-y-4 text-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#0f4440] pb-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-[#EDE9E0]">{selectedSubmission.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#25CDB6] font-mono">{selectedSubmission.email}</span>
                        <button
                          type="button"
                          onClick={() => void handleCopySenderEmail(selectedSubmission.email)}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-[#EDE9E0]/80 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedEmail ? <Check className="w-3 h-3 text-[#25CDB6]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
                        </button>
                      </div>
                      <span className="text-[11px] text-[#EDE9E0]/40 block font-mono">
                        Received {new Date(selectedSubmission.createdAt || selectedSubmission.submittedAt || Date.now()).toLocaleString()}
                        {selectedSubmission.organization ? ` · ${selectedSubmission.organization}` : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleUpdateSubmissionStatus(
                            selectedSubmission,
                            selectedSubmission.status === 'new' ? 'read' : 'new'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#EDE9E0]/80 flex items-center gap-1 cursor-pointer"
                      >
                        <MailOpen className="w-3.5 h-3.5" />
                        <span>{selectedSubmission.status === 'new' ? 'Mark Read' : 'Mark Unread'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleUpdateSubmissionStatus(
                            selectedSubmission,
                            selectedSubmission.status === 'archived' ? 'read' : 'archived'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#EDE9E0]/80 flex items-center gap-1 cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{selectedSubmission.status === 'archived' ? 'Unarchive' : 'Archive'}</span>
                      </button>

                      <DeleteButton
                        onClick={() => setConfirmDeleteSub(selectedSubmission)}
                        title="Delete submission"
                        ariaLabel="Delete submission"
                      />
                    </div>
                  </div>

                  {selectedSubmission.subject && (
                    <div className="text-xs font-bold text-[#EDE9E0]">
                      Subject: <span className="font-normal text-[#EDE9E0]/80">{selectedSubmission.subject}</span>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-[#031D1C] border border-white/5 text-[#EDE9E0]/90 leading-relaxed whitespace-pre-wrap">
                    {selectedSubmission.message}
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-xs text-[#EDE9E0]/50 space-y-2">
                  <Inbox className="w-8 h-8 text-[#25CDB6] mx-auto opacity-40" />
                  <p>Select a message from the left to read contact inquiry details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          4. SUB-TAB: BACKUPS & SNAPSHOTS
          =================================================================== */}
      {canManageBackups && currentSubTab === 'backups' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#EDE9E0]">System Snapshots &amp; JSON Backups</h3>
              <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                Sanitized exports of departments, projects, publications, products, site copy, settings, pages, and media records. Session tokens, password hashes, and 2FA secrets are never included.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <label className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[#EDE9E0] rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore Snapshot</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={backupInProgress}
                className="px-4 py-2 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{backupInProgress ? 'Exporting...' : 'Export Snapshot'}</span>
              </button>
            </div>
          </div>

          {backupError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2">
              <span>{backupError}</span>
              <button
                type="button"
                onClick={() => void loadBackups()}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-x-auto">
            {backupLoading ? (
              <div className="p-12 text-center text-xs text-[#EDE9E0]/50">Loading server rolling backups...</div>
            ) : backups.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#EDE9E0]/50">
                No rolling server backups stored yet. Rolling backups are created automatically when records change.
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/60 font-semibold uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Snapshot Filename</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">File Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f4440]/50 text-[#EDE9E0]">
                  {backups.map(b => (
                    <tr key={b.id} className="hover:bg-[#073635]/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#25CDB6]">{b.filename}</td>
                      <td className="py-3.5 px-4 text-[#EDE9E0]/70 font-mono text-[11px]">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.type === 'pre-import'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-[#25CDB6]/15 text-[#25CDB6]'
                          }`}
                        >
                          {b.type === 'pre-import' ? 'Pre-Import Safety' : b.type === 'pre-migration' ? 'Pre-Migration' : 'Rolling Auto Snapshot'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#EDE9E0]/60">{formatBytes(b.size)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadServerBackup(b.filename)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-[#25CDB6] transition cursor-pointer"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================
          5. SUB-TAB: AUDIT & SECURITY LOGS
          =================================================================== */}
      {canViewAudit && currentSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-[#052827] border border-[#0f4440] p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setAuditView('activity')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                  auditView === 'activity' ? 'bg-[#25CDB6] text-[#06302F]' : 'text-[#EDE9E0]/70 hover:text-white'
                }`}
              >
                Activity Log
              </button>
              <button
                type="button"
                onClick={() => setAuditView('security')}
                className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition ${
                  auditView === 'security' ? 'bg-[#25CDB6] text-[#06302F]' : 'text-[#EDE9E0]/70 hover:text-white'
                }`}
              >
                Security Events
              </button>
            </div>

            {auditView === 'activity' ? (
              <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#EDE9E0]/40" />
                  <input
                    type="text"
                    placeholder="Search activity..."
                    value={auditSearch}
                    onChange={e => {
                      setAuditSearch(e.target.value);
                      setAuditPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-[#052827] border border-[#0f4440] rounded-xl text-xs text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>

                <select
                  value={auditArea}
                  onChange={e => {
                    setAuditArea(e.target.value);
                    setAuditPage(1);
                  }}
                  aria-label="Filter by audit area"
                  className="bg-[#052827] border border-[#0f4440] rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                >
                  <option value="all">All Areas</option>
                  {['Projects', 'Publications', 'Products', 'Departments', 'Website', 'Media', 'Team', 'Settings', 'Auth', 'System'].map(
                    area => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => void loadAuditLogs()}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const header = 'Timestamp,ActorEmail,Area,Action,Target,Details';
                    const rows = auditLogs.map(l =>
                      [
                        escapeCsvCell(l.timestamp),
                        escapeCsvCell(l.userEmail),
                        escapeCsvCell(l.area),
                        escapeCsvCell(l.action),
                        escapeCsvCell(l.target),
                        escapeCsvCell(l.details || '')
                      ].join(',')
                    );
                    const csv = [header, ...rows].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void loadSecurityLogs()}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            )}
          </div>

          {auditError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2">
              <span>{auditError}</span>
              <button
                type="button"
                onClick={() => (auditView === 'activity' ? void loadAuditLogs() : void loadSecurityLogs())}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {auditView === 'activity' ? (
            <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-x-auto">
              {auditLoading ? (
                <div className="p-12 text-center text-xs text-[#EDE9E0]/50">Loading activity trail...</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#EDE9E0]/50">No activity records found.</div>
              ) : (
                <>
                  <table className="w-full text-left text-xs min-w-[680px]">
                    <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/60 font-semibold uppercase tracking-wider font-mono">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4">Area</th>
                        <th className="py-3 px-4">Event Description</th>
                        <th className="py-3 px-4 text-right">Target Entity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0f4440]/50 text-[#EDE9E0]">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#073635]/40 transition">
                          <td className="py-3 px-4 text-[#EDE9E0]/60 font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#EDE9E0]">{log.userEmail}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-[#EDE9E0]/70">
                              {log.area}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#25CDB6]">{log.action}</td>
                          <td className="py-3 px-4 text-right text-[#EDE9E0]/70 font-mono text-[11px]">{log.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {auditTotalPages > 1 && (
                    <div className="p-3 border-t border-[#0f4440] flex items-center justify-between text-[11px] text-[#EDE9E0]/60">
                      <button
                        type="button"
                        disabled={auditPage <= 1}
                        onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Previous
                      </button>
                      <span className="font-mono">
                        Page {auditPage} of {auditTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={auditPage >= auditTotalPages}
                        onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-x-auto">
              {securityLogsLoading ? (
                <div className="p-12 text-center text-xs text-[#EDE9E0]/50">Loading security events...</div>
              ) : securityLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#EDE9E0]/50">No security events recorded.</div>
              ) : (
                <table className="w-full text-left text-xs min-w-[580px]">
                  <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/60 font-semibold uppercase tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Security Event</th>
                      <th className="py-3 px-4">Account Email</th>
                      <th className="py-3 px-4 text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0f4440]/50 text-[#EDE9E0]">
                    {securityLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#073635]/40 transition">
                        <td className="py-3 px-4 text-[#EDE9E0]/60 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-[#25CDB6] font-mono text-[11px]">{log.event}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{log.email}</td>
                        <td className="py-3 px-4 text-right text-[#EDE9E0]/60 font-mono text-[11px]">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          6. SUB-TAB: SITE HEALTH CHECK (Real API Diagnostics)
          =================================================================== */}
      {canViewAudit && currentSubTab === 'health' && (
        <div className="space-y-5">
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#EDE9E0]">Site Health Diagnostics</h3>
              <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                Scans live server data for missing department copy, alt text gaps, unused uploaded files, SEO defaults, and stalled drafts.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  healthItems.length === 0
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {healthItems.length === 0
                    ? 'All Diagnostics Passing (100/100)'
                    : `${healthItems.length} Alert${healthItems.length === 1 ? '' : 's'} (${healthScore}/100)`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void loadHealth()}
                disabled={healthLoading}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                <span>Re-run Scan</span>
              </button>
            </div>
          </div>

          {healthError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2">
              <span>{healthError}</span>
              <button
                type="button"
                onClick={() => void loadHealth()}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {healthLoading ? (
            <div className="p-12 rounded-2xl bg-[#052827] border border-[#0f4440] text-center text-xs text-[#EDE9E0]/50">
              Running site health scan...
            </div>
          ) : healthItems.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#052827] border border-[#0f4440] text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#25CDB6] mx-auto" />
              <h4 className="text-sm font-bold text-[#EDE9E0]">All Checks Passing</h4>
              <p className="text-xs text-[#EDE9E0]/60">
                No missing introductions, alt attributes, unused uploads, or SEO gaps detected.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {healthItems.map(item => (
                <div
                  key={item.id}
                  className="p-5 bg-[#052827] border border-[#0f4440] rounded-2xl flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#EDE9E0]">{item.title}</h4>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          item.type === 'error'
                            ? 'bg-red-500/20 text-red-300'
                            : item.type === 'warning'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-[#25CDB6]/15 text-[#25CDB6]'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-[#EDE9E0]/60 leading-relaxed">{item.message}</p>
                  </div>

                  {item.actionText && (
                    <div className="pt-2 border-t border-white/5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.actionTab === 'settings') {
                            onSubTabChange('organization');
                          } else if (onNavigateTab && item.actionTab) {
                            if (
                              item.actionTab === 'departments' ||
                              item.actionTab === 'projects' ||
                              item.actionTab === 'publications' ||
                              item.actionTab === 'products'
                            ) {
                              onNavigateTab('content', item.actionTab);
                            } else if (item.actionTab === 'website') {
                              onNavigateTab('website', 'seo');
                            } else {
                              onNavigateTab(item.actionTab);
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#17A491]/20 hover:bg-[#17A491]/30 text-[#25CDB6] text-xs font-bold cursor-pointer"
                      >
                        {item.actionText}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          7. SUB-TAB: TRASH BIN (Real API Soft-Deleted Records)
          =================================================================== */}
      {canManageTrash && currentSubTab === 'trash' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#EDE9E0]/60">
              Soft-deleted departments, projects, publications, products, and pages are retained for 30 days before permanent removal.
            </p>
            {flattenedTrash.length > 0 && (
              <DeleteButton
                onClick={() => setConfirmEmptyTrash(true)}
                label="Empty Trash Permanently"
                title="Empty Trash Permanently"
                className="self-start sm:self-auto"
              />
            )}
          </div>

          {trashError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2">
              <span>{trashError}</span>
              <button
                type="button"
                onClick={() => void loadTrash()}
                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {trashLoading ? (
            <div className="p-12 text-center text-xs text-[#EDE9E0]/50">Loading Trash bin...</div>
          ) : flattenedTrash.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-[#052827] border border-[#0f4440] space-y-2">
              <Trash2 className="w-8 h-8 text-[#25CDB6] mx-auto opacity-40" />
              <p className="text-xs text-[#EDE9E0]/60">Trash bin is empty.</p>
            </div>
          ) : (
            <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/60 font-semibold uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">Deleted At</th>
                    <th className="py-3 px-4">Retention Window</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f4440]/50 text-[#EDE9E0]">
                  {flattenedTrash.map(item => (
                    <tr key={`${item.entityType}-${item.id}`} className="hover:bg-[#073635]/40 transition">
                      <td className="py-3.5 px-4 font-bold text-[#EDE9E0]">{item.title}</td>
                      <td className="py-3.5 px-4 text-[#25CDB6]">{item.labelType}</td>
                      <td className="py-3.5 px-4 text-[#EDE9E0]/60 font-mono text-[11px]">
                        {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'Unknown'}
                      </td>
                      <td className="py-3.5 px-4 text-amber-300 font-mono text-[11px]">{item.daysLeftLabel}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestoreTrash(item)}
                            className="px-3 py-1 bg-[#25CDB6]/20 hover:bg-[#25CDB6]/30 text-[#25CDB6] rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Restore
                          </button>
                          <DeleteButton
                            onClick={() => setConfirmDeleteTrashItem(item)}
                            label="Delete Permanently"
                            title="Delete item permanently"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteSub)}
        title="Delete Contact Submission"
        message={
          confirmDeleteSub
            ? `Permanently delete submission from ${confirmDeleteSub.name} (${confirmDeleteSub.email})?`
            : ''
        }
        confirmLabel="Delete Submission"
        onCancel={() => setConfirmDeleteSub(null)}
        onConfirm={async () => {
          if (!confirmDeleteSub) return;
          const target = confirmDeleteSub;
          setConfirmDeleteSub(null);
          try {
            await api.deleteSubmission(target.id);
            if (selectedSubmission?.id === target.id) setSelectedSubmission(null);
            await loadSubmissions();
            if (onRefreshData) await onRefreshData();
            showSuccess('Submission permanently deleted.');
          } catch (err: unknown) {
            setBannerError(err instanceof Error ? err.message : 'Failed to delete submission.');
          }
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingImportPayload)}
        title="Restore System Snapshot"
        message={
          pendingImportPayload
            ? `Restoring "${pendingImportPayload.filename}" will replace departments, projects, publications, products, media, pages, content, roles, and settings. The server takes an automatic pre-import backup first.`
            : ''
        }
        confirmLabel="Validate & Restore"
        onCancel={() => setPendingImportPayload(null)}
        onConfirm={async () => {
          if (!pendingImportPayload) return;
          const payload = pendingImportPayload;
          setPendingImportPayload(null);
          try {
            const res = await api.importEverything(payload.data);
            await loadBackups();
            if (onRefreshData) await onRefreshData();
            showSuccess(res.message || `Restored snapshot "${payload.filename}".`);
          } catch (err: unknown) {
            setBannerError(err instanceof Error ? err.message : 'Backup validation or restore failed.');
          }
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteTrashItem)}
        title="Delete Permanently"
        message={
          confirmDeleteTrashItem
            ? `Permanently delete ${confirmDeleteTrashItem.labelType.toLowerCase()} "${confirmDeleteTrashItem.title}"? This removes the record and cannot be undone.`
            : ''
        }
        confirmLabel="Delete Permanently"
        onCancel={() => setConfirmDeleteTrashItem(null)}
        onConfirm={async () => {
          if (!confirmDeleteTrashItem) return;
          const item = confirmDeleteTrashItem;
          setConfirmDeleteTrashItem(null);
          try {
            await api.deleteTrashItem(item.entityType, item.id);
            await loadTrash();
            if (onRefreshData) await onRefreshData();
            showSuccess(`Permanently deleted "${item.title}".`);
          } catch (err: unknown) {
            setBannerError(err instanceof Error ? err.message : 'Failed to permanently delete item.');
          }
        }}
      />

      <ConfirmDialog
        isOpen={confirmEmptyTrash}
        title="Empty Trash Permanently"
        message={`Permanently purge all ${flattenedTrash.length} item${flattenedTrash.length === 1 ? '' : 's'} from Trash and remove any orphaned uploaded files? This action cannot be undone.`}
        confirmLabel="Empty Trash"
        onCancel={() => setConfirmEmptyTrash(false)}
        onConfirm={async () => {
          setConfirmEmptyTrash(false);
          try {
            await api.emptyTrash();
            await loadTrash();
            if (onRefreshData) await onRefreshData();
            showSuccess('Trash bin permanently emptied.');
          } catch (err: unknown) {
            setBannerError(err instanceof Error ? err.message : 'Failed to empty Trash.');
          }
        }}
      />
    </div>
  );
};
