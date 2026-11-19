import crypto from 'crypto';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  VALID_PERMISSION_KEYS,
  normalizeRoleId,
  resolvePermissions,
  type PermissionKey
} from '../../src/shared/permissions';
import { isSafeUrl, normalizeSlug } from '../../src/shared/url';
import { INITIAL_SITE_CONTENT } from '../../src/data/initialData';
import type {
  ActivityRecord,
  Department,
  FormSubmission,
  MediaAsset,
  PageRecord,
  Product,
  Project,
  Publication,
  RedirectRule,
  RoleDefinition,
  SecurityLogRecord,
  SiteContent,
  SiteSettings,
  TrashItemsResponse,
  UserInvitation
} from '../../src/types/index';
import type { DatabaseState, ServerSessionRecord, ServerUserRecord } from './schema';
import {
  DATA_DIR,
  UPLOADS_DIR,
  dbStore,
  purgeExpiredSessionsInDb,
  purgeExpiredTrashInDb
} from './store';
import { importMediaBlobsToSqlite, type MediaBlobRecord } from './sqliteDb';
import {
  collectUploadUrlsFromItems,
  deleteUploadFileIfUnused,
  getMediaReferences,
  isMediaInUse,
  purgeOrphanUploadUrls,
  replaceAllUrlReferences
} from '../utils/mediaUsage';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean);
}

export function sanitizeUserResponse(user: ServerUserRecord, db: DatabaseState) {
  const isProd = process.env.NODE_ENV === 'production';
  const allowDevExempt = !isProd || process.env.ENABLE_TEST_ACCOUNTS === 'true';
  const isExemptTest =
    Boolean(user.isTestAccount) ||
    (allowDevExempt && user.email.toLowerCase() === 'admin@mastersofall.org');
  const roleId = normalizeRoleId(user, db.roles);
  const roleObj = db.roles.find(r => r.id === roleId);
  const permissions = resolvePermissions({ ...user, roleId }, db.roles);
  const enforce2FA =
    !isExemptTest &&
    (isProd ||
      Boolean(db.settings?.securityPolicy?.enforce2FAForAdmins && roleId === 'role-admin'));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: roleObj?.name || user.role || 'Member',
    roleId,
    permissions,
    isFounder: Boolean(user.isFounder),
    isTestAccount: Boolean(user.isTestAccount),
    departmentScope: user.departmentScope || [],
    mustChangePassword: isExemptTest ? false : Boolean(user.mustChangePassword),
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    requires2FASetup: enforce2FA && !user.twoFactorEnabled,
    deactivated: Boolean(user.deactivated),
    createdAt: user.createdAt,
    lastSignIn: user.lastSignIn
  };
}

export function appendActivity(
  db: DatabaseState,
  user: { id: string; email: string },
  action: string,
  area: ActivityRecord['area'],
  target: string,
  details?: string
): void {
  db.activityLog.unshift({
    id: `act-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    userId: user.id,
    userEmail: user.email,
    action,
    area,
    target,
    details,
    timestamp: new Date().toISOString()
  });
  if (db.activityLog.length > 500) {
    db.activityLog = db.activityLog.slice(0, 500);
  }
}

export function appendSecurityLog(
  db: DatabaseState,
  event: string,
  ip: string,
  email?: string
): void {
  if (!Array.isArray(db.securityLog)) db.securityLog = [];
  db.securityLog.unshift({
    id: `sec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    event,
    email: email || '',
    ip,
    timestamp: new Date().toISOString()
  });
  if (db.securityLog.length > 200) {
    db.securityLog = db.securityLog.slice(0, 200);
  }
}

// ============================================================================
// REDIRECT LOOP & PATH VALIDATION HELPERS
// ============================================================================

