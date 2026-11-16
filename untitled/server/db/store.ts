import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { DEFAULT_ROLES } from '../../src/shared/permissions';
import { INITIAL_DEPARTMENTS, INITIAL_SECTORS, INITIAL_SETTINGS, INITIAL_SITE_CONTENT } from '../../src/data/initialData';
import type { Sector } from '../../src/types/index';
import type { DatabaseState, ServerSessionRecord, ServerUserRecord } from './schema';
import { CURRENT_SCHEMA_VERSION, SQLITE_SCHEMA_DDL } from './schema';
import { runMigrations } from './migrations';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { collectUploadUrlsFromItems, purgeOrphanUploadUrls } from '../utils/mediaUsage';

export const DATA_DIR = path.resolve(process.env.MOA_DATA_DIR || 'data');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const UPLOADS_DIR = path.resolve(process.env.MOA_UPLOADS_DIR || 'public/uploads');
export const TMP_UPLOADS_DIR = path.join(DATA_DIR, 'tmp-uploads');
export const DB_JSON_FILE = path.join(DATA_DIR, 'database.json');
export const DB_FILE = path.join(DATA_DIR, 'moa.db');

const MAX_ROLLING_BACKUPS = 5;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isTestAccountsEnabled(): boolean {
  if (process.env.ENABLE_TEST_ACCOUNTS === 'false') return false;
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_ACCOUNTS === 'true';
}

export function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(TMP_UPLOADS_DIR)) fs.mkdirSync(TMP_UPLOADS_DIR, { recursive: true });
}

export function cleanupStaleTempUploads(): void {
  try {
    if (!fs.existsSync(TMP_UPLOADS_DIR)) return;
    for (const entry of fs.readdirSync(TMP_UPLOADS_DIR)) {
      const target = path.join(TMP_UPLOADS_DIR, entry);
      try {
        if (fs.statSync(target).isFile()) {
          fs.unlinkSync(target);
        }
      } catch {
        // Ignore individual temp unlink errors
      }
    }
  } catch {
    // Ignore directory read errors
  }
}

function isValidDatabaseShape(parsed: unknown): parsed is Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const obj = parsed as Record<string, unknown>;
  return (
    Array.isArray(obj.users) &&
    Array.isArray(obj.departments) &&
    typeof obj.settings === 'object' &&
    obj.settings !== null &&
    typeof obj.pageContent === 'object' &&
    obj.pageContent !== null
  );
}

function isStrongPasswordLiteral(pw: string | undefined): pw is string {
  return Boolean(
    pw &&
      pw.length >= 12 &&
      /[A-Z]/.test(pw) &&
      /\d/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw)
  );
}

function createInitialDatabase(): DatabaseState {
  const testEnabled = isTestAccountsEnabled();
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const envPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  const strongEnvPass = isStrongPasswordLiteral(envPassword);
  const initialPassword = strongEnvPass ? envPassword : 'admin123';

  if (!testEnabled && !strongEnvPass) {
    console.warn(
      '⚠️  [MoA SECURITY WARNING] Fresh DB created with ENABLE_TEST_ACCOUNTS=false and no valid 12+ char INITIAL_ADMIN_PASSWORD; founder admin@mastersofall.org seeded with temporary default password "admin123" (mustChangePassword=true & 2FA required at first sign-in).'
    );
  } else if (strongEnvPass) {
    console.log('[MoA First Run] Founder admin account seeded using INITIAL_ADMIN_PASSWORD.');
  }

  const nowIso = new Date().toISOString();
  const founderUser: ServerUserRecord = {
    id: 'usr-admin-muslim',
    email: 'admin@mastersofall.org',
    name: 'Muslim Mehdi',
    role: 'Admin',
    roleId: 'role-admin',
    isFounder: true,
    salt: adminSalt,
    passwordHash: hashPassword(initialPassword, adminSalt),
    mustChangePassword: !testEnabled,
    twoFactorEnabled: false,
    deactivated: false,
    createdAt: nowIso
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    contentVersion: 1,
    users: [founderUser],
    roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
    sessions: [],
    passwordResets: [],
    activityLog: [
      {
        id: 'act-init-1',
        userId: 'system',
        userEmail: 'system@mastersofall.org',
        action: 'System initialized with founder admin account and official departments',
        area: 'System',
        target: 'Control Room',
        timestamp: nowIso
      }
    ],
    securityLog: [],
    departments: INITIAL_DEPARTMENTS.map(d => ({ ...d, createdAt: nowIso })),
    sectors: INITIAL_SECTORS.map(s => ({ ...s, createdAt: nowIso })),
    projects: [],
    publications: [],
    products: [],
    media: [
      {
        id: 'med-moa-logo',
        name: 'MoA Official Emblem',
        url: '/drawing1.png',
        mimeType: 'image/png',
        type: 'image',
        size: 191718,
        altText: 'Masters Of All circular crest',
        tags: ['branding', 'official'],
        uploadedAt: nowIso,
        isLocked: true
      },
      {
        id: 'med-rdd-logo',
        name: 'RDD Logo Badge',
        url: '/5320.jpg',
        mimeType: 'image/jpeg',
        type: 'image',
        size: 38455,
        altText: 'Research, Discovery and Development official insignia',
        tags: ['branding', 'official'],
        uploadedAt: nowIso,
        isLocked: true
      }
    ],
    settings: JSON.parse(JSON.stringify(INITIAL_SETTINGS)),
    pageContent: JSON.parse(JSON.stringify(INITIAL_SITE_CONTENT)),
    contentHistory: [],
    pages: [],
    submissions: [],
    invitations: []
  };
}

