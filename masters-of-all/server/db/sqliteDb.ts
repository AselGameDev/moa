import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseState, ServerUserRecord } from './schema';
import { CURRENT_SCHEMA_VERSION } from './schema';
import { INITIAL_SETTINGS, INITIAL_SITE_CONTENT } from '../../src/data/initialData';
import { DEFAULT_ROLES } from '../../src/shared/permissions';

const openedDbs = new Map<string, DatabaseSync>();

export function getSqliteDbPath(customDataDir?: string): string {
  const dataDir = path.resolve(customDataDir || process.env.MOA_DATA_DIR || 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'moa.sqlite');
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_credentials (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_log (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publications (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_history (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
  `);
}

export function getSharedSqliteConnection(customDataDir?: string): DatabaseSync {
  const dbPath = getSqliteDbPath(customDataDir);
  const existing = openedDbs.get(dbPath);
  if (existing) return existing;

  const db = new DatabaseSync(dbPath);
  initSchema(db);
  openedDbs.set(dbPath, db);
  return db;
}

export function hasSqliteDatabase(customDataDir?: string): boolean {
  const dbPath = getSqliteDbPath(customDataDir);
  if (!fs.existsSync(dbPath)) return false;
  const db = getSharedSqliteConnection(customDataDir);
  const row = db
    .prepare(`SELECT value FROM app_meta WHERE key = 'initialized' LIMIT 1`)
    .get() as { value: string } | undefined;
  if (row?.value === '1') return true;
  // Also consider populated if settings + at least one user exist
  const settingsRow = db
    .prepare(`SELECT value FROM app_meta WHERE key = 'settings' LIMIT 1`)
    .get() as { value: string } | undefined;
  const userCount = db.prepare(`SELECT COUNT(*) as cnt FROM users`).get() as { cnt: number } | undefined;
  return Boolean(settingsRow && (userCount?.cnt || 0) > 0);
}

function readCollection<T>(db: DatabaseSync, tableName: string): T[] {
  const rows = db
    .prepare(`SELECT data FROM ${tableName} ORDER BY sort_index ASC`)
    .all() as Array<{ data: string }>;
  const out: T[] = [];
  for (const r of rows) {
    try {
      out.push(JSON.parse(r.data) as T);
    } catch {
      // Skip malformed row gracefully
    }
  }
  return out;
}

function writeCollection<T>(
  db: DatabaseSync,
  tableName: string,
  items: T[],
  getId: (item: T, index: number) => string
): void {
  db.exec(`DELETE FROM ${tableName}`);
  const stmt = db.prepare(`INSERT INTO ${tableName} (id, sort_index, data) VALUES (?, ?, ?)`);
  items.forEach((item, idx) => {
    stmt.run(getId(item, idx), idx, JSON.stringify(item));
  });
}

export function loadDatabaseFromSqlite(customDataDir?: string): DatabaseState {
  const db = getSharedSqliteConnection(customDataDir);

  const metaRows = db.prepare(`SELECT key, value FROM app_meta`).all() as Array<{
    key: string;
    value: string;
  }>;
  const metaMap = new Map<string, string>();
  for (const r of metaRows) {
    metaMap.set(r.key, r.value);
  }

  const parseMetaJson = <T>(key: string, fallback: T): T => {
    const raw = metaMap.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const schemaVersion = Number(metaMap.get('schemaVersion') || CURRENT_SCHEMA_VERSION) || CURRENT_SCHEMA_VERSION;
  const contentVersion = Number(metaMap.get('contentVersion') || 1) || 1;
  const settings = parseMetaJson('settings', JSON.parse(JSON.stringify(INITIAL_SETTINGS)));
  const pageContent = parseMetaJson('pageContent', JSON.parse(JSON.stringify(INITIAL_SITE_CONTENT)));
  const draftRaw = metaMap.get('draftContent');
  let draftContent: DatabaseState['draftContent'] = undefined;
  if (draftRaw) {
    try {
      const parsedDraft = JSON.parse(draftRaw);
      if (parsedDraft && typeof parsedDraft === 'object') {
        draftContent = parsedDraft;
      }
    } catch {
      draftContent = undefined;
    }
  }

  const users = readCollection<ServerUserRecord>(db, 'users');
  const credRows = db
    .prepare(`SELECT user_id, email, password_hash, salt FROM user_credentials`)
    .all() as Array<{ user_id: string; email: string; password_hash: string; salt: string }>;
  const credByUserId = new Map(credRows.map(c => [c.user_id, c]));
  for (const u of users) {
    const cred = credByUserId.get(u.id);
    if (cred) {
      u.email = cred.email;
      u.passwordHash = cred.password_hash;
      u.salt = cred.salt;
    }
  }

  const roles = readCollection<DatabaseState['roles'][number]>(db, 'roles');

  return {
    schemaVersion,
    contentVersion,
    users,
    roles: roles.length > 0 ? roles : JSON.parse(JSON.stringify(DEFAULT_ROLES)),
    sessions: readCollection(db, 'sessions'),
    passwordResets: readCollection(db, 'password_resets'),
    activityLog: readCollection(db, 'activity_log'),
    securityLog: readCollection(db, 'security_log'),
    departments: readCollection(db, 'departments'),
    projects: readCollection(db, 'projects'),
    publications: readCollection(db, 'publications'),
    products: readCollection(db, 'products'),
    media: readCollection(db, 'media'),
    settings,
    pageContent,
    ...(draftContent ? { draftContent } : {}),
    contentHistory: readCollection(db, 'content_history'),
    pages: readCollection(db, 'pages'),
    submissions: readCollection(db, 'submissions'),
    invitations: readCollection(db, 'invitations')
  };
}

export function saveDatabaseToSqlite(state: DatabaseState, customDataDir?: string): void {
  const db = getSharedSqliteConnection(customDataDir);
  db.exec('BEGIN IMMEDIATE');
  try {
    const upsertMeta = db.prepare(`
      INSERT INTO app_meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    upsertMeta.run('initialized', '1');
    upsertMeta.run('schemaVersion', String(state.schemaVersion ?? CURRENT_SCHEMA_VERSION));
    upsertMeta.run('contentVersion', String(state.contentVersion ?? 1));
    upsertMeta.run('settings', JSON.stringify(state.settings || {}));
    upsertMeta.run('pageContent', JSON.stringify(state.pageContent || {}));
    if (state.draftContent && Object.keys(state.draftContent).length > 0) {
      upsertMeta.run('draftContent', JSON.stringify(state.draftContent));
    } else {
      db.prepare(`DELETE FROM app_meta WHERE key = 'draftContent'`).run();
    }

    // Users table
    db.exec('DELETE FROM users');
    const insertUser = db.prepare(`INSERT INTO users (id, email, sort_index, data) VALUES (?, ?, ?, ?)`);
    const seenEmails = new Set<string>();
    (state.users || []).forEach((u, idx) => {
      const emailLower = (u.email || `${u.id}@local`).trim().toLowerCase();
      const uniqueEmail = seenEmails.has(emailLower) ? `${u.id}:${emailLower}` : emailLower;
      seenEmails.add(uniqueEmail);
      insertUser.run(u.id, uniqueEmail, idx, JSON.stringify(u));
    });

    // Keep user_credentials synchronized for customized & invited/reset accounts
    const nowIso = new Date().toISOString();
    const upsertCred = db.prepare(`
      INSERT INTO user_credentials (user_id, email, password_hash, salt, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        password_hash = excluded.password_hash,
        salt = excluded.salt,
        updated_at = excluded.updated_at
    `);
    for (const u of state.users || []) {
      if (u.id && u.email && u.passwordHash && u.salt && u.credentialsCustomized) {
        upsertCred.run(u.id, u.email.trim().toLowerCase(), u.passwordHash, u.salt, nowIso);
      }
    }

    writeCollection(db, 'roles', state.roles || [], (r, i) => r.id || `role-${i}`);
    writeCollection(
      db,
      'sessions',
      state.sessions || [],
      (s, i) => s.token || s.id || `sess-${i}`
    );
    writeCollection(
      db,
      'password_resets',
      state.passwordResets || [],
      (r, i) => r.id || r.tokenHash || `reset-${i}`
    );
    writeCollection(db, 'activity_log', state.activityLog || [], (a, i) => a.id || `act-${i}`);
    writeCollection(db, 'security_log', state.securityLog || [], (s, i) => s.id || `sec-${i}`);
    writeCollection(db, 'departments', state.departments || [], (d, i) => d.id || `dept-${i}`);
    writeCollection(db, 'projects', state.projects || [], (p, i) => p.id || `proj-${i}`);
    writeCollection(db, 'publications', state.publications || [], (p, i) => p.id || `pub-${i}`);
    writeCollection(db, 'products', state.products || [], (p, i) => p.id || `prod-${i}`);
    writeCollection(db, 'media', state.media || [], (m, i) => m.id || `med-${i}`);
    writeCollection(db, 'content_history', state.contentHistory || [], (h, i) => h.id || `hist-${i}`);
    writeCollection(db, 'pages', state.pages || [], (p, i) => p.id || `page-${i}`);
    writeCollection(db, 'submissions', state.submissions || [], (s, i) => s.id || `sub-${i}`);
    writeCollection(db, 'invitations', state.invitations || [], (inv, i) => inv.id || `inv-${i}`);

    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }
    throw err;
  }
}