export function normalizeRedirectPath(p: string): string {
  const trimmed = p.trim();
  if (!trimmed) return '/';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

export function wouldCreateRedirectLoop(
  redirects: RedirectRule[],
  candidateFrom: string,
  candidateTo: string,
  ignoreId?: string
): boolean {
  const normFrom = normalizeRedirectPath(candidateFrom).toLowerCase();
  const normTo = normalizeRedirectPath(candidateTo).toLowerCase();
  if (normFrom === normTo) return true;

  const map = new Map<string, string>();
  for (const r of redirects) {
    if (ignoreId && r.id === ignoreId) continue;
    map.set(normalizeRedirectPath(r.from).toLowerCase(), normalizeRedirectPath(r.to).toLowerCase());
  }
  map.set(normFrom, normTo);

  // Follow chain from normFrom; detect cycles
  const visited = new Set<string>([normFrom]);
  let curr: string | undefined = normTo;
  let hops = 0;
  while (curr && hops < 50) {
    if (visited.has(curr)) return true;
    visited.add(curr);
    curr = map.get(curr);
    hops += 1;
  }
  return false;
}

export function addAutoRedirect(db: DatabaseState, fromPath: string, toPath: string): void {
  const normFrom = normalizeRedirectPath(fromPath);
  const normTo = normalizeRedirectPath(toPath);
  if (normFrom.toLowerCase() === normTo.toLowerCase()) return;
  if (!db.settings.redirects) db.settings.redirects = [];
  // Remove any existing rule from same source or pointing back from target that would loop
  db.settings.redirects = db.settings.redirects.filter(
    r => normalizeRedirectPath(r.from).toLowerCase() !== normFrom.toLowerCase()
  );
  if (wouldCreateRedirectLoop(db.settings.redirects, normFrom, normTo)) return;
  db.settings.redirects.unshift({
    id: `red-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    from: normFrom,
    to: normTo,
    type: '301',
    createdAt: new Date().toISOString(),
    hits: 0
  });
}

// ============================================================================
// SCHEDULED PUBLISHING & REFERENTIAL INTEGRITY
// ============================================================================

export async function processScheduledPublications(): Promise<number> {
  const nowMs = Date.now();
  const db = dbStore.read();

  const needsPublish = (item: { publicationStatus?: string; scheduledPublishDate?: string; deletedAt?: string }) => {
    if (item.deletedAt) return false;
    if (!item.scheduledPublishDate) return false;
    if (item.publicationStatus === 'Published' || item.publicationStatus === 'Archived') return false;
    const targetMs = Date.parse(item.scheduledPublishDate);
    return Number.isFinite(targetMs) && targetMs <= nowMs;
  };

  const pageNeedsPublish = (pg: PageRecord) => {
    if (pg.deletedAt) return false;
    if (!pg.scheduledPublishDate) return false;
    if (pg.status === 'Published') return false;
    const targetMs = Date.parse(pg.scheduledPublishDate);
    return Number.isFinite(targetMs) && targetMs <= nowMs;
  };

  const hasPending =
    db.projects.some(needsPublish) ||
    db.publications.some(needsPublish) ||
    db.products.some(needsPublish) ||
    db.pages.some(pageNeedsPublish);

  if (!hasPending) return 0;

  return dbStore.write(
    state => {
      let count = 0;
      const nowIso = new Date().toISOString();

      for (const p of state.projects) {
        if (needsPublish(p)) {
          p.publicationStatus = 'Published';
          p.publishedAt = p.publishedAt || nowIso;
          p.scheduledPublishDate = '';
          p.updatedAt = nowIso;
          appendActivity(state, { id: 'system', email: 'system@mastersofall.org' }, `Auto-published scheduled project: ${p.title}`, 'Projects', p.title);
          count++;
        }
      }
      for (const pub of state.publications) {
        if (needsPublish(pub)) {
          pub.publicationStatus = 'Published';
          pub.publishedAt = pub.publishedAt || nowIso;
          pub.scheduledPublishDate = '';
          pub.updatedAt = nowIso;
          appendActivity(state, { id: 'system', email: 'system@mastersofall.org' }, `Auto-published scheduled publication: ${pub.title}`, 'Publications', pub.title);
          count++;
        }
      }
      for (const prod of state.products) {
        if (needsPublish(prod)) {
          prod.publicationStatus = 'Published';
          prod.publishedAt = prod.publishedAt || nowIso;
          prod.scheduledPublishDate = '';
          prod.updatedAt = nowIso;
          appendActivity(state, { id: 'system', email: 'system@mastersofall.org' }, `Auto-published scheduled product: ${prod.name}`, 'Products', prod.name);
          count++;
        }
      }
      for (const pg of state.pages) {
        if (pageNeedsPublish(pg)) {
          pg.status = 'Published';
          pg.scheduledPublishDate = '';
          pg.updatedAt = nowIso;
          appendActivity(state, { id: 'system', email: 'system@mastersofall.org' }, `Auto-published scheduled page: ${pg.title}`, 'Website', pg.title);
          count++;
        }
      }
      return count;
    },
    { bumpContentVersion: true }
  );
}

function cleanupProjectReferences(db: DatabaseState, projectId: string): void {
  for (const p of db.projects) {
    if (Array.isArray(p.relatedProjectIds)) {
      p.relatedProjectIds = p.relatedProjectIds.filter(id => id !== projectId);
    }
  }
  for (const pub of db.publications) {
    if (pub.relatedProjectId === projectId) {
      pub.relatedProjectId = '';
    }
  }
  for (const prod of db.products) {
    if (Array.isArray(prod.relatedProjectIds)) {
      prod.relatedProjectIds = prod.relatedProjectIds.filter(id => id !== projectId);
    }
  }
}

// ============================================================================
// REPOSITORIES
// ============================================================================

export const rolesRepo = {
  list(): RoleDefinition[] {
    return dbStore.read().roles;
  },
  getById(id: string): RoleDefinition | undefined {
    return dbStore.read().roles.find(r => r.id === id);
  },
  async create(name: string, permissions: PermissionKey[], actor: { id: string; email: string }): Promise<RoleDefinition> {
    const cleanName = name.trim().slice(0, 60);
    if (!cleanName) throw new Error('Role name is required.');
    const cleanPerms = Array.from(new Set(permissions.filter(p => VALID_PERMISSION_KEYS.has(p))));
    return dbStore.write(db => {
      if (db.roles.some(r => r.name.toLowerCase() === cleanName.toLowerCase())) {
        throw new Error('A role with this name already exists.');
      }
      const nowIso = new Date().toISOString();
      const role: RoleDefinition = {
        id: `role-${normalizeSlug(cleanName, 'custom')}-${crypto.randomBytes(2).toString('hex')}`,
        name: cleanName,
        permissions: cleanPerms,
        isSystem: false,
        locked: false,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      db.roles.push(role);
      appendActivity(db, actor, `Created role: ${role.name}`, 'Team', role.name);
      return role;
    });
  },
  async update(
    id: string,
    patch: { name?: string; permissions?: PermissionKey[] },
    actor: { id: string; email: string }
  ): Promise<RoleDefinition> {
    return dbStore.write(db => {
      const role = db.roles.find(r => r.id === id);
      if (!role) throw new Error('Role not found.');
      if (role.locked || role.id === 'role-admin') {
        throw new Error('The Admin role is locked and always holds full permissions.');
      }
      if (typeof patch.name === 'string' && patch.name.trim()) {
        const nextName = patch.name.trim().slice(0, 60);
        if (db.roles.some(r => r.id !== id && r.name.toLowerCase() === nextName.toLowerCase())) {
          throw new Error('Another role already uses this name.');
        }
        role.name = nextName;
        // Keep denormalized user.role & invitation.role labels synced
        for (const u of db.users) {
          if (u.roleId === role.id) u.role = nextName;
        }
        for (const inv of db.invitations) {
          if (inv.roleId === role.id) inv.role = nextName;
        }
      }
      if (Array.isArray(patch.permissions)) {
        role.permissions = Array.from(new Set(patch.permissions.filter(p => VALID_PERMISSION_KEYS.has(p))));
      }
      role.updatedAt = new Date().toISOString();
      appendActivity(db, actor, `Updated role permissions: ${role.name}`, 'Team', role.name);
      return role;
    });
  },
  async remove(id: string, actor: { id: string; email: string }): Promise<void> {
    return dbStore.write(db => {
      const idx = db.roles.findIndex(r => r.id === id);
      if (idx < 0) throw new Error('Role not found.');
      const role = db.roles[idx];
      if (role.isSystem || role.locked) {
        throw new Error('System roles (Admin / Member) cannot be deleted.');
      }
      const assignedUsers = db.users.filter(u => normalizeRoleId(u, db.roles) === id).length;
      if (assignedUsers > 0) {
        throw new Error(`Cannot delete role "${role.name}" while ${assignedUsers} team member(s) are assigned to it.`);
      }
      const pendingInvites = db.invitations.filter(i => i.status === 'pending' && i.roleId === id).length;
      if (pendingInvites > 0) {
        throw new Error(`Cannot delete role "${role.name}" while pending invitations reference it.`);
      }
      db.roles.splice(idx, 1);
      appendActivity(db, actor, `Deleted role: ${role.name}`, 'Team', role.name);
    });
  }
};

export const usersRepo = {
  list(): ServerUserRecord[] {
    return dbStore.read().users;
  },
  getById(id: string): ServerUserRecord | undefined {
    return dbStore.read().users.find(u => u.id === id);
  },
  getByEmail(email: string): ServerUserRecord | undefined {
    const clean = email.trim().toLowerCase();
    return dbStore.read().users.find(u => u.email.toLowerCase() === clean);
  },
  countActiveAdmins(db: DatabaseState): number {
    return db.users.filter(u => {
      if (u.deactivated) return false;
      const perms = resolvePermissions(u, db.roles);
      return perms.includes('team.manage') || normalizeRoleId(u, db.roles) === 'role-admin';
    }).length;
  },
  write: dbStore.write.bind(dbStore)
};

export const sessionsRepo = {
  findByToken(token: string): ServerSessionRecord | undefined {
    return dbStore.read().sessions.find(s => s.token === token);
  },
  purgeExpired(): Promise<boolean> {
    return dbStore.write(db => purgeExpiredSessionsInDb(db));
  },
  touch(session: ServerSessionRecord): void {
    session.lastActivity = Date.now();
    dbStore.markSessionActivityDirty();
  },
  async create(session: ServerSessionRecord): Promise<void> {
    return dbStore.write(db => {
      purgeExpiredSessionsInDb(db);
      db.sessions.push(session);
    });
  },
  async removeByToken(token: string): Promise<void> {
    return dbStore.write(db => {
      db.sessions = db.sessions.filter(s => s.token !== token);
    });
  },
  async removeForUser(userId: string, exceptToken?: string): Promise<void> {
    return dbStore.write(db => {
      db.sessions = db.sessions.filter(s => s.userId !== userId || (exceptToken && s.token === exceptToken));
    });
  }
};

function sortDepartmentsCanonical(items: Department[]): Department[] {
  return [...items].sort((a, b) => {
    const aKind = a.kind === 'sector' ? 1 : 0;
    const bKind = b.kind === 'sector' ? 1 : 0;
    if (aKind !== bKind) return aKind - bKind;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
}

export const departmentsRepo = {
  listPublished(): Department[] {
    return sortDepartmentsCanonical(
      dbStore.read().departments.filter(d => d.published && !d.deletedAt)
    );
  },
  listAll(): Department[] {
    return sortDepartmentsCanonical(dbStore.read().departments);
  },
  getById(id: string): Department | undefined {
    return dbStore.read().departments.find(d => d.id === id);
  },
  getBySlugPublished(slug: string): Department | undefined {
    const clean = slug.toLowerCase();
    return dbStore.read().departments.find(d => d.published && !d.deletedAt && d.slug.toLowerCase() === clean);
  },
  async create(data: Partial<Department>, actor: { id: string; email: string }): Promise<Department> {
    return dbStore.write(
      db => {
        const name = typeof data.name === 'string' ? data.name.trim() : '';
        if (!name) throw new Error('Name is required');
        const kind: 'department' | 'sector' = data.kind === 'sector' ? 'sector' : 'department';
        const slug = normalizeSlug(typeof data.slug === 'string' && data.slug.trim() ? data.slug : name, kind === 'sector' ? 'sector' : 'dept');
        if (db.departments.some(d => !d.deletedAt && d.slug.toLowerCase() === slug)) {
          throw new Error('An active department or sector with this slug already exists');
        }
        let parentDepartmentId = typeof data.parentDepartmentId === 'string' ? data.parentDepartmentId : undefined;
        if (kind === 'sector' && !parentDepartmentId) {
          const rdd = db.departments.find(d => !d.deletedAt && (d.isRdd || d.id === 'dept-rdd'));
          parentDepartmentId = rdd?.id || 'dept-rdd';
        }
        const sameKind = db.departments.filter(d => (d.kind === 'sector' ? 'sector' : 'department') === kind);
        const maxOrder = sameKind.reduce((max, d) => Math.max(max, d.displayOrder || 0), 0);
        const nowIso = new Date().toISOString();
        const dept: Department = {
          id: `${kind === 'sector' ? 'sec' : 'dept'}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
          name,
          shortName: name,
          slug,
          kind,
          parentDepartmentId: kind === 'sector' ? parentDepartmentId : undefined,
          isRdd: false,
          tagline: typeof data.tagline === 'string' ? data.tagline : '',
          iconGlyph: data.iconGlyph || 'custom',
          iconUrl: isSafeUrl(data.iconUrl) ? data.iconUrl : '',
          colorHex: typeof data.colorHex === 'string' ? data.colorHex : '#25CDB6',
          iconBgHex: typeof data.iconBgHex === 'string' ? data.iconBgHex : '#06302F',
          customLogoUrl: isSafeUrl(data.customLogoUrl) ? data.customLogoUrl : '',
          heroImage: isSafeUrl(data.heroImage) ? data.heroImage : '',
          introduction: typeof data.introduction === 'string' ? data.introduction : '',
          purpose: typeof data.purpose === 'string' ? data.purpose : '',
          mission: typeof data.mission === 'string' ? data.mission : '',
          areasOfFocus: sanitizeStringArray(data.areasOfFocus),
          structuredAreasOfFocus: Array.isArray(data.structuredAreasOfFocus) ? data.structuredAreasOfFocus : undefined,
          initiatives: sanitizeStringArray(data.initiatives),
          structuredInitiatives: Array.isArray(data.structuredInitiatives) ? data.structuredInitiatives : undefined,
          galleryImages: sanitizeStringArray(data.galleryImages).filter(u => isSafeUrl(u)),
          template: data.template,
          published: data.published !== false,
          showInTree: data.showInTree !== false,
          displayOrder: maxOrder + 1,
          seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : '',
          seoDescription: typeof data.seoDescription === 'string' ? data.seoDescription : '',
          seoShareImage: isSafeUrl(data.seoShareImage) ? data.seoShareImage : '',
          createdAt: nowIso,
          updatedAt: nowIso
        };
        db.departments.push(dept);
        appendActivity(db, actor, `Created ${kind}: ${dept.name}`, 'Departments', dept.name);
        return dept;
      },
      { bumpContentVersion: true }
    );
  },
  async update(id: string, body: Partial<Department>, actor: { id: string; email: string }): Promise<Department> {
    return dbStore.write(
      db => {
        const idx = db.departments.findIndex(d => d.id === id);
        if (idx < 0) throw new Error('Department not found');
        const existing = db.departments[idx];
        const oldSlug = existing.slug;
        const kind: 'department' | 'sector' = existing.isRdd
          ? 'department'
          : body.kind === 'sector' || body.kind === 'department'
          ? body.kind
          : existing.kind === 'sector'
          ? 'sector'
          : 'department';
        const newSlug =
          typeof body.slug === 'string' && body.slug.trim() ? normalizeSlug(body.slug, kind === 'sector' ? 'sector' : 'dept') : oldSlug;
        if (
          newSlug !== oldSlug &&
          db.departments.some(d => d.id !== existing.id && !d.deletedAt && d.slug.toLowerCase() === newSlug)
        ) {
          throw new Error('Another active department or sector already uses this slug');
        }
        const nextParentId =
          kind === 'sector'
            ? (typeof body.parentDepartmentId === 'string' && body.parentDepartmentId.trim()
                ? body.parentDepartmentId.trim()
                : existing.parentDepartmentId || 'dept-rdd')
            : undefined;
        if (newSlug !== oldSlug) {
          const oldParent = existing.parentDepartmentId
            ? db.departments.find(d => d.id === existing.parentDepartmentId)
            : undefined;
          const newParent = nextParentId
            ? db.departments.find(d => d.id === nextParentId)
            : undefined;
          const oldPrefix = kind === 'sector' ? `/departments/${oldParent?.slug || 'rdd'}/` : '/departments/';
          const newPrefix = kind === 'sector' ? `/departments/${newParent?.slug || 'rdd'}/` : '/departments/';
          addAutoRedirect(db, `${oldPrefix}${oldSlug}`, `${newPrefix}${newSlug}`);
          if (kind === 'sector') {
            addAutoRedirect(db, `/sectors/${oldSlug}`, `${newPrefix}${newSlug}`);
          }
        }
        const nextName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name;
        const updated: Department = {
          ...existing,
          name: nextName,
          shortName: nextName,
          slug: newSlug,
          kind,
          parentDepartmentId: nextParentId,
          isRdd: existing.isRdd || existing.id === 'dept-rdd',
          tagline: typeof body.tagline === 'string' ? body.tagline : existing.tagline,
          iconGlyph: body.iconGlyph ?? existing.iconGlyph,
          iconUrl: body.iconUrl !== undefined ? (body.iconUrl === '' ? '' : isSafeUrl(body.iconUrl) ? body.iconUrl : existing.iconUrl) : existing.iconUrl,
          colorHex: typeof body.colorHex === 'string' ? body.colorHex : existing.colorHex,
          iconBgHex: typeof body.iconBgHex === 'string' ? body.iconBgHex : existing.iconBgHex,
          customLogoUrl:
            body.customLogoUrl !== undefined
              ? (body.customLogoUrl === '' ? '' : isSafeUrl(body.customLogoUrl) ? body.customLogoUrl : existing.customLogoUrl)
              : existing.customLogoUrl,
          heroImage:
            body.heroImage !== undefined
              ? (body.heroImage === '' ? '' : isSafeUrl(body.heroImage) ? body.heroImage : existing.heroImage)
              : existing.heroImage,
          introduction: typeof body.introduction === 'string' ? body.introduction : existing.introduction,
          purpose: typeof body.purpose === 'string' ? body.purpose : existing.purpose,
          mission: typeof body.mission === 'string' ? body.mission : existing.mission,
          areasOfFocus: body.areasOfFocus !== undefined ? sanitizeStringArray(body.areasOfFocus) : existing.areasOfFocus,
          structuredAreasOfFocus: Array.isArray(body.structuredAreasOfFocus)
            ? body.structuredAreasOfFocus
            : existing.structuredAreasOfFocus,
          initiatives: body.initiatives !== undefined ? sanitizeStringArray(body.initiatives) : existing.initiatives,
          structuredInitiatives: Array.isArray(body.structuredInitiatives)
            ? body.structuredInitiatives
            : existing.structuredInitiatives,
          teamLeadIds: body.teamLeadIds !== undefined ? sanitizeStringArray(body.teamLeadIds) : existing.teamLeadIds,
          galleryImages:
            body.galleryImages !== undefined
              ? sanitizeStringArray(body.galleryImages).filter(u => isSafeUrl(u))
              : existing.galleryImages,
          template:
            body.template && ['Standard', 'Research-heavy', 'Media-heavy', 'Programmes-heavy'].includes(body.template)
              ? body.template
              : existing.template,
          published: typeof body.published === 'boolean' ? body.published : existing.published,
          archived: typeof body.archived === 'boolean' ? body.archived : existing.archived,
          showInTree: typeof body.showInTree === 'boolean' ? body.showInTree : existing.showInTree,
          displayOrder: typeof body.displayOrder === 'number' ? body.displayOrder : existing.displayOrder,
          seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle : existing.seoTitle,
          seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription : existing.seoDescription,
          seoShareImage:
            body.seoShareImage !== undefined
              ? (body.seoShareImage === '' ? '' : isSafeUrl(body.seoShareImage) ? body.seoShareImage : existing.seoShareImage)
              : existing.seoShareImage,
          updatedAt: new Date().toISOString()
        };
        db.departments[idx] = updated;
        if ((updated.isRdd || updated.id === 'dept-rdd') && body.customLogoUrl !== undefined) {
          db.settings.rddLogoUrl = updated.customLogoUrl || '';
        }
        appendActivity(db, actor, `Updated ${kind}: ${updated.name}`, 'Departments', updated.name);
        return updated;
      },
      { bumpContentVersion: true }
    );
  },
  async reorder(orderedIds: string[], actor: { id: string; email: string }): Promise<void> {
    return dbStore.write(
      db => {
        let deptSeq = 1;
        let sectorSeq = 1;
        orderedIds.forEach((id) => {
          const dept = db.departments.find(d => d.id === id);
          if (!dept) return;
          if (dept.kind === 'sector') {
            dept.displayOrder = sectorSeq++;
          } else {
            dept.displayOrder = deptSeq++;
          }
        });
        appendActivity(db, actor, 'Reordered organization hierarchy', 'Departments', 'Organization Tree');
      },
      { bumpContentVersion: true }
    );
  },
  async softDelete(
    id: string,
    opts: { projectHandling?: string; targetDeptId?: string },
    actor: { id: string; email: string }
  ): Promise<void> {
    return dbStore.write(
      db => {
        const dept = db.departments.find(d => d.id === id);
        if (!dept) throw new Error('Department not found');

        const { projectHandling, targetDeptId } = opts;
        if (projectHandling === 'reassign' && typeof targetDeptId === 'string') {
          const validTarget = db.departments.find(d => d.id === targetDeptId && !d.deletedAt && d.id !== dept.id);
          if (!validTarget) {
            throw new Error('Reassignment target department does not exist or is in Trash.');
          }
          const swapRef = (ids?: string[]) => {
            if (!ids || !ids.includes(dept.id)) return ids || [];
            const next = ids.filter(x => x !== dept.id);
            if (!next.includes(targetDeptId)) next.push(targetDeptId);
            return next;
          };
          db.projects.forEach(p => {
            p.departmentIds = swapRef(p.departmentIds);
            p.sectorIds = swapRef(p.sectorIds);
            if (p.primaryDepartmentId === dept.id) p.primaryDepartmentId = targetDeptId;
          });
          db.publications.forEach(pub => {
            pub.departmentIds = swapRef(pub.departmentIds);
            pub.sectorIds = swapRef(pub.sectorIds);
          });
          db.products.forEach(prod => {
            prod.departmentIds = swapRef(prod.departmentIds);
            prod.sectorIds = swapRef(prod.sectorIds);
          });
        } else {
          db.projects.forEach(p => {
            p.departmentIds = (p.departmentIds || []).filter(x => x !== dept.id);
            p.sectorIds = (p.sectorIds || []).filter(x => x !== dept.id);
            if (p.primaryDepartmentId === dept.id) p.primaryDepartmentId = undefined;
          });
          db.publications.forEach(pub => {
            pub.departmentIds = (pub.departmentIds || []).filter(x => x !== dept.id);
            pub.sectorIds = (pub.sectorIds || []).filter(x => x !== dept.id);
          });
          db.products.forEach(prod => {
            prod.departmentIds = (prod.departmentIds || []).filter(x => x !== dept.id);
            prod.sectorIds = (prod.sectorIds || []).filter(x => x !== dept.id);
          });
        }

        for (const u of db.users) {
          if (Array.isArray(u.departmentScope)) {
            u.departmentScope = u.departmentScope.filter(x => x !== dept.id);
          }
        }

        dept.deletedAt = new Date().toISOString();
        dept.published = false;

        if (dept.kind !== 'sector') {
          const childSectors = db.departments.filter(
            d => d.kind === 'sector' && !d.deletedAt && (d.parentDepartmentId || 'dept-rdd') === dept.id
          );
          if (projectHandling === 'reassign' && typeof targetDeptId === 'string') {
            const validTarget = db.departments.find(
              d => d.id === targetDeptId && !d.deletedAt && d.kind !== 'sector' && d.id !== dept.id
            );
            if (validTarget) {
              childSectors.forEach(cs => {
                cs.parentDepartmentId = validTarget.id;
                cs.updatedAt = dept.deletedAt!;
              });
            } else {
              childSectors.forEach(cs => {
                cs.deletedAt = dept.deletedAt;
                cs.published = false;
              });
            }
          } else {
            childSectors.forEach(cs => {
              cs.deletedAt = dept.deletedAt;
              cs.published = false;
            });
          }
        }

        appendActivity(
          db,
          actor,
          `Moved department to Trash: ${dept.name}`,
          'Departments',
          dept.name,
          projectHandling === 'reassign' ? `Items reassigned to ${targetDeptId}` : 'Items left untagged'
        );
      },
      { bumpContentVersion: true }
    );
  }
};

