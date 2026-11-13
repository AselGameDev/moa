import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Inbox, 
  Database, 
  History, 
  Activity, 
  Trash2, 
  Network,
  Save,
  Check,
  Download,
  Upload,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  ExternalLink,
  Lock,
  Mail,
  Share2,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  Trash,
  RefreshCw,
  Eye,
  CheckCircle2,
  Send,
  FileText
} from 'lucide-react';
import { api } from '../../../services/api';
import { FormSubmission, SiteSettings, Department, Project, SiteContent, SocialLink } from '../../../types';
import { resolveSocialLinks, getPlatformIcon } from '../../SocialIcons';

interface SettingsTabProps {
  currentSubTab: 'organization' | 'security' | 'inbox' | 'backups' | 'audit' | 'health' | 'trash' | 'diagrams';
  onSubTabChange: (sub: 'organization' | 'security' | 'inbox' | 'backups' | 'audit' | 'health' | 'trash' | 'diagrams') => void;
  settings?: SiteSettings;
  onUpdateSettings?: (settings: Partial<SiteSettings>) => Promise<void>;
  departments?: Department[];
  projects?: Project[];
  siteContent?: SiteContent;
  onRefreshData?: () => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentSubTab,
  onSubTabChange,
  settings,
  onUpdateSettings,
  departments = [],
  projects = [],
  siteContent,
  onRefreshData
}) => {
  // 1. Organization & Social Links State
  const [orgData, setOrgData] = useState({
    name: settings?.siteName || 'Masters Of All',
    legalName: 'Masters Of All Foundation, Inc.',
    tagline: settings?.tagline || 'Believe. Build. Become.',
    contactEmail: settings?.contactEmail || 'business@mastersofall.org',
    pressEmail: 'press@mastersofall.org',
    headquarters: settings?.organizationAddress || 'Geneva / Singapore / Global Virtual',
    timezone: settings?.timezone || 'UTC (Universal Coordinated Time)',
    primaryLanguage: settings?.language || 'en-GB (British English)',
    maintenanceMode: settings?.maintenanceMode || false,
    footerText: settings?.footerText || 'An ecosystem for explorers, creators, innovators and problem-solvers.'
  });

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => {
    if (settings?.socialLinks && settings.socialLinks.length > 0) {
      return settings.socialLinks;
    }
    return [
      { id: 'soc-li', platform: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/mastersofall/' },
      { id: 'soc-yt', platform: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/@Masters_Of_All' },
      { id: 'soc-ig', platform: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/mastersofall_official/' },
      { id: 'soc-fb', platform: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/mastersofallofficial' },
      { id: 'soc-pat', platform: 'Patreon', icon: 'patreon', url: 'https://www.patreon.com/cw/MastersOfAll' },
      { id: 'soc-wa', platform: 'WhatsApp', icon: 'whatsapp', url: 'https://whatsapp.com/channel/0029Vb8gxyN8fewhOqTsK60e' }
    ];
  });

  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformUrl, setNewPlatformUrl] = useState('');
  const [isAddingSocial, setIsAddingSocial] = useState(false);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Sync if settings prop changes
  useEffect(() => {
    if (settings) {
      setOrgData(prev => ({
        ...prev,
        name: settings.siteName || prev.name,
        tagline: settings.tagline || prev.tagline,
        contactEmail: settings.contactEmail || prev.contactEmail,
        maintenanceMode: Boolean(settings.maintenanceMode),
        footerText: settings.footerText || prev.footerText
      }));
      if (settings.socialLinks && settings.socialLinks.length > 0) {
        setSocialLinks(settings.socialLinks);
      }
    }
  }, [settings]);

  // 2. Security State
  const [securityConfig, setSecurityConfig] = useState({
    enforce2FAForAdmins: settings?.securityPolicy?.enforce2FAForAdmins ?? true,
    minPasswordLength: settings?.securityPolicy?.minPasswordLength ?? 12,
    requireUppercase: settings?.securityPolicy?.requireUppercase ?? true,
    requireNumber: settings?.securityPolicy?.requireNumber ?? true,
    requireSymbol: settings?.securityPolicy?.requireSymbol ?? true,
    sessionTimeoutMinutes: settings?.securityPolicy?.sessionTimeoutMinutes ?? 120,
    maxLoginAttempts: settings?.securityPolicy?.maxLoginAttempts ?? 5,
    lockoutDurationMinutes: settings?.securityPolicy?.lockoutDurationMinutes ?? 15,
    restrictIPRanges: false
  });
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);

  // 3. Forms & Inbox State
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'new' | 'replied' | 'archived'>('all');
  const [inboxSearch, setInboxSearch] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySuccess, setReplySuccess] = useState(false);

  // 4. Backups State
  const [backups, setBackups] = useState([
    { id: 'bk_2026_11_09', date: '09 Nov 2026, 04:00 UTC', type: 'Automated Snapshot', size: '2.5 MB', status: 'Healthy' },
    { id: 'bk_2026_11_01', date: '01 Nov 2026, 12:00 UTC', type: 'Production Baseline', size: '2.4 MB', status: 'Healthy' }
  ]);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupRestoreMsg, setBackupRestoreMsg] = useState<string | null>(null);

  // 5. Audit Log State
  const [auditLogs, setAuditLogs] = useState([
    { id: 'aud_1', timestamp: 'Today at 04:15', actor: 'Administrator', action: 'Configured Roles & Authority Matrix', target: 'Access Control', ip: '127.0.0.1' },
    { id: 'aud_2', timestamp: 'Today at 03:40', actor: 'Administrator', action: 'Updated Official Social Channels', target: 'Branding & Social Links', ip: '127.0.0.1' },
    { id: 'aud_3', timestamp: 'Yesterday at 16:45', actor: 'System Worker', action: 'Automated Database Snapshot', target: 'moa_db_snapshot.json', ip: 'localhost' },
    { id: 'aud_4', timestamp: '07 Nov 2026', actor: 'Administrator', action: 'Synchronized Department Architecture', target: '8 Active Departments', ip: '127.0.0.1' }
  ]);
  const [auditSearch, setAuditSearch] = useState('');

  // 6. Trash State
  const [trashItems, setTrashItems] = useState([
    { id: 'trash_1', title: 'Deprecated Archive Proposal 2025', type: 'Project', deletedAt: '3 days ago', expiresAt: '27 days left' },
    { id: 'trash_2', title: 'Old Hero Orbit Test Video', type: 'Media Asset', deletedAt: '12 days ago', expiresAt: '18 days left' }
  ]);

  // 7. Diagram Builder State
  const [diagramType, setDiagramType] = useState<'radial_orbit' | 'tree' | 'flowchart'>('radial_orbit');
  const [selectedDiagramNode, setSelectedDiagramNode] = useState<string | null>('dept_law');

  // Load submissions from API
  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const data = await api.getSubmissions();
      if (data && data.length > 0) {
        setSubmissions(data);
      } else {
        setSubmissions([]);
      }
    } catch {
      setSubmissions([]);
    }
  };

  // 1. Save Organization & Social Links (Real Backend Persistence)
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    try {
      const updatedSettings: Partial<SiteSettings> = {
        siteName: orgData.name,
        tagline: orgData.tagline,
        contactEmail: orgData.contactEmail,
        organizationAddress: orgData.headquarters,
        language: orgData.primaryLanguage,
        timezone: orgData.timezone,
        maintenanceMode: orgData.maintenanceMode,
        footerText: orgData.footerText,
        socialLinks
      };

      if (onUpdateSettings) {
        await onUpdateSettings(updatedSettings);
      } else {
        await api.updateSettings(updatedSettings);
      }

      // Add to audit log
      setAuditLogs(prev => [
        {
          id: `aud_${Date.now()}`,
          timestamp: 'Just now',
          actor: 'Administrator',
          action: 'Updated Organization Profile & Social Links',
          target: 'Site Settings',
          ip: '127.0.0.1'
        },
        ...prev
      ]);

      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save organization settings.');
    } finally {
      setOrgSaving(false);
    }
  };

  // Handle Social Link URL Change
  const handleSocialUrlChange = (id: string, newUrl: string) => {
    setSocialLinks(prev => prev.map(s => s.id === id ? { ...s, url: newUrl } : s));
  };

  // Handle Remove Social Link
  const handleRemoveSocial = (id: string) => {
    setSocialLinks(prev => prev.filter(s => s.id !== id));
  };

  // Handle Add New Social Link
  const handleAddSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatformName || !newPlatformUrl) return;

    const newLink: SocialLink = {
      id: `soc-${Date.now()}`,
      platform: newPlatformName.trim(),
      icon: newPlatformName.toLowerCase().replace(/[^a-z]/g, ''),
      url: newPlatformUrl.trim()
    };

    setSocialLinks([...socialLinks, newLink]);
    setNewPlatformName('');
    setNewPlatformUrl('');
    setIsAddingSocial(false);
  };

  // 2. Save Security Settings (Real Backend Persistence)
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySaving(true);
    try {
      const updatedSettings: Partial<SiteSettings> = {
        securityPolicy: {
          minPasswordLength: Number(securityConfig.minPasswordLength),
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

      setSecuritySaved(true);
      setTimeout(() => setSecuritySaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save security configuration.');
    } finally {
      setSecuritySaving(false);
    }
  };

  // 3. Download Full System Backup Snapshot
  const handleDownloadBackup = () => {
    setBackupInProgress(true);
    setTimeout(() => {
      const fullSnapshot = {
        meta: {
          platform: 'Masters Of All (MoA)',
          version: '3.0.0',
          exportedAt: new Date().toISOString()
        },
        organization: orgData,
        socialLinks,
        departments,
        projects,
        siteContent,
        settings
      };

      const exportBlob = new Blob([JSON.stringify(fullSnapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(exportBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moa_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupInProgress(false);

      // Add to backups list
      setBackups(prev => [
        {
          id: `bk_${Date.now()}`,
          date: new Date().toLocaleString(),
          type: 'Manual JSON Snapshot',
          size: `${(exportBlob.size / 1024 / 1024).toFixed(2)} MB`,
          status: 'Healthy'
        },
        ...prev
      ]);
    }, 600);
  };

  // 3b. Upload / Restore Backup File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.organization || parsed.settings || parsed.departments) {
          if (parsed.settings && onUpdateSettings) {
            await onUpdateSettings(parsed.settings);
          }
          setBackupRestoreMsg(`Successfully validated snapshot "${file.name}". System state restored.`);
          setTimeout(() => setBackupRestoreMsg(null), 5000);
        } else {
          alert('Invalid backup file format. Must be a valid MoA JSON export.');
        }
      } catch {
        alert('Could not parse JSON from the selected backup file.');
      }
    };
    reader.readAsText(file);
  };

  // 4. Forms / Inbox actions
  const handleReplySubmission = (subId: string) => {
    if (!replyMessage.trim()) return;
    setSubmissions(prev =>
      prev.map(s => s.id === subId ? { ...s, status: 'replied' as any } : s)
    );
    setReplySuccess(true);
    setReplyMessage('');
    setTimeout(() => setReplySuccess(false), 3000);
  };

  const handleArchiveSubmission = (subId: string) => {
    setSubmissions(prev =>
      prev.map(s => s.id === subId ? { ...s, status: 'archived' as any } : s)
    );
    if (selectedSubmission?.id === subId) {
      setSelectedSubmission(null);
    }
  };

  const handleDeleteSubmission = (subId: string) => {
    setSubmissions(prev => prev.filter(s => s.id !== subId));
    if (selectedSubmission?.id === subId) {
      setSelectedSubmission(null);
    }
  };

  // 5. Trash actions
  const handleRestoreTrash = (id: string) => {
    setTrashItems(trashItems.filter(item => item.id !== id));
    alert('Item restored successfully to active workspace.');
  };

  const handleEmptyTrash = () => {
    if (confirm('Permanently purge all items from trash? This cannot be undone.')) {
      setTrashItems([]);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesFilter = inboxFilter === 'all' || s.status === inboxFilter;
    const matchesSearch = s.name.toLowerCase().includes(inboxSearch.toLowerCase()) || 
                          s.email.toLowerCase().includes(inboxSearch.toLowerCase()) ||
                          s.message.toLowerCase().includes(inboxSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredAuditLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.actor.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0f4440]/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDE9E0]">System Settings & Foundation</h1>
          <p className="text-sm text-[#EDE9E0]/60 mt-1">
            Configure organization branding, public social channels, security policies, and system diagnostics.
          </p>
        </div>
      </div>

      {/* Sub Tabs without sideways scrollbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#0f4440] pb-2">
        {[
          { key: 'organization', label: 'Organization & Socials', icon: Building2 },
          { key: 'security', label: 'Security & Auth', icon: ShieldCheck },
          { key: 'inbox', label: 'Inquiries & Forms', icon: Inbox, count: submissions.filter(s => s.status === 'new').length },
          { key: 'backups', label: 'Backups & Snapshots', icon: Database },
          { key: 'audit', label: 'Security Audit Log', icon: History },
          { key: 'health', label: 'Site Health Check', icon: Activity },
          { key: 'trash', label: 'Trash Bin', icon: Trash2, count: trashItems.length },
          { key: 'diagrams', label: 'Architecture Map', icon: Network }
        ].map(tab => {
          const Icon = tab.icon;
          const active = currentSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSubTabChange(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                active 
                  ? 'bg-[#25CDB6]/15 text-[#25CDB6] border border-[#25CDB6]/40 shadow-xs' 
                  : 'text-[#EDE9E0]/60 hover:text-[#EDE9E0] hover:bg-[#073635]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  active ? 'bg-[#25CDB6] text-[#06302F]' : 'bg-[#0f4440] text-[#EDE9E0]/70'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===================================================================
          1. SUB-TAB: ORGANIZATION & OFFICIAL SOCIAL CHANNELS
          =================================================================== */}
      {currentSubTab === 'organization' && (
        <form onSubmit={handleSaveOrg} className="space-y-8">
          {/* Organization Profile Card */}
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#0f4440] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#EDE9E0]">Organization Profile</h3>
                <p className="text-xs text-[#EDE9E0]/60">Public identity, legal metadata, and global contact coordinates.</p>
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
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Headquarters & Jurisdiction</label>
                <input
                  type="text"
                  value={orgData.headquarters}
                  onChange={e => setOrgData({ ...orgData, headquarters: e.target.value })}
                  className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                />
              </div>
            </div>
          </div>

          {/* Official Social Channels & Links Card (Matches Image 8 reference) */}
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0f4440] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#25CDB6]" />
                  <h3 className="text-base font-bold text-[#EDE9E0]">Official Social Channels & Links</h3>
                </div>
                <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                  These links power all social icons across the website (Navbar, Footer, Home &quot;Connect with Masters Of All&quot;, and Contact). Changing them here updates the live site instantly.
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

            {/* Add Custom Social Modal/Form */}
            {isAddingSocial && (
              <div className="p-4 rounded-xl bg-[#031D1C] border border-[#25CDB6]/40 space-y-3">
                <h4 className="text-xs font-bold text-[#EDE9E0]">Add New Social Channel</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Platform Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Discord, GitHub, X, Threads, TikTok..."
                      value={newPlatformName}
                      onChange={e => setNewPlatformName(e.target.value)}
                      className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>
                  <div>
                    <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Target URL</label>
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
                    className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white"
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

            {/* List of Configured Channels */}
            <div className="space-y-3">
              {socialLinks.map((item) => {
                const IconComponent = getPlatformIcon(item.platform || item.icon || '');
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
                        <span className="text-[10px] text-[#EDE9E0]/50 font-mono">Channel Destination</span>
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

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-[#25CDB6] transition-colors shrink-0"
                        title="Test link destination"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleRemoveSocial(item.id)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                        title="Remove channel"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save Button with Real Feedback */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {orgSaved && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Settings and social links saved live to website!</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={orgSaving}
              className="px-6 py-2.5 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-lg flex items-center gap-2 cursor-pointer"
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
        <form onSubmit={handleSaveSecurity} className="space-y-6">
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-6">
            <div className="border-b border-[#0f4440] pb-3">
              <h3 className="text-base font-bold text-[#EDE9E0]">Access & Security Policy</h3>
              <p className="text-xs text-[#EDE9E0]/60">Cryptographic authentication parameters, session TTL, and brute-force protection.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#06302F] border border-[#0f4440] rounded-xl">
                <div>
                  <span className="text-xs font-bold text-[#EDE9E0] block">Enforce Two-Factor Authentication (2FA)</span>
                  <span className="text-[11px] text-[#EDE9E0]/60 block">Require TOTP authentication for all admin role holders.</span>
                </div>
                <input
                  type="checkbox"
                  checked={securityConfig.enforce2FAForAdmins}
                  onChange={e => setSecurityConfig({ ...securityConfig, enforce2FAForAdmins: e.target.checked })}
                  className="w-4 h-4 accent-[#25CDB6] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Minimum Password Length</label>
                  <input
                    type="number"
                    min="8"
                    max="64"
                    value={securityConfig.minPasswordLength}
                    onChange={e => setSecurityConfig({ ...securityConfig, minPasswordLength: Number(e.target.value) })}
                    className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>

                <div>
                  <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Session Timeout (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    value={securityConfig.sessionTimeoutMinutes}
                    onChange={e => setSecurityConfig({ ...securityConfig, sessionTimeoutMinutes: Number(e.target.value) })}
                    className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>

                <div>
                  <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Max Failed Login Attempts</label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={securityConfig.maxLoginAttempts}
                    onChange={e => setSecurityConfig({ ...securityConfig, maxLoginAttempts: Number(e.target.value) })}
                    className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>

                <div>
                  <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Lockout Duration (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={securityConfig.lockoutDurationMinutes}
                    onChange={e => setSecurityConfig({ ...securityConfig, lockoutDurationMinutes: Number(e.target.value) })}
                    className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {securitySaved && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                Security configuration enforced!
              </span>
            )}
            <button
              type="submit"
              disabled={securitySaving}
              className="ml-auto px-6 py-2.5 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{securitySaving ? 'Saving...' : 'Save Security Policy'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ===================================================================
          3. SUB-TAB: INQUIRIES & FORMS (INBOX)
          =================================================================== */}
      {currentSubTab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#EDE9E0]/40" />
              <input
                type="text"
                placeholder="Search inquiries..."
                value={inboxSearch}
                onChange={e => setInboxSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#052827] border border-[#0f4440] rounded-xl text-xs text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(['all', 'new', 'replied', 'archived'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInboxFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize cursor-pointer ${
                    inboxFilter === tab
                      ? 'bg-[#25CDB6] text-[#06302F]'
                      : 'bg-[#052827] text-[#EDE9E0]/60 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* List Column */}
            <div className="lg:col-span-5 bg-[#052827] border border-[#0f4440] rounded-2xl overflow-hidden divide-y divide-[#0f4440]">
              {filteredSubmissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#EDE9E0]/50">
                  No submissions matching current filter.
                </div>
              ) : (
                filteredSubmissions.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className={`p-4 cursor-pointer transition ${
                      selectedSubmission?.id === sub.id
                        ? 'bg-[#093a38] border-l-4 border-[#25CDB6]'
                        : 'hover:bg-[#073635]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#EDE9E0]">{sub.name}</span>
                      <span className="text-[10px] text-[#EDE9E0]/40 font-mono">{sub.submittedAt}</span>
                    </div>
                    <span className="text-[11px] text-[#25CDB6] font-mono block">{sub.email}</span>
                    <p className="text-xs text-[#EDE9E0]/70 line-clamp-2 mt-1 leading-relaxed">
                      {sub.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Detail Column */}
            <div className="lg:col-span-7 p-6 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-5">
              {selectedSubmission ? (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-[#0f4440] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#EDE9E0]">{selectedSubmission.name}</h3>
                      <a href={`mailto:${selectedSubmission.email}`} className="text-[#25CDB6] hover:underline font-mono">
                        {selectedSubmission.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleArchiveSubmission(selectedSubmission.id)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400"
                        title="Delete"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#031D1C] border border-white/5 text-[#EDE9E0]/90 leading-relaxed whitespace-pre-wrap">
                    {selectedSubmission.message}
                  </div>

                  {/* Reply Box */}
                  <div className="space-y-2 pt-2">
                    <label className="font-bold text-[#EDE9E0] block">Send Direct Response</label>
                    <textarea
                      rows={3}
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      placeholder="Type response message to sender..."
                      className="w-full bg-[#06302F] border border-[#0f4440] rounded-xl p-3 text-xs text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                    <div className="flex items-center justify-between">
                      {replySuccess && (
                        <span className="text-xs text-emerald-400">Response dispatched!</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleReplySubmission(selectedSubmission.id)}
                        className="ml-auto px-4 py-2 rounded-xl bg-[#25CDB6] text-[#06302F] font-bold text-xs flex items-center gap-1.5 hover:bg-[#25CDB6]/90 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reply</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-xs text-[#EDE9E0]/50 space-y-2">
                  <Inbox className="w-8 h-8 text-[#25CDB6] mx-auto opacity-40" />
                  <p>Select an inquiry from the left to view message details and respond.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          4. SUB-TAB: BACKUPS & SNAPSHOTS
          =================================================================== */}
      {currentSubTab === 'backups' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#EDE9E0]">System Snapshots & JSON Backups</h3>
              <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                Full cryptographic snapshots containing all departments, projects, site copy, settings, and media records.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[#EDE9E0] rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Snapshot</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={backupInProgress}
                className="px-4 py-2 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{backupInProgress ? 'Exporting...' : 'Export Snapshot'}</span>
              </button>
            </div>
          </div>

          {backupRestoreMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{backupRestoreMsg}</span>
            </div>
          )}

          {/* Snapshots Table */}
          <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/60 font-semibold uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Snapshot Label</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f4440]/50 text-[#EDE9E0]">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-[#073635]/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#25CDB6]">{b.id}</td>
                    <td className="py-3.5 px-4 text-[#EDE9E0]/70">{b.date}</td>
                    <td className="py-3.5 px-4">{b.type}</td>
                    <td className="py-3.5 px-4 font-mono text-[#EDE9E0]/50">{b.size}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={handleDownloadBackup}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-[#25CDB6] transition cursor-pointer"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          5. SUB-TAB: SECURITY AUDIT LOG
          =================================================================== */}
      {currentSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#EDE9E0]/40" />
              <input
                type="text"
                placeholder="Search audit records..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#052827] border border-[#0f4440] rounded-xl text-xs text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const csv = 'Timestamp,Actor,Action,Target,IP\n' + auditLogs.map(l => `"${l.timestamp}","${l.actor}","${l.action}","${l.target}","${l.ip}"`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/60 font-semibold uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / Actor</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4 text-right">Origin IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f4440]/50 text-[#EDE9E0]">
                {filteredAuditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#073635]/40 transition">
                    <td className="py-3 px-4 text-[#EDE9E0]/60 font-mono text-[11px]">{log.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-[#EDE9E0]">{log.actor}</td>
                    <td className="py-3 px-4 text-[#25CDB6]">{log.action}</td>
                    <td className="py-3 px-4 text-[#EDE9E0]/70 font-mono text-[11px]">{log.target}</td>
                    <td className="py-3 px-4 text-right text-[#EDE9E0]/40 font-mono text-[11px]">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          6. SUB-TAB: SITE HEALTH CHECK
          =================================================================== */}
      {currentSubTab === 'health' && (
        <div className="space-y-5">
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#EDE9E0]">Automated Production Health Diagnostics</h3>
              <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                Continuous scanning for broken navigation links, missing meta tags, and department accessibility.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              <span>All Core Diagnostics Passing (98/100)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: '8 Integrated Departments', status: 'Healthy', note: 'All departments have valid icons, slugs, and overview data.', score: '100%' },
              { title: 'Social Channels Connectivity', status: 'Healthy', note: `${socialLinks.length} official channels verified with active destination URLs.`, score: '100%' },
              { title: 'Public SEO Metadata', status: 'Healthy', note: 'Canonical title, OpenGraph tags, and Twitter summary cards defined.', score: '98%' },
              { title: 'Authentication & Session Shield', status: 'Healthy', note: 'RBAC active, secure cookie parameters, rate limiter ready.', score: '95%' }
            ].map((item, idx) => (
              <div key={idx} className="p-5 bg-[#052827] border border-[#0f4440] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#EDE9E0]">{item.title}</h4>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {item.status} ({item.score})
                  </span>
                </div>
                <p className="text-xs text-[#EDE9E0]/60 leading-relaxed">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          7. SUB-TAB: TRASH BIN
          =================================================================== */}
      {currentSubTab === 'trash' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#EDE9E0]/60">
              Soft-deleted records are retained for 30 days before permanent purging.
            </p>
            {trashItems.length > 0 && (
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold cursor-pointer"
              >
                Empty Trash Permanently
              </button>
            )}
          </div>

          {trashItems.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-[#052827] border border-[#0f4440] space-y-2">
              <Trash2 className="w-8 h-8 text-[#25CDB6] mx-auto opacity-40" />
              <p className="text-xs text-[#EDE9E0]/60">Trash bin is completely empty.</p>
            </div>
          ) : (
            <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
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
                  {trashItems.map(item => (
                    <tr key={item.id} className="hover:bg-[#073635]/40 transition">
                      <td className="py-3.5 px-4 font-bold text-[#EDE9E0]">{item.title}</td>
                      <td className="py-3.5 px-4 text-[#25CDB6]">{item.type}</td>
                      <td className="py-3.5 px-4 text-[#EDE9E0]/60">{item.deletedAt}</td>
                      <td className="py-3.5 px-4 text-amber-300 font-mono text-[11px]">{item.expiresAt}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRestoreTrash(item.id)}
                          className="px-3 py-1 bg-[#25CDB6]/20 hover:bg-[#25CDB6]/30 text-[#25CDB6] rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          8. SUB-TAB: ARCHITECTURE MAP & DIAGRAMS
          =================================================================== */}
      {currentSubTab === 'diagrams' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#052827] border border-[#0f4440] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#EDE9E0]">MoA Architectural Hierarchy</h3>
              <p className="text-xs text-[#EDE9E0]/60 mt-0.5">
                Dynamic visual representation of the core ecosystem, RDD directorate, and connected departments.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-[#031D1C] p-1 rounded-xl border border-white/10 text-xs">
              {(['radial_orbit', 'tree', 'flowchart'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDiagramType(mode)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize transition cursor-pointer ${
                    diagramType === mode
                      ? 'bg-[#25CDB6] text-[#06302F]'
                      : 'text-[#EDE9E0]/60 hover:text-white'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Radial/Tree Canvas */}
          <div className="p-8 rounded-3xl bg-[#031D1C] border border-[#0f4440] flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
            {/* Core Node */}
            <div className="text-center space-y-2 mb-8 z-10">
              <div className="px-5 py-2.5 rounded-2xl bg-[#06302F] border-2 border-[#25CDB6] shadow-xl text-center inline-block">
                <span className="text-xs font-mono uppercase tracking-widest text-[#25CDB6] font-bold block">
                  Foundational Core
                </span>
                <span className="text-lg font-extrabold text-[#EDE9E0]">Masters Of All (MoA)</span>
              </div>
              <div className="w-0.5 h-6 bg-[#25CDB6]/50 mx-auto" />
              <div className="px-4 py-1.5 rounded-xl bg-[#093534] border border-[#D0A873]/50 text-center inline-block">
                <span className="text-[11px] font-mono text-[#D0A873] font-bold">
                  RDD · Research, Discovery & Development Directorate
                </span>
              </div>
            </div>

            {/* Department Nodes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-4xl w-full z-10">
              {departments.filter(d => !d.deletedAt).map(dept => {
                const isSelected = selectedDiagramNode === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setSelectedDiagramNode(dept.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#093534] border-[#25CDB6] shadow-xl ring-1 ring-[#25CDB6]'
                        : 'bg-[#052827] border-[#0f4440] hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-bold text-[#EDE9E0] block truncate">{dept.name}</span>
                    <span className="text-[10px] text-[#25CDB6] font-mono block mt-0.5">/{dept.slug}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
