import { getSharedSqliteConnection } from './sqliteDb';

export interface SqliteCredentialRecord {
  userId: string;
  email: string;
  passwordHash: string;
  salt: string;
  updatedAt: string;
}

export function upsertCredentialInSqlite(record: SqliteCredentialRecord): void {
  const db = getSharedSqliteConnection();
  const cleanEmail = record.email.trim().toLowerCase();
  const nowIso = record.updatedAt || new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO user_credentials (user_id, email, password_hash, salt, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      email = excluded.email,
      password_hash = excluded.password_hash,
      salt = excluded.salt,
      updated_at = excluded.updated_at
  `);
  stmt.run(record.userId, cleanEmail, record.passwordHash, record.salt, nowIso);
}

export function getCredentialByUserIdFromSqlite(userId: string): SqliteCredentialRecord | null {
  const db = getSharedSqliteConnection();
  const row = db
    .prepare(
      `SELECT user_id, email, password_hash, salt, updated_at FROM user_credentials WHERE user_id = ? LIMIT 1`
    )
    .get(userId) as
    | {
        user_id: string;
        email: string;
        password_hash: string;
        salt: string;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    userId: row.user_id,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.salt,
    updatedAt: row.updated_at
  };
}

export function getCredentialByEmailFromSqlite(email: string): SqliteCredentialRecord | null {
  const db = getSharedSqliteConnection();
  const cleanEmail = email.trim().toLowerCase();
  const row = db
    .prepare(
      `SELECT user_id, email, password_hash, salt, updated_at FROM user_credentials WHERE LOWER(email) = LOWER(?) LIMIT 1`
    )
    .get(cleanEmail) as
    | {
        user_id: string;
        email: string;
        password_hash: string;
        salt: string;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    userId: row.user_id,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.salt,
    updatedAt: row.updated_at
  };
}