export const projectsRepo = {
  listPublished(): Project[] {
    return dbStore.read().projects.filter(p => p.publicationStatus === 'Published' && !p.deletedAt);
  },
  listForPortal(canEditAll: boolean, userId: string): Project[] {
    const active = dbStore.read().projects.filter(p => !p.deletedAt);
    if (canEditAll) return active;
    return active.filter(p => p.authorId === userId || p.publicationStatus === 'Published');
  },
  getById(id: string): Project | undefined {
    return dbStore.read().projects.find(p => p.id === id);
  },
  writeWithBump: <T>(fn: (db: DatabaseState) => T) => dbStore.write(fn, { bumpContentVersion: true }),
  cleanupReferences: cleanupProjectReferences
};

export const publicationsRepo = {
  listPublished(): Publication[] {
    return dbStore.read().publications.filter(p => p.publicationStatus === 'Published' && !p.deletedAt);
  },
  listForPortal(canEditAll: boolean, userId: string): Publication[] {
    const active = dbStore.read().publications.filter(p => !p.deletedAt);
    if (canEditAll) return active;
    return active.filter(p => p.authorId === userId || p.publicationStatus === 'Published');
  },
  getById(id: string): Publication | undefined {
    return dbStore.read().publications.find(p => p.id === id);
  },
  writeWithBump: <T>(fn: (db: DatabaseState) => T) => dbStore.write(fn, { bumpContentVersion: true })
};

