import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { DEFAULT_ROLES } from '../../src/shared/permissions';
import { INITIAL_DEPARTMENTS, INITIAL_SETTINGS, INITIAL_SITE_CONTENT } from '../../src/data/initialData';
import type { DatabaseState, ServerUserRecord } from './schema';
import { CURRENT_SCHEMA_VERSION } from './schema';
import { runMigrations } from './migrations';
import { generateSecurePassword, hashPassword } from '../utils/crypto';
import { collectUploadUrlsFromItems, purgeOrphanUploadUrls } from '../utils/mediaUsage';

export const DATA_DIR = path.resolve(process.env.MOA_DATA_DIR || 'data');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const UPLOADS_DIR = path.resolve(process.env.MOA_UPLOADS_DIR || 'public/uploads');
export const DB_FILE = path.join(DATA_DIR, 'database.json');
const MAX_ROLLING_BACKUPS = 5;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function writeAtomic(filePath: string, content: string): void {
  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.tmp.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`
  );
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
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

function createInitialDatabase(): DatabaseState {
  const isProd = process.env.NODE_ENV === 'production';
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const envPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  const strongEnvPass = Boolean(envPassword && envPassword.length >= 12 && /[A-Z]/.test(envPassword) && /\d/.test(envPassword) && /[^A-Za-z0-9]/.test(envPassword));
  const initialPassword = strongEnvPass && envPassword ? envPassword : generateSecurePassword(16);

  if (!strongEnvPass) {
    if (envPassword) {
      console.warn('[MoA First Run] INITIAL_ADMIN_PASSWORD did not meet the 12+ character complexity policy; generated a secure random password instead.');
    }
    console.log('\n============================================================');
    console.log('[MoA First Run] Founder admin account created:');
    console.log('  Email: admin@mastersofall.org');
    console.log(`  One-time initial password: ${initialPassword}`);
    console.log(`  ${isProd ? 'Password change and 2FA setup are required on first sign-in.' : 'Change this password on first sign-in.'}`);
    console.log('============================================================\n');
  } else {
    console.log('[MoA First Run] Founder admin account seeded using INITIAL_ADMIN_PASSWORD (mustChangePassword=true).');
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
    mustChangePassword: true,
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

export function createBackupFile(reason: 'auto' | 'pre-import' | 'pre-migration', serialized?: string): void {
  ensureDirectories();
  const payload = serialized ?? (fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE, 'utf-8') : '');
  if (!payload || payload.trim().length === 0) return;

  const filename = `database-${reason}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}.json`;
  writeAtomic(path.join(BACKUPS_DIR, filename), payload);

  if (reason === 'auto') {
    try {
      const files = fs
        .readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('database-auto-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime);

      for (const stale of files.slice(MAX_ROLLING_BACKUPS)) {
        fs.unlinkSync(path.join(BACKUPS_DIR, stale.name));
      }
    } catch (err) {
      console.warn('[MoA Backup] Could not prune old auto backups:', err);
    }
  }
}

function tryRecoverFromBackup(): Record<string, unknown> | null {
  if (!fs.existsSync(BACKUPS_DIR)) return null;
  const backups = fs
    .readdirSync(BACKUPS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      fullPath: path.join(BACKUPS_DIR, f),
      mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const candidate of backups) {
    try {
      const raw = fs.readFileSync(candidate.fullPath, 'utf-8').trim();
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (isValidDatabaseShape(parsed)) {
        console.warn(`[MoA DB] Recovered database from backup: ${candidate.name}`);
        writeAtomic(DB_FILE, JSON.stringify(parsed, null, 2));
        return parsed;
      }
    } catch {
      // Try older backup
    }
  }
  return null;
}

export function reconcileTestAccounts(db: DatabaseState): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  const enableTestAccounts = !isProd || process.env.ENABLE_TEST_ACCOUNTS === 'true';
  let changed = false;

  // Always remove any leftover separate "usr-test-admin" (Test Admin) account
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

    // Ensure founder Muslim Mehdi exists with admin@mastersofall.org and dev password
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

    // Ensure demo Member test account (solo@mastersofall.org)
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
    // Production without ENABLE_TEST_ACCOUNTS=true: NEVER create test accounts; deactivate any test-only accounts and wipe their sessions
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
          `🚨 [MoA PRODUCTION SECURITY WARNING] Test account "${u.email}" exists in production database — deactivated! Delete this account from Team before launch.`
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
  const expiredPages = db.pages.filter(p => p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff);

  const totalExpired =
    expiredDepts.length + expiredProjs.length + expiredPubs.length + expiredProds.length + expiredPages.length;
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
  db.pages = db.pages.filter(p => !(p.deletedAt && new Date(p.deletedAt).getTime() <= cutoff));

  purgeOrphanUploadUrls(db, UPLOADS_DIR, candidateUrls);
  return true;
}

export function purgeExpiredSessionsInDb(db: DatabaseState): boolean {
  const timeoutMinutes = db.settings?.securityPolicy?.sessionTimeoutMinutes || 120;
  const maxIdleMs = Math.max(5, timeoutMinutes) * 60 * 1000;
  const now = Date.now();
  const beforeSess = db.sessions.length;
  db.sessions = db.sessions.filter(s => now - (s.lastActivity || 0) <= maxIdleMs);
  const beforeResets = db.passwordResets.length;
  db.passwordResets = db.passwordResets.filter(
    r => !r.usedAt && new Date(r.expiresAt).getTime() > now
  );
  return db.sessions.length !== beforeSess || db.passwordResets.length !== beforeResets;
}

class Store {
  private db: DatabaseState;
  private writeChain: Promise<unknown> = Promise.resolve();
  private flushTimer: NodeJS.Timeout | null = null;
  private pendingLowValueDirty = false;

  constructor() {
    this.db = this.initialize();
  }

  private initialize(): DatabaseState {
    ensureDirectories();
    if (!fs.existsSync(DB_FILE)) {
      const fresh = createInitialDatabase();
      reconcileTestAccounts(fresh);
      writeAtomic(DB_FILE, JSON.stringify(fresh, null, 2));
      return fresh;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const trimmed = raw.trim();
    let parsed: Record<string, unknown> | null = null;

    if (trimmed.length > 0) {
      try {
        const candidate = JSON.parse(trimmed);
        if (isValidDatabaseShape(candidate)) {
          parsed = candidate;
        }
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      const corruptPath = path.join(DATA_DIR, `database.corrupt-${Date.now()}.json`);
      try {
        fs.copyFileSync(DB_FILE, corruptPath);
        console.error(`[MoA DB] CRITICAL: Corrupt database quarantined at ${corruptPath}`);
      } catch (err) {
        console.error('[MoA DB] Failed quarantining corrupt DB:', err);
      }

      const recovered = tryRecoverFromBackup();
      if (!recovered) {
        throw new Error(
          `[MoA DB] Refusing to start: database.json is corrupt (${corruptPath}) and no valid backup exists.`
        );
      }
      parsed = recovered;
    }

    const existingSchemaVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 0;
    if (existingSchemaVersion < CURRENT_SCHEMA_VERSION) {
      // Mandatory backup BEFORE running migrations (Rule S4 + Item 17)
      createBackupFile('pre-migration', raw);
    }

    const { db, appliedVersions } = runMigrations(parsed);
    const reconciled = reconcileTestAccounts(db);
    const purgedSessions = purgeExpiredSessionsInDb(db);
    const purgedTrash = purgeExpiredTrashInDb(db);

    if (appliedVersions.length > 0 || reconciled || purgedSessions || purgedTrash) {
      if (appliedVersions.length > 0) {
        console.log(`[MoA DB] Applied migrations: v${appliedVersions.join(', v')}`);
      }
      writeAtomic(DB_FILE, JSON.stringify(db, null, 2));
    }

    return db;
  }

  public read(): DatabaseState {
    return this.db;
  }

  /**
   * Reload from disk (useful in tests or external checks)
   */
  public reloadFromDisk(): DatabaseState {
    this.db = this.initialize();
    return this.db;
  }

  /**
   * Single-writer serialized write-through persistence.
   * Ensures disk write completes atomically BEFORE resolving.
   */
  public write<T>(
    mutator: (db: DatabaseState) => T,
    opts?: { skipBackup?: boolean; bumpContentVersion?: boolean }
  ): Promise<T> {
    const run = (): T => {
      const result = mutator(this.db);
      if (opts?.bumpContentVersion) {
        this.db.contentVersion = (this.db.contentVersion || 1) + 1;
      }
      this.persistNow({ skipBackup: opts?.skipBackup });
      return result;
    };

    const next = this.writeChain.then(run, run);
    this.writeChain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  /**
   * Low-value debounced flush (allowed by Item 18 ONLY for session lastActivity).
   */
  public markSessionActivityDirty(): void {
    this.pendingLowValueDirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushPendingNow();
    }, 5000);
    this.flushTimer.unref();
  }

  public flushPendingNow(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pendingLowValueDirty) {
      this.pendingLowValueDirty = false;
      this.persistNow({ skipBackup: true });
    }
  }

  private persistNow(opts?: { skipBackup?: boolean }): void {
    ensureDirectories();
    const serialized = JSON.stringify(this.db, null, 2);
    if (!opts?.skipBackup && fs.existsSync(DB_FILE)) {
      const now = Date.now();
      if (now - lastAutoBackupAt >= 15_000) {
        try {
          createBackupFile('auto');
          lastAutoBackupAt = now;
        } catch (err) {
          console.warn('[MoA Backup] Auto backup warning:', err);
        }
      }
    }
    writeAtomic(DB_FILE, serialized);
  }
}

export const dbStore = new Store();
