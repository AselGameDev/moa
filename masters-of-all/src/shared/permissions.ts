export type PermissionKey =
  | 'website.edit'
  | 'pages.manage'
  | 'navigation.manage'
  | 'seo.manage'
  | 'departments.manage'
  | 'projects.create'
  | 'projects.editOwn'
  | 'projects.editAll'
  | 'projects.publish'
  | 'publications.manage'
  | 'products.manage'
  | 'media.upload'
  | 'media.manage'
  | 'inbox.view'
  | 'team.manage'
  | 'settings.manage'
  | 'backups.manage'
  | 'audit.view'
  | 'trash.manage';

export type PermissionCategory =
  | 'Departments'
  | 'Projects'
  | 'Publications'
  | 'Products'
  | 'Website'
  | 'Media'
  | 'Team'
  | 'Inbox'
  | 'System';

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  description: string;
  category: PermissionCategory;
}

export interface PermissionGroup {
  category: PermissionCategory;
  items: PermissionMeta[];
}

export const ALL_PERMISSIONS: PermissionMeta[] = [
  {
    key: 'departments.manage',
    label: 'Manage Departments & Sectors',
    description: 'Allows creating, editing, reordering, publishing, and removing official departments and RDD sectors.',
    category: 'Departments'
  },
  {
    key: 'projects.create',
    label: 'Create Projects',
    description: 'Allows creating new project drafts and submitting work for review.',
    category: 'Projects'
  },
  {
    key: 'projects.editOwn',
    label: 'Edit Own Content',
    description: 'Allows editing projects, publications, and products created by the signed-in user.',
    category: 'Projects'
  },
  {
    key: 'projects.editAll',
    label: 'Edit Any Content',
    description: 'Allows editing projects, publications, and products created by any team member.',
    category: 'Projects'
  },
  {
    key: 'projects.publish',
    label: 'Publish & Review Content',
    description: 'Allows publishing content directly and approving or requesting changes on pending submissions.',
    category: 'Projects'
  },
  {
    key: 'publications.manage',
    label: 'Manage Publications',
    description: 'Allows creating and updating research papers, monographs, whitepapers, and PDF publications.',
    category: 'Publications'
  },
  {
    key: 'products.manage',
    label: 'Manage Products',
    description: 'Allows creating and updating product listings, specifications, and releases.',
    category: 'Products'
  },
  {
    key: 'website.edit',
    label: 'Edit Live Website Copy',
    description: 'Allows opening the inline page editor, saving page text drafts, and publishing page copy.',
    category: 'Website'
  },
  {
    key: 'pages.manage',
    label: 'Manage Custom Pages',
    description: 'Allows creating, editing, publishing, and deleting custom public pages.',
    category: 'Website'
  },
  {
    key: 'navigation.manage',
    label: 'Manage Navigation & Footer',
    description: 'Allows adding, renaming, reordering, and removing navbar and footer links.',
    category: 'Website'
  },
  {
    key: 'seo.manage',
    label: 'Manage SEO & Redirects',
    description: 'Allows editing SEO defaults, sitemap and robots toggles, and URL redirect rules.',
    category: 'Website'
  },
  {
    key: 'media.upload',
    label: 'Upload Media Files',
    description: 'Allows uploading images, PDFs, audio, and video assets to the Media Library.',
    category: 'Media'
  },
  {
    key: 'media.manage',
    label: 'Manage All Media Assets',
    description: 'Allows editing, replacing, and deleting any asset in the Media Library.',
    category: 'Media'
  },
  {
    key: 'team.manage',
    label: 'Manage Team & Roles',
    description: 'Allows inviting team members, managing user accounts, and editing custom roles and permissions.',
    category: 'Team'
  },
  {
    key: 'inbox.view',
    label: 'View Contact Inbox',
    description: 'Allows reading, filtering, archiving, and deleting contact form submissions.',
    category: 'Inbox'
  },
  {
    key: 'settings.manage',
    label: 'Manage Organization Settings',
    description: 'Allows editing organization details, logos, maintenance mode, and security policy.',
    category: 'System'
  },
  {
    key: 'backups.manage',
    label: 'Manage Backups',
    description: 'Allows viewing, exporting, and importing database backups.',
    category: 'System'
  },
  {
    key: 'audit.view',
    label: 'View Audit & Health Logs',
    description: 'Allows viewing the activity log, security log, and site health diagnostics.',
    category: 'System'
  },
  {
    key: 'trash.manage',
    label: 'Manage Trash & Restore',
    description: 'Allows viewing deleted items, restoring items from trash, and emptying the trash.',
    category: 'System'
  }
];