export const productsRepo = {
  listPublished(): Product[] {
    return dbStore.read().products.filter(p => p.publicationStatus === 'Published' && !p.deletedAt);
  },
  listForPortal(canEditAll: boolean, userId: string): Product[] {
    const active = dbStore.read().products.filter(p => !p.deletedAt);
    if (canEditAll) return active;
    return active.filter(p => p.authorId === userId || p.publicationStatus === 'Published');
  },
  getById(id: string): Product | undefined {
    return dbStore.read().products.find(p => p.id === id);
  },
  writeWithBump: <T>(fn: (db: DatabaseState) => T) => dbStore.write(fn, { bumpContentVersion: true })
};

export const mediaRepo = {
  listWithUsage(): MediaAsset[] {
    const db = dbStore.read();
    return db.media.map(m => ({
      ...m,
      usedInCount: getMediaReferences(db, m.url).length
    }));
  },
  getById(id: string): MediaAsset | undefined {
    return dbStore.read().media.find(m => m.id === id);
  },
  getReferences(url: string): string[] {
    return getMediaReferences(dbStore.read(), url);
  },
  isInUse(url: string): boolean {
    return isMediaInUse(dbStore.read(), url);
  },
  replaceReferences(db: DatabaseState, oldUrl: string, newUrl: string): void {
    replaceAllUrlReferences(db, oldUrl, newUrl);
  },
  deleteUploadIfUnused(db: DatabaseState, url?: string): void {
    deleteUploadFileIfUnused(db, UPLOADS_DIR, url, DATA_DIR);
  },
  write: dbStore.write.bind(dbStore)
};

