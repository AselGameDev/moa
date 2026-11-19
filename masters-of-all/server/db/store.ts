import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { DEFAULT_ROLES } from '../../src/shared/permissions';
import { INITIAL_DEPARTMENTS, INITIAL_SETTINGS, INITIAL_SITE_CONTENT } from '../../src/data/initialData';
import type { DatabaseState, ServerUserRecord } from './schema';
import { CURRENT_SCHEMA_VERSION } from './schema';
import { runMigrations } from './migrations';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { getCredentialByUserIdFromSqlite, upsertCredentialInSqlite } from './sqliteAuth';
import {
  getSqliteDbPath,
  hasSqliteDatabase,
  ingestLegacyDiskUploadsToSqlite,
  loadDatabaseFromSqlite,
  saveDatabaseToSqlite
} from './sqliteDb';
import { collectUploadUrlsFromItems, purgeOrphanUploadUrls } from '../utils/mediaUsage';

export const DATA_DIR = path.resolve(process.env.MOA_DATA_DIR || 'data');
export const UPLOADS_DIR = path.resolve(process.env.MOA_UPLOADS_DIR || 'public/uploads');
export const TMP_UPLOADS_DIR = path.join(DATA_DIR, 'tmp-uploads');
export const SQLITE_DB_FILE = getSqliteDbPath(DATA_DIR);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isTestAccountsEnabled(): boolean {
  if (process.env.ENABLE_TEST_ACCOUNTS === 'false') return false;
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_ACCOUNTS === 'true';
}

export function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
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
        altText: 'Research Discover and Development official insignia',
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