export const PERMISSION_GROUPS: PermissionGroup[] = (
  [
    'Departments',
    'Projects',
    'Publications',
    'Products',
    'Website',
    'Media',
    'Team',
    'Inbox',
    'System'
  ] as PermissionCategory[]
).map(category => ({
  category,
  items: ALL_PERMISSIONS.filter(p => p.category === category)
}));

export const VALID_PERMISSION_KEYS = new Set<PermissionKey>(ALL_PERMISSIONS.map(p => p.key));

export const DEFAULT_ADMIN_PERMISSIONS: PermissionKey[] = ALL_PERMISSIONS.map(p => p.key);

export const DEFAULT_MEMBER_PERMISSIONS: PermissionKey[] = [
  'projects.create',
  'projects.editOwn',
  'publications.manage',
  'media.upload'
];

export interface RoleRecord {
  id: string;
  name: string;
  permissions: PermissionKey[];
  isSystem?: boolean;
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_ROLES: RoleRecord[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    permissions: [...DEFAULT_ADMIN_PERMISSIONS],
    isSystem: true,
    locked: true
  },
  {
    id: 'role-member',
    name: 'Member',
    permissions: [...DEFAULT_MEMBER_PERMISSIONS],
    isSystem: true,
    locked: false
  }
];

export interface PermissionSubject {
  role?: string;
  roleId?: string;
  permissions?: PermissionKey[];
  isFounder?: boolean;
  deactivated?: boolean;
}

export function normalizeRoleId(user: PermissionSubject | null | undefined, roles?: RoleRecord[]): string {
  if (!user) return 'role-member';
  if (user.roleId && (!roles || roles.some(r => r.id === user.roleId))) {
    return user.roleId;
  }
  const roleName = String(user.role || '').trim().toLowerCase();
  if (roles && roles.length > 0) {
    const byName = roles.find(r => r.name.toLowerCase() === roleName || r.id.toLowerCase() === roleName);
    if (byName) return byName.id;
  }
  if (['owner', 'admin'].includes(roleName)) return 'role-admin';
  return 'role-member';
}

export function resolvePermissions(
  user: PermissionSubject | null | undefined,
  roles: RoleRecord[] = DEFAULT_ROLES
): PermissionKey[] {
  if (!user || user.deactivated) return [];
  if (user.isFounder) return [...DEFAULT_ADMIN_PERMISSIONS];

  const roleId = normalizeRoleId(user, roles);
  const roleRecord = roles.find(r => r.id === roleId);
  if (roleRecord) {
    if (roleRecord.id === 'role-admin' || roleRecord.locked) {
      return [...DEFAULT_ADMIN_PERMISSIONS];
    }
    return roleRecord.permissions.filter(p => VALID_PERMISSION_KEYS.has(p));
  }

  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.filter(p => VALID_PERMISSION_KEYS.has(p));
  }

  const lowerRole = String(user.role || '').trim().toLowerCase();
  if (lowerRole === 'owner' || lowerRole === 'admin') {
    return [...DEFAULT_ADMIN_PERMISSIONS];
  }
  return [...DEFAULT_MEMBER_PERMISSIONS];
}

export function can(
  user: PermissionSubject | null | undefined,
  permission: PermissionKey,
  roles?: RoleRecord[]
): boolean {
  if (!user || user.deactivated) return false;
  if (user.isFounder) return true;
  if (!roles && Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }
  return resolvePermissions(user, roles).includes(permission);
}

export function hasPortalAccess(
  user: PermissionSubject | null | undefined,
  roles?: RoleRecord[]
): boolean {
  if (!user || user.deactivated) return false;
  if (user.isFounder) return true;
  return resolvePermissions(user, roles).length > 0;
}