export const pagesRepo = {
  listPublic(): PageRecord[] {
    return (dbStore.read().pages || []).filter(p => p.status === 'Published' && !p.deletedAt);
  },
  listAllNonDeleted(): PageRecord[] {
    return (dbStore.read().pages || []).filter(p => !p.deletedAt);
  },
  writeWithBump: <T>(fn: (db: DatabaseState) => T) => dbStore.write(fn, { bumpContentVersion: true })
};

export const submissionsRepo = {
  listAll(): FormSubmission[] {
    return dbStore.read().submissions || [];
  },
  write: dbStore.write.bind(dbStore)
};

export const invitationsRepo = {
  listAll(): UserInvitation[] {
    return dbStore.read().invitations || [];
  },
  write: dbStore.write.bind(dbStore)
};

export const settingsRepo = {
  get(): SiteSettings {
    return dbStore.read().settings;
  },
  writeWithBump: <T>(fn: (db: DatabaseState) => T) => dbStore.write(fn, { bumpContentVersion: true })
};

export function mergeSiteContentPatch(current: SiteContent, patch: unknown): SiteContent {
  if (!patch || typeof patch !== 'object') return current;
  const src = patch as Record<string, unknown>;

  const mergeSection = <T extends object>(curSec: T, defSec: T, rawSec: unknown): T => {
    if (!rawSec || typeof rawSec !== 'object' || Array.isArray(rawSec)) return curSec;
    const raw = rawSec as Record<string, unknown>;
    const next: Record<string, unknown> = { ...(curSec as Record<string, unknown>) };
    for (const key of Object.keys(defSec)) {
      const defVal = (defSec as Record<string, unknown>)[key];
      const val = raw[key];
      if (val === undefined) continue;
      if (typeof defVal === 'string' && typeof val === 'string') {
        next[key] = val;
      } else if (Array.isArray(defVal) && Array.isArray(val)) {
        next[key] = val;
      }
    }
    return next as T;
  };

  return {
    home: mergeSection(current.home, INITIAL_SITE_CONTENT.home, src.home),
    about: mergeSection(current.about, INITIAL_SITE_CONTENT.about, src.about),
    departments: mergeSection(current.departments, INITIAL_SITE_CONTENT.departments, src.departments),
    work: mergeSection(current.work, INITIAL_SITE_CONTENT.work, src.work),
    contact: mergeSection(current.contact, INITIAL_SITE_CONTENT.contact, src.contact),
    products:
      INITIAL_SITE_CONTENT.products
        ? mergeSection(current.products || INITIAL_SITE_CONTENT.products, INITIAL_SITE_CONTENT.products, src.products)
        : current.products,
    detailFallback:
      INITIAL_SITE_CONTENT.detailFallback
        ? mergeSection(
            current.detailFallback || INITIAL_SITE_CONTENT.detailFallback,
            INITIAL_SITE_CONTENT.detailFallback,
            src.detailFallback
          )
        : current.detailFallback,
    footer: mergeSection(current.footer, INITIAL_SITE_CONTENT.footer, src.footer),
    notFound: mergeSection(current.notFound, INITIAL_SITE_CONTENT.notFound, src.notFound)
  };
}

