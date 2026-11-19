import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Shield,
  Mail,
  Check,
  Plus,
  Search,
  Filter,
  Copy,
  Trash2,
  X,
  Clock,
  UserPlus,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Lock,
  Ban,
  CheckCircle2,
  RefreshCw,
  Pencil
} from 'lucide-react';
import { User, UserInvitation, Department, RoleDefinition } from '../../../types';
import { api } from '../../../services/api';
import { can, PERMISSION_GROUPS, PermissionKey } from '../../../shared/permissions';
import { ConfirmDialog } from '../ConfirmDialog';
import { DeleteButton } from '../DeleteButton';

interface TeamTabProps {
  currentSubTab: 'members' | 'invitations' | 'roles';
  onSubTabChange: (sub: 'members' | 'invitations' | 'roles') => void;
  currentUser: User;
  roles: RoleDefinition[];
  onRolesChange?: (roles: RoleDefinition[]) => void;
  departments?: Department[];
}

export const TeamTab: React.FC<TeamTabProps> = ({
  currentSubTab,
  onSubTabChange,
  currentUser,
  roles: initialRoles,
  onRolesChange,
  departments = []
}) => {
  const canManageTeam = can(currentUser, 'team.manage', initialRoles);

  const [members, setMembers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>(initialRoles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [smtpNotice, setSmtpNotice] = useState<{ sent: boolean; link?: string; error?: string } | null>(null);

  useEffect(() => {
    if (initialRoles.length > 0) setRoles(initialRoles);
  }, [initialRoles]);

  // Filters & Drawer
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [drawerEmail, setDrawerEmail] = useState('');
  const [drawerPassword, setDrawerPassword] = useState('');
  const [drawerCredSaving, setDrawerCredSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setDrawerEmail(selectedMember?.email || '');
    setDrawerPassword('');
  }, [selectedMember?.id, selectedMember?.email]);

  // Create/Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [modalMode, setModalMode] = useState<'invite' | 'direct'>('invite');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<string>('role-member');
  const [inviteDeptScope, setInviteDeptScope] = useState<string[]>([]);
  const [inviteTempPassword, setInviteTempPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Role Management Modal / State
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<PermissionKey[]>([
    'projects.create',
    'projects.editOwn',
    'media.upload'
  ]);
  const [renamingRoleId, setRenamingRoleId] = useState<string | null>(null);
  const [renameRoleValue, setRenameRoleValue] = useState('');
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<RoleDefinition | null>(null);

  // One-time temporary password banner
  const [oneTimeCredential, setOneTimeCredential] = useState<{
    email: string;
    password: string;
    label: string;
  } | null>(null);

  // Confirmation dialogs
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<User | null>(null);
  const [confirmRevokeInvite, setConfirmRevokeInvite] = useState<UserInvitation | null>(null);

  const onRolesChangeRef = useRef(onRolesChange);
  useEffect(() => {
    onRolesChangeRef.current = onRolesChange;
  }, [onRolesChange]);

  const loadTeamData = useCallback(async () => {
    if (!canManageTeam) return;
    setLoading(true);
    setError(null);
    try {
      const [mems, invs, rolesList] = await Promise.all([
        api.getMembers(),
        api.getInvitations(),
        api.getRoles()
      ]);
      setMembers(mems);
      setInvitations(invs);
      setRoles(rolesList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load team directory.');
    } finally {
      setLoading(false);
    }
  }, [canManageTeam]);

  useEffect(() => {
    void loadTeamData();
  }, [loadTeamData]);

  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.roleId === roleFilter || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(prev => (prev === key ? null : prev)), 2500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    setSmtpNotice(null);
    const chosenRole = roles.find(r => r.id === inviteRoleId);
    const roleName = chosenRole?.name || 'Member';
    try {
      if (modalMode === 'invite') {
        const created = await api.createInvitation({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          roleId: inviteRoleId,
          role: roleName,
          departmentScope: inviteRoleId === 'role-admin' ? [] : inviteDeptScope
        });
        setInvitations(prev => [created, ...prev]);
        const link =
          created.inviteUrl || `${window.location.origin}/invite?token=${created.token}`;
        setSmtpNotice({
          sent: Boolean(created.emailSent),
          link,
          error: created.emailError
        });
        setNotice(
          created.emailSent
            ? `Invitation emailed to ${created.email}.`
            : `Invitation link created for ${created.email}. Copy and share the invite link below.`
        );
        onSubTabChange('invitations');
      } else {
        if (!inviteName.trim()) {
          setError('Full name is required when adding a member directly.');
          setSubmitting(false);
          return;
        }
        const created = await api.createMember({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          roleId: inviteRoleId,
          role: roleName,
          departmentScope: inviteRoleId === 'role-admin' ? [] : inviteDeptScope,
          temporaryPassword: inviteTempPassword.trim() || undefined
        });
        setMembers(prev => [...prev, created]);
        if (created.temporaryPassword) {
          setOneTimeCredential({
            email: created.email,
            password: created.temporaryPassword,
            label: `Account created for ${created.name}`
          });
        } else {
          setNotice(`Member ${created.name} created.`);
        }
        onSubTabChange('members');
      }
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteTempPassword('');
      setInviteDeptScope([]);
      setInviteRoleId('role-member');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create team entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async (
    memberId: string,
    patch: Partial<User> & { email?: string; password?: string }
  ) => {
    setError(null);
    try {
      const updated = await api.updateMember(memberId, patch);
      setMembers(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      setSelectedMember(prev => (prev && prev.id === updated.id ? updated : prev));
      setNotice(`Updated member profile for ${updated.name}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update member.');
    }
  };

  const handleSaveMemberCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !currentUser?.isFounder) return;
    const cleanEmail = drawerEmail.trim().toLowerCase();
    const emailChanged = Boolean(cleanEmail && cleanEmail !== selectedMember.email.trim().toLowerCase());
    const passwordChanged = Boolean(drawerPassword);
    if (!emailChanged && !passwordChanged) {
      setError('Enter a new email address or password before saving credentials.');
      return;
    }

    setDrawerCredSaving(true);
    setError(null);
    try {
      const payload: { email?: string; password?: string } = {};
      if (emailChanged) payload.email = cleanEmail;
      if (passwordChanged) payload.password = drawerPassword;
      const updated = await api.updateMember(selectedMember.id, payload);
      setMembers(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      setSelectedMember(prev => (prev && prev.id === updated.id ? updated : prev));
      if (updated.id === currentUser.id && api.getToken()) {
        api.setSession(api.getToken()!, updated);
      }
      setDrawerPassword('');
      setNotice(`Updated sign-in credentials for ${updated.name}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update account credentials.');
    } finally {
      setDrawerCredSaving(false);
    }
  };

  const handleResetMemberPassword = async (member: User) => {
    setError(null);
    try {
      const res = await api.resetMemberPassword(member.id);
      setOneTimeCredential({
        email: member.email,
        password: res.temporaryPassword,
        label: `Password reset for ${member.name}`
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset member password.');
    }
  };

  const handleResendInvitation = async (inv: UserInvitation) => {
    setError(null);
    setSmtpNotice(null);
    try {
      const updated = await api.resendInvitation(inv.id);
      setInvitations(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      const link = updated.inviteUrl || `${window.location.origin}/invite?token=${updated.token}`;
      setSmtpNotice({
        sent: Boolean(updated.emailSent),
        link,
        error: updated.emailError
      });
      setNotice(
        updated.emailSent
          ? `Invitation resent to ${updated.email}.`
          : `Refreshed invitation link for ${updated.email}.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation.');
    }
  };

  const handleToggleRolePermission = async (role: RoleDefinition, perm: PermissionKey) => {
    if (role.locked || role.id === 'role-admin') return;
    const hasPerm = role.permissions.includes(perm);
    const nextPerms = hasPerm
      ? role.permissions.filter(p => p !== perm)
      : [...role.permissions, perm];
    setBusyRoleId(role.id);
    setError(null);
    try {
      const updated = await api.updateRole(role.id, { permissions: nextPerms });
      const nextRoles = roles.map(r => (r.id === updated.id ? updated : r));
      setRoles(nextRoles);
      onRolesChange?.(nextRoles);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role permissions.');
    } finally {
      setBusyRoleId(null);
    }
  };

  const handleSaveRoleRename = async (role: RoleDefinition) => {
    if (!renameRoleValue.trim() || role.locked) {
      setRenamingRoleId(null);
      return;
    }
    setBusyRoleId(role.id);
    setError(null);
    try {
      const updated = await api.updateRole(role.id, { name: renameRoleValue.trim() });
      const nextRoles = roles.map(r => (r.id === updated.id ? updated : r));
      setRoles(nextRoles);
      onRolesChange?.(nextRoles);
      setRenamingRoleId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rename role.');
    } finally {
      setBusyRoleId(null);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.createRole({
        name: newRoleName.trim(),
        permissions: newRolePerms
      });
      const nextRoles = [...roles, created];
      setRoles(nextRoles);
      onRolesChange?.(nextRoles);
      setShowCreateRoleModal(false);
      setNewRoleName('');
      setNotice(`Created custom role "${created.name}".`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleInviteDept = (deptId: string) => {
    setInviteDeptScope(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  if (!canManageTeam) {
    return (
      <div className="p-10 rounded-3xl bg-[#031D1C] border border-white/10 text-center space-y-3">
        <Lock className="w-8 h-8 text-[#D0A873] mx-auto" />
        <h2 className="text-lg font-bold text-[#EDE9E0]">Team Management Restricted</h2>
        <p className="text-xs text-[#EDE9E0]/60 max-w-md mx-auto leading-relaxed">
          Roster management, invitations, and role permissions require the team management permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#EDE9E0]">Team &amp; Governance</h1>
          <p className="text-xs text-[#EDE9E0]/60 mt-1">
            Manage organization members, department scopes, invitations, and custom RBAC roles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setModalMode('direct');
              setShowInviteModal(true);
            }}
            className="h-9 px-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[#EDE9E0] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#25CDB6]" />
            <span>Add Member</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setModalMode('invite');
              setShowInviteModal(true);
            }}
            className="h-9 px-3.5 bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Invite Link</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-red-300 hover:text-white cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-200 hover:text-white cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {smtpNotice && !smtpNotice.sent && smtpNotice.link && (
        <div className="p-4 rounded-2xl bg-[#031D1C] border border-[#D0A873]/40 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#D0A873]">
              SMTP email is not configured on this server — share this invite link directly:
            </span>
            <button
              type="button"
              onClick={() => setSmtpNotice(null)}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#06302F] border border-white/10 font-mono">
            <span className="text-[#25CDB6] truncate">{smtpNotice.link}</span>
            <button
              type="button"
              onClick={() => handleCopyText(smtpNotice.link!, 'smtp-invite')}
              className="h-8 px-3 rounded-lg bg-[#25CDB6]/15 hover:bg-[#25CDB6]/25 text-[#25CDB6] font-sans font-bold shrink-0 cursor-pointer"
            >
              {copiedId === 'smtp-invite' ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {oneTimeCredential && (
        <div className="p-5 rounded-2xl bg-[#031D1C] border border-amber-400/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <KeyRound className="w-4 h-4" />
              <span>{oneTimeCredential.label} &mdash; Copy Temporary Password Now</span>
            </div>
            <button
              type="button"
              onClick={() => setOneTimeCredential(null)}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#EDE9E0]/70">
            This password is displayed once. The user will be prompted to replace it upon first sign-in.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#06302F] border border-white/10 font-mono text-xs">
            <div>
              <span className="text-[#EDE9E0]/50 mr-2">{oneTimeCredential.email}:</span>
              <span className="text-[#25CDB6] font-bold select-all">{oneTimeCredential.password}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText(oneTimeCredential.password, 'one-time-pw')}
              className="h-8 px-3 rounded-lg bg-[#25CDB6]/15 hover:bg-[#25CDB6]/25 text-[#25CDB6] text-xs font-sans font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copiedId === 'one-time-pw' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'one-time-pw' ? 'Copied' : 'Copy Password'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Segmented Sub Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#031D1C] rounded-2xl border border-white/10 w-fit max-w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs">
        {[
          { key: 'members' as const, label: 'Members', icon: Users, count: members.length },
          { key: 'invitations' as const, label: 'Invitations', icon: Mail, count: invitations.filter(i => i.status === 'pending').length },
          { key: 'roles' as const, label: 'Roles & Permissions', icon: Shield, count: roles.length }
        ].map(tab => {
          const Icon = tab.icon;
          const active = currentSubTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSubTabChange(tab.key)}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#17A491] text-[#06302F] shadow-sm'
                  : 'text-[#EDE9E0]/65 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  active ? 'bg-[#06302F]/30 text-[#06302F]' : 'bg-white/5 text-[#EDE9E0]/50'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 1. MEMBERS SUB-TAB */}
      {currentSubTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 p-3 rounded-2xl bg-[#031D1C] border border-white/10 relative w-full">
              <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-6 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 bg-[#06302F] border border-white/10 rounded-xl pl-10 pr-4 text-xs text-[#EDE9E0] placeholder-[#EDE9E0]/35 focus:outline-none focus:border-[#25CDB6]"
              />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#031D1C] border border-white/10">
              <Filter className="w-3.5 h-3.5 text-[#EDE9E0]/45 shrink-0" />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="h-9 bg-[#06302F] border border-white/10 rounded-xl px-3 text-xs font-bold text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
              >
                <option value="all">All Roles</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-[#EDE9E0]/50 rounded-2xl bg-[#031D1C] border border-white/10">
              Loading team roster...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-[#031D1C] border border-white/10 p-8 space-y-3">
              <Users className="w-8 h-8 text-[#25CDB6] mx-auto opacity-60" />
              <p className="text-xs text-[#EDE9E0]/60">No team members match the current filter.</p>
            </div>
          ) : (
            <div className="bg-[#031D1C] border border-white/10 rounded-2xl overflow-x-auto shadow-lg">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className="bg-[#06302F]/60 border-b border-white/10 text-[#EDE9E0]/55 font-semibold uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">2FA</th>
                    <th className="py-3.5 px-4">Last Sign-In</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[#EDE9E0]">
                  {filteredMembers.map(member => {
                    const roleObj = roles.find(r => r.id === member.roleId);
                    const displayRole = roleObj?.name || member.role;
                    const isAdminRole = member.roleId === 'role-admin' || displayRole.toLowerCase() === 'admin';
                    return (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#06302F] border border-white/10 flex items-center justify-center font-bold text-[#25CDB6] text-xs shrink-0">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-[#EDE9E0]">{member.name}</p>
                                {member.isFounder && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#D0A873]/20 text-[#D0A873] border border-[#D0A873]/40">
                                    Founder
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#EDE9E0]/50 font-mono">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              isAdminRole
                                ? 'bg-[#17A491]/20 text-[#25CDB6] border border-[#25CDB6]/30'
                                : 'bg-[#D0A873]/20 text-[#D0A873] border border-[#D0A873]/30'
                            }`}
                          >
                            {displayRole}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {member.deactivated ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              Deactivated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-[#25CDB6]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#25CDB6]" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {member.twoFactorEnabled ? (
                            <span className="text-emerald-400">Enrolled</span>
                          ) : (
                            <span className="text-[#EDE9E0]/40">Off</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#EDE9E0]/60 font-mono text-[11px]">
                          {member.lastSignIn ? new Date(member.lastSignIn).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedMember(member)}
                            className="h-8 px-3 rounded-lg bg-[#17A491]/15 hover:bg-[#17A491] text-[#25CDB6] hover:text-[#06302F] text-xs font-bold transition-colors cursor-pointer"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. INVITATIONS SUB-TAB */}
      {currentSubTab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#EDE9E0]/60">
              Invitations generate cryptographically signed 7-day onboarding links (
              <code className="text-[#25CDB6]">/invite?token=...</code>).
            </p>
            <button
              type="button"
              onClick={() => {
                setModalMode('invite');
                setShowInviteModal(true);
              }}
              className="h-9 px-3.5 bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Invitation</span>
            </button>
          </div>

          {invitations.length === 0 ? (
            <div className="py-20 text-center rounded-2xl bg-[#031D1C] border border-white/10 p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#17A491]/10 border border-[#25CDB6]/20 text-[#25CDB6] mx-auto flex items-center justify-center">
                <Mail className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-[#EDE9E0]">No invitations created</h3>
                <p className="text-xs text-[#EDE9E0]/60 leading-relaxed">
                  Create a signed invitation link to onboard a collaborator or administrator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalMode('invite');
                  setShowInviteModal(true);
                }}
                className="h-9 px-3.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold transition-all shadow-md inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create First Invitation</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#031D1C] border border-white/10 rounded-2xl overflow-x-auto shadow-lg">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className="bg-[#06302F]/60 border-b border-white/10 text-[#EDE9E0]/55 font-semibold uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Invited Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Invited By</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[#EDE9E0]">
                  {invitations.map(inv => {
                    const isExpired =
                      inv.status === 'pending' && new Date(inv.expiresAt).getTime() < Date.now();
                    const effectiveStatus = isExpired ? 'expired' : inv.status;
                    const inviteUrl = `${window.location.origin}/invite?token=${inv.token}`;
                    const roleObj = roles.find(r => r.id === inv.roleId);
                    return (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4 font-mono font-medium">
                          <span>{inv.email}</span>
                          {inv.name && (
                            <span className="block font-sans text-[11px] text-[#EDE9E0]/50">{inv.name}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#17A491]/20 text-[#25CDB6] border border-[#25CDB6]/30">
                            {roleObj?.name || inv.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#EDE9E0]/60">{inv.invitedByName || inv.invitedBy}</td>
                        <td className="py-3.5 px-4 text-[#EDE9E0]/60 font-mono text-[11px]">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] capitalize ${
                              effectiveStatus === 'accepted'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : effectiveStatus === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-red-500/15 text-red-300 border border-red-500/30'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {effectiveStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {effectiveStatus === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyText(inviteUrl, inv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#25CDB6] hover:bg-white/5 rounded-lg transition cursor-pointer"
                              >
                                {copiedId === inv.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy link</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResendInvitation(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#EDE9E0]/80 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
                                title="Resend invitation"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Resend</span>
                              </button>
                            </>
                          )}
                          <DeleteButton
                            onClick={() => setConfirmRevokeInvite(inv)}
                            title="Revoke invitation"
                            ariaLabel={`Revoke invitation for ${inv.email}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. INTERACTIVE ROLES & PERMISSIONS MATRIX */}
      {currentSubTab === 'roles' && (
        <div className="space-y-6">
          <div className="p-5 bg-[#031D1C] border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#25CDB6]" />
                <h3 className="text-sm font-bold text-[#EDE9E0]">Live Roles &amp; Permissions Matrix</h3>
              </div>
              <p className="text-xs text-[#EDE9E0]/60">
                Click any permission cell on a custom or Member role to grant or revoke Access immediately. Admin stays full-access.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateRoleModal(true)}
              className="h-9 px-3.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap shrink-0 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Custom Role</span>
            </button>
          </div>

          <div className="bg-[#031D1C] border border-white/10 rounded-2xl overflow-x-auto shadow-lg">
            <table className="w-full text-left text-xs min-w-[740px]">
              <thead className="bg-[#06302F]/60 border-b border-white/10 text-[#EDE9E0]/65 font-semibold uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 min-w-[260px]">Permission</th>
                  {roles.map(role => {
                    const assignedCount = members.filter(m => m.roleId === role.id).length;
                    const isLocked = Boolean(role.locked || role.id === 'role-admin');
                    return (
                      <th key={role.id} className="py-3.5 px-4 text-center min-w-[140px]">
                        {renamingRoleId === role.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              value={renameRoleValue}
                              onChange={e => setRenameRoleValue(e.target.value)}
                              className="w-24 bg-[#06302F] border border-[#25CDB6] rounded-lg px-2 py-1 text-xs text-[#EDE9E0] normal-case focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRoleRename(role)}
                              className="text-[#25CDB6] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <span>{role.name}</span>
                              {isLocked && <Lock className="w-3 h-3 text-[#25CDB6]" />}
                              {!role.isSystem && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRenamingRoleId(role.id);
                                      setRenameRoleValue(role.name);
                                    }}
                                    className="text-white/40 hover:text-[#25CDB6] cursor-pointer"
                                    title="Rename role"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <DeleteButton
                                    disabled={assignedCount > 0}
                                    onClick={() => setConfirmDeleteRole(role)}
                                    title={assignedCount > 0 ? 'Reassign members before deleting role' : 'Delete role'}
                                    ariaLabel={`Delete role ${role.name}`}
                                  />
                                </>
                              )}
                            </div>
                            <span className="text-[10px] font-normal normal-case text-[#EDE9E0]/45">
                              {assignedCount} member{assignedCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#EDE9E0]">
                {PERMISSION_GROUPS.map(group => (
                  <React.Fragment key={group.category}>
                    <tr className="bg-[#06302F]/40">
                      <td
                        colSpan={roles.length + 1}
                        className="py-2 px-4 text-[10px] font-mono uppercase tracking-widest text-[#25CDB6] font-bold"
                      >
                        {group.category}
                      </td>
                    </tr>
                    {group.items.map(perm => (
                      <tr key={perm.key} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#EDE9E0] block">{perm.label}</span>
                          <span className="text-[11px] text-[#EDE9E0]/50 block mt-0.5">{perm.description}</span>
                        </td>
                        {roles.map(role => {
                          const isLocked = Boolean(role.locked || role.id === 'role-admin');
                          const hasAccess = isLocked || role.permissions.includes(perm.key);
                          return (
                            <td key={role.id} className="py-3 px-4 text-center">
                              <button
                                type="button"
                                disabled={isLocked || busyRoleId === role.id}
                                onClick={() => handleToggleRolePermission(role, perm.key)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                  hasAccess
                                    ? 'bg-[#17A491]/20 text-[#25CDB6] border border-[#25CDB6]/30'
                                    : 'bg-white/5 text-white/45 border border-white/10 hover:text-white'
                                } ${isLocked ? 'cursor-default opacity-90' : 'cursor-pointer hover:scale-105'}`}
                              >
                                {hasAccess ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Access</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3 h-3" />
                                    <span>Restricted</span>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MEMBER PROFILE DRAWER */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#031D1C] border-l border-white/15 h-full overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#06302F] border border-white/10 flex items-center justify-center font-bold text-[#25CDB6]">
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-[#EDE9E0]">{selectedMember.name}</h3>
                  <p className="text-xs text-[#EDE9E0]/50 font-mono">{selectedMember.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1.5 text-[#EDE9E0]/50 hover:text-[#EDE9E0] rounded-lg hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              <div>
                <label className="text-[#EDE9E0]/60 block mb-1.5 font-semibold">Assigned Role</label>
                <select
                  value={selectedMember.roleId || 'role-member'}
                  disabled={Boolean(selectedMember.isFounder)}
                  onChange={e => {
                    const nextId = e.target.value;
                    const chosen = roles.find(r => r.id === nextId);
                    void handleUpdateMember(selectedMember.id, {
                      roleId: nextId,
                      role: chosen?.name || 'Member'
                    });
                  }}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer disabled:opacity-50"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {selectedMember.isFounder && (
                  <p className="text-[10px] text-[#D0A873] mt-1">
                    Organization founder role is permanently protected.
                  </p>
                )}
              </div>

              {selectedMember.roleId !== 'role-admin' && departments.length > 0 && (
                <div>
                  <label className="text-[#EDE9E0]/60 block mb-1.5 font-semibold">
                    Department Editing Scope (leave unchecked for unrestricted content scope)
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto p-2.5 rounded-xl bg-[#06302F] border border-white/10">
                    {departments
                      .filter(d => !d.deletedAt)
                      .map(dept => {
                        const scoped = (selectedMember.departmentScope || []).includes(dept.id);
                        return (
                          <label
                            key={dept.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={scoped}
                              onChange={() => {
                                const current = selectedMember.departmentScope || [];
                                const next = scoped
                                  ? current.filter(id => id !== dept.id)
                                  : [...current, dept.id];
                                void handleUpdateMember(selectedMember.id, { departmentScope: next });
                              }}
                              className="accent-[#25CDB6]"
                            />
                            <span className="truncate">{dept.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#06302F] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold block text-[#EDE9E0]">Account Active</span>
                  <span className="text-[11px] text-[#EDE9E0]/50 block">
                    Deactivating terminates all active sessions immediately.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={Boolean(selectedMember.isFounder) || selectedMember.id === currentUser?.id}
                  onClick={() =>
                    handleUpdateMember(selectedMember.id, {
                      deactivated: !selectedMember.deactivated
                    })
                  }
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-40 shrink-0 ${
                    selectedMember.deactivated
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {selectedMember.deactivated ? 'Reactivate' : 'Deactivate'}
                </button>
              </div>

              {Boolean(currentUser?.isFounder) && (
                <form
                  onSubmit={handleSaveMemberCredentials}
                  className="p-4 rounded-xl bg-[#06302F] border border-[#25CDB6]/25 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-[#25CDB6]" />
                    <span className="font-bold text-[#EDE9E0]">
                      Account Credentials (Founder Only)
                    </span>
                  </div>
                  <div>
                    <label className="text-[#EDE9E0]/60 block mb-1 font-semibold">Sign-In Email</label>
                    <input
                      type="email"
                      value={drawerEmail}
                      onChange={e => setDrawerEmail(e.target.value)}
                      required
                      className="w-full bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>
                  <div>
                    <label className="text-[#EDE9E0]/60 block mb-1 font-semibold">
                      Set New Password (optional)
                    </label>
                    <input
                      type="password"
                      value={drawerPassword}
                      onChange={e => setDrawerPassword(e.target.value)}
                      placeholder="Leave blank to keep existing password"
                      className="w-full bg-[#031D1C] border border-white/10 rounded-xl px-3 py-2 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={drawerCredSaving}
                      className="h-8 px-3 rounded-lg bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>{drawerCredSaving ? 'Saving...' : 'Save Credentials'}</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                {Boolean(currentUser?.isFounder) && (
                  <button
                    type="button"
                    onClick={() => handleResetMemberPassword(selectedMember)}
                    className="h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#25CDB6] inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Generate Temp Password</span>
                  </button>
                )}

                {!selectedMember.isFounder && selectedMember.id !== currentUser?.id && (
                  <DeleteButton
                    onClick={() => setConfirmRemoveMember(selectedMember)}
                    label="Remove Member"
                    title="Remove team member"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVITE / CREATE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[#031D1C] border border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 text-[#EDE9E0]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-[#EDE9E0]">
                {modalMode === 'invite' ? 'Generate Invite Link' : 'Create Team Account'}
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-[#EDE9E0]/40 hover:text-[#EDE9E0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#06302F] border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setModalMode('invite')}
                className={`h-9 rounded-lg font-bold transition cursor-pointer ${
                  modalMode === 'invite' ? 'bg-[#17A491] text-[#06302F]' : 'text-[#EDE9E0]/65 hover:text-white'
                }`}
              >
                Invite Link (7-day)
              </button>
              <button
                type="button"
                onClick={() => setModalMode('direct')}
                className={`h-9 rounded-lg font-bold transition cursor-pointer ${
                  modalMode === 'direct' ? 'bg-[#17A491] text-[#06302F]' : 'text-[#EDE9E0]/65 hover:text-white'
                }`}
              >
                Direct Account
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">
                  Full Name {modalMode === 'direct' ? '*' : '(optional)'}
                </label>
                <input
                  type="text"
                  required={modalMode === 'direct'}
                  placeholder="e.g. Alex Morgan"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="collaborator@mastersofall.org"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">Assign Role</label>
                <select
                  value={inviteRoleId}
                  onChange={e => setInviteRoleId(e.target.value)}
                  className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {modalMode === 'direct' && (
                <div>
                  <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">
                    Temporary Password (optional &mdash; leave blank to auto-generate)
                  </label>
                  <input
                    type="text"
                    value={inviteTempPassword}
                    onChange={e => setInviteTempPassword(e.target.value)}
                    placeholder="Auto-generate secure 16-char password"
                    className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                  />
                </div>
              )}

              {inviteRoleId !== 'role-admin' && departments.length > 0 && (
                <div>
                  <label className="text-[#EDE9E0]/70 block mb-1 font-semibold">
                    Department Scope (optional)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-2.5 rounded-xl bg-[#06302F] border border-white/10">
                    {departments
                      .filter(d => !d.deletedAt)
                      .map(dept => (
                        <label key={dept.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inviteDeptScope.includes(dept.id)}
                            onChange={() => handleToggleInviteDept(dept.id)}
                            className="accent-[#25CDB6]"
                          />
                          <span className="truncate">{dept.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="h-9 px-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0]/75 hover:text-white rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-3.5 bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Processing...'
                    : modalMode === 'invite'
                    ? 'Generate Invitation'
                    : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM ROLE MODAL */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateRole}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#031D1C] border border-white/15 rounded-2xl p-6 shadow-2xl space-y-4 text-[#EDE9E0]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base">Create Custom Role</h3>
              <button
                type="button"
                onClick={() => setShowCreateRoleModal(false)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-[#EDE9E0]/70 font-semibold block">Role Name *</label>
              <input
                type="text"
                required
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="e.g. Managing Editor, Department Lead..."
                className="w-full bg-[#06302F] border border-white/10 rounded-xl px-3.5 py-2.5 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6]"
              />
            </div>

            <div className="space-y-3 text-xs">
              <label className="text-[#EDE9E0]/70 font-semibold block">Initial Permissions</label>
              {PERMISSION_GROUPS.map(group => (
                <div key={group.category} className="p-3 rounded-xl bg-[#06302F] border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-[#25CDB6] font-bold block">
                    {group.category}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {group.items.map(perm => (
                      <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={newRolePerms.includes(perm.key)}
                          onChange={() =>
                            setNewRolePerms(prev =>
                              prev.includes(perm.key)
                                ? prev.filter(p => p !== perm.key)
                                : [...prev, perm.key]
                            )
                          }
                          className="accent-[#25CDB6]"
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateRoleModal(false)}
                className="h-9 px-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-[#EDE9E0]/75 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-3.5 bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmRemoveMember)}
        title="Remove Team Member"
        message={
          confirmRemoveMember
            ? `Permanently remove ${confirmRemoveMember.name} (${confirmRemoveMember.email}) and revoke all active sessions?`
            : ''
        }
        confirmLabel="Remove Member"
        onCancel={() => setConfirmRemoveMember(null)}
        onConfirm={async () => {
          if (!confirmRemoveMember) return;
          const target = confirmRemoveMember;
          setConfirmRemoveMember(null);
          try {
            await api.deleteMember(target.id);
            setMembers(prev => prev.filter(m => m.id !== target.id));
            if (selectedMember?.id === target.id) setSelectedMember(null);
            setNotice(`Removed ${target.name} from the Control Room.`);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to remove member.');
          }
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmRevokeInvite)}
        title="Revoke Invitation"
        message={
          confirmRevokeInvite
            ? `Revoke the invitation link for ${confirmRevokeInvite.email}? It will immediately become unusable.`
            : ''
        }
        confirmLabel="Revoke Invitation"
        onCancel={() => setConfirmRevokeInvite(null)}
        onConfirm={async () => {
          if (!confirmRevokeInvite) return;
          const target = confirmRevokeInvite;
          setConfirmRevokeInvite(null);
          try {
            await api.revokeInvitation(target.id);
            setInvitations(prev => prev.filter(i => i.id !== target.id));
            setNotice(`Revoked invitation for ${target.email}.`);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to revoke invitation.');
          }
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteRole)}
        title="Delete Custom Role"
        message={
          confirmDeleteRole
            ? `Delete custom role "${confirmDeleteRole.name}"? Roles currently assigned to team members cannot be deleted.`
            : ''
        }
        confirmLabel="Delete Role"
        onCancel={() => setConfirmDeleteRole(null)}
        onConfirm={async () => {
          if (!confirmDeleteRole) return;
          const target = confirmDeleteRole;
          setConfirmDeleteRole(null);
          try {
            await api.deleteRole(target.id);
            const nextRoles = roles.filter(r => r.id !== target.id);
            setRoles(nextRoles);
            onRolesChange?.(nextRoles);
            setNotice(`Deleted role "${target.name}".`);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to delete custom role.');
          }
        }}
      />
    </div>
  );
};
