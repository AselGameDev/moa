import React, { useState } from 'react';
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
  CheckSquare, 
  Square, 
  Clock, 
  UserPlus, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { UserRole } from '../../../types';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  departmentId?: string;
  status: 'active' | 'invited' | 'suspended';
  lastActive: string;
  sessionsCount: number;
  activityCount: number;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
}

export interface RoleAuthority {
  id: string;
  label: string;
  description: string;
}

export const SYSTEM_AUTHORITIES: RoleAuthority[] = [
  { id: 'manage_org', label: 'Organization & Settings', description: 'Configure organization profile, branding, and domains' },
  { id: 'manage_members', label: 'Team Members & Roles', description: 'Invite users, assign roles, and configure authorities' },
  { id: 'publish_live', label: 'Publish Live Site', description: 'Publish and deploy content changes directly to the public website' },
  { id: 'edit_departments', label: 'Department Content', description: 'Create and edit departments, focus areas, and initiatives' },
  { id: 'edit_projects', label: 'Projects & Publications', description: 'Author research projects, articles, and whitepapers' },
  { id: 'manage_media', label: 'Brand & Media Assets', description: 'Upload and manage logos, imagery, and files in media library' },
  { id: 'manage_backups', label: 'System Backups & Audit Logs', description: 'Export database snapshots and view security audit records' },
  { id: 'restore_trash', label: 'Trash & Item Recovery', description: 'Restore soft-deleted items within the retention period' },
  { id: 'portal_access', label: 'Control Room Portal Access', description: 'Sign in to the administrative portal and view dashboard' }
];

export interface DefinedRole {
  id: string;
  name: string;
  isBuiltIn: boolean;
  authorities: string[]; // List of authority IDs
  badgeColor: string;
}

const INITIAL_ROLES: DefinedRole[] = [
  {
    id: 'role_admin',
    name: 'Admin',
    isBuiltIn: true,
    authorities: SYSTEM_AUTHORITIES.map(a => a.id), // All authorities enabled
    badgeColor: '#25CDB6'
  },
  {
    id: 'role_member',
    name: 'Member',
    isBuiltIn: true,
    authorities: ['portal_access', 'edit_departments', 'edit_projects', 'manage_media'],
    badgeColor: '#D0A873'
  }
];

interface TeamTabProps {
  currentSubTab: 'members' | 'roles' | 'invitations';
  onSubTabChange: (sub: 'members' | 'roles' | 'invitations') => void;
  onOpenInviteModal?: () => void;
}