export const pageContentRepo = {
  get(): SiteContent {
    return dbStore.read().pageContent;
  },
  getDraft() {
    const db = dbStore.read();
    return { draft: db.draftContent || null, isDraft: Boolean(db.draftContent) };
  },
  getHistory() {
    return dbStore.read().contentHistory || [];
  },
  writeWithBump: <T>(fn: (db: DatabaseState) => T) => dbStore.write(fn, { bumpContentVersion: true }),
  write: dbStore.write.bind(dbStore)
};

export const activityRepo = {
  list(limit?: number): ActivityRecord[] {
    const all = dbStore.read().activityLog || [];
    return limit && limit > 0 ? all.slice(0, limit) : all;
  }
};

export const securityLogRepo = {
  list(limit?: number): SecurityLogRecord[] {
    const all = dbStore.read().securityLog || [];
    return limit && limit > 0 ? all.slice(0, limit) : all;
  }
};

export const trashRepo = {
  list(): TrashItemsResponse {
    const db = dbStore.read();
    return {
      departments: (db.departments || []).filter(d => Boolean(d.deletedAt)),
      projects: (db.projects || []).filter(p => Boolean(p.deletedAt)),
      publications: (db.publications || []).filter(p => Boolean(p.deletedAt)),
      products: (db.products || []).filter(p => Boolean(p.deletedAt)),
      pages: (db.pages || []).filter(pg => Boolean(pg.deletedAt))
    };
  },
  async restore(type: string, id: string, actor: { id: string; email: string }): Promise<void> {
    return dbStore.write(
      db => {
        let label = id;
        if (type === 'department') {
          const dept = db.departments.find(d => d.id === id && Boolean(d.deletedAt));
          if (!dept) throw new Error('Department not found in trash');
          if (db.departments.some(d => d.id !== dept.id && !d.deletedAt && d.slug.toLowerCase() === dept.slug.toLowerCase())) {
            dept.slug = `${dept.slug}-${Date.now().toString().slice(-4)}`;
          }
          delete dept.deletedAt;
          dept.published = true;
          label = dept.name;
        } else if (type === 'project') {
          const proj = db.projects.find(p => p.id === id && Boolean(p.deletedAt));
          if (!proj) throw new Error('Project not found in trash');
          if (db.projects.some(p => p.id !== proj.id && !p.deletedAt && p.slug.toLowerCase() === proj.slug.toLowerCase())) {
            proj.slug = `${proj.slug}-${Date.now().toString().slice(-4)}`;
          }
          delete proj.deletedAt;
          proj.publicationStatus = 'Draft';
          label = proj.title;
        } else if (type === 'publication') {
          const pub = db.publications.find(p => p.id === id && Boolean(p.deletedAt));
          if (!pub) throw new Error('Publication not found in trash');
          if (db.publications.some(p => p.id !== pub.id && !p.deletedAt && p.slug.toLowerCase() === pub.slug.toLowerCase())) {
            pub.slug = `${pub.slug}-${Date.now().toString().slice(-4)}`;
          }
          delete pub.deletedAt;
          pub.publicationStatus = 'Draft';
          label = pub.title;
        } else if (type === 'product') {
          const prod = db.products.find(p => p.id === id && Boolean(p.deletedAt));
          if (!prod) throw new Error('Product not found in trash');
          if (db.products.some(p => p.id !== prod.id && !p.deletedAt && p.slug.toLowerCase() === prod.slug.toLowerCase())) {
            prod.slug = `${prod.slug}-${Date.now().toString().slice(-4)}`;
          }
          delete prod.deletedAt;
          prod.publicationStatus = 'Draft';
          label = prod.name;
        } else if (type === 'page') {
          const pg = db.pages.find(p => p.id === id && Boolean(p.deletedAt));
          if (!pg) throw new Error('Page not found in trash');
          if (db.pages.some(p => p.id !== pg.id && !p.deletedAt && p.slug.toLowerCase() === pg.slug.toLowerCase())) {
            pg.slug = `${pg.slug}-${Date.now().toString().slice(-4)}`;
          }
          delete pg.deletedAt;
          pg.status = 'Draft';
          label = pg.title;
        } else {
          throw new Error('Invalid trash item type');
        }
        appendActivity(db, actor, `Restored ${type} from Trash: ${label}`, 'Settings', label);
      },
      { bumpContentVersion: true }
    );
  },
  async deletePermanently(type: string, id: string, actor: { id: string; email: string }): Promise<void> {
    return dbStore.write(
      db => {
        let removedItem: unknown = null;
        let label = id;
        if (type === 'department') {
          const item = db.departments.find(d => d.id === id && Boolean(d.deletedAt));
          if (!item) throw new Error('Department not found in trash');
          removedItem = item;
          label = item.name;
          db.departments = db.departments.filter(d => d.id !== id);
        } else if (type === 'project') {
          const item = db.projects.find(p => p.id === id && Boolean(p.deletedAt));
          if (!item) throw new Error('Project not found in trash');
          removedItem = item;
          label = item.title;
          db.projects = db.projects.filter(p => p.id !== id);
          cleanupProjectReferences(db, id);
        } else if (type === 'publication') {
          const item = db.publications.find(p => p.id === id && Boolean(p.deletedAt));
          if (!item) throw new Error('Publication not found in trash');
          removedItem = item;
          label = item.title;
          db.publications = db.publications.filter(p => p.id !== id);
        } else if (type === 'product') {
          const item = db.products.find(p => p.id === id && Boolean(p.deletedAt));
          if (!item) throw new Error('Product not found in trash');
          removedItem = item;
          label = item.name;
          db.products = db.products.filter(p => p.id !== id);
        } else if (type === 'page') {
          const item = db.pages.find(p => p.id === id && Boolean(p.deletedAt));
          if (!item) throw new Error('Page not found in trash');
          removedItem = item;
          label = item.title;
          db.pages = db.pages.filter(p => p.id !== id);
        } else {
          throw new Error('Invalid trash item type');
        }

        const candidateUrls = collectUploadUrlsFromItems([removedItem]);
        purgeOrphanUploadUrls(db, UPLOADS_DIR, candidateUrls, DATA_DIR);
        appendActivity(db, actor, `Permanently deleted ${type}: ${label}`, 'Settings', label);
      },
      { bumpContentVersion: true }
    );
  },
  async empty(actor: { id: string; email: string }): Promise<number> {
    return dbStore.write(
      db => {
        const trashedDepts = db.departments.filter(d => Boolean(d.deletedAt));
        const trashedProjs = db.projects.filter(p => Boolean(p.deletedAt));
        const trashedPubs = db.publications.filter(p => Boolean(p.deletedAt));
        const trashedProds = db.products.filter(p => Boolean(p.deletedAt));
        const trashedPages = db.pages.filter(p => Boolean(p.deletedAt));

        const total =
          trashedDepts.length + trashedProjs.length + trashedPubs.length + trashedProds.length + trashedPages.length;

        const candidateUrls = collectUploadUrlsFromItems([
          ...trashedDepts,
          ...trashedProjs,
          ...trashedPubs,
          ...trashedProds,
          ...trashedPages
        ]);

        for (const p of trashedProjs) cleanupProjectReferences(db, p.id);

        db.departments = db.departments.filter(d => !d.deletedAt);
        db.projects = db.projects.filter(p => !p.deletedAt);
        db.publications = db.publications.filter(p => !p.deletedAt);
        db.products = db.products.filter(p => !p.deletedAt);
        db.pages = db.pages.filter(p => !p.deletedAt);

        purgeOrphanUploadUrls(db, UPLOADS_DIR, candidateUrls, DATA_DIR);
        appendActivity(db, actor, `Permanently emptied Trash (${total} items)`, 'Settings', 'Trash Purge');
        return total;
      },
      { bumpContentVersion: true }
    );
  },
  async purgeExpired(): Promise<boolean> {
    return dbStore.write(db => purgeExpiredTrashInDb(db), { bumpContentVersion: true });
  }
};

