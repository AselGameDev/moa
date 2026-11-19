import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
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

function initSchema(db: DatabaseSync, journalMode: 'WAL' | 'DELETE' = 'WAL'): void {
  db.exec(`
    PRAGMA journal_mode = ${journalMode};
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

    CREATE TABLE IF NOT EXISTS media_blobs (
      filename TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      content BLOB NOT NULL,
      updated_at TEXT NOT NULL
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

export interface MediaBlobRecord {
  filename: string;
  mimeType: string;
  size: number;
  content: Buffer;
  updatedAt: string;
}

export function normalizeUploadFilename(urlOrName: string): string {
  const base = String(urlOrName || '').split('?')[0].trim();
  if (!base) return '';
  return path.basename(base);
}

function inferMimeTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    default:
      return 'application/octet-stream';
  }
}

export function saveMediaBlobToSqlite(
  urlOrFilename: string,
  mimeType: string,
  content: Buffer,
  customDataDir?: string
): void {
  const filename = normalizeUploadFilename(urlOrFilename);
  if (!filename) return;
  const db = getSharedSqliteConnection(customDataDir);
  db.prepare(`
    INSERT INTO media_blobs (filename, mime_type, size, content, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(filename) DO UPDATE SET
      mime_type = excluded.mime_type,
      size = excluded.size,
      content = excluded.content,
      updated_at = excluded.updated_at
  `).run(filename, mimeType || 'application/octet-stream', content.length, content, new Date().toISOString());
}

export function getMediaBlobFromSqlite(urlOrFilename: string, customDataDir?: string): MediaBlobRecord | null {
  const filename = normalizeUploadFilename(urlOrFilename);
  if (!filename) return null;
  const db = getSharedSqliteConnection(customDataDir);
  const row = db
    .prepare(`SELECT filename, mime_type, size, content, updated_at FROM media_blobs WHERE filename = ? LIMIT 1`)
    .get(filename) as
    | { filename: string; mime_type: string; size: number; content: Uint8Array | Buffer; updated_at: string }
    | undefined;
  if (!row) return null;
  const contentBuf = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content);
  return {
    filename: row.filename,
    mimeType: row.mime_type,
    size: Number(row.size) || contentBuf.length,
    content: contentBuf,
    updatedAt: row.updated_at
  };
}

export function deleteMediaBlobFromSqlite(urlOrFilename: string, customDataDir?: string): void {
  const filename = normalizeUploadFilename(urlOrFilename);
  if (!filename) return;
  const db = getSharedSqliteConnection(customDataDir);
  db.prepare(`DELETE FROM media_blobs WHERE filename = ?`).run(filename);
}

export function listMediaBlobsFromSqlite(customDataDir?: string): MediaBlobRecord[] {
  const db = getSharedSqliteConnection(customDataDir);
  const rows = db
    .prepare(`SELECT filename, mime_type, size, content, updated_at FROM media_blobs ORDER BY filename ASC`)
    .all() as Array<{
    filename: string;
    mime_type: string;
    size: number;
    content: Uint8Array | Buffer;
    updated_at: string;
  }>;
  return rows.map(row => {
    const contentBuf = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content);
    return {
      filename: row.filename,
      mimeType: row.mime_type,
      size: Number(row.size) || contentBuf.length,
      content: contentBuf,
      updatedAt: row.updated_at
    };
  });
}

export function importMediaBlobsToSqlite(blobs: MediaBlobRecord[], customDataDir?: string): void {
  if (!Array.isArray(blobs) || blobs.length === 0) return;
  const db = getSharedSqliteConnection(customDataDir);
  db.exec('BEGIN IMMEDIATE');
  try {
    const stmt = db.prepare(`
      INSERT INTO media_blobs (filename, mime_type, size, content, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(filename) DO UPDATE SET
        mime_type = excluded.mime_type,
        size = excluded.size,
        content = excluded.content,
        updated_at = excluded.updated_at
    `);
    for (const blob of blobs) {
      const filename = normalizeUploadFilename(blob.filename);
      if (!filename || !blob.content) continue;
      const contentBuf = Buffer.isBuffer(blob.content) ? blob.content : Buffer.from(blob.content);
      stmt.run(
        filename,
        blob.mimeType || inferMimeTypeFromExt(path.extname(filename)),
        contentBuf.length,
        contentBuf,
        blob.updatedAt || new Date().toISOString()
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback error
    }
    throw err;
  }
}

export function ingestLegacyDiskUploadsToSqlite(uploadsDir: string, customDataDir?: string): number {
  if (!uploadsDir || !fs.existsSync(uploadsDir)) return 0;
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(uploadsDir);
  } catch {
    return 0;
  }

  let migratedCount = 0;
  const db = getSharedSqliteConnection(customDataDir);
  for (const entry of entries) {
    const fullPath = path.join(uploadsDir, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile() || entry.startsWith('.')) continue;
      const filename = normalizeUploadFilename(entry);
      if (!filename) continue;
      const existing = db.prepare(`SELECT 1 FROM media_blobs WHERE filename = ? LIMIT 1`).get(filename);
      if (!existing) {
        const buf = fs.readFileSync(fullPath);
        const mimeType = inferMimeTypeFromExt(path.extname(filename));
        saveMediaBlobToSqlite(filename, mimeType, buf, customDataDir);
        migratedCount++;
      }
      fs.unlinkSync(fullPath);
    } catch {
      // Ignore individual legacy file migration failure
    }
  }
  return migratedCount;
}

export const SQLITE_MAGIC_HEADER = 'SQLite format 3\0';

export function isValidSqliteBuffer(buf: Buffer): boolean {
  return Buffer.isBuffer(buf) && buf.length >= 100 && buf.subarray(0, 16).toString('utf8') === SQLITE_MAGIC_HEADER;
}

function initSnapshotSchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
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

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      sort_index INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_blobs (
      filename TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      content BLOB NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function exportSafeSqliteSnapshot(state: DatabaseState, customDataDir?: string): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moa-snap-export-'));
  const tmpFile = path.join(tmpDir, 'moa_snapshot.sqlite');
  let db: DatabaseSync | null = null;
  try {
    const settingsCopy = state.settings ? JSON.parse(JSON.stringify(state.settings)) : {};
    delete settingsCopy.theme;

    const mediaBlobs = listMediaBlobsFromSqlite(customDataDir);

    db = new DatabaseSync(tmpFile);
    initSnapshotSchema(db);
    db.exec('BEGIN IMMEDIATE');
    try {
      const upsertMeta = db.prepare(`
        INSERT INTO app_meta (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      upsertMeta.run('initialized', '1');
      upsertMeta.run('snapshotFormat', 'moa-sqlite-v2');
      upsertMeta.run('exportedAt', new Date().toISOString());
      upsertMeta.run('schemaVersion', String(state.schemaVersion ?? CURRENT_SCHEMA_VERSION));
      upsertMeta.run('contentVersion', String(state.contentVersion ?? 1));
      upsertMeta.run('settings', JSON.stringify(settingsCopy));
      upsertMeta.run('pageContent', JSON.stringify(state.pageContent || {}));

      writeCollection(db, 'roles', state.roles || [], (r, i) => r.id || `role-${i}`);
      writeCollection(db, 'departments', state.departments || [], (d, i) => d.id || `dept-${i}`);
      writeCollection(db, 'projects', state.projects || [], (p, i) => p.id || `proj-${i}`);
      writeCollection(db, 'publications', state.publications || [], (p, i) => p.id || `pub-${i}`);
      writeCollection(db, 'products', state.products || [], (p, i) => p.id || `prod-${i}`);
      writeCollection(db, 'media', state.media || [], (m, i) => m.id || `med-${i}`);
      writeCollection(db, 'pages', state.pages || [], (p, i) => p.id || `page-${i}`);

      const insertBlob = db.prepare(`
        INSERT INTO media_blobs (filename, mime_type, size, content, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const blob of mediaBlobs) {
        insertBlob.run(blob.filename, blob.mimeType, blob.size, blob.content, blob.updatedAt);
      }

      db.exec('COMMIT');
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore rollback error
      }
      throw err;
    }

    db.close();
    db = null;
    return fs.readFileSync(tmpFile);
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // Ignore close error
      }
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

export function parseSqliteSnapshotBuffer(buf: Buffer): Record<string, unknown> {
  if (!isValidSqliteBuffer(buf)) {
    throw new Error('Invalid snapshot file: only valid SQLite database snapshots (.sqlite) are accepted.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moa-snap-import-'));
  const tmpFile = path.join(tmpDir, 'restore.sqlite');
  let db: DatabaseSync | null = null;
  try {
    fs.writeFileSync(tmpFile, buf);
    try {
      db = new DatabaseSync(tmpFile, { readOnly: true });
    } catch {
      throw new Error('Unable to open SQLite snapshot database. The file may be corrupted.');
    }

    let tableRows: Array<{ name: string }> = [];
    try {
      tableRows = db
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
        .all() as Array<{ name: string }>;
    } catch {
      throw new Error('Corrupted or invalid SQLite snapshot file.');
    }

    const tables = new Set(tableRows.map(t => t.name));
    if (!tables.has('app_meta') || !tables.has('departments')) {
      throw new Error('Invalid MoA snapshot: required SQLite tables (app_meta, departments) are missing.');
    }

    const metaRows = db.prepare(`SELECT key, value FROM app_meta`).all() as Array<{ key: string; value: string }>;
    const metaMap = new Map(metaRows.map(r => [r.key, r.value]));

    const parseJson = (raw: string | undefined, label: string): unknown => {
      if (!raw) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`Invalid SQLite snapshot: malformed JSON in ${label}.`);
      }
    };

    const settings = parseJson(metaMap.get('settings'), 'app_meta.settings');
    const pageContent = parseJson(metaMap.get('pageContent'), 'app_meta.pageContent');
    const schemaVersion = Number(metaMap.get('schemaVersion') || CURRENT_SCHEMA_VERSION) || CURRENT_SCHEMA_VERSION;

    const readOptional = (tableName: string) =>
      tables.has(tableName) ? readCollection<unknown>(db!, tableName) : [];

    const mediaBlobs: MediaBlobRecord[] = tables.has('media_blobs')
      ? (
          db
            .prepare(`SELECT filename, mime_type, size, content, updated_at FROM media_blobs`)
            .all() as Array<{
            filename: string;
            mime_type: string;
            size: number;
            content: Uint8Array | Buffer;
            updated_at: string;
          }>
        ).map(row => {
          const contentBuf = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content);
          return {
            filename: row.filename,
            mimeType: row.mime_type,
            size: Number(row.size) || contentBuf.length,
            content: contentBuf,
            updatedAt: row.updated_at
          };
        })
      : [];

    return {
      version: 2,
      schemaVersion,
      roles: readOptional('roles'),
      departments: readCollection<unknown>(db, 'departments'),
      projects: readOptional('projects'),
      publications: readOptional('publications'),
      products: readOptional('products'),
      media: readOptional('media'),
      mediaBlobs,
      settings,
      pageContent: pageContent || {},
      pages: readOptional('pages')
    };
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // Ignore close error
      }
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