export const TeamTab: React.FC<TeamTabProps> = ({
  currentSubTab,
  onSubTabChange,
}) => {
  // Members state - empty by default per user instruction
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Invitations state - empty by default per user instruction
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Roles state: only Admin and Member by default, plus up to 4 custom roles
  const [roles, setRoles] = useState<DefinedRole[]>(INITIAL_ROLES);

  // Custom role creation state
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleAuthorities, setNewRoleAuthorities] = useState<string[]>(['portal_access']);

  // Selected member drawer state
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('Member');
  const [inviteName, setInviteName] = useState('');

  // Maximum allowed custom roles is 5 (per user request)
  const customRolesCount = roles.filter(r => !r.isBuiltIn).length;
  const canAddMoreRoles = customRolesCount < 5;

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const token = `moa_inv_${Math.random().toString(36).substring(2, 9)}`;
    const newInv: Invitation = {
      id: `inv_${Date.now()}`,
      email: inviteEmail.trim(),
      role: inviteRole,
      invitedBy: 'Administrator',
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      token
    };

    setInvitations([newInv, ...invitations]);

    // Also auto-add to members if desired or keep as invitation
    if (inviteName.trim()) {
      const newMem: TeamMember = {
        id: `usr_${Date.now()}`,
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        status: 'active',
        lastActive: 'Just invited',
        sessionsCount: 0,
        activityCount: 0
      };
      setMembers([...members, newMem]);
    }

    setInviteEmail('');
    setInviteName('');
    setShowInviteModal(false);
  };

  const copyToClipboard = (token: string) => {
    const link = `${window.location.origin}/signin?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Toggle authority for an existing role
  const handleToggleAuthority = (roleId: string, authId: string) => {
    setRoles(prevRoles =>
      prevRoles.map(role => {
        if (role.id !== roleId) return role;
        const exists = role.authorities.includes(authId);
        const updated = exists
          ? role.authorities.filter(id => id !== authId)
          : [...role.authorities, authId];
        return { ...role, authorities: updated };
      })
    );
  };

  // Add custom role
  const handleCreateCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    if (roles.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A role with this name already exists.');
      return;
    }
    if (!canAddMoreRoles) {
      alert('Maximum of 4 custom roles reached.');
      return;
    }

    const newRole: DefinedRole = {
      id: `role_${Date.now()}`,
      name: trimmed,
      isBuiltIn: false,
      authorities: newRoleAuthorities,
      badgeColor: '#25CDB6'
    };

    setRoles([...roles, newRole]);
    setNewRoleName('');
    setNewRoleAuthorities(['portal_access']);
    setIsAddingRole(false);
  };

  // Delete custom role
  const handleDeleteCustomRole = (roleId: string) => {
    const target = roles.find(r => r.id === roleId);
    if (!target || target.isBuiltIn) return;
    if (confirm(`Delete the role "${target.name}"? Members with this role will default to Member.`)) {
      setRoles(roles.filter(r => r.id !== roleId));
      // Reset members who had this role
      setMembers(members.map(m => m.role === target.name ? { ...m, role: 'Member' } : m));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0f4440]/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDE9E0]">Team & Governance</h1>
          <p className="text-sm text-[#EDE9E0]/60 mt-1">
            Manage organization members, custom roles, and authority permissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#25CDB6] text-[#06302F] rounded-xl text-sm font-bold hover:bg-[#25CDB6]/90 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs without sideways scrollbars */}
      <div className="flex items-center gap-2 border-b border-[#0f4440] pb-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {[
          { key: 'members', label: 'Members', icon: Users, count: members.length },
          { key: 'roles', label: 'Roles & Permissions', icon: Shield, count: roles.length },
          { key: 'invitations', label: 'Invitations', icon: Mail, count: invitations.filter(i => i.status === 'pending').length },
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
              {typeof tab.count === 'number' && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
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
          1. MEMBERS SUB-TAB
          =================================================================== */}
      {currentSubTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#EDE9E0]/40" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#052827] border border-[#0f4440] rounded-xl text-xs text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[#EDE9E0]/40" />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-[#052827] border border-[#0f4440] rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
              >
                <option value="all">All Roles</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="py-20 text-center rounded-2xl bg-[#052827] border border-[#0f4440] p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#25CDB6]/10 border border-[#25CDB6]/20 text-[#25CDB6] mx-auto flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-[#EDE9E0]">No members right now</h3>
                <p className="text-xs text-[#EDE9E0]/60 leading-relaxed">
                  There are currently no active team members in the organization. Invite your first admin or collaborator to get started.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 rounded-xl bg-[#25CDB6] text-[#06302F] text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite First Member</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/60 font-semibold uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3.5 px-4">Member</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4">Active Sessions</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f4440]/50 text-[#EDE9E0]">
                  {filteredMembers.map(member => (
                    <tr key={member.id} className="hover:bg-[#073635]/40 transition group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0f4440] flex items-center justify-center font-bold text-[#25CDB6] text-xs">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#EDE9E0]">{member.name}</p>
                            <p className="text-[11px] text-[#EDE9E0]/50 font-mono">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#25CDB6]/20 text-[#25CDB6] border border-[#25CDB6]/40">
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#25CDB6]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#25CDB6]" />
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#EDE9E0]/60">{member.lastActive}</td>
                      <td className="py-3.5 px-4 text-[#EDE9E0]/60 font-mono">{member.sessionsCount} active</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedMember(member)}
                          className="px-3 py-1.5 text-xs text-[#EDE9E0]/80 hover:text-[#25CDB6] hover:bg-[#073635] rounded-lg transition cursor-pointer font-medium"
                        >
                          View Profile
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
          2. ROLES & PERMISSIONS MATRIX SUB-TAB (Admin & Member + Up to 4 Custom Roles)
          =================================================================== */}
      {currentSubTab === 'roles' && (
        <div className="space-y-6">
          <div className="p-5 bg-[#052827] border border-[#0f4440] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#25CDB6]" />
                <h3 className="text-sm font-bold text-[#EDE9E0]">Roles & Authority Permissions</h3>
              </div>
              <p className="text-xs text-[#EDE9E0]/60">
                Currently configured with <strong>Admin</strong> and <strong>Member</strong>. You can add up to 5 additional custom roles and tick their individual authority permissions below.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {canAddMoreRoles ? (
                <button
                  type="button"
                  onClick={() => setIsAddingRole(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#25CDB6] text-[#06302F] text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Role ({5 - customRolesCount} left)</span>
                </button>
              ) : (
                <span className="text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 font-medium">
                  Max 5 custom roles added
                </span>
              )}
            </div>
          </div>

          {/* Add Custom Role Modal / Inline Card */}
          {isAddingRole && (
            <form
              onSubmit={handleCreateCustomRole}
              className="p-5 rounded-2xl bg-[#031D1C] border border-[#25CDB6]/40 shadow-xl space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#25CDB6]" />
                  <h4 className="text-sm font-bold text-[#EDE9E0]">Create Custom Role</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingRole(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#EDE9E0]/80 block">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fellow, Researcher, Specialist, Coordinator..."
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="w-full bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#EDE9E0]/80 block">Tick Role Authorities</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {SYSTEM_AUTHORITIES.map(auth => {
                    const isChecked = newRoleAuthorities.includes(auth.id);
                    return (
                      <div
                        key={auth.id}
                        onClick={() => {
                          if (isChecked) {
                            setNewRoleAuthorities(newRoleAuthorities.filter(id => id !== auth.id));
                          } else {
                            setNewRoleAuthorities([...newRoleAuthorities, auth.id]);
                          }
                        }}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          isChecked
                            ? 'bg-[#17A491]/20 border-[#25CDB6]/60 text-[#EDE9E0]'
                            : 'bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/5'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#25CDB6]" />
                          ) : (
                            <Square className="w-4 h-4 text-white/30" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{auth.label}</span>
                          <span className="text-[10px] text-[#EDE9E0]/50 block leading-tight mt-0.5">{auth.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddingRole(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#25CDB6] text-[#06302F] text-xs font-bold hover:bg-[#25CDB6]/90 transition"
                >
                  Save New Role
                </button>
              </div>
            </form>
          )}

          {/* Interactive Authority Matrix Table */}
          <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/70 font-semibold uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 px-4 min-w-[240px]">Authority / System Capability</th>
                  {roles.map(role => (
                    <th key={role.id} className="py-3.5 px-3 text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          role.name === 'Admin' ? 'bg-[#25CDB6]/20 text-[#25CDB6] border border-[#25CDB6]/40' :
                          role.name === 'Member' ? 'bg-[#D0A873]/20 text-[#D0A873] border border-[#D0A873]/40' :
                          'bg-[#17A491]/20 text-[#25CDB6] border border-[#17A491]/40'
                        }`}>
                          {role.name}
                        </span>
                        {!role.isBuiltIn && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomRole(role.id)}
                            className="p-1 text-white/40 hover:text-red-400 rounded transition cursor-pointer"
                            title="Delete custom role"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f4440]/40 text-[#EDE9E0]">
                {SYSTEM_AUTHORITIES.map((auth) => (
                  <tr key={auth.id} className="hover:bg-[#073635]/25 transition">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-[#EDE9E0] block">{auth.label}</span>
                        <span className="text-[11px] text-[#EDE9E0]/50 block">{auth.description}</span>
                      </div>
                    </td>
                    {roles.map(role => {
                      const isGranted = role.authorities.includes(auth.id);
                      return (
                        <td key={role.id} className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAuthority(role.id, auth.id)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                            title={`Toggle ${auth.label} for ${role.name}`}
                          >
                            {isGranted ? (
                              <div className="w-5 h-5 rounded bg-[#25CDB6]/20 border border-[#25CDB6] text-[#25CDB6] flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded bg-white/5 border border-white/20 text-white/30 flex items-center justify-center">
                                <span className="text-xs text-white/30">—</span>
                              </div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#EDE9E0]/50 italic">
            Tip: Click any checkbox cell in the matrix above to grant or revoke that authority for the respective role.
          </p>
        </div>
      )}

      {/* ===================================================================
          3. INVITATIONS SUB-TAB
          =================================================================== */}
      {currentSubTab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#EDE9E0]/60">
              Invitations generate cryptographically signed 7-day tokens for new collaborators.
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Invitation</span>
            </button>
          </div>

          {invitations.length === 0 ? (
            <div className="py-20 text-center rounded-2xl bg-[#052827] border border-[#0f4440] p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#25CDB6]/10 border border-[#25CDB6]/20 text-[#25CDB6] mx-auto flex items-center justify-center">
                <Mail className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-[#EDE9E0]">No pending invitations</h3>
                <p className="text-xs text-[#EDE9E0]/60 leading-relaxed">
                  There are currently no invited email addresses awaiting registration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 rounded-xl bg-[#25CDB6] text-[#06302F] text-xs font-bold hover:bg-[#25CDB6]/90 transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Send First Invitation</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#052827] border border-[#0f4440] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#073635]/60 border-b border-[#0f4440] text-[#EDE9E0]/60 font-semibold uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Invited Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Invited By</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f4440]/50 text-[#EDE9E0]">
                  {invitations.map(inv => (
                    <tr key={inv.id} className="hover:bg-[#073635]/40 transition">
                      <td className="py-3.5 px-4 font-mono font-medium">{inv.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#25CDB6]/20 text-[#25CDB6] border border-[#25CDB6]/30">
                          {inv.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#EDE9E0]/60">{inv.invitedBy}</td>
                      <td className="py-3.5 px-4 text-[#EDE9E0]/60">{inv.expiresAt}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => copyToClipboard(inv.token)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#25CDB6] hover:bg-[#073635] rounded-lg transition cursor-pointer"
                        >
                          {copiedToken === inv.token ? (
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
                          onClick={() => setInvitations(invitations.filter(i => i.id !== inv.id))}
                          className="p-1 text-[#EDE9E0]/40 hover:text-red-400 rounded-lg transition cursor-pointer"
                          title="Revoke invitation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* MEMBER PROFILE DRAWER */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#06302F] border-l border-[#0f4440] h-full overflow-y-auto no-scrollbar p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#0f4440]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0f4440] flex items-center justify-center font-bold text-[#25CDB6]">
                  {selectedMember.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-[#EDE9E0]">{selectedMember.name}</h3>
                  <p className="text-xs text-[#EDE9E0]/50 font-mono">{selectedMember.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-1 text-[#EDE9E0]/50 hover:text-[#EDE9E0] rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[#EDE9E0]/60 block mb-1">Assigned Role</label>
                <select
                  value={selectedMember.role}
                  onChange={e => {
                    const newRole = e.target.value;
                    setMembers(members.map(m => m.id === selectedMember.id ? { ...m, role: newRole } : m));
                    setSelectedMember({ ...selectedMember, role: newRole });
                  }}
                  className="w-full bg-[#052827] border border-[#0f4440] rounded-xl px-3 py-2 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-[#0f4440] flex items-center justify-between">
                <button
                  onClick={() => {
                    if (confirm(`Remove ${selectedMember.name} from organization?`)) {
                      setMembers(members.filter(m => m.id !== selectedMember.id));
                      setSelectedMember(null);
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition font-medium cursor-pointer"
                >
                  Remove Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#06302F] border border-[#0f4440] rounded-2xl p-6 shadow-2xl space-y-4 text-[#EDE9E0]">
            <div className="flex items-center justify-between pb-2 border-b border-[#0f4440]">
              <h3 className="font-bold text-base text-[#EDE9E0]">Invite Team Member</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-[#EDE9E0]/40 hover:text-[#EDE9E0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-4 text-xs">
              <div>
                <label className="text-[#EDE9E0]/70 block mb-1">Collaborator Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Alex Morgan"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full bg-[#052827] border border-[#0f4440] rounded-xl px-3 py-2 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="collaborator@organization.org"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-[#052827] border border-[#0f4440] rounded-xl px-3 py-2 text-[#EDE9E0] placeholder-[#EDE9E0]/30 focus:outline-none focus:border-[#25CDB6]"
                />
              </div>

              <div>
                <label className="text-[#EDE9E0]/70 block mb-1">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-[#052827] border border-[#0f4440] rounded-xl px-3 py-2 text-[#EDE9E0] focus:outline-none focus:border-[#25CDB6] cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name} ({r.authorities.length} authorities)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-[#073635]/60 border border-[#0f4440] rounded-xl text-[#EDE9E0]/70 text-[11px] leading-relaxed">
                The invite link will be valid for 7 days. The recipient can configure their sign-in credentials with the selected role authorities.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-2 text-xs text-[#EDE9E0]/60 hover:text-[#EDE9E0] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#25CDB6] text-[#06302F] rounded-xl text-xs font-bold hover:bg-[#25CDB6]/90 transition cursor-pointer"
                >
                  Generate Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