export const backupsRepo = {
  exportSafe(source?: Partial<DatabaseState>) {
    const db = source || dbStore.read();
    const settingsCopy = db.settings ? JSON.parse(JSON.stringify(db.settings)) : {};
    delete settingsCopy.theme;
    return {
      version: 2,
      schemaVersion: db.schemaVersion,
      exportedAt: new Date().toISOString(),
      roles: db.roles || [],
      departments: db.departments || [],
      projects: db.projects || [],
      publications: db.publications || [],
      products: db.products || [],
      media: db.media || [],
      settings: settingsCopy,
      pageContent: db.pageContent || {},
      pages: db.pages || []
    };
  },
  async importBackup(importedData: Record<string, unknown>, actor: { id: string; email: string }): Promise<void> {
    await dbStore.write(
      db => {

        if (Array.isArray(importedData.roles) && importedData.roles.length > 0) {
          db.roles = importedData.roles as RoleDefinition[];
        }
        db.departments = importedData.departments as Department[];
        if (Array.isArray(importedData.projects)) db.projects = importedData.projects as Project[];
        if (Array.isArray(importedData.publications)) db.publications = importedData.publications as Publication[];
        if (Array.isArray(importedData.products)) db.products = importedData.products as Product[];
        if (Array.isArray(importedData.media)) db.media = importedData.media as MediaAsset[];
        if (importedData.pageContent) {
          db.pageContent = mergeSiteContentPatch(db.pageContent, importedData.pageContent);
        }
        if (importedData.settings && typeof importedData.settings === 'object') {
          const incomingSettings = { ...(importedData.settings as Partial<SiteSettings>) };
          delete (incomingSettings as Record<string, unknown>).theme;
          db.settings = {
            ...db.settings,
            ...incomingSettings,
            securityPolicy: incomingSettings.securityPolicy || db.settings.securityPolicy
          };
        }
        if (Array.isArray(importedData.pages)) {
          db.pages = importedData.pages as PageRecord[];
        }

        appendActivity(db, actor, 'Imported system backup snapshot', 'Settings', 'Database Restore');
      },
      { bumpContentVersion: true }
    );

    if (Array.isArray(importedData.mediaBlobs) && importedData.mediaBlobs.length > 0) {
      importMediaBlobsToSqlite(importedData.mediaBlobs as MediaBlobRecord[], DATA_DIR);
    }
  }
};

export function getContentVersion(): number {
  return dbStore.read().contentVersion || 1;
}

export function normalizePermissionsInput(perms: unknown): PermissionKey[] {
  if (!Array.isArray(perms)) return [];
  return perms.filter((p): p is PermissionKey => typeof p === 'string' && VALID_PERMISSION_KEYS.has(p as PermissionKey));
}

export { DEFAULT_ADMIN_PERMISSIONS };