export function reconcileTestAccounts(db: DatabaseState): boolean {
  const enableTestAccounts = isTestAccountsEnabled();
  let changed = false;

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
      u => u.id === 'usr-admin-muslim' || u.isFounder || u.email.toLowerCase() === 'admin@mastersofall.org'
    );
    const sqliteFounderCred = getCredentialByUserIdFromSqlite(founder?.id || 'usr-admin-muslim');
    const hasCustomCredentials = Boolean(founder?.credentialsCustomized || sqliteFounderCred);

    if (!founder) {
      const adminSalt = crypto.randomBytes(16).toString('hex');
      const adminHash = hashPassword('admin123', adminSalt);
      founder = {
        id: 'usr-admin-muslim',
        email: sqliteFounderCred?.email || 'admin@mastersofall.org',
        name: 'Muslim Mehdi',
        role: 'Admin',
        roleId: 'role-admin',
        salt: sqliteFounderCred?.salt || adminSalt,
        passwordHash: sqliteFounderCred?.passwordHash || adminHash,
        mustChangePassword: false,
        isFounder: true,
        isTestAccount: false,
        credentialsCustomized: Boolean(sqliteFounderCred),
        twoFactorEnabled: false,
        deactivated: false,
        createdAt: new Date().toISOString()
      };
      db.users.unshift(founder);
      upsertCredentialInSqlite({
        userId: founder.id,
        email: founder.email,
        passwordHash: founder.passwordHash,
        salt: founder.salt,
        updatedAt: founder.createdAt
      });
    } else {
      founder.name = founder.name && founder.name !== 'Test Admin' ? founder.name : 'Muslim Mehdi';
      founder.role = 'Admin';
      founder.roleId = 'role-admin';
      founder.mustChangePassword = false;
      founder.isFounder = true;
      founder.isTestAccount = false;
      founder.deactivated = false;

      if (sqliteFounderCred) {
        founder.email = sqliteFounderCred.email;
        founder.salt = sqliteFounderCred.salt;
        founder.passwordHash = sqliteFounderCred.passwordHash;
        founder.credentialsCustomized = true;
      } else if (!hasCustomCredentials) {
        const adminSalt = crypto.randomBytes(16).toString('hex');
        const adminHash = hashPassword('admin123', adminSalt);
        founder.email = 'admin@mastersofall.org';
        founder.salt = adminSalt;
        founder.passwordHash = adminHash;
      }
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
  const expiredProjs = db.projects.filter(p => p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff);
  const expiredPubs = db.publications.filter(p => p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff);
  const expiredProds = db.products.filter(p => p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff);
  const expiredPages = db.pages.filter(pg => pg.deletedAt && new Date(pg.deletedAt).getTime() <= cutoff);

  const totalExpired =
    expiredDepts.length +
    expiredProjs.length +
    expiredPubs.length +
    expiredProds.length +
    expiredPages.length;

  if (totalExpired === 0) return false;

  const candidateUrls = collectUploadUrlsFromItems([
    ...expiredDepts,
    ...expiredProjs,
    ...expiredPubs,
    ...expiredProds,
    ...expiredPages
  ]);

  db.departments = db.departments.filter(d => !(d.deletedAt && new Date(d.deletedAt).getTime() <= cutoff));
  db.projects = db.projects.filter(p => !(p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff));
  db.publications = db.publications.filter(p => !(p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff));
  db.products = db.products.filter(p => !(p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff));
  db.pages = db.pages.filter(pg => !(pg.deletedAt && new Date(pg.deletedAt).getTime() <= cutoff));

  purgeOrphanUploadUrls(db, UPLOADS_DIR, candidateUrls, DATA_DIR);
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

class Store {
  private state: DatabaseState;
  private sessionActivityDirty = false;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.state = this.initialize();
  }

  private writeToDisk(state: DatabaseState): void {
    ensureDirectories();
    saveDatabaseToSqlite(state, DATA_DIR);
  }

  private initialize(): DatabaseState {
    ensureDirectories();
    cleanupStaleTempUploads();

    if (!hasSqliteDatabase(DATA_DIR)) {
      const fresh = createInitialDatabase();
      reconcileTestAccounts(fresh);
      this.writeToDisk(fresh);
      ingestLegacyDiskUploadsToSqlite(UPLOADS_DIR, DATA_DIR);
      return fresh;
    }

    ingestLegacyDiskUploadsToSqlite(UPLOADS_DIR, DATA_DIR);
    const parsed = loadDatabaseFromSqlite(DATA_DIR) as unknown as Record<string, unknown>;
    const { db, appliedVersions } = runMigrations(parsed);
    const reconciled = reconcileTestAccounts(db);
    const purgedSess = purgeExpiredSessionsInDb(db);
    const purgedTrash = purgeExpiredTrashInDb(db);

    if (appliedVersions.length > 0) {
      console.log(`[MoA DB] Applied migrations: v${appliedVersions.join(', v')}`);
    }

    if (appliedVersions.length > 0 || reconciled || purgedSess || purgedTrash) {
      this.writeToDisk(db);
    }

    return db;
  }

  public read(): DatabaseState {
    return this.state;
  }

  public reloadFromDisk(): DatabaseState {
    this.sessionActivityDirty = false;
    this.state = this.initialize();
    return this.state;
  }

  public markSessionActivityDirty(): void {
    this.sessionActivityDirty = true;
  }

  public async write<T>(
    mutator: (db: DatabaseState) => T,
    opts?: { bumpContentVersion?: boolean }
  ): Promise<T> {
    const task = this.writeQueue.then(() => {
      const out = mutator(this.state);
      if (opts?.bumpContentVersion) {
        this.state.contentVersion = (this.state.contentVersion || 1) + 1;
      }
      this.writeToDisk(this.state);
      this.sessionActivityDirty = false;
      return out;
    });
    this.writeQueue = task.catch(() => undefined);
    return task;
  }

  public flushPendingNow(): void {
    if (this.sessionActivityDirty) {
      try {
        this.writeToDisk(this.state);
        this.sessionActivityDirty = false;
      } catch (err) {
        console.warn('[MoA DB] Error flushing pending state:', err);
      }
    }
  }
}

export const dbStore = new Store();
