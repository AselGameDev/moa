import { can, hasPortalAccess, type PermissionKey, type PermissionSubject, type RoleRecord } from '../../shared/permissions';

export type MainTab = 'overview' | 'website' | 'content' | 'media' | 'team' | 'settings';

export type CreateActionType =
  | 'project'
  | 'publication'
  | 'product'
  | 'department'
  | 'page'
  | 'member';

export interface SubTabDefinition {
  id: string;
  label: string;
  anyOfPermissions?: PermissionKey[];
  allowAllPortalUsers?: boolean;
}

export interface MainTabDefinition {
  id: MainTab;
  label: string;
  anyOfPermissions?: PermissionKey[];
  allowAllPortalUsers?: boolean;
  subTabs: SubTabDefinition[];
}

export interface CreateActionDefinition {
  id: CreateActionType;
  label: string;
  description: string;
  anyOfPermissions: PermissionKey[];
  targetTab: MainTab;
  targetSubTab?: string;
}

export const PORTAL_NAV: MainTabDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    allowAllPortalUsers: true,
    subTabs: []
  },
  {
    id: 'website',
    label: 'Website',
    anyOfPermissions: ['website.edit', 'pages.manage', 'navigation.manage', 'seo.manage'],
    subTabs: [
      { id: 'pages', label: 'Pages', anyOfPermissions: ['pages.manage'] },
      { id: 'editor', label: 'Page Editor', anyOfPermissions: ['website.edit'] },
      { id: 'navigation', label: 'Navigation', anyOfPermissions: ['navigation.manage'] },
      { id: 'footer', label: 'Footer', anyOfPermissions: ['navigation.manage'] },
      { id: 'seo', label: 'SEO & Redirects', anyOfPermissions: ['seo.manage'] }
    ]
  },
  {
    id: 'content',
    label: 'Content',
    anyOfPermissions: [
      'departments.manage',
      'projects.create',
      'projects.editOwn',
      'projects.editAll',
      'projects.publish',
      'publications.manage',
      'products.manage'
    ],
    subTabs: [
      { id: 'departments', label: 'Departments', anyOfPermissions: ['departments.manage'] },
      {
        id: 'projects',
        label: 'Projects',
        anyOfPermissions: ['projects.create', 'projects.editOwn', 'projects.editAll', 'projects.publish']
      },
      { id: 'publications', label: 'Publications', anyOfPermissions: ['publications.manage', 'projects.publish'] },
      { id: 'products', label: 'Products', anyOfPermissions: ['products.manage', 'projects.publish'] }
    ]
  },
  {
    id: 'media',
    label: 'Media',
    anyOfPermissions: ['media.upload', 'media.manage'],
    subTabs: []
  },
  {
    id: 'team',
    label: 'Team',
    anyOfPermissions: ['team.manage'],
    subTabs: [
      { id: 'members', label: 'Members', anyOfPermissions: ['team.manage'] },
      { id: 'invitations', label: 'Invitations', anyOfPermissions: ['team.manage'] },
      { id: 'roles', label: 'Roles & Permissions', anyOfPermissions: ['team.manage'] }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    allowAllPortalUsers: true,
    subTabs: [
      { id: 'organization', label: 'Organization', anyOfPermissions: ['settings.manage'] },
      { id: 'security', label: 'Security & Auth', allowAllPortalUsers: true },
      { id: 'inbox', label: 'Inbox', anyOfPermissions: ['inbox.view'] },
      { id: 'audit', label: 'Audit Log', anyOfPermissions: ['audit.view'] },
      { id: 'health', label: 'Site Health', anyOfPermissions: ['audit.view'] },
      { id: 'backups', label: 'Backups', anyOfPermissions: ['backups.manage'] },
      { id: 'trash', label: 'Trash', anyOfPermissions: ['trash.manage'] }
    ]
  }
];

export const PORTAL_ACTIONS: CreateActionDefinition[] = [
  {
    id: 'project',
    label: 'New Project',
    description: 'R&D project or initiative',
    anyOfPermissions: ['projects.create'],
    targetTab: 'content',
    targetSubTab: 'projects'
  },
  {
    id: 'publication',
    label: 'New Publication',
    description: 'Paper, monograph, or whitepaper',
    anyOfPermissions: ['publications.manage', 'projects.create'],
    targetTab: 'content',
    targetSubTab: 'publications'
  },
  {
    id: 'product',
    label: 'New Product',
    description: 'Tool, software, or platform release',
    anyOfPermissions: ['products.manage', 'projects.publish'],
    targetTab: 'content',
    targetSubTab: 'products'
  },
  {
    id: 'department',
    label: 'New Department',
    description: 'Official discipline or unit',
    anyOfPermissions: ['departments.manage'],
    targetTab: 'content',
    targetSubTab: 'departments'
  },
  {
    id: 'page',
    label: 'New Custom Page',
    description: 'Landing, article, or resource',
    anyOfPermissions: ['pages.manage'],
    targetTab: 'website',
    targetSubTab: 'pages'
  },
  {
    id: 'member',
    label: 'Invite Team Member',
    description: 'Send secure invitation link',
    anyOfPermissions: ['team.manage'],
    targetTab: 'team',
    targetSubTab: 'members'
  }
];

export function canAccessItem(
  user: PermissionSubject | null | undefined,
  item: { anyOfPermissions?: PermissionKey[]; allowAllPortalUsers?: boolean },
  roles?: RoleRecord[]
): boolean {
  if (!hasPortalAccess(user, roles)) return false;
  if (item.allowAllPortalUsers) return true;
  if (!item.anyOfPermissions || item.anyOfPermissions.length === 0) return true;
  return item.anyOfPermissions.some(p => can(user, p, roles));
}

export function getVisibleMainTabs(
  user: PermissionSubject | null | undefined,
  roles?: RoleRecord[]
): MainTabDefinition[] {
  return PORTAL_NAV.filter(tab => canAccessItem(user, tab, roles));
}

export function getVisibleSubTabs(
  tabId: MainTab,
  user: PermissionSubject | null | undefined,
  roles?: RoleRecord[]
): SubTabDefinition[] {
  const found = PORTAL_NAV.find(t => t.id === tabId);
  if (!found) return [];
  return found.subTabs.filter(st => canAccessItem(user, st, roles));
}

export function getVisibleCreateActions(
  user: PermissionSubject | null | undefined,
  roles?: RoleRecord[]
): CreateActionDefinition[] {
  return PORTAL_ACTIONS.filter(a => canAccessItem(user, a, roles));
}