let lastAutoBackupAt = 0;
let backupInFlight = false;

function pruneAutoDbBackups(): void {
  try {
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('moa-auto-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const stale of files.slice(MAX_ROLLING_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUPS_DIR, stale.name));
    }
  } catch (err) {
    console.warn('[MoA Backup] Could not prune old SQLite auto backups:', err);
  }
}

export function createPreMigrationBackupSync(sqlite: BetterSqlite3.Database, reason: 'pre-migration' | 'pre-import'): string {
  ensureDirectories();
  const filename = `moa-${reason}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}.db`;
  const destPath = path.join(BACKUPS_DIR, filename);
  const escaped = destPath.replace(/'/g, "''");
  sqlite.exec(`VACUUM INTO '${escaped}'`);
  return filename;
}

export function scheduleAutoBackup(sqlite: BetterSqlite3.Database): void {
  const now = Date.now();
  if (backupInFlight || now - lastAutoBackupAt < 15_000) return;
  lastAutoBackupAt = now;
  backupInFlight = true;
  ensureDirectories();
  const filename = `moa-auto-${now}-${crypto.randomBytes(2).toString('hex')}.db`;
  const destPath = path.join(BACKUPS_DIR, filename);
  sqlite
    .backup(destPath)
    .then(() => {
      pruneAutoDbBackups();
    })
    .catch(err => {
      console.warn('[MoA Backup] Async SQLite backup warning:', err);
    })
    .finally(() => {
      backupInFlight = false;
    });
}

export function reconcileTestAccounts(db: DatabaseState): boolean {
  const enableTestAccounts = isTestAccountsEnabled();
  let changed = false;

  // Always remove legacy separate "usr-test-admin"
  const beforeUsers = db.users.length;
  db.users = db.users.filter(u => u.id !== 'usr-test-admin');
  if (db.users.length !== beforeUsers) {
    db.sessions = db.sessions.filter(s => s.userId !== 'usr-test-admin');
    changed = true;
  }

  if (enableTestAccounts) {
    console.warn(
      '⚠️  [MoA SECURITY WARNING] Dev credentials are ACTIVE (admin@mastersofall.org & solo@mastersofall.org). Disable before real production deployment.'
    );

    let founder = db.users.find(
      u => u.id === 'usr-admin-muslim' || u.email.toLowerCase() === 'admin@mastersofall.org'
    );
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const adminHash = hashPassword('admin123', adminSalt);
    if (!founder) {
      founder = {
        id: 'usr-admin-muslim',
        email: 'admin@mastersofall.org',
        name: 'Muslim Mehdi',
        role: 'Admin',
        roleId: 'role-admin',
        salt: adminSalt,
        passwordHash: adminHash,
        mustChangePassword: false,
        isFounder: true,
        isTestAccount: false,
        twoFactorEnabled: false,
        deactivated: false,
        createdAt: new Date().toISOString()
      };
      db.users.unshift(founder);
    } else {
      founder.email = 'admin@mastersofall.org';
      founder.name = founder.name && founder.name !== 'Test Admin' ? founder.name : 'Muslim Mehdi';
      founder.role = 'Admin';
      founder.roleId = 'role-admin';
      founder.salt = adminSalt;
      founder.passwordHash = adminHash;
      founder.mustChangePassword = false;
      founder.isFounder = true;
      founder.isTestAccount = false;
      founder.deactivated = false;
    }
    changed = true;

    let solo = db.users.find(u => u.email.toLowerCase() === 'solo@mastersofall.org');
    const soloSalt = crypto.randomBytes(16).toString('hex');
    const soloHash = hashPassword('solo123', soloSalt);
    if (!solo) {
      solo = {
        id: 'usr-test-solo',
        email: 'solo@mastersofall.org',
        name: 'Asel Syed',
        role: 'Member',
        roleId: 'role-member',
        salt: soloSalt,
        passwordHash: soloHash,
        mustChangePassword: false,
        isFounder: false,
        isTestAccount: true,
        twoFactorEnabled: false,
        deactivated: false,
        createdAt: new Date().toISOString()
      };
      db.users.push(solo);
    } else {
      solo.name = 'Asel Syed';
      solo.role = 'Member';
      solo.roleId = 'role-member';
      solo.salt = soloSalt;
      solo.passwordHash = soloHash;
      solo.mustChangePassword = false;
      solo.isFounder = false;
      solo.isTestAccount = true;
      solo.deactivated = false;
    }
    changed = true;
  } else {
    for (const u of db.users) {
      if (u.isTestAccount || u.email.toLowerCase() === 'solo@mastersofall.org') {
        if (!u.deactivated) {
          u.deactivated = true;
          changed = true;
        }
        const beforeSessions = db.sessions.length;
        db.sessions = db.sessions.filter(s => s.userId !== u.id);
        if (db.sessions.length !== beforeSessions) changed = true;
        console.error(
          `🚨 [MoA PRODUCTION SECURITY WARNING] Test account "${u.email}" exists while test accounts are disabled — deactivated!`
        );
      }
    }

    const founder = db.users.find(u => u.isFounder) || db.users.find(u => u.roleId === 'role-admin');
    if (founder && !founder.deactivated) {
      const stillDefaultPw = verifyPassword('admin123', founder.salt, founder.passwordHash);
      if (stillDefaultPw || founder.mustChangePassword || !founder.twoFactorEnabled) {
        console.warn(
          `⚠️  [MoA SECURITY WARNING] Founder account (${founder.email}) requires first-run setup: ${[
            stillDefaultPw ? 'still using temporary password' : '',
            founder.mustChangePassword ? 'mustChangePassword pending' : '',
            !founder.twoFactorEnabled ? '2FA not yet enabled' : ''
          ]
            .filter(Boolean)
            .join(', ')}.`
        );
      }
    }
  }

  return changed;
}

export function purgeExpiredTrashInDb(db: DatabaseState): boolean {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const expiredDepts = db.departments.filter(d => d.deletedAt && new Date(d.deletedAt).getTime() <= cutoff);
  const expiredSectors = (db.sectors || []).filter(
    s => typeof s.deletedAt === 'string' && new Date(s.deletedAt).getTime() <= cutoff
  );
  const expiredProjs = db.projects.filter(p => p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff);
  const expiredPubs = db.publications.filter(p => p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff);
  const expiredProds = db.products.filter(p => p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff);
  const expiredPages = db.pages.filter(pg => pg.deletedAt && new Date(pg.deletedAt).getTime() <= cutoff);

  const totalExpired =
    expiredDepts.length +
    expiredSectors.length +
    expiredProjs.length +
    expiredPubs.length +
    expiredProds.length +
    expiredPages.length;
  if (totalExpired === 0) return false;

  const candidateUrls = collectUploadUrlsFromItems([
    ...expiredDepts,
    ...expiredSectors,
    ...expiredProjs,
    ...expiredPubs,
    ...expiredProds,
    ...expiredPages
  ]);

  db.departments = db.departments.filter(d => !(d.deletedAt && new Date(d.deletedAt).getTime() <= cutoff));
  if (db.sectors) {
    db.sectors = db.sectors.filter(s => !(typeof s.deletedAt === 'string' && new Date(s.deletedAt).getTime() <= cutoff));
  }
  db.projects = db.projects.filter(p => !(p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff));
  db.publications = db.publications.filter(p => !(p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff));
  db.products = db.products.filter(p => !(p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff));
  db.pages = db.pages.filter(pg => !(pg.deletedAt && new Date(pg.deletedAt).getTime() <= cutoff));

  purgeOrphanUploadUrls(db, UPLOADS_DIR, candidateUrls);
  return true;
}

export function purgeExpiredSessionsInDb(db: DatabaseState): boolean {
  const timeoutMinutes = db.settings?.securityPolicy?.sessionTimeoutMinutes || 120;
  const maxIdleMs = Math.max(5, timeoutMinutes) * 60 * 1000;
  const now = Date.now();
  const beforeSess = db.sessions.length;
  db.sessions = db.sessions.filter(
    s => now - (s.lastActivity || 0) <= maxIdleMs && (!s.expiresAt || s.expiresAt > now)
  );
  const beforeResets = db.passwordResets.length;
  db.passwordResets = db.passwordResets.filter(r => !r.usedAt && new Date(r.expiresAt).getTime() > now);
  return db.sessions.length !== beforeSess || db.passwordResets.length !== beforeResets;
}

// ============================================================================
// SQLITE COLLECTION SERIALIZATION & TRANSACTIONAL SYNC
// ============================================================================

function getMetaInt(sqlite: BetterSqlite3.Database, key: string, fallback: number): number {
  const row = sqlite.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
  const num = row ? Number(row.value) : NaN;
  return Number.isFinite(num) ? num : fallback;
}

function setMeta(sqlite: BetterSqlite3.Database, key: string, value: string | number): void {
  sqlite
    .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

function setKv(sqlite: BetterSqlite3.Database, key: string, value: unknown): void {
  if (value === undefined || value === null) {
    sqlite.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
    return;
  }
  sqlite
    .prepare('INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

function getKv<T>(sqlite: BetterSqlite3.Database, key: string): T | undefined {
  const row = sqlite.prepare('SELECT value FROM kv_store WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return undefined;
  return JSON.parse(row.value) as T;
}

function normalizeSessionRecord(s: Partial<ServerSessionRecord>, idx = 0): ServerSessionRecord {
  const createdAt = typeof s.createdAt === 'number' ? s.createdAt : Date.now();
  const lastActivity = typeof s.lastActivity === 'number' ? s.lastActivity : createdAt;
  const token = String(s.token || '');
  const id =
    typeof s.id === 'string' && s.id
      ? s.id
      : token
      ? crypto.createHash('sha256').update(token).digest('hex').slice(0, 24)
      : `sess-${createdAt}-${idx}`;
  const expiresAt = typeof s.expiresAt === 'number' ? s.expiresAt : 0;
  return {
    id,
    token,
    userId: String(s.userId || ''),
    role: String(s.role || 'Member'),
    roleId: String(s.roleId || 'role-member'),
    lastActivity,
    createdAt,
    expiresAt,
    userAgent: typeof s.userAgent === 'string' ? s.userAgent : undefined,
    ip: typeof s.ip === 'string' ? s.ip : undefined
  };
}

function readAllDataRows<T>(sqlite: BetterSqlite3.Database, table: string, orderBy?: string): T[] {
  const sql = orderBy ? `SELECT data FROM ${table} ORDER BY ${orderBy}` : `SELECT data FROM ${table}`;
  const rows = sqlite.prepare(sql).all() as Array<{ data: string }>;
  return rows.map(r => JSON.parse(r.data) as T);
}

export function readDatabaseStateFromSqlite(sqlite: BetterSqlite3.Database): DatabaseState {
  const schemaVersion = getMetaInt(sqlite, 'schemaVersion', CURRENT_SCHEMA_VERSION);
  const contentVersion = getMetaInt(sqlite, 'contentVersion', 1);

  const users = readAllDataRows<ServerUserRecord>(sqlite, 'users');
  const roles = readAllDataRows<DatabaseState['roles'][number]>(sqlite, 'roles');
  const sessionRows = sqlite
    .prepare('SELECT id, token, userId, role, roleId, createdAt, lastActivity, expiresAt, userAgent, ip FROM sessions')
    .all() as ServerSessionRecord[];
  const passwordResets = sqlite
    .prepare('SELECT id, userId, tokenHash, expiresAt, usedAt, createdAt FROM password_resets')
    .all() as DatabaseState['passwordResets'];
  const departments = readAllDataRows<DatabaseState['departments'][number]>(sqlite, 'departments', 'displayOrder ASC');
  const sectors = readAllDataRows<Sector>(sqlite, 'sectors', 'displayOrder ASC');
  const projects = readAllDataRows<DatabaseState['projects'][number]>(sqlite, 'projects');
  const publications = readAllDataRows<DatabaseState['publications'][number]>(sqlite, 'publications');
  const products = readAllDataRows<DatabaseState['products'][number]>(sqlite, 'products');
  const media = readAllDataRows<DatabaseState['media'][number]>(sqlite, 'media');
  const pages = readAllDataRows<DatabaseState['pages'][number]>(sqlite, 'pages');
  const submissions = readAllDataRows<DatabaseState['submissions'][number]>(sqlite, 'submissions');
  const invitations = readAllDataRows<DatabaseState['invitations'][number]>(sqlite, 'invitations');
  const activityLog = readAllDataRows<DatabaseState['activityLog'][number]>(sqlite, 'activity_log', 'seq ASC');
  const securityLog = readAllDataRows<DatabaseState['securityLog'][number]>(sqlite, 'security_log', 'seq ASC');
  const contentHistory = readAllDataRows<DatabaseState['contentHistory'][number]>(sqlite, 'content_history', 'seq ASC');

  const settings = getKv<DatabaseState['settings']>(sqlite, 'settings') || JSON.parse(JSON.stringify(INITIAL_SETTINGS));
  const pageContent =
    getKv<DatabaseState['pageContent']>(sqlite, 'pageContent') || JSON.parse(JSON.stringify(INITIAL_SITE_CONTENT));
  const draftContent = getKv<DatabaseState['draftContent']>(sqlite, 'draftContent');

  return {
    schemaVersion,
    contentVersion,
    users,
    roles,
    sessions: sessionRows,
    passwordResets,
    activityLog,
    securityLog,
    departments,
    sectors,
    projects,
    publications,
    products,
    media,
    settings,
    pageContent,
    draftContent,
    contentHistory,
    pages,
    submissions,
    invitations
  };
}

function writeFullStateIntoSqlite(sqlite: BetterSqlite3.Database, db: DatabaseState, prevSerialized?: Record<string, string>): void {
  const serialize = (v: unknown) => JSON.stringify(v);
  const changed = (key: string, val: unknown) => !prevSerialized || prevSerialized[key] !== serialize(val);

  setMeta(sqlite, 'schemaVersion', db.schemaVersion);
  setMeta(sqlite, 'contentVersion', db.contentVersion || 1);

  if (changed('settings', db.settings)) setKv(sqlite, 'settings', db.settings);
  if (changed('pageContent', db.pageContent)) setKv(sqlite, 'pageContent', db.pageContent);
  if (changed('draftContent', db.draftContent)) setKv(sqlite, 'draftContent', db.draftContent);

  if (changed('users', db.users)) {
    sqlite.prepare('DELETE FROM users').run();
    const stmt = sqlite.prepare(
      'INSERT INTO users (id, email, role, roleId, isFounder, isTestAccount, deactivated, createdAt, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const u of db.users) {
      stmt.run(
        u.id,
        u.email.toLowerCase(),
        u.role,
        u.roleId,
        u.isFounder ? 1 : 0,
        u.isTestAccount ? 1 : 0,
        u.deactivated ? 1 : 0,
        u.createdAt || new Date().toISOString(),
        JSON.stringify(u)
      );
    }
  }

  if (changed('roles', db.roles)) {
    sqlite.prepare('DELETE FROM roles').run();
    const stmt = sqlite.prepare('INSERT INTO roles (id, name, createdAt, updatedAt, data) VALUES (?, ?, ?, ?, ?)');
    for (const r of db.roles) {
      stmt.run(r.id, r.name, r.createdAt || null, r.updatedAt || null, JSON.stringify(r));
    }
  }

  const validUserIds = new Set(db.users.map(u => u.id));
  const validSessions = (db.sessions || [])
    .filter(s => validUserIds.has(s.userId) && Boolean(s.token))
    .map((s, idx) => normalizeSessionRecord(s, idx));

  if (changed('sessions', db.sessions) || changed('users', db.users)) {
    sqlite.prepare('DELETE FROM sessions').run();
    const stmt = sqlite.prepare(
      'INSERT INTO sessions (id, token, userId, role, roleId, createdAt, lastActivity, expiresAt, userAgent, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const s of validSessions) {
      stmt.run(
        s.id,
        s.token,
        s.userId,
        s.role,
        s.roleId,
        s.createdAt,
        s.lastActivity,
        s.expiresAt || 0,
        s.userAgent || null,
        s.ip || null
      );
    }
  }

  const validResets = (db.passwordResets || []).filter(r => validUserIds.has(r.userId));
  if (changed('passwordResets', db.passwordResets) || changed('users', db.users)) {
    sqlite.prepare('DELETE FROM password_resets').run();
    const stmt = sqlite.prepare(
      'INSERT INTO password_resets (id, userId, tokenHash, expiresAt, usedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const r of validResets) {
      stmt.run(r.id, r.userId, r.tokenHash, r.expiresAt, r.usedAt || null, r.createdAt);
    }
  }

  if (changed('departments', db.departments)) {
    sqlite.prepare('DELETE FROM departments').run();
    const stmt = sqlite.prepare(
      'INSERT INTO departments (id, slug, published, showInTree, displayOrder, deletedAt, createdAt, updatedAt, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const d of db.departments) {
      stmt.run(
        d.id,
        d.slug,
        d.published ? 1 : 0,
        d.showInTree !== false ? 1 : 0,
        d.displayOrder || 0,
        d.deletedAt || null,
        d.createdAt || null,
        d.updatedAt || null,
        JSON.stringify(d)
      );
    }
  }

  if (changed('sectors', db.sectors || [])) {
    sqlite.prepare('DELETE FROM sectors').run();
    const stmt = sqlite.prepare(
      'INSERT INTO sectors (id, slug, departmentId, published, showInTree, displayOrder, deletedAt, createdAt, updatedAt, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const s of db.sectors || []) {
      stmt.run(
        String(s.id),
        String(s.slug || ''),
        String(s.departmentId || 'dept-rdd'),
        s.published !== false ? 1 : 0,
        s.showInTree !== false ? 1 : 0,
        Number(s.displayOrder || 0),
        typeof s.deletedAt === 'string' ? s.deletedAt : null,
        typeof s.createdAt === 'string' ? s.createdAt : null,
        typeof s.updatedAt === 'string' ? s.updatedAt : null,
        JSON.stringify(s)
      );
    }
  }

  if (changed('projects', db.projects)) {
    sqlite.prepare('DELETE FROM projects').run();
    const stmt = sqlite.prepare(
      'INSERT INTO projects (id, slug, publicationStatus, status, departmentId, authorId, createdAt, updatedAt, deletedAt, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const p of db.projects) {
      const deptId =
        ((p as unknown as Record<string, unknown>).departmentId as string | undefined) ||
        p.primaryDepartmentId ||
        p.departmentIds?.[0] ||
        null;
      stmt.run(
        p.id,
        p.slug,
        p.publicationStatus || 'Draft',
        p.status || 'Active',
        deptId,
        p.authorId || 'system',
        p.createdAt || new Date().toISOString(),
        p.updatedAt || new Date().toISOString(),
        p.deletedAt || null,
        JSON.stringify(p)
      );
    }
  }

  if (changed('publications', db.publications)) {
    sqlite.prepare('DELETE FROM publications').run();
    const stmt = sqlite.prepare(
      'INSERT INTO publications (id, slug, publicationStatus, departmentId, authorId, createdAt, updatedAt, deletedAt, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const pub of db.publications) {
      const deptId =
        ((pub as unknown as Record<string, unknown>).departmentId as string | undefined) ||
        pub.departmentIds?.[0] ||
        null;
      stmt.run(
        pub.id,
        pub.slug,
        pub.publicationStatus || 'Draft',
        deptId,
        pub.authorId || 'system',
        pub.createdAt || new Date().toISOString(),
        pub.updatedAt || new Date().toISOString(),
        pub.deletedAt || null,
        JSON.stringify(pub)
      );
    }
  }

  if (changed('products', db.products)) {
    sqlite.prepare('DELETE FROM products').run();
    const stmt = sqlite.prepare(
      'INSERT INTO products (id, slug, publicationStatus, status, departmentId, authorId, createdAt, updatedAt, deletedAt, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const prod of db.products) {
      const deptId =
        ((prod as unknown as Record<string, unknown>).departmentId as string | undefined) ||
        prod.departmentIds?.[0] ||
        null;
      stmt.run(
        prod.id,
        prod.slug,
        prod.publicationStatus || 'Draft',
        prod.status || 'Concept',
        deptId,
        prod.authorId || 'system',
        prod.createdAt || new Date().toISOString(),
        prod.updatedAt || new Date().toISOString(),
        prod.deletedAt || null,
        JSON.stringify(prod)
      );
    }
  }

  if (changed('media', db.media)) {
    sqlite.prepare('DELETE FROM media').run();
    const stmt = sqlite.prepare(
      'INSERT INTO media (id, type, url, uploadedBy, uploadedAt, data) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const m of db.media) {
      stmt.run(m.id, m.type, m.url, m.uploadedBy || null, m.uploadedAt || new Date().toISOString(), JSON.stringify(m));
    }
  }

  if (changed('pages', db.pages)) {
    sqlite.prepare('DELETE FROM pages').run();
    const stmt = sqlite.prepare(
      'INSERT INTO pages (id, slug, status, deletedAt, createdAt, updatedAt, data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const pg of db.pages) {
      stmt.run(pg.id, pg.slug, pg.status || 'Draft', pg.deletedAt || null, pg.createdAt, pg.updatedAt, JSON.stringify(pg));
    }
  }

  if (changed('submissions', db.submissions)) {
    sqlite.prepare('DELETE FROM submissions').run();
    const stmt = sqlite.prepare('INSERT INTO submissions (id, status, createdAt, data) VALUES (?, ?, ?, ?)');
    for (const s of db.submissions) {
      stmt.run(s.id, s.status || 'new', s.createdAt, JSON.stringify(s));
    }
  }

  if (changed('invitations', db.invitations)) {
    sqlite.prepare('DELETE FROM invitations').run();
    const stmt = sqlite.prepare(
      'INSERT INTO invitations (id, email, token, status, expiresAt, createdAt, data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const inv of db.invitations) {
      stmt.run(inv.id, inv.email.toLowerCase(), inv.token, inv.status, inv.expiresAt, inv.createdAt, JSON.stringify(inv));
    }
  }

  if (changed('activityLog', db.activityLog)) {
    sqlite.prepare('DELETE FROM activity_log').run();
    const stmt = sqlite.prepare(
      'INSERT INTO activity_log (id, userId, area, timestamp, data) VALUES (?, ?, ?, ?, ?)'
    );
    for (const a of db.activityLog) {
      stmt.run(a.id, a.userId, a.area, a.timestamp, JSON.stringify(a));
    }
  }

  if (changed('securityLog', db.securityLog)) {
    sqlite.prepare('DELETE FROM security_log').run();
    const stmt = sqlite.prepare('INSERT INTO security_log (id, timestamp, data) VALUES (?, ?, ?)');
    for (const sl of db.securityLog) {
      stmt.run(sl.id, sl.timestamp, JSON.stringify(sl));
    }
  }

  if (changed('contentHistory', db.contentHistory)) {
    sqlite.prepare('DELETE FROM content_history').run();
    const stmt = sqlite.prepare('INSERT INTO content_history (id, timestamp, data) VALUES (?, ?, ?)');
    for (const ch of db.contentHistory) {
      stmt.run(ch.id, ch.timestamp, JSON.stringify(ch));
    }
  }
}

function captureSnapshotHashes(db: DatabaseState): Record<string, string> {
  return {
    settings: JSON.stringify(db.settings),
    pageContent: JSON.stringify(db.pageContent),
    draftContent: JSON.stringify(db.draftContent),
    users: JSON.stringify(db.users),
    roles: JSON.stringify(db.roles),
    sessions: JSON.stringify(db.sessions),
    passwordResets: JSON.stringify(db.passwordResets),
    departments: JSON.stringify(db.departments),
    sectors: JSON.stringify(db.sectors || []),
    projects: JSON.stringify(db.projects),
    publications: JSON.stringify(db.publications),
    products: JSON.stringify(db.products),
    media: JSON.stringify(db.media),
    pages: JSON.stringify(db.pages),
    submissions: JSON.stringify(db.submissions),
    invitations: JSON.stringify(db.invitations),
    activityLog: JSON.stringify(db.activityLog),
    securityLog: JSON.stringify(db.securityLog),
    contentHistory: JSON.stringify(db.contentHistory)
  };
}

function verifyImportedCollection(
  sqlite: BetterSqlite3.Database,
  table: string,
  items: Array<{ id?: string }>
): void {
  const row = sqlite.prepare(`SELECT COUNT(*) AS cnt FROM ${table}`).get() as { cnt: number };
  if (row.cnt !== items.length) {
    throw new Error(`Import count mismatch on ${table}: expected ${items.length}, got ${row.cnt}`);
  }
  if (items.length === 0) return;

  const indices = Array.from(new Set([0, Math.floor(items.length / 2), items.length - 1]));
  const checkStmt = sqlite.prepare(`SELECT 1 FROM ${table} WHERE id = ?`);
  for (const idx of indices) {
    const id = items[idx]?.id;
    if (id && !checkStmt.get(id)) {
      throw new Error(`Import ID verification failed on ${table} for id="${id}"`);
    }
  }
}

function removePartialSqliteFiles(): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = `${DB_FILE}${suffix}`;
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function openSqliteWithPragmas(dbPath: string): BetterSqlite3.Database {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = FULL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.exec(SQLITE_SCHEMA_DDL);

  const check = sqlite.pragma('integrity_check', { simple: true }) as string;
  if (check !== 'ok') {
    sqlite.close();
    throw new Error(`[MoA DB] SQLite integrity_check failed: ${check}`);
  }
  return sqlite;
}

class Store {
  private sqlite: BetterSqlite3.Database;

  constructor() {
    this.sqlite = this.initialize();
  }

  private initialize(): BetterSqlite3.Database {
    ensureDirectories();
    cleanupStaleTempUploads();

    const hasSqlite = fs.existsSync(DB_FILE);
    const hasJson = fs.existsSync(DB_JSON_FILE);

    // 1.2 ONE-TIME IMPORT from legacy database.json -> data/moa.db
    if (!hasSqlite && hasJson) {
      const raw = fs.readFileSync(DB_JSON_FILE, 'utf-8').trim();
      let parsed: Record<string, unknown> | null = null;
      if (raw.length > 0) {
        try {
          const candidate = JSON.parse(raw);
          if (isValidDatabaseShape(candidate)) {
            parsed = candidate;
          }
        } catch {
          parsed = null;
        }
      }
      if (!parsed) {
        throw new Error(`[MoA DB] Refusing to start: legacy ${DB_JSON_FILE} is unreadable or corrupt.`);
      }

      const preImportBackup = path.join(BACKUPS_DIR, `database-pre-sqlite-import-${Date.now()}.json`);
      fs.copyFileSync(DB_JSON_FILE, preImportBackup);

      const { db: normalized } = runMigrations(parsed);
      reconcileTestAccounts(normalized);
      purgeExpiredSessionsInDb(normalized);
      purgeExpiredTrashInDb(normalized);

      let sqlite: BetterSqlite3.Database | null = null;
      try {
        sqlite = openSqliteWithPragmas(DB_FILE);

        const validUserIds = new Set(normalized.users.map(u => u.id));
        normalized.sessions = (normalized.sessions || [])
          .filter(s => validUserIds.has(s.userId) && Boolean(s.token))
          .map((s, idx) => normalizeSessionRecord(s, idx));
        normalized.passwordResets = (normalized.passwordResets || []).filter(r => validUserIds.has(r.userId));

        sqlite.transaction(() => {
          writeFullStateIntoSqlite(sqlite!, normalized);
        }).immediate();

        // Verify counts and spot-check IDs
        verifyImportedCollection(sqlite, 'users', normalized.users);
        verifyImportedCollection(sqlite, 'roles', normalized.roles);
        verifyImportedCollection(sqlite, 'sessions', normalized.sessions);
        verifyImportedCollection(sqlite, 'password_resets', normalized.passwordResets);
        verifyImportedCollection(sqlite, 'departments', normalized.departments);
        verifyImportedCollection(sqlite, 'sectors', normalized.sectors || []);
        verifyImportedCollection(sqlite, 'projects', normalized.projects);
        verifyImportedCollection(sqlite, 'publications', normalized.publications);
        verifyImportedCollection(sqlite, 'products', normalized.products);
        verifyImportedCollection(sqlite, 'media', normalized.media);
        verifyImportedCollection(sqlite, 'pages', normalized.pages);
        verifyImportedCollection(sqlite, 'submissions', normalized.submissions);
        verifyImportedCollection(sqlite, 'invitations', normalized.invitations);
        verifyImportedCollection(sqlite, 'activity_log', normalized.activityLog);
        verifyImportedCollection(sqlite, 'security_log', normalized.securityLog);
        verifyImportedCollection(sqlite, 'content_history', normalized.contentHistory);

        const migratedJsonPath = `${DB_JSON_FILE}.migrated-${Date.now()}`;
        fs.renameSync(DB_JSON_FILE, migratedJsonPath);
        console.log(`[MoA DB] Imported database.json into SQLite (${DB_FILE}); source archived at ${path.basename(migratedJsonPath)}.`);
        return sqlite;
      } catch (err) {
        try {
          sqlite?.close();
        } catch {
          // ignore
        }
        removePartialSqliteFiles();
        throw new Error(
          `[MoA DB] One-time JSON -> SQLite import failed (source database.json left untouched): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    // Fresh database creation when neither exists
    if (!hasSqlite && !hasJson) {
      const sqlite = openSqliteWithPragmas(DB_FILE);
      const fresh = createInitialDatabase();
      reconcileTestAccounts(fresh);
      sqlite.transaction(() => {
        writeFullStateIntoSqlite(sqlite, fresh);
      }).immediate();
      return sqlite;
    }

    // Existing SQLite database: run pending ordered migrations after VACUUM INTO backup
    const sqlite = openSqliteWithPragmas(DB_FILE);
    const currentSchema = getMetaInt(sqlite, 'schemaVersion', 0);

    if (currentSchema < CURRENT_SCHEMA_VERSION) {
      createPreMigrationBackupSync(sqlite, 'pre-migration');
      const snapshot = readDatabaseStateFromSqlite(sqlite);
      const hashesBefore = captureSnapshotHashes(snapshot);
      const { db: migrated, appliedVersions } = runMigrations(snapshot as unknown as Record<string, unknown>);
      reconcileTestAccounts(migrated);
      purgeExpiredSessionsInDb(migrated);
      purgeExpiredTrashInDb(migrated);
      sqlite.transaction(() => {
        writeFullStateIntoSqlite(sqlite, migrated, hashesBefore);
      }).immediate();
      if (appliedVersions.length > 0) {
        console.log(`[MoA DB] Applied SQLite migrations: v${appliedVersions.join(', v')}`);
      }
    } else {
      const snapshot = readDatabaseStateFromSqlite(sqlite);
      const hashesBefore = captureSnapshotHashes(snapshot);
      const reconciled = reconcileTestAccounts(snapshot);
      const purgedSess = purgeExpiredSessionsInDb(snapshot);
      const purgedTrash = purgeExpiredTrashInDb(snapshot);
      if (reconciled || purgedSess || purgedTrash) {
        sqlite.transaction(() => {
          writeFullStateIntoSqlite(sqlite, snapshot, hashesBefore);
        }).immediate();
      }
    }

    return sqlite;
  }

  public getSqlite(): BetterSqlite3.Database {
    return this.sqlite;
  }

  public read(): DatabaseState {
    return readDatabaseStateFromSqlite(this.sqlite);
  }

  public reloadFromDisk(): DatabaseState {
    try {
      this.sqlite.pragma('wal_checkpoint(TRUNCATE)');
      this.sqlite.close();
    } catch {
      // ignore if already closed
    }
    this.sqlite = this.initialize();
    return this.read();
  }

  public transaction<T>(
    fn: (sqlite: BetterSqlite3.Database) => T,
    opts?: { skipBackup?: boolean; bumpContentVersion?: boolean }
  ): T {
    const result = this.sqlite.transaction(() => {
      const out = fn(this.sqlite);
      if (opts?.bumpContentVersion) {
        const nextVer = getMetaInt(this.sqlite, 'contentVersion', 1) + 1;
        setMeta(this.sqlite, 'contentVersion', nextVer);
      }
      return out;
    }).immediate();

    if (!opts?.skipBackup) {
      scheduleAutoBackup(this.sqlite);
    }
    return result;
  }

  public async write<T>(
    mutator: (db: DatabaseState) => T,
    opts?: { skipBackup?: boolean; bumpContentVersion?: boolean }
  ): Promise<T> {
    const result = this.sqlite.transaction(() => {
      const snapshot = readDatabaseStateFromSqlite(this.sqlite);
      const hashesBefore = captureSnapshotHashes(snapshot);
      const out = mutator(snapshot);
      if (opts?.bumpContentVersion) {
        snapshot.contentVersion = (snapshot.contentVersion || 1) + 1;
      }
      writeFullStateIntoSqlite(this.sqlite, snapshot, hashesBefore);
      return out;
    }).immediate();

    if (!opts?.skipBackup) {
      scheduleAutoBackup(this.sqlite);
    }
    return result;
  }

  public checkpointAndClose(): void {
    try {
      if (this.sqlite.open) {
        this.sqlite.pragma('wal_checkpoint(TRUNCATE)');
        this.sqlite.close();
      }
    } catch (err) {
      console.warn('[MoA DB] Error during SQLite checkpoint/close:', err);
    }
  }

  public flushPendingNow(): void {
    this.checkpointAndClose();
  }
}

export const dbStore = new Store();
