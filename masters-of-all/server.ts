import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type {
  Department,
  Product,
  Project,
  Publication,
  PublicationStatus
} from './src/types/index';
import {
  can,
  hasPortalAccess,
  normalizeRoleId,
  resolvePermissions,
  type PermissionKey
} from './src/shared/permissions';
import { isSafeUrl, normalizeSlug } from './src/shared/url';
import { INITIAL_SITE_CONTENT } from './src/data/initialData';
import type { ServerSessionRecord, ServerUserRecord } from './server/db/schema';
import {
  BACKUPS_DIR,
  DATA_DIR,
  UPLOADS_DIR,
  dbStore,
  ensureDirectories
} from './server/db/store';
import {
  getCredentialByEmailFromSqlite,
  getCredentialByUserIdFromSqlite,
  upsertCredentialInSqlite
} from './server/db/sqliteAuth';
import {
  EMAIL_REGEX,
  activityRepo,
  addAutoRedirect,
  appendActivity,
  appendSecurityLog,
  backupsRepo,
  departmentsRepo,
  getContentVersion,
  invitationsRepo,
  mediaRepo,
  mergeSiteContentPatch,
  normalizePermissionsInput,
  normalizeRedirectPath,
  pageContentRepo,
  pagesRepo,
  processScheduledPublications,
  productsRepo,
  projectsRepo,
  publicationsRepo,
  rolesRepo,
  sanitizeStringArray,
  sanitizeUserResponse,
  securityLogRepo,
  sessionsRepo,
  settingsRepo,
  submissionsRepo,
  trashRepo,
  usersRepo,
  wouldCreateRedirectLoop
} from './server/db/repositories';
import {
  base32Encode,
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateSecurePassword,
  hashPassword,
  timingSafeTokenEqual,
  validatePasswordAgainstPolicy,
  verifyPassword,
  verifyTotpCode
} from './server/utils/crypto';
import {
  isSmtpConfigured,
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendSubmissionNotificationEmail
} from './server/utils/email';
import {
  AUDIO_MAX_BYTES,
  DOC_MAX_BYTES,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  detectMediaByMagicBytes
} from './server/utils/mediaUsage';
import {
  validateBlocksUrls,
  validateDocumentsAndLinks,
  validateFooterColumnsUrls,
  validateNavigationUrls,
  validateSafeUrlField,
  validateUrlList
} from './server/utils/urlValidation';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

ensureDirectories();

const app = express();
app.disable('x-powered-by');
app.use(compression());

// Configurable trust proxy
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv !== undefined && trustProxyEnv !== '') {
  if (trustProxyEnv === 'true') app.set('trust proxy', true);
  else if (trustProxyEnv === 'false') app.set('trust proxy', false);
  else if (!Number.isNaN(Number(trustProxyEnv))) app.set('trust proxy', Number(trustProxyEnv));
  else app.set('trust proxy', trustProxyEnv);
} else {
  app.set('trust proxy', 1);
}

// ============================================================================
// SENSITIVE FILE GUARD (Dev & Prod: 404 on /data, /server*, /.env*, /package*, etc.)
// ============================================================================

const BLOCKED_PATH_PREFIXES = ['/data', '/server', '/tests'];
const BLOCKED_EXACT_PATHS = new Set([
  '/data',
  '/server.ts',
  '/package.json',
  '/package-lock.json',
  '/bun.lock',
  '/tsconfig.json',
  '/vite.config.ts'
]);

app.use((req: Request, res: Response, next: NextFunction) => {
  const lowerPath = req.path.toLowerCase();
  if (
    BLOCKED_EXACT_PATHS.has(lowerPath) ||
    lowerPath.startsWith('/.env') ||
    lowerPath.startsWith('/.git') ||
    BLOCKED_PATH_PREFIXES.some(prefix => lowerPath === prefix || lowerPath.startsWith(`${prefix}/`))
  ) {
    return res.status(404).type('text/plain').send('Not Found');
  }
  return next();
});

// ============================================================================
// SECURITY HEADERS, CORS & CSRF PROTECTION
// ============================================================================

const configuredAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

function getAllowedOriginsForRequest(req: Request): Set<string> {
  const allowed = new Set<string>(configuredAllowedOrigins);
  const host = req.get('host');
  if (host) {
    allowed.add(`${req.protocol}://${host}`);
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  if (process.env.APP_URL) {
    try {
      allowed.add(new URL(process.env.APP_URL).origin);
    } catch {
      // Ignore invalid APP_URL
    }
  }
  return allowed;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self'${!isProd ? " 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
    `connect-src 'self'${!isProd ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  if (isProd && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOriginsForRequest(req);
  if (origin) {
    if (allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MoA-Request');
    } else if (req.method === 'OPTIONS') {
      return res.status(403).json({ error: 'CORS origin not allowed' });
    }
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.path.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'Cross-origin mutation blocked' });
    }
    if (!origin && req.headers.referer) {
      try {
        const refOrigin = new URL(req.headers.referer).origin;
        if (!allowedOrigins.has(refOrigin)) {
          return res.status(403).json({ error: 'Cross-origin referer blocked' });
        }
      } catch {
        return res.status(403).json({ error: 'Invalid referer header' });
      }
    }
  }

  return next();
});

// ============================================================================
// BODY PARSERS (Large upload/import parsers run ONLY AFTER auth + permissions!)
// ============================================================================

const defaultJsonParser = express.json({ limit: '512kb' });
const submissionJsonParser = express.json({ limit: '16kb' });
const importJsonParser = express.json({ limit: '25mb' });
const uploadJsonParser = express.json({ limit: '280mb' });

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' && req.path === '/api/submissions') {
    return submissionJsonParser(req, res, next);
  }
  if (req.method === 'POST' && req.path === '/api/backup/import') {
    return next(); // Auth & requirePermission run before importJsonParser on the route
  }
  if (req.method === 'POST' && (req.path === '/api/media' || /^\/api\/media\/[^/]+\/replace$/.test(req.path))) {
    return next(); // Auth & requirePermission run before uploadJsonParser on the route
  }
  return defaultJsonParser(req, res, next);
});

// No-store on API responses so CDN/browser/proxy never serves stale CMS data
app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ============================================================================
// RATE LIMITING & AUTH / RBAC MIDDLEWARE
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: ServerUserRecord;
  session?: ServerSessionRecord;
}

const failedLoginBuckets = new Map<string, { count: number; lockedUntil: number }>();
const submissionRateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkLoginBucket(key: string, maxAttempts: number): boolean {
  const record = failedLoginBuckets.get(key);
  if (!record) return true;
  const now = Date.now();
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    failedLoginBuckets.delete(key);
    return true;
  }
  if (record.lockedUntil > now) return false;
  return record.count < maxAttempts;
}

function recordLoginFailure(key: string, maxAttempts: number, lockoutMinutes: number) {
  const now = Date.now();
  const existing = failedLoginBuckets.get(key);
  const current =
    existing && (existing.lockedUntil === 0 || existing.lockedUntil > now)
      ? existing
      : { count: 0, lockedUntil: 0 };
  current.count += 1;
  if (current.count >= maxAttempts) {
    // Cap lockout duration cleanly to at most 15 minutes for test/admin safety while strictly respecting policy up to 15m
    const boundedMinutes = Math.min(15, Math.max(1, lockoutMinutes));
    current.lockedUntil = now + boundedMinutes * 60 * 1000;
  }
  failedLoginBuckets.set(key, current);
}

function clearLoginFailure(key: string) {
  failedLoginBuckets.delete(key);
}

function checkSubmissionRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const record = submissionRateBuckets.get(ip);
  if (!record || record.resetAt <= now) {
    submissionRateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= 5) return false;
  record.count += 1;
  return true;
}

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  const proto = req.headers['x-forwarded-proto'] === 'https' || req.secure ? 'https' : req.protocol;
  const host = req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function getOptionalAuthUser(req: Request): ServerUserRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const session = sessionsRepo.findByToken(token);
  if (!session) return null;
  const timeoutMinutes = settingsRepo.get().securityPolicy?.sessionTimeoutMinutes || 120;
  if (Date.now() - session.lastActivity > Math.max(5, timeoutMinutes) * 60 * 1000) return null;
  const user = usersRepo.getById(session.userId);
  if (!user || user.deactivated) return null;
  return user;
}

function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  const session = sessionsRepo.findByToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const settings = settingsRepo.get();
  const timeoutMinutes = settings.securityPolicy?.sessionTimeoutMinutes || 120;
  const timeoutMs = Math.max(5, timeoutMinutes) * 60 * 1000;
  if (Date.now() - session.lastActivity > timeoutMs) {
    void sessionsRepo.removeByToken(token);
    return res.status(401).json({ error: 'Session expired due to inactivity. Please sign in again.' });
  }

  sessionsRepo.touch(session);

  const user = usersRepo.getById(session.userId);
  if (!user || user.deactivated) {
    void sessionsRepo.removeByToken(token);
    return res.status(401).json({ error: 'User account is deactivated or no longer exists' });
  }

  const roles = rolesRepo.list();
  const roleId = normalizeRoleId(user, roles);
  const allowDevExempt = !isProd || process.env.ENABLE_TEST_ACCOUNTS === 'true';
  const isExemptTest =
    Boolean(user.isTestAccount) ||
    (allowDevExempt && user.email.toLowerCase() === 'admin@mastersofall.org');
  const require2FA =
    !isExemptTest &&
    (isProd || Boolean(settings.securityPolicy?.enforce2FAForAdmins && roleId === 'role-admin'));

  const isAuthBootstrapRoute =
    req.path === '/api/auth/me' ||
    req.path === '/api/auth/change-password' ||
    req.path === '/api/auth/signout' ||
    req.path.startsWith('/api/auth/2fa');

  if (require2FA && !user.twoFactorEnabled && !isAuthBootstrapRoute) {
    return res.status(403).json({
      error: 'Two-factor authentication setup is required before accessing the Control Room.',
      code: '2FA_SETUP_REQUIRED'
    });
  }

  if (!isExemptTest && user.mustChangePassword && !isAuthBootstrapRoute) {
    return res.status(403).json({
      error: 'You must change your temporary password before continuing.',
      code: 'PASSWORD_CHANGE_REQUIRED'
    });
  }

  req.user = user;
  req.session = session;
  return next();
}

function requirePermission(permission: PermissionKey) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!can(user, permission, rolesRepo.list())) {
      return res.status(403).json({ error: `Permission denied (${permission})` });
    }
    return next();
  };
}

function requireAnyPermission(...permissions: PermissionKey[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const roles = rolesRepo.list();
    if (!permissions.some(p => can(user, p, roles))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

function maintenanceGate(req: Request, res: Response, next: NextFunction) {
  const settings = settingsRepo.get();
  if (!settings.maintenanceMode) return next();
  const user = getOptionalAuthUser(req);
  if (user && hasPortalAccess(user, rolesRepo.list())) {
    return next();
  }
  res.setHeader('Retry-After', '300');
  return res.status(503).json({
    maintenance: true,
    error: 'Site is temporarily offline for scheduled maintenance.'
  });
}

function userHasDepartmentAccess(user: ServerUserRecord, deptIds: string[]): boolean {
  if (!Array.isArray(user.departmentScope) || user.departmentScope.length === 0) return true;
  if (!Array.isArray(deptIds) || deptIds.length === 0) return true;
  return deptIds.some(id => user.departmentScope!.includes(id));
}

// Background maintenance timers (sessions & 30-day trash auto-purge & scheduled publish)
setInterval(() => {
  void sessionsRepo.purgeExpired();
  void trashRepo.purgeExpired();
  void processScheduledPublications();
}, 5 * 60 * 1000).unref();

// ============================================================================
// HEALTH, VERSION & MAINTENANCE INFO
// ============================================================================

app.get('/api/health', (_req, res) => {
  const db = dbStore.read();
  return res.json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    schemaVersion: db.schemaVersion,
    contentVersion: db.contentVersion
  });
});

app.get('/api/content-version', (_req, res) => {
  return res.json({ version: getContentVersion() });
});

app.get('/api/maintenance-info', (_req, res) => {
  const settings = settingsRepo.get();
  const pageContent = pageContentRepo.get();
  return res.json({
    maintenanceMode: Boolean(settings.maintenanceMode),
    siteName: settings.siteName,
    moaLogoUrl: settings.moaLogoUrl,
    maintenance: pageContent.maintenance || INITIAL_SITE_CONTENT.maintenance
  });
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

app.get('/api/auth/smtp-status', (_req, res) => {
  return res.json({ smtpConfigured: isSmtpConfigured() });
});

app.post('/api/auth/signin', async (req, res) => {
  const settings = settingsRepo.get();
  const policy = settings.securityPolicy || { maxLoginAttempts: 5, lockoutDurationMinutes: 15 };
  const maxAttempts = Math.max(3, Number(policy.maxLoginAttempts) || 5);
  const lockoutMinutes = Math.min(15, Math.max(1, Number(policy.lockoutDurationMinutes) || 15));

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const twoFactorCode = typeof req.body?.twoFactorCode === 'string' ? req.body.twoFactorCode : '';

  if (!rawEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = rawEmail.trim().toLowerCase();
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${cleanEmail}`;

  if (!checkLoginBucket(ipKey, maxAttempts) || !checkLoginBucket(emailKey, maxAttempts)) {
    return res.status(429).json({
      error: `Too many failed sign-in attempts. Access temporarily locked for ${lockoutMinutes} minutes.`,
      lockoutMinutes
    });
  }

  const sqliteByEmail = getCredentialByEmailFromSqlite(cleanEmail);
  const user = usersRepo.getByEmail(cleanEmail) || (sqliteByEmail ? usersRepo.getById(sqliteByEmail.userId) : undefined);
  if (!user || user.deactivated) {
    recordLoginFailure(ipKey, maxAttempts, lockoutMinutes);
    recordLoginFailure(emailKey, maxAttempts, lockoutMinutes);
    await usersRepo.write(
      db => appendSecurityLog(db, 'Failed sign-in (unknown or deactivated account)', ip, cleanEmail),
      { skipBackup: true }
    );
    return res.status(401).json({ error: "That email and password don't match." });
  }

  const sqliteCred = sqliteByEmail || getCredentialByUserIdFromSqlite(user.id);
  const authSalt = sqliteCred?.salt || user.salt;
  const authHash = sqliteCred?.passwordHash || user.passwordHash;

  if (!verifyPassword(password, authSalt, authHash)) {
    recordLoginFailure(ipKey, maxAttempts, lockoutMinutes);
    recordLoginFailure(emailKey, maxAttempts, lockoutMinutes);
    await usersRepo.write(
      db => appendSecurityLog(db, 'Failed sign-in (incorrect password)', ip, cleanEmail),
      { skipBackup: true }
    );
    return res.status(401).json({ error: "That email and password don't match." });
  }

  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return res.json({ requires2FA: true, message: 'Two-factor authentication code required' });
    }
    const totpCheck = verifyTotpCode(user.twoFactorSecret, twoFactorCode, user.lastTotpStep);
    let usedRecovery = false;
    if (!totpCheck.valid) {
      usedRecovery = await usersRepo.write(db => {
        const u = db.users.find(x => x.id === user.id);
        return u ? consumeRecoveryCode(u, twoFactorCode) : false;
      }, { skipBackup: true });
    }

    if (!totpCheck.valid && !usedRecovery) {
      recordLoginFailure(ipKey, maxAttempts, lockoutMinutes);
      recordLoginFailure(emailKey, maxAttempts, lockoutMinutes);
      await usersRepo.write(
        db => appendSecurityLog(db, 'Failed 2FA verification', ip, cleanEmail),
        { skipBackup: true }
      );
      return res.status(401).json({ error: 'Invalid two-factor authentication or recovery code.' });
    }

    if (totpCheck.valid && totpCheck.step !== undefined) {
      await usersRepo.write(db => {
        const u = db.users.find(x => x.id === user.id);
        if (u) u.lastTotpStep = totpCheck.step;
      }, { skipBackup: true });
    }
  }

  clearLoginFailure(ipKey);
  clearLoginFailure(emailKey);

  const token = crypto.randomBytes(32).toString('hex');
  const sanitized = await usersRepo.write(db => {
    const target = db.users.find(u => u.id === user.id)!;
    const roleId = normalizeRoleId(target, db.roles);
    target.lastSignIn = new Date().toISOString();
    db.sessions.push({
      token,
      userId: target.id,
      role: target.role,
      roleId,
      lastActivity: Date.now(),
      createdAt: Date.now()
    });
    appendActivity(db, target, 'Signed in', 'Auth', 'Control Room');
    return sanitizeUserResponse(target, db);
  });

  return res.json({
    token,
    requires2FASetup: sanitized.requires2FASetup,
    user: sanitized
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkLoginBucket(`forgot:${ip}`, 10)) {
    return res.status(429).json({ error: 'Too many password reset requests. Please try again later.' });
  }

  if (!isSmtpConfigured()) {
    return res.json({
      smtpConfigured: false,
      sent: false,
      message: 'SMTP email is not configured. Contact an administrator to reset your password.'
    });
  }

  const cleanEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  recordLoginFailure(`forgot:${ip}`, 10, 15);
  const user = usersRepo.getByEmail(cleanEmail);

  if (user && !user.deactivated && !user.isTestAccount) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await usersRepo.write(db => {
      db.passwordResets.push({
        id: `rst-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        userId: user.id,
        tokenHash,
        expiresAt,
        createdAt: new Date().toISOString()
      });
      appendSecurityLog(db, 'Password reset link issued', ip, cleanEmail);
    }, { skipBackup: true });

    const resetUrl = `${getBaseUrl(req)}/login?reset=${rawToken}`;
    const result = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      siteName: settingsRepo.get().siteName
    });
    if (!result.sent) {
      return res.status(502).json({
        smtpConfigured: true,
        sent: false,
        error: result.error || 'Could not deliver password reset email.'
      });
    }
  }

  return res.json({
    smtpConfigured: true,
    sent: true,
    message: 'If an active account matches that email, a reset link has been sent.'
  });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  const pwCheck = validatePasswordAgainstPolicy(newPassword, settingsRepo.get().securityPolicy);
  if (!pwCheck.ok) {
    return res.status(400).json({ error: pwCheck.error });
  }

  const candidateHash = crypto.createHash('sha256').update(token).digest('hex');
  try {
    await usersRepo.write(db => {
      const nowMs = Date.now();
      const record = db.passwordResets.find(
        r => !r.usedAt && new Date(r.expiresAt).getTime() > nowMs && timingSafeTokenEqual(r.tokenHash, candidateHash)
      );
      if (!record) {
        throw new Error('Reset link is invalid or has expired.');
      }
      const user = db.users.find(u => u.id === record.userId && !u.deactivated);
      if (!user) {
        throw new Error('Account no longer active.');
      }
      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = hashPassword(newPassword, salt);
      user.mustChangePassword = false;
      record.usedAt = new Date().toISOString();
      db.sessions = db.sessions.filter(s => s.userId !== user.id);
      appendActivity(db, user, 'Completed password reset via email token', 'Auth', 'Security');
    });
    return res.json({ success: true, message: 'Password reset successfully. You may now sign in.' });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Password reset failed' });
  }
});

app.post('/api/auth/change-password', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const currentSession = req.session!;
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  const pwCheck = validatePasswordAgainstPolicy(newPassword, settingsRepo.get().securityPolicy);
  if (!pwCheck.ok) {
    return res.status(400).json({ error: pwCheck.error });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);
  const nowIso = new Date().toISOString();

  const updated = await usersRepo.write(db => {
    const targetUser = db.users.find(u => u.id === user.id);
    if (!targetUser) throw new Error('User not found');
    targetUser.salt = newSalt;
    targetUser.passwordHash = newHash;
    targetUser.mustChangePassword = false;
    targetUser.credentialsCustomized = true;
    db.sessions = db.sessions.filter(s => s.userId !== targetUser.id || s.token === currentSession.token);
    appendActivity(db, targetUser, 'Changed password (other sessions invalidated)', 'Auth', 'Security');
    return sanitizeUserResponse(targetUser, db);
  });

  upsertCredentialInSqlite({
    userId: user.id,
    email: updated.email,
    passwordHash: newHash,
    salt: newSalt,
    updatedAt: nowIso
  });

  return res.json({ success: true, message: 'Password updated successfully', user: updated });
});

app.post('/api/auth/update-credentials', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const currentSession = req.session!;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const rawNewEmail = typeof req.body?.newEmail === 'string' ? req.body.newEmail.trim().toLowerCase() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required to update credentials.' });
  }

  const targetRecord = usersRepo.getById(user.id);
  if (!targetRecord) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  const sqliteCred = getCredentialByUserIdFromSqlite(user.id);
  const verifySalt = sqliteCred?.salt || targetRecord.salt;
  const verifyHash = sqliteCred?.passwordHash || targetRecord.passwordHash;
  if (!verifyPassword(currentPassword, verifySalt, verifyHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const emailChanged = Boolean(rawNewEmail && rawNewEmail !== targetRecord.email.toLowerCase());
  const passwordChanged = Boolean(newPassword);

  if (!emailChanged && !passwordChanged) {
    return res.status(400).json({ error: 'Enter a new email address or a new password to update.' });
  }

  let nextEmail = targetRecord.email.toLowerCase();
  if (emailChanged) {
    if (!EMAIL_REGEX.test(rawNewEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const conflict = usersRepo
      .list()
      .find(u => u.id !== user.id && u.email.trim().toLowerCase() === rawNewEmail);
    const sqliteConflict = getCredentialByEmailFromSqlite(rawNewEmail);
    if (conflict || (sqliteConflict && sqliteConflict.userId !== user.id)) {
      return res.status(409).json({ error: 'Another account already uses this email address.' });
    }
    nextEmail = rawNewEmail;
  }

  let nextSalt = verifySalt;
  let nextHash = verifyHash;
  if (passwordChanged) {
    const pwCheck = validatePasswordAgainstPolicy(newPassword, settingsRepo.get().securityPolicy);
    if (!pwCheck.ok) {
      return res.status(400).json({ error: pwCheck.error });
    }
    nextSalt = crypto.randomBytes(16).toString('hex');
    nextHash = hashPassword(newPassword, nextSalt);
  }

  const nowIso = new Date().toISOString();
  const updated = await usersRepo.write(db => {
    const targetUser = db.users.find(u => u.id === user.id);
    if (!targetUser) throw new Error('User not found');
    targetUser.email = nextEmail;
    targetUser.salt = nextSalt;
    targetUser.passwordHash = nextHash;
    targetUser.mustChangePassword = false;
    targetUser.credentialsCustomized = true;

    if (passwordChanged) {
      db.sessions = db.sessions.filter(s => s.userId !== targetUser.id || s.token === currentSession.token);
    }

    const changeParts = [emailChanged ? 'email' : '', passwordChanged ? 'password' : ''].filter(Boolean).join(' & ');
    appendActivity(db, targetUser, `Updated account ${changeParts}`, 'Auth', targetUser.email);
    appendSecurityLog(db, `Account ${changeParts} updated`, ip, targetUser.email);
    return sanitizeUserResponse(targetUser, db);
  });

  upsertCredentialInSqlite({
    userId: user.id,
    email: nextEmail,
    passwordHash: nextHash,
    salt: nextSalt,
    updatedAt: nowIso
  });

  return res.json({
    success: true,
    message:
      emailChanged && passwordChanged
        ? 'Account email and password updated and saved to SQLite.'
        : emailChanged
          ? 'Account email updated and saved to SQLite.'
          : 'Account password updated and saved to SQLite.',
    user: updated
  });
});

app.get('/api/auth/me', authenticateUser, (req: AuthenticatedRequest, res) => {
  const db = dbStore.read();
  const freshUser = usersRepo.getById(req.user!.id) || req.user!;
  return res.json({ user: sanitizeUserResponse(freshUser, db) });
});

app.patch('/api/auth/profile', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Display name is required.' });
  }
  const updated = await usersRepo.write(db => {
    const targetUser = db.users.find(u => u.id === req.user!.id);
    if (!targetUser) throw new Error('User not found');
    targetUser.name = name;
    appendActivity(db, targetUser, 'Updated profile display name', 'Auth', targetUser.email);
    return sanitizeUserResponse(targetUser, db);
  });
  return res.json({ user: updated });
});

app.post('/api/auth/signout', authenticateUser, async (req: AuthenticatedRequest, res) => {
  await sessionsRepo.removeByToken(req.session!.token);
  return res.json({ success: true });
});

app.post('/api/auth/2fa/setup', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const secret = base32Encode(crypto.randomBytes(20));
  const { plain: recoveryCodes, hashed: hashedCodes } = generateRecoveryCodes();
  const siteName = settingsRepo.get().siteName || 'Masters Of All';
  const issuer = encodeURIComponent(siteName);
  const label = encodeURIComponent(`${siteName}:${req.user!.email}`);
  const otpauthUri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  await usersRepo.write(db => {
    const targetUser = db.users.find(u => u.id === req.user!.id);
    if (targetUser) {
      targetUser.pendingTwoFactorSecret = secret;
      targetUser.pendingRecoveryCodes = hashedCodes;
    }
  });

  return res.json({ secret, otpauthUri, recoveryCodes });
});

app.post('/api/auth/2fa/verify', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const verifyKey = `2fa:${req.user!.id}:${ip}`;
  if (!checkLoginBucket(verifyKey, 5)) {
    return res.status(429).json({ error: 'Too many invalid verification attempts. Please wait 5 minutes.' });
  }

  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const targetUser = usersRepo.getById(req.user!.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const secretToVerify = targetUser.pendingTwoFactorSecret || targetUser.twoFactorSecret;
  if (!secretToVerify) {
    return res.status(400).json({ error: 'No pending two-factor setup found. Start setup first.' });
  }

  const check = verifyTotpCode(secretToVerify, code, targetUser.lastTotpStep);
  if (!check.valid) {
    recordLoginFailure(verifyKey, 5, 5);
    return res.status(400).json({ error: 'Invalid 6-digit verification code.' });
  }

  clearLoginFailure(verifyKey);
  const sanitized = await usersRepo.write(db => {
    const u = db.users.find(x => x.id === targetUser.id)!;
    u.twoFactorSecret = secretToVerify;
    if (u.pendingRecoveryCodes) u.recoveryCodes = u.pendingRecoveryCodes;
    delete u.pendingTwoFactorSecret;
    delete u.pendingRecoveryCodes;
    u.twoFactorEnabled = true;
    if (check.step !== undefined) u.lastTotpStep = check.step;
    appendActivity(db, u, 'Enabled TOTP two-factor authentication', 'Auth', 'Security');
    return sanitizeUserResponse(u, db);
  });

  return res.json({ success: true, twoFactorEnabled: true, user: sanitized });
});

app.post('/api/auth/2fa/disable', authenticateUser, async (req: AuthenticatedRequest, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const targetUser = usersRepo.getById(req.user!.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const settings = settingsRepo.get();
  if (isProd && !targetUser.isTestAccount) {
    return res.status(400).json({ error: 'Two-factor authentication is mandatory in production.' });
  }
  if (normalizeRoleId(targetUser, rolesRepo.list()) === 'role-admin' && settings.securityPolicy?.enforce2FAForAdmins) {
    return res.status(400).json({ error: 'Two-factor authentication cannot be disabled while enforced for administrators.' });
  }

  if (!verifyPassword(password, targetUser.salt, targetUser.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  if (targetUser.twoFactorEnabled) {
    const check = verifyTotpCode(targetUser.twoFactorSecret, code, targetUser.lastTotpStep);
    if (!check.valid) {
      const usedRecovery = await usersRepo.write(db => {
        const u = db.users.find(x => x.id === targetUser.id);
        return u ? consumeRecoveryCode(u, code) : false;
      }, { skipBackup: true });
      if (!usedRecovery) {
        return res.status(401).json({ error: 'Valid 6-digit authenticator or recovery code required.' });
      }
    }
  }

  const sanitized = await usersRepo.write(db => {
    const u = db.users.find(x => x.id === targetUser.id)!;
    u.twoFactorEnabled = false;
    delete u.twoFactorSecret;
    delete u.pendingTwoFactorSecret;
    delete u.recoveryCodes;
    delete u.pendingRecoveryCodes;
    delete u.lastTotpStep;
    appendActivity(db, u, 'Disabled TOTP two-factor authentication', 'Auth', 'Security');
    return sanitizeUserResponse(u, db);
  });

  return res.json({ success: true, twoFactorEnabled: false, user: sanitized });
});

// ============================================================================
// ROLES & PERMISSIONS CRUD
// ============================================================================

app.get('/api/roles', authenticateUser, (_req, res) => {
  return res.json(rolesRepo.list());
});

app.post('/api/roles', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name : '';
  const permissions = normalizePermissionsInput(req.body?.permissions);
  try {
    const role = await rolesRepo.create(name, permissions, req.user!);
    return res.json(role);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create role' });
  }
});

app.put('/api/roles/:id', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name : undefined;
  const permissions = req.body?.permissions !== undefined ? normalizePermissionsInput(req.body.permissions) : undefined;
  try {
    const role = await rolesRepo.update(req.params.id, { name, permissions }, req.user!);
    return res.json(role);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update role' });
  }
});

app.delete('/api/roles/:id', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    await rolesRepo.remove(req.params.id, req.user!);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not delete role' });
  }
});

// ============================================================================
// TEAM MEMBERS
// ============================================================================

app.get('/api/members', authenticateUser, requirePermission('team.manage'), (_req, res) => {
  const db = dbStore.read();
  return res.json(db.users.map(u => sanitizeUserResponse(u, db)));
});

app.post('/api/members', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const requestedRoleId = typeof req.body?.roleId === 'string' ? req.body.roleId.trim() : '';
  const requestedRoleName = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
  const temporaryPassword = typeof req.body?.temporaryPassword === 'string' ? req.body.temporaryPassword : '';

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!name || name.length > 120) {
    return res.status(400).json({ error: 'Name is required (max 120 characters).' });
  }
  if (usersRepo.getByEmail(email)) {
    return res.status(400).json({ error: 'A member with this email already exists.' });
  }

  const roles = rolesRepo.list();
  const matchedRole =
    (requestedRoleId && roles.find(r => r.id === requestedRoleId)) ||
    (requestedRoleName && roles.find(r => r.name.toLowerCase() === requestedRoleName.toLowerCase() || r.id === requestedRoleName)) ||
    roles.find(r => r.id === 'role-member');

  if (!matchedRole) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  const settings = settingsRepo.get();
  if (temporaryPassword) {
    const pwCheck = validatePasswordAgainstPolicy(temporaryPassword, settings.securityPolicy);
    if (!pwCheck.ok) {
      return res.status(400).json({ error: pwCheck.error });
    }
  }

  const minLength = Math.max(12, settings.securityPolicy?.minPasswordLength || 12);
  const tempPass = temporaryPassword || generateSecurePassword(Math.max(14, minLength));
  const salt = crypto.randomBytes(16).toString('hex');

  const responsePayload = await usersRepo.write(db => {
    const newMember: ServerUserRecord = {
      id: `usr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      email,
      name,
      role: matchedRole.name,
      roleId: matchedRole.id,
      departmentScope: sanitizeStringArray(req.body?.departmentScope),
      salt,
      passwordHash: hashPassword(tempPass, salt),
      mustChangePassword: true,
      deactivated: false,
      createdAt: new Date().toISOString()
    };
    db.users.push(newMember);
    appendActivity(db, req.user!, `Added member: ${newMember.name} (${newMember.email})`, 'Team', newMember.name, `Role: ${matchedRole.name}`);
    return {
      ...sanitizeUserResponse(newMember, db),
      temporaryPassword: tempPass
    };
  });

  return res.json(responsePayload);
});

app.put('/api/members/:id', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  const { name, roleId, role, deactivated, departmentScope } = req.body || {};
  try {
    const updated = await usersRepo.write(db => {
      const target = db.users.find(u => u.id === req.params.id);
      if (!target) throw new Error('Member not found');

      let nextRoleObj = db.roles.find(r => r.id === normalizeRoleId(target, db.roles));
      if (roleId !== undefined || role !== undefined) {
        const candidate =
          (typeof roleId === 'string' && db.roles.find(r => r.id === roleId)) ||
          (typeof role === 'string' &&
            db.roles.find(r => r.name.toLowerCase() === role.toLowerCase() || r.id.toLowerCase() === role.toLowerCase()));
        if (!candidate) throw new Error('Specified role does not exist.');
        nextRoleObj = candidate;
      }

      if (target.isFounder) {
        if (nextRoleObj && nextRoleObj.id !== 'role-admin') {
          throw new Error('The founder account cannot be demoted.');
        }
        if (deactivated === true) {
          throw new Error('The founder account cannot be deactivated.');
        }
      }

      const nextDeactivated = typeof deactivated === 'boolean' ? deactivated : Boolean(target.deactivated);
      const currentPerms = resolvePermissions(target, db.roles);
      const nextPerms = nextRoleObj ? nextRoleObj.permissions : currentPerms;

      const wasAdmin = currentPerms.includes('team.manage') && !target.deactivated;
      const willBeAdmin = nextPerms.includes('team.manage') && !nextDeactivated;
      if (wasAdmin && !willBeAdmin && usersRepo.countActiveAdmins(db) <= 1) {
        throw new Error('The system must always keep at least one active Administrator.');
      }

      if (typeof name === 'string' && name.trim()) {
        target.name = name.trim().slice(0, 120);
      }
      if (nextRoleObj) {
        target.roleId = nextRoleObj.id;
        target.role = nextRoleObj.name;
      }
      target.deactivated = nextDeactivated;
      if (departmentScope !== undefined) {
        target.departmentScope = sanitizeStringArray(departmentScope);
      }
      if (nextDeactivated || roleId !== undefined || role !== undefined) {
        db.sessions = db.sessions.filter(s => s.userId !== target.id);
      }
      appendActivity(db, req.user!, `Updated member profile: ${target.name}`, 'Team', target.name);
      return sanitizeUserResponse(target, db);
    });
    return res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    return res.status(msg === 'Member not found' ? 404 : 400).json({ error: msg });
  }
});

app.post('/api/members/:id/reset-password', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    const minLength = Math.max(12, settingsRepo.get().securityPolicy?.minPasswordLength || 12);
    const tempPass = generateSecurePassword(minLength);
    await usersRepo.write(db => {
      const target = db.users.find(u => u.id === req.params.id);
      if (!target) throw new Error('Member not found');
      const salt = crypto.randomBytes(16).toString('hex');
      target.salt = salt;
      target.passwordHash = hashPassword(tempPass, salt);
      target.mustChangePassword = true;
      db.sessions = db.sessions.filter(s => s.userId !== target.id);
      appendActivity(db, req.user!, `Reset password for: ${target.name}`, 'Team', target.email);
    });
    return res.json({ success: true, temporaryPassword: tempPass });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : 'Member not found' });
  }
});

app.delete('/api/members/:id', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    await usersRepo.write(db => {
      const target = db.users.find(u => u.id === req.params.id);
      if (!target) throw new Error('Member not found');
      if (target.isFounder) throw new Error('The founder account cannot be deleted.');

      const perms = resolvePermissions(target, db.roles);
      if (perms.includes('team.manage') && !target.deactivated && usersRepo.countActiveAdmins(db) <= 1) {
        throw new Error('The system must always keep at least one active Administrator.');
      }

      db.users = db.users.filter(u => u.id !== req.params.id);
      db.sessions = db.sessions.filter(s => s.userId !== target.id);
      appendActivity(db, req.user!, `Removed member: ${target.name} (${target.email})`, 'Team', target.email);
    });
    return res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not delete member';
    return res.status(msg === 'Member not found' ? 404 : 400).json({ error: msg });
  }
});

// ============================================================================
// DEPARTMENTS
// ============================================================================

app.get('/api/departments', maintenanceGate, (_req, res) => {
  return res.json(departmentsRepo.listPublished());
});

app.get('/api/departments/all', authenticateUser, (_req, res) => {
  return res.json(departmentsRepo.listAll());
});

app.post('/api/departments', authenticateUser, requirePermission('departments.manage'), async (req: AuthenticatedRequest, res) => {
  const body = req.body || {};
  const urlErr =
    validateSafeUrlField(body.iconUrl, 'iconUrl') ||
    validateSafeUrlField(body.customLogoUrl, 'customLogoUrl') ||
    validateSafeUrlField(body.heroImage, 'heroImage') ||
    validateSafeUrlField(body.seoShareImage, 'seoShareImage') ||
    validateUrlList(body.galleryImages, 'galleryImages');
  if (urlErr) return res.status(400).json({ error: urlErr });

  try {
    const created = await departmentsRepo.create(body, req.user!);
    return res.json(created);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create department' });
  }
});

app.put('/api/departments/:id', authenticateUser, (req: AuthenticatedRequest, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const roles = rolesRepo.list();
  if (!can(user, 'departments.manage', roles) && !can(user, 'website.edit', roles)) {
    return res.status(403).json({ error: 'Permission denied (departments.manage)' });
  }
  return next();
}, async (req: AuthenticatedRequest, res) => {
  const body = req.body || {};
  const urlErr =
    validateSafeUrlField(body.iconUrl, 'iconUrl') ||
    validateSafeUrlField(body.customLogoUrl, 'customLogoUrl') ||
    validateSafeUrlField(body.heroImage, 'heroImage') ||
    validateSafeUrlField(body.seoShareImage, 'seoShareImage') ||
    validateUrlList(body.galleryImages, 'galleryImages');
  if (urlErr) return res.status(400).json({ error: urlErr });

  try {
    const updated = await departmentsRepo.update(req.params.id, body, req.user!);
    return res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not update department';
    return res.status(msg === 'Department not found' ? 404 : 400).json({ error: msg });
  }
});

app.post('/api/departments/reorder', authenticateUser, requirePermission('departments.manage'), async (req: AuthenticatedRequest, res) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'Invalid order array' });
  await departmentsRepo.reorder(sanitizeStringArray(orderedIds), req.user!);
  return res.json({ success: true });
});

app.delete('/api/departments/:id', authenticateUser, requirePermission('departments.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    await departmentsRepo.softDelete(req.params.id, req.body || {}, req.user!);
    return res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not delete department';
    return res.status(msg === 'Department not found' ? 404 : 400).json({ error: msg });
  }
});

app.post('/api/departments/:id/restore', authenticateUser, requirePermission('trash.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    await trashRepo.restore('department', req.params.id, req.user!);
    return res.json({ success: true });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : 'Department not found' });
  }
});

// ============================================================================
// PROJECTS
// ============================================================================

function buildProjectSnapshot(source: Partial<Project>) {
  return {
    title: typeof source.title === 'string' ? source.title : '',
    slug: typeof source.slug === 'string' ? source.slug : '',
    shortDescription: typeof source.shortDescription === 'string' ? source.shortDescription : '',
    fullDescription: typeof source.fullDescription === 'string' ? source.fullDescription : '',
    coverImage: typeof source.coverImage === 'string' ? source.coverImage : '',
    coverFocalPoint: source.coverFocalPoint,
    galleryImages: Array.isArray(source.galleryImages) ? source.galleryImages : [],
    videoUrl: typeof source.videoUrl === 'string' ? source.videoUrl : '',
    audioUrl: typeof source.audioUrl === 'string' ? source.audioUrl : '',
    pdfUrl: typeof source.pdfUrl === 'string' ? source.pdfUrl : '',
    documents: Array.isArray(source.documents) ? source.documents : [],
    externalLinks: Array.isArray(source.externalLinks) ? source.externalLinks : [],
    category: typeof source.category === 'string' ? source.category : 'General',
    departmentIds: Array.isArray(source.departmentIds) ? source.departmentIds : [],
    sectorIds: Array.isArray(source.sectorIds) ? source.sectorIds : [],
    primaryDepartmentId: source.primaryDepartmentId,
    status: typeof source.status === 'string' ? source.status : 'Active',
    visibility: source.visibility,
    tags: Array.isArray(source.tags) ? source.tags : undefined,
    featured: typeof source.featured === 'boolean' ? source.featured : undefined,
    impactMetrics: Array.isArray(source.impactMetrics) ? source.impactMetrics : undefined,
    timelineMilestones: Array.isArray(source.timelineMilestones) ? source.timelineMilestones : undefined,
    creditsList: Array.isArray(source.creditsList) ? source.creditsList : undefined,
    relatedProjectIds: Array.isArray(source.relatedProjectIds) ? source.relatedProjectIds : undefined,
    blocks: Array.isArray(source.blocks) ? JSON.parse(JSON.stringify(source.blocks)) : [],
    storyBlocks: Array.isArray(source.storyBlocks) ? JSON.parse(JSON.stringify(source.storyBlocks)) : undefined,
    startDate: typeof source.startDate === 'string' ? source.startDate : '',
    completionDate: typeof source.completionDate === 'string' ? source.completionDate : '',
    scheduledPublishDate: typeof source.scheduledPublishDate === 'string' ? source.scheduledPublishDate : '',
    credits: typeof source.credits === 'string' ? source.credits : '',
    seoTitle: typeof source.seoTitle === 'string' ? source.seoTitle : '',
    seoDescription: typeof source.seoDescription === 'string' ? source.seoDescription : '',
    seoShareImage: typeof source.seoShareImage === 'string' ? source.seoShareImage : ''
  };
}

function toPublicProject(p: Project) {
  const { versions: _v, reviewComment: _rc, reviewHistory: _rh, authorEmail: _ae, deletedAt: _da, ...rest } = p;
  return rest;
}

app.get('/api/projects', maintenanceGate, async (req, res) => {
  await processScheduledPublications();
  const user = getOptionalAuthUser(req);
  const published = projectsRepo
    .listPublished()
    .filter(p => user || p.visibility !== 'Members only')
    .map(toPublicProject);
  return res.json(published);
});

app.get('/api/projects/by-slug/:slug', maintenanceGate, async (req, res) => {
  await processScheduledPublications();
  const user = getOptionalAuthUser(req);
  const slug = req.params.slug.toLowerCase();
  const match = projectsRepo
    .listPublished()
    .find(p => p.slug.toLowerCase() === slug && (user || p.visibility !== 'Members only'));
  if (!match) return res.status(404).json({ error: 'Project not found' });
  return res.json(toPublicProject(match));
});

app.get(
  '/api/projects/admin',
  authenticateUser,
  requireAnyPermission('projects.create', 'projects.editOwn', 'projects.editAll', 'projects.publish'),
  async (req: AuthenticatedRequest, res) => {
    await processScheduledPublications();
    const user = req.user!;
    const roles = rolesRepo.list();
    const canEditAll = can(user, 'projects.editAll', roles) || can(user, 'projects.publish', roles);
    return res.json(projectsRepo.listForPortal(canEditAll, user.id));
  }
);

app.post('/api/projects', authenticateUser, requirePermission('projects.create'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const body = req.body || {};

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return res.status(400).json({ error: 'Project title is required' });
  }

  const urlErr =
    validateSafeUrlField(body.coverImage, 'coverImage') ||
    validateSafeUrlField(body.videoUrl, 'videoUrl') ||
    validateSafeUrlField(body.audioUrl, 'audioUrl') ||
    validateSafeUrlField(body.pdfUrl, 'pdfUrl') ||
    validateSafeUrlField(body.seoShareImage, 'seoShareImage') ||
    validateUrlList(body.galleryImages, 'galleryImages') ||
    validateDocumentsAndLinks(body.documents, body.externalLinks) ||
    validateBlocksUrls(body.blocks, 'blocks') ||
    validateBlocksUrls(body.storyBlocks, 'storyBlocks');
  if (urlErr) return res.status(400).json({ error: urlErr });

  const departmentIds = sanitizeStringArray(body.departmentIds);
  if (!userHasDepartmentAccess(user, departmentIds)) {
    return res.status(403).json({ error: 'You are restricted from creating projects in the selected department(s).' });
  }

  const slug = normalizeSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : body.title, 'proj');
  const roles = rolesRepo.list();
  const canPublish = can(user, 'projects.publish', roles);

  const allowedStatuses: PublicationStatus[] = ['Draft', 'Pending Review', 'Published', 'Archived'];
  let pubStatus: PublicationStatus = allowedStatuses.includes(body.publicationStatus)
    ? body.publicationStatus
    : 'Draft';
  if (!canPublish && (pubStatus === 'Published' || pubStatus === 'Archived')) {
    pubStatus = 'Pending Review';
  }

  try {
    const newProject = await projectsRepo.writeWithBump(db => {
      if (db.projects.some(p => !p.deletedAt && p.slug.toLowerCase() === slug)) {
        throw new Error('A project with this slug already exists');
      }
      const nowIso = new Date().toISOString();
      const baseData: Partial<Project> = {
        title: body.title.trim(),
        slug,
        shortDescription: typeof body.shortDescription === 'string' ? body.shortDescription : '',
        fullDescription: typeof body.fullDescription === 'string' ? body.fullDescription : '',
        coverImage: typeof body.coverImage === 'string' ? body.coverImage : '',
        coverFocalPoint: body.coverFocalPoint,
        galleryImages: sanitizeStringArray(body.galleryImages),
        videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl : '',
        audioUrl: typeof body.audioUrl === 'string' ? body.audioUrl : '',
        pdfUrl: typeof body.pdfUrl === 'string' ? body.pdfUrl : '',
        category: typeof body.category === 'string' ? body.category : 'General',
        departmentIds,
        sectorIds: sanitizeStringArray(body.sectorIds),
        primaryDepartmentId: typeof body.primaryDepartmentId === 'string' ? body.primaryDepartmentId : undefined,
        status: typeof body.status === 'string' ? body.status : 'Active',
        visibility: ['Public', 'Unlisted', 'Members only'].includes(body.visibility) ? body.visibility : 'Public',
        tags: sanitizeStringArray(body.tags),
        featured: Boolean(body.featured),
        impactMetrics: Array.isArray(body.impactMetrics) ? body.impactMetrics : undefined,
        timelineMilestones: Array.isArray(body.timelineMilestones) ? body.timelineMilestones : undefined,
        creditsList: Array.isArray(body.creditsList) ? body.creditsList : undefined,
        relatedProjectIds: sanitizeStringArray(body.relatedProjectIds),
        blocks: Array.isArray(body.blocks) ? body.blocks : [],
        storyBlocks: Array.isArray(body.storyBlocks) ? body.storyBlocks : undefined,
        startDate: typeof body.startDate === 'string' && body.startDate ? body.startDate : nowIso.substring(0, 10),
        completionDate: typeof body.completionDate === 'string' ? body.completionDate : '',
        scheduledPublishDate: typeof body.scheduledPublishDate === 'string' ? body.scheduledPublishDate : '',
        externalLinks: Array.isArray(body.externalLinks) ? body.externalLinks : [],
        documents: Array.isArray(body.documents) ? body.documents : [],
        credits: typeof body.credits === 'string' ? body.credits : '',
        seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle : '',
        seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription : '',
        seoShareImage: typeof body.seoShareImage === 'string' ? body.seoShareImage : ''
      };

      const created: Project = {
        ...(baseData as Project),
        id: `proj-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        publicationStatus: pubStatus,
        publishedAt: pubStatus === 'Published' ? nowIso : undefined,
        authorId: user.id,
        authorName: user.name,
        authorEmail: user.email,
        createdAt: nowIso,
        updatedAt: nowIso,
        versions: [
          {
            versionId: `v-${Date.now()}`,
            author: user.name,
            authorEmail: user.email,
            timestamp: nowIso,
            summary: 'Initial project creation',
            snapshot: buildProjectSnapshot(baseData)
          }
        ]
      };
      db.projects.unshift(created);
      appendActivity(db, user, `Created project: ${created.title} [${pubStatus}]`, 'Projects', created.title);
      return created;
    });
    return res.json(newProject);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create project' });
  }
});

app.put(
  '/api/projects/:id',
  authenticateUser,
  requireAnyPermission('projects.editOwn', 'projects.editAll'),
  async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const roles = rolesRepo.list();
    const canEditAll = can(user, 'projects.editAll', roles);
    const canPublish = can(user, 'projects.publish', roles);
    const body = req.body || {};

    const urlErr =
      validateSafeUrlField(body.coverImage, 'coverImage') ||
      validateSafeUrlField(body.videoUrl, 'videoUrl') ||
      validateSafeUrlField(body.audioUrl, 'audioUrl') ||
      validateSafeUrlField(body.pdfUrl, 'pdfUrl') ||
      validateSafeUrlField(body.seoShareImage, 'seoShareImage') ||
      validateUrlList(body.galleryImages, 'galleryImages') ||
      validateDocumentsAndLinks(body.documents, body.externalLinks) ||
      validateBlocksUrls(body.blocks, 'blocks') ||
      validateBlocksUrls(body.storyBlocks, 'storyBlocks');
    if (urlErr) return res.status(400).json({ error: urlErr });

    try {
      const updated = await projectsRepo.writeWithBump(db => {
        const index = db.projects.findIndex(p => p.id === req.params.id);
        if (index < 0) throw new Error('NOT_FOUND:Project not found');
        const existing = db.projects[index];
        if (existing.deletedAt) throw new Error('Cannot edit a trashed project. Restore it first.');

        if (!canEditAll && existing.authorId !== user.id) {
          throw new Error('FORBIDDEN:You are only authorized to edit your own projects.');
        }

        const nextDepartmentIds =
          body.departmentIds !== undefined ? sanitizeStringArray(body.departmentIds) : existing.departmentIds;
        if (!userHasDepartmentAccess(user, nextDepartmentIds)) {
          throw new Error('FORBIDDEN:You are outside the allowed department scope for this project.');
        }

        const allowedStatuses: PublicationStatus[] = ['Draft', 'Pending Review', 'Published', 'Archived'];
        let nextPubStatus: PublicationStatus = allowedStatuses.includes(body.publicationStatus)
          ? body.publicationStatus
          : existing.publicationStatus;

        if (!canPublish) {
          if (existing.publicationStatus === 'Published' || nextPubStatus === 'Published' || nextPubStatus === 'Archived') {
            nextPubStatus = 'Pending Review';
          }
        }

        const nextSlug =
          typeof body.slug === 'string' && body.slug.trim() ? normalizeSlug(body.slug, 'proj') : existing.slug;
        if (
          nextSlug !== existing.slug &&
          db.projects.some(p => p.id !== existing.id && !p.deletedAt && p.slug.toLowerCase() === nextSlug)
        ) {
          throw new Error('Another active project already uses this slug');
        }
        if (nextSlug !== existing.slug) {
          addAutoRedirect(db, `/projects/${existing.slug}`, `/projects/${nextSlug}`);
        }

        if (existing.publicationStatus === 'Published' && nextPubStatus !== 'Published') {
          projectsRepo.cleanupReferences(db, existing.id);
        }

        const existingVersions = Array.isArray(existing.versions) ? [...existing.versions] : [];
        existingVersions.unshift({
          versionId: `v-${Date.now()}`,
          author: user.name,
          authorEmail: user.email,
          timestamp: new Date().toISOString(),
          summary: typeof body.changeNote === 'string' && body.changeNote.trim() ? body.changeNote.trim() : 'Project updated',
          snapshot: buildProjectSnapshot(existing)
        });

        const nowIso = new Date().toISOString();
        const updatedProject: Project = {
          ...existing,
          title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : existing.title,
          slug: nextSlug,
          shortDescription: typeof body.shortDescription === 'string' ? body.shortDescription : existing.shortDescription,
          fullDescription: typeof body.fullDescription === 'string' ? body.fullDescription : existing.fullDescription,
          coverImage: body.coverImage !== undefined ? String(body.coverImage) : existing.coverImage,
          coverFocalPoint: body.coverFocalPoint !== undefined ? body.coverFocalPoint : existing.coverFocalPoint,
          galleryImages: body.galleryImages !== undefined ? sanitizeStringArray(body.galleryImages) : existing.galleryImages,
          videoUrl: body.videoUrl !== undefined ? String(body.videoUrl) : existing.videoUrl,
          audioUrl: body.audioUrl !== undefined ? String(body.audioUrl) : existing.audioUrl,
          pdfUrl: body.pdfUrl !== undefined ? String(body.pdfUrl) : existing.pdfUrl,
          documents: Array.isArray(body.documents) ? body.documents : existing.documents,
          externalLinks: Array.isArray(body.externalLinks) ? body.externalLinks : existing.externalLinks,
          category: typeof body.category === 'string' ? body.category : existing.category,
          departmentIds: nextDepartmentIds,
          sectorIds: body.sectorIds !== undefined ? sanitizeStringArray(body.sectorIds) : existing.sectorIds || [],
          primaryDepartmentId: typeof body.primaryDepartmentId === 'string' ? body.primaryDepartmentId : existing.primaryDepartmentId,
          status: typeof body.status === 'string' ? body.status : existing.status,
          publicationStatus: nextPubStatus,
          visibility: ['Public', 'Unlisted', 'Members only'].includes(body.visibility) ? body.visibility : existing.visibility,
          tags: body.tags !== undefined ? sanitizeStringArray(body.tags) : existing.tags,
          featured: typeof body.featured === 'boolean' ? body.featured : existing.featured,
          impactMetrics: Array.isArray(body.impactMetrics) ? body.impactMetrics : existing.impactMetrics,
          timelineMilestones: Array.isArray(body.timelineMilestones) ? body.timelineMilestones : existing.timelineMilestones,
          creditsList: Array.isArray(body.creditsList) ? body.creditsList : existing.creditsList,
          relatedProjectIds:
            body.relatedProjectIds !== undefined ? sanitizeStringArray(body.relatedProjectIds) : existing.relatedProjectIds,
          blocks: Array.isArray(body.blocks) ? body.blocks : existing.blocks,
          storyBlocks: Array.isArray(body.storyBlocks) ? body.storyBlocks : existing.storyBlocks,
          startDate: typeof body.startDate === 'string' ? body.startDate : existing.startDate,
          completionDate: typeof body.completionDate === 'string' ? body.completionDate : existing.completionDate,
          scheduledPublishDate:
            typeof body.scheduledPublishDate === 'string' ? body.scheduledPublishDate : existing.scheduledPublishDate,
          credits: typeof body.credits === 'string' ? body.credits : existing.credits,
          seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle : existing.seoTitle,
          seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription : existing.seoDescription,
          seoShareImage: body.seoShareImage !== undefined ? String(body.seoShareImage) : existing.seoShareImage,
          publishedAt: nextPubStatus === 'Published' && !existing.publishedAt ? nowIso : existing.publishedAt,
          versions: existingVersions.slice(0, 30),
          updatedAt: nowIso
        };

        db.projects[index] = updatedProject;
        appendActivity(
          db,
          user,
          `Updated project: ${updatedProject.title} [Status: ${nextPubStatus}]`,
          'Projects',
          updatedProject.title
        );
        return updatedProject;
      });
      return res.json(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
      if (msg.startsWith('FORBIDDEN:')) return res.status(403).json({ error: msg.slice(10) });
      return res.status(400).json({ error: msg });
    }
  }
);

app.post('/api/projects/:id/review', authenticateUser, requirePermission('projects.publish'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const action = req.body?.action;
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

  if (!['approved', 'rejected', 'requested_changes'].includes(action)) {
    return res.status(400).json({ error: "Invalid review action. Must be 'approved', 'rejected', or 'requested_changes'." });
  }

  try {
    const project = await projectsRepo.writeWithBump(db => {
      const p = db.projects.find(x => x.id === req.params.id);
      if (!p) throw new Error('NOT_FOUND:Project not found');
      if (p.deletedAt) throw new Error('Cannot review a deleted project.');
      if (p.publicationStatus !== 'Pending Review') {
        throw new Error('Only projects in Pending Review status can be reviewed.');
      }

      if (action === 'approved') {
        p.publicationStatus = 'Published';
        p.publishedAt = p.publishedAt || new Date().toISOString();
      } else {
        p.publicationStatus = 'Draft';
      }
      p.reviewComment = comment;
      p.updatedAt = new Date().toISOString();
      if (!p.reviewHistory) p.reviewHistory = [];
      p.reviewHistory.unshift({
        id: `rev-${Date.now()}`,
        reviewer: user.name,
        action,
        comment,
        date: new Date().toISOString()
      });
      appendActivity(
        db,
        user,
        `Reviewed project: ${p.title} (${action})`,
        'Projects',
        p.title,
        comment ? `Note: ${comment}` : undefined
      );
      return p;
    });
    return res.json(project);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Review failed';
    if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
    return res.status(400).json({ error: msg });
  }
});

app.delete(
  '/api/projects/:id',
  authenticateUser,
  requireAnyPermission('projects.editOwn', 'projects.editAll', 'projects.publish'),
  async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const roles = rolesRepo.list();
    const canDeleteAny = can(user, 'projects.editAll', roles) || can(user, 'projects.publish', roles);

    try {
      await projectsRepo.writeWithBump(db => {
        const project = db.projects.find(p => p.id === req.params.id);
        if (!project) throw new Error('NOT_FOUND:Project not found');
        if (!canDeleteAny) {
          if (
            project.authorId !== user.id ||
            project.publicationStatus === 'Published' ||
            project.publicationStatus === 'Archived'
          ) {
            throw new Error('FORBIDDEN:You are only authorized to delete your own draft or pending projects.');
          }
        }
        project.deletedAt = new Date().toISOString();
        project.publicationStatus = canDeleteAny ? 'Archived' : 'Draft';
        projectsRepo.cleanupReferences(db, project.id);
        appendActivity(db, user, `Moved project to Trash: ${project.title}`, 'Projects', project.title);
      });
      return res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
      if (msg.startsWith('FORBIDDEN:')) return res.status(403).json({ error: msg.slice(10) });
      return res.status(400).json({ error: msg });
    }
  }
);

app.post('/api/projects/:id/restore', authenticateUser, requirePermission('trash.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    await trashRepo.restore('project', req.params.id, req.user!);
    return res.json({ success: true });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : 'Project not found' });
  }
});

app.post('/api/projects/:id/restore-version', authenticateUser, requirePermission('projects.editAll'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const versionId = req.body?.versionId;
  try {
    const updated = await projectsRepo.writeWithBump(db => {
      const project = db.projects.find(p => p.id === req.params.id);
      if (!project) throw new Error('Project not found');
      const version = project.versions?.find(v => v.versionId === versionId);
      if (!version || !version.snapshot) throw new Error('Version not found');

      const currentVersions = Array.isArray(project.versions) ? [...project.versions] : [];
      currentVersions.unshift({
        versionId: `v-${Date.now()}`,
        author: user.name,
        authorEmail: user.email,
        timestamp: new Date().toISOString(),
        summary: `Before restoring version ${version.versionId}`,
        snapshot: buildProjectSnapshot(project)
      });

      const contentFields = buildProjectSnapshot(version.snapshot);
      Object.assign(project, contentFields, {
        versions: currentVersions.slice(0, 30),
        updatedAt: new Date().toISOString()
      });
      appendActivity(db, user, `Restored project version for: ${project.title}`, 'Projects', project.title);
      return project;
    });
    return res.json(updated);
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : 'Not found' });
  }
});

// ============================================================================
// PUBLICATIONS
// ============================================================================

function toPublicPublication(pub: Publication) {
  const { reviewComment: _rc, reviewHistory: _rh, authorEmail: _ae, deletedAt: _da, ...rest } = pub;
  return rest;
}

app.get('/api/publications', maintenanceGate, async (_req, res) => {
  await processScheduledPublications();
  return res.json(publicationsRepo.listPublished().map(toPublicPublication));
});

app.get(
  '/api/publications/admin',
  authenticateUser,
  requireAnyPermission('publications.manage', 'projects.editAll', 'projects.publish'),
  async (req: AuthenticatedRequest, res) => {
    await processScheduledPublications();
    const user = req.user!;
    const roles = rolesRepo.list();
    const canAll = can(user, 'projects.editAll', roles) || can(user, 'projects.publish', roles);
    return res.json(publicationsRepo.listForPortal(canAll, user.id));
  }
);

app.post('/api/publications', authenticateUser, requirePermission('publications.manage'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const body = req.body || {};

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return res.status(400).json({ error: 'Publication title is required' });
  }

  const urlErr =
    validateSafeUrlField(body.pdfUrl, 'pdfUrl') ||
    validateSafeUrlField(body.thumbnailUrl, 'thumbnailUrl') ||
    validateSafeUrlField(body.doiOrUrl, 'doiOrUrl') ||
    validateSafeUrlField(body.seoShareImage, 'seoShareImage');
  if (urlErr) return res.status(400).json({ error: urlErr });

  const departmentIds = sanitizeStringArray(body.departmentIds);
  if (!userHasDepartmentAccess(user, departmentIds)) {
    return res.status(403).json({ error: 'You are restricted from creating publications in the selected department(s).' });
  }

  const slug = normalizeSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : body.title, 'pub');
  const canPublish = can(user, 'projects.publish', rolesRepo.list());
  const allowedStatuses: PublicationStatus[] = ['Draft', 'Pending Review', 'Published', 'Archived'];
  let pubStatus: PublicationStatus = allowedStatuses.includes(body.publicationStatus) ? body.publicationStatus : 'Draft';
  if (!canPublish && (pubStatus === 'Published' || pubStatus === 'Archived')) {
    pubStatus = 'Pending Review';
  }

  try {
    const created = await publicationsRepo.writeWithBump(db => {
      if (db.publications.some(p => !p.deletedAt && p.slug.toLowerCase() === slug)) {
        throw new Error('A publication with this slug already exists');
      }
      const nowIso = new Date().toISOString();
      const pub: Publication = {
        id: `pub-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        title: body.title.trim(),
        slug,
        authors: typeof body.authors === 'string' ? body.authors : '',
        abstract: typeof body.abstract === 'string' ? body.abstract : '',
        publicationDate: typeof body.publicationDate === 'string' && body.publicationDate ? body.publicationDate : nowIso.slice(0, 10),
        publicationType: typeof body.publicationType === 'string' && body.publicationType.trim() ? body.publicationType.trim() : 'Paper',
        pdfUrl: typeof body.pdfUrl === 'string' ? body.pdfUrl : '',
        thumbnailUrl: typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl : '',
        doiOrUrl: typeof body.doiOrUrl === 'string' ? body.doiOrUrl : '',
        departmentIds,
        sectorIds: sanitizeStringArray(body.sectorIds),
        relatedProjectId: typeof body.relatedProjectId === 'string' ? body.relatedProjectId : '',
        tags: sanitizeStringArray(body.tags),
        publicationStatus: pubStatus,
        scheduledPublishDate: typeof body.scheduledPublishDate === 'string' ? body.scheduledPublishDate : '',
        publishedAt: pubStatus === 'Published' ? nowIso : undefined,
        authorId: user.id,
        authorName: user.name,
        authorEmail: user.email,
        seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle : '',
        seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription : '',
        seoShareImage: typeof body.seoShareImage === 'string' ? body.seoShareImage : '',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      db.publications.unshift(pub);
      appendActivity(db, user, `Created publication: ${pub.title} [${pubStatus}]`, 'Publications', pub.title);
      return pub;
    });
    return res.json(created);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create publication' });
  }
});

app.put('/api/publications/:id', authenticateUser, requirePermission('publications.manage'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const roles = rolesRepo.list();
  const canEditAll = can(user, 'projects.editAll', roles);
  const canPublish = can(user, 'projects.publish', roles);
  const body = req.body || {};

  const urlErr =
    validateSafeUrlField(body.pdfUrl, 'pdfUrl') ||
    validateSafeUrlField(body.thumbnailUrl, 'thumbnailUrl') ||
    validateSafeUrlField(body.doiOrUrl, 'doiOrUrl') ||
    validateSafeUrlField(body.seoShareImage, 'seoShareImage');
  if (urlErr) return res.status(400).json({ error: urlErr });

  try {
    const updated = await publicationsRepo.writeWithBump(db => {
      const idx = db.publications.findIndex(p => p.id === req.params.id);
      if (idx < 0) throw new Error('NOT_FOUND:Publication not found');
      const existing = db.publications[idx];
      if (existing.deletedAt) throw new Error('Cannot edit a trashed publication.');
      if (!canEditAll && existing.authorId !== user.id) {
        throw new Error('FORBIDDEN:You can only edit your own publications.');
      }

      const nextDepartmentIds =
        body.departmentIds !== undefined ? sanitizeStringArray(body.departmentIds) : existing.departmentIds;
      if (!userHasDepartmentAccess(user, nextDepartmentIds)) {
        throw new Error('FORBIDDEN:You are outside the allowed department scope for this publication.');
      }

      const allowedStatuses: PublicationStatus[] = ['Draft', 'Pending Review', 'Published', 'Archived'];
      let nextStatus: PublicationStatus = allowedStatuses.includes(body.publicationStatus)
        ? body.publicationStatus
        : existing.publicationStatus;
      if (!canPublish && (existing.publicationStatus === 'Published' || nextStatus === 'Published' || nextStatus === 'Archived')) {
        nextStatus = 'Pending Review';
      }

      const nextSlug =
        typeof body.slug === 'string' && body.slug.trim() ? normalizeSlug(body.slug, 'pub') : existing.slug;
      if (nextSlug !== existing.slug && db.publications.some(p => p.id !== existing.id && !p.deletedAt && p.slug.toLowerCase() === nextSlug)) {
        throw new Error('Another active publication already uses this slug');
      }

      const nowIso = new Date().toISOString();
      const nextPub: Publication = {
        ...existing,
        title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : existing.title,
        slug: nextSlug,
        authors: typeof body.authors === 'string' ? body.authors : existing.authors,
        abstract: typeof body.abstract === 'string' ? body.abstract : existing.abstract,
        publicationDate: typeof body.publicationDate === 'string' ? body.publicationDate : existing.publicationDate,
        publicationType: typeof body.publicationType === 'string' ? body.publicationType : existing.publicationType,
        pdfUrl: body.pdfUrl !== undefined ? String(body.pdfUrl) : existing.pdfUrl,
        thumbnailUrl: body.thumbnailUrl !== undefined ? String(body.thumbnailUrl) : existing.thumbnailUrl,
        doiOrUrl: body.doiOrUrl !== undefined ? String(body.doiOrUrl) : existing.doiOrUrl,
        departmentIds: nextDepartmentIds,
        sectorIds: body.sectorIds !== undefined ? sanitizeStringArray(body.sectorIds) : existing.sectorIds || [],
        relatedProjectId: body.relatedProjectId !== undefined ? String(body.relatedProjectId) : existing.relatedProjectId,
        tags: body.tags !== undefined ? sanitizeStringArray(body.tags) : existing.tags,
        publicationStatus: nextStatus,
        scheduledPublishDate:
          typeof body.scheduledPublishDate === 'string' ? body.scheduledPublishDate : existing.scheduledPublishDate,
        publishedAt: nextStatus === 'Published' && !existing.publishedAt ? nowIso : existing.publishedAt,
        seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle : existing.seoTitle,
        seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription : existing.seoDescription,
        seoShareImage: body.seoShareImage !== undefined ? String(body.seoShareImage) : existing.seoShareImage,
        updatedAt: nowIso
      };
      db.publications[idx] = nextPub;
      appendActivity(db, user, `Updated publication: ${nextPub.title} [${nextStatus}]`, 'Publications', nextPub.title);
      return nextPub;
    });
    return res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
    if (msg.startsWith('FORBIDDEN:')) return res.status(403).json({ error: msg.slice(10) });
    return res.status(400).json({ error: msg });
  }
});

app.post('/api/publications/:id/review', authenticateUser, requirePermission('projects.publish'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const action = req.body?.action;
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (!['approved', 'rejected', 'requested_changes'].includes(action)) {
    return res.status(400).json({ error: 'Invalid review action' });
  }
  try {
    const updated = await publicationsRepo.writeWithBump(db => {
      const pub = db.publications.find(p => p.id === req.params.id);
      if (!pub || pub.deletedAt) throw new Error('NOT_FOUND:Publication not found');
      if (pub.publicationStatus !== 'Pending Review') throw new Error('Only pending publications can be reviewed.');
      pub.publicationStatus = action === 'approved' ? 'Published' : 'Draft';
      if (action === 'approved') pub.publishedAt = pub.publishedAt || new Date().toISOString();
      pub.reviewComment = comment;
      pub.updatedAt = new Date().toISOString();
      if (!pub.reviewHistory) pub.reviewHistory = [];
      pub.reviewHistory.unshift({ id: `rev-${Date.now()}`, reviewer: user.name, action, comment, date: new Date().toISOString() });
      appendActivity(db, user, `Reviewed publication: ${pub.title} (${action})`, 'Publications', pub.title);
      return pub;
    });
    return res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Review failed';
    if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
    return res.status(400).json({ error: msg });
  }
});

app.delete('/api/publications/:id', authenticateUser, requirePermission('publications.manage'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const roles = rolesRepo.list();
  const canAll = can(user, 'projects.editAll', roles) || can(user, 'projects.publish', roles);
  try {
    await publicationsRepo.writeWithBump(db => {
      const pub = db.publications.find(p => p.id === req.params.id);
      if (!pub) throw new Error('NOT_FOUND:Publication not found');
      if (!canAll && (pub.authorId !== user.id || pub.publicationStatus === 'Published')) {
        throw new Error('FORBIDDEN:You can only delete your own non-published publications.');
      }
      pub.deletedAt = new Date().toISOString();
      pub.publicationStatus = canAll ? 'Archived' : 'Draft';
      appendActivity(db, user, `Moved publication to Trash: ${pub.title}`, 'Publications', pub.title);
    });
    return res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Delete failed';
    if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
    if (msg.startsWith('FORBIDDEN:')) return res.status(403).json({ error: msg.slice(10) });
    return res.status(400).json({ error: msg });
  }
});

// ============================================================================
// PRODUCTS
// ============================================================================

function toPublicProduct(prod: Product) {
  const { reviewComment: _rc, reviewHistory: _rh, authorEmail: _ae, deletedAt: _da, ...rest } = prod;
  return rest;
}

app.get('/api/products', maintenanceGate, async (_req, res) => {
  await processScheduledPublications();
  return res.json(productsRepo.listPublished().map(toPublicProduct));
});

app.get('/api/products/by-slug/:slug', maintenanceGate, async (req, res) => {
  await processScheduledPublications();
  const slug = req.params.slug.toLowerCase();
  const match = productsRepo.listPublished().find(p => p.slug.toLowerCase() === slug);
  if (!match) return res.status(404).json({ error: 'Product not found' });
  return res.json(toPublicProduct(match));
});

app.get(
  '/api/products/admin',
  authenticateUser,
  requireAnyPermission('products.manage', 'projects.editAll', 'projects.publish'),
  async (req: AuthenticatedRequest, res) => {
    await processScheduledPublications();
    const user = req.user!;
    const roles = rolesRepo.list();
    const canAll = can(user, 'projects.editAll', roles) || can(user, 'projects.publish', roles);
    return res.json(productsRepo.listForPortal(canAll, user.id));
  }
);

app.post('/api/products', authenticateUser, requirePermission('products.manage'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const body = req.body || {};

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const links = body.links && typeof body.links === 'object' ? body.links : {};
  const urlErr =
    validateSafeUrlField(body.coverImage, 'coverImage') ||
    validateSafeUrlField(body.demoVideoUrl, 'demoVideoUrl') ||
    validateSafeUrlField(body.seoShareImage, 'seoShareImage') ||
    validateUrlList(body.galleryImages, 'galleryImages') ||
    validateSafeUrlField(links.download, 'links.download') ||
    validateSafeUrlField(links.website, 'links.website') ||
    validateSafeUrlField(links.repository, 'links.repository') ||
    validateSafeUrlField(links.documentationPdf, 'links.documentationPdf');
  if (urlErr) return res.status(400).json({ error: urlErr });

  const departmentIds = sanitizeStringArray(body.departmentIds);
  if (!userHasDepartmentAccess(user, departmentIds)) {
    return res.status(403).json({ error: 'You are restricted from creating products in the selected department(s).' });
  }

  const slug = normalizeSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : body.name, 'product');
  const canPublish = can(user, 'projects.publish', rolesRepo.list());
  const allowedPubStatuses: PublicationStatus[] = ['Draft', 'Pending Review', 'Published', 'Archived'];
  let pubStatus: PublicationStatus = allowedPubStatuses.includes(body.publicationStatus)
    ? body.publicationStatus
    : 'Draft';
  if (!canPublish && (pubStatus === 'Published' || pubStatus === 'Archived')) {
    pubStatus = 'Pending Review';
  }

  const validStages: Product['status'][] = ['Concept', 'In development', 'Released'];
  const stage: Product['status'] = validStages.includes(body.status) ? body.status : 'Concept';
  const validPricing: Product['availabilityPricing'][] = ['free', 'paid', 'contact'];
  const pricing: Product['availabilityPricing'] = validPricing.includes(body.availabilityPricing)
    ? body.availabilityPricing
    : 'free';

  try {
    const created = await productsRepo.writeWithBump(db => {
      if (db.products.some(p => !p.deletedAt && p.slug.toLowerCase() === slug)) {
        throw new Error('A product with this slug already exists');
      }
      const nowIso = new Date().toISOString();
      const prod: Product = {
        id: `prod-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        name: body.name.trim(),
        slug,
        tagline: typeof body.tagline === 'string' ? body.tagline : '',
        category: typeof body.category === 'string' ? body.category : '',
        status: stage,
        version: typeof body.version === 'string' ? body.version : '',
        shortDescription: typeof body.shortDescription === 'string' ? body.shortDescription : '',
        fullDescription: typeof body.fullDescription === 'string' ? body.fullDescription : '',
        keyFeatures: sanitizeStringArray(body.keyFeatures),
        specs: Array.isArray(body.specs)
          ? body.specs
              .filter((s: unknown): s is { label: string; value: string } => Boolean(s && typeof s === 'object'))
              .map((s: { label: unknown; value: unknown }) => ({
                label: String(s.label || ''),
                value: String(s.value || '')
              }))
              .filter((s: { label: string; value: string }) => s.label || s.value)
          : [],
        galleryImages: sanitizeStringArray(body.galleryImages),
        demoVideoUrl: typeof body.demoVideoUrl === 'string' ? body.demoVideoUrl : '',
        coverImage: typeof body.coverImage === 'string' ? body.coverImage : '',
        releaseDate: typeof body.releaseDate === 'string' ? body.releaseDate : '',
        availabilityPricing: pricing,
        priceText: typeof body.priceText === 'string' ? body.priceText : '',
        links: {
          download: typeof links.download === 'string' ? links.download : '',
          website: typeof links.website === 'string' ? links.website : '',
          repository: typeof links.repository === 'string' ? links.repository : '',
          documentationPdf: typeof links.documentationPdf === 'string' ? links.documentationPdf : ''
        },
        departmentIds,
        sectorIds: sanitizeStringArray(body.sectorIds),
        relatedProjectIds: sanitizeStringArray(body.relatedProjectIds),
        credits: typeof body.credits === 'string' ? body.credits : '',
        tags: sanitizeStringArray(body.tags),
        publicationStatus: pubStatus,
        scheduledPublishDate: typeof body.scheduledPublishDate === 'string' ? body.scheduledPublishDate : '',
        publishedAt: pubStatus === 'Published' ? nowIso : undefined,
        authorId: user.id,
        authorName: user.name,
        authorEmail: user.email,
        seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle : '',
        seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription : '',
        seoShareImage: typeof body.seoShareImage === 'string' ? body.seoShareImage : '',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      db.products.unshift(prod);
      appendActivity(db, user, `Created product: ${prod.name} [${pubStatus}]`, 'Products', prod.name);
      return prod;
    });
    return res.json(created);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create product' });
  }
});

app.put('/api/products/:id', authenticateUser, requirePermission('products.manage'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const roles = rolesRepo.list();
  const canEditAll = can(user, 'projects.editAll', roles);
  const canPublish = can(user, 'projects.publish', roles);
  const body = req.body || {};
  const links = body.links && typeof body.links === 'object' ? body.links : undefined;

  const urlErr =
    validateSafeUrlField(body.coverImage, 'coverImage') ||
    validateSafeUrlField(body.demoVideoUrl, 'demoVideoUrl') ||
    validateSafeUrlField(body.seoShareImage, 'seoShareImage') ||
    validateUrlList(body.galleryImages, 'galleryImages') ||
    (links
      ? validateSafeUrlField(links.download, 'links.download') ||
        validateSafeUrlField(links.website, 'links.website') ||
        validateSafeUrlField(links.repository, 'links.repository') ||
        validateSafeUrlField(links.documentationPdf, 'links.documentationPdf')
      : null);
  if (urlErr) return res.status(400).json({ error: urlErr });

  try {
    const updated = await productsRepo.writeWithBump(db => {
      const idx = db.products.findIndex(p => p.id === req.params.id);
      if (idx < 0) throw new Error('NOT_FOUND:Product not found');
      const existing = db.products[idx];
      if (existing.deletedAt) throw new Error('Cannot edit a trashed product.');
      if (!canEditAll && existing.authorId !== user.id) {
        throw new Error('FORBIDDEN:You can only edit your own products.');
      }

      const nextDepartmentIds =
        body.departmentIds !== undefined ? sanitizeStringArray(body.departmentIds) : existing.departmentIds;
      if (!userHasDepartmentAccess(user, nextDepartmentIds)) {
        throw new Error('FORBIDDEN:You are outside the allowed department scope for this product.');
      }

      const allowedPubStatuses: PublicationStatus[] = ['Draft', 'Pending Review', 'Published', 'Archived'];
      let nextPubStatus: PublicationStatus = allowedPubStatuses.includes(body.publicationStatus)
        ? body.publicationStatus
        : existing.publicationStatus;
      if (!canPublish && (existing.publicationStatus === 'Published' || nextPubStatus === 'Published' || nextPubStatus === 'Archived')) {
        nextPubStatus = 'Pending Review';
      }

      const nextSlug =
        typeof body.slug === 'string' && body.slug.trim() ? normalizeSlug(body.slug, 'product') : existing.slug;
      if (nextSlug !== existing.slug && db.products.some(p => p.id !== existing.id && !p.deletedAt && p.slug.toLowerCase() === nextSlug)) {
        throw new Error('Another active product already uses this slug');
      }
      if (nextSlug !== existing.slug) {
        addAutoRedirect(db, `/products/${existing.slug}`, `/products/${nextSlug}`);
      }

      const nowIso = new Date().toISOString();
      const updatedProd: Product = {
        ...existing,
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name,
        slug: nextSlug,
        tagline: typeof body.tagline === 'string' ? body.tagline : existing.tagline,
        category: typeof body.category === 'string' ? body.category : existing.category,
        status: ['Concept', 'In development', 'Released'].includes(body.status) ? body.status : existing.status,
        version: typeof body.version === 'string' ? body.version : existing.version,
        shortDescription: typeof body.shortDescription === 'string' ? body.shortDescription : existing.shortDescription,
        fullDescription: typeof body.fullDescription === 'string' ? body.fullDescription : existing.fullDescription,
        keyFeatures: body.keyFeatures !== undefined ? sanitizeStringArray(body.keyFeatures) : existing.keyFeatures,
        specs: Array.isArray(body.specs) ? body.specs : existing.specs,
        galleryImages: body.galleryImages !== undefined ? sanitizeStringArray(body.galleryImages) : existing.galleryImages,
        demoVideoUrl: body.demoVideoUrl !== undefined ? String(body.demoVideoUrl) : existing.demoVideoUrl,
        coverImage: body.coverImage !== undefined ? String(body.coverImage) : existing.coverImage,
        releaseDate: typeof body.releaseDate === 'string' ? body.releaseDate : existing.releaseDate,
        availabilityPricing: ['free', 'paid', 'contact'].includes(body.availabilityPricing)
          ? body.availabilityPricing
          : existing.availabilityPricing,
        priceText: typeof body.priceText === 'string' ? body.priceText : existing.priceText,
        links: links
          ? {
              download: typeof links.download === 'string' ? links.download : '',
              website: typeof links.website === 'string' ? links.website : '',
              repository: typeof links.repository === 'string' ? links.repository : '',
              documentationPdf: typeof links.documentationPdf === 'string' ? links.documentationPdf : ''
            }
          : existing.links,
        departmentIds: nextDepartmentIds,
        sectorIds: body.sectorIds !== undefined ? sanitizeStringArray(body.sectorIds) : existing.sectorIds || [],
        relatedProjectIds:
          body.relatedProjectIds !== undefined ? sanitizeStringArray(body.relatedProjectIds) : existing.relatedProjectIds,
        credits: typeof body.credits === 'string' ? body.credits : existing.credits,
        tags: body.tags !== undefined ? sanitizeStringArray(body.tags) : existing.tags,
        publicationStatus: nextPubStatus,
        scheduledPublishDate:
          typeof body.scheduledPublishDate === 'string' ? body.scheduledPublishDate : existing.scheduledPublishDate,
        publishedAt: nextPubStatus === 'Published' && !existing.publishedAt ? nowIso : existing.publishedAt,
        seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle : existing.seoTitle,
        seoDescription: typeof body.seoDescription === 'string' ? body.seoDescription : existing.seoDescription,
        seoShareImage: body.seoShareImage !== undefined ? String(body.seoShareImage) : existing.seoShareImage,
        updatedAt: nowIso
      };
      db.products[idx] = updatedProd;
      appendActivity(db, user, `Updated product: ${updatedProd.name} [${nextPubStatus}]`, 'Products', updatedProd.name);
      return updatedProd;
    });
    return res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
    if (msg.startsWith('FORBIDDEN:')) return res.status(403).json({ error: msg.slice(10) });
    return res.status(400).json({ error: msg });
  }
});

app.post('/api/products/:id/review', authenticateUser, requirePermission('projects.publish'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const action = req.body?.action;
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (!['approved', 'rejected', 'requested_changes'].includes(action)) {
    return res.status(400).json({ error: 'Invalid review action' });
  }
  try {
    const updated = await productsRepo.writeWithBump(db => {
      const prod = db.products.find(p => p.id === req.params.id);
      if (!prod || prod.deletedAt) throw new Error('NOT_FOUND:Product not found');
      if (prod.publicationStatus !== 'Pending Review') throw new Error('Only pending products can be reviewed.');
      prod.publicationStatus = action === 'approved' ? 'Published' : 'Draft';
      if (action === 'approved') prod.publishedAt = prod.publishedAt || new Date().toISOString();
      prod.reviewComment = comment;
      prod.updatedAt = new Date().toISOString();
      if (!prod.reviewHistory) prod.reviewHistory = [];
      prod.reviewHistory.unshift({ id: `rev-${Date.now()}`, reviewer: user.name, action, comment, date: new Date().toISOString() });
      appendActivity(db, user, `Reviewed product: ${prod.name} (${action})`, 'Products', prod.name);
      return prod;
    });
    return res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Review failed';
    if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
    return res.status(400).json({ error: msg });
  }
});

app.delete('/api/products/:id', authenticateUser, requirePermission('products.manage'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const roles = rolesRepo.list();
  const canAll = can(user, 'projects.editAll', roles) || can(user, 'projects.publish', roles);
  try {
    await productsRepo.writeWithBump(db => {
      const prod = db.products.find(p => p.id === req.params.id);
      if (!prod) throw new Error('NOT_FOUND:Product not found');
      if (!canAll && (prod.authorId !== user.id || prod.publicationStatus === 'Published')) {
        throw new Error('FORBIDDEN:You can only delete your own non-published products.');
      }
      prod.deletedAt = new Date().toISOString();
      prod.publicationStatus = canAll ? 'Archived' : 'Draft';
      appendActivity(db, user, `Moved product to Trash: ${prod.name}`, 'Products', prod.name);
    });
    return res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Delete failed';
    if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
    if (msg.startsWith('FORBIDDEN:')) return res.status(403).json({ error: msg.slice(10) });
    return res.status(400).json({ error: msg });
  }
});

// ============================================================================
// MEDIA LIBRARY (Auth + permission checked BEFORE uploadJsonParser!)
// ============================================================================

app.get('/api/media', authenticateUser, requireAnyPermission('media.upload', 'media.manage'), (_req, res) => {
  return res.json(mediaRepo.listWithUsage());
});

app.get('/api/media/limits', authenticateUser, requireAnyPermission('media.upload', 'media.manage'), (_req, res) => {
  return res.json({
    image: IMAGE_MAX_BYTES,
    document: DOC_MAX_BYTES,
    audio: AUDIO_MAX_BYTES,
    video: VIDEO_MAX_BYTES
  });
});

app.post(
  '/api/media',
  authenticateUser,
  requirePermission('media.upload'),
  uploadJsonParser,
  async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { name, dataUrl, altText, folder, tags } = req.body || {};

    if (typeof dataUrl !== 'string' || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Media data and filename are required.' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z0-9\-+\/.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid data URI payload.' });
    }

    const declaredMime = matches[1].toLowerCase();
    const buffer = Buffer.from(matches[2], 'base64');
    const detection = detectMediaByMagicBytes(buffer, declaredMime, name);
    if (!detection.ok) {
      return res.status(400).json({ error: detection.error });
    }

    const { info } = detection;
    if (buffer.length > info.maxBytes) {
      const limitMb = Math.round(info.maxBytes / (1024 * 1024));
      return res.status(413).json({ error: `File exceeds the ${limitMb}MB limit for ${info.type} uploads.` });
    }

    const filename = `asset_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${info.ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    const url = `/uploads/${filename}`;

    const mediaItem = await mediaRepo.write(db => {
      const created = {
        id: `med-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        name: name.trim().slice(0, 180),
        url,
        mimeType: info.mimeType,
        type: info.type,
        size: buffer.length,
        altText: typeof altText === 'string' ? altText.trim().slice(0, 300) : '',
        folder: typeof folder === 'string' && folder.trim() ? folder.trim() : 'General',
        tags: sanitizeStringArray(tags),
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString()
      };
      db.media.unshift(created);
      appendActivity(db, user, `Uploaded media: ${created.name} (${info.type})`, 'Media', created.name);
      return created;
    });

    return res.json({ ...mediaItem, usedInCount: 0 });
  }
);

app.post(
  '/api/media/:id/replace',
  authenticateUser,
  requirePermission('media.manage'),
  uploadJsonParser,
  async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { dataUrl, name } = req.body || {};

    if (typeof dataUrl !== 'string' || !dataUrl) {
      return res.status(400).json({ error: 'Replacement media dataUrl is required.' });
    }

    const existing = mediaRepo.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Media asset not found' });

    const matches = dataUrl.match(/^data:([A-Za-z0-9\-+\/.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid file format.' });
    }

    const declaredMime = matches[1].toLowerCase();
    const buffer = Buffer.from(matches[2], 'base64');
    const detection = detectMediaByMagicBytes(buffer, declaredMime, typeof name === 'string' ? name : existing.name);
    if (!detection.ok) {
      return res.status(400).json({ error: detection.error });
    }

    const { info } = detection;
    if (info.type !== existing.type) {
      return res.status(400).json({
        error: `Replacement file must match the existing asset category (${existing.type}); received ${info.type}.`
      });
    }
    if (buffer.length > info.maxBytes) {
      const limitMb = Math.round(info.maxBytes / (1024 * 1024));
      return res.status(413).json({ error: `Replacement file exceeds ${limitMb}MB limit.` });
    }

    const updated = await dbStore.write(
      db => {
        const item = db.media.find(m => m.id === req.params.id)!;
        const oldUrl = item.url.split('?')[0];
        const newExt = `.${info.ext}`;
        const newFilename = `${item.isLocked ? 'brand' : 'asset'}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${newExt}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, newFilename), buffer);

        if (oldUrl.startsWith('/uploads/')) {
          try {
            const oldPath = path.join(UPLOADS_DIR, path.basename(oldUrl));
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          } catch {
            // Ignore cleanup failure
          }
        }

        // Cache-bust URL cleanly on replace so live site updates immediately everywhere
        const newUrl = `/uploads/${newFilename}?v=${Date.now()}`;
        const prevFullUrl = item.url;
        item.url = newUrl;
        mediaRepo.replaceReferences(db, prevFullUrl, newUrl);
        if (prevFullUrl !== oldUrl) {
          mediaRepo.replaceReferences(db, oldUrl, newUrl);
        }
        item.mimeType = info.mimeType;
        item.size = buffer.length;
        if (typeof name === 'string' && name.trim()) item.name = name.trim().slice(0, 180);
        appendActivity(db, user, `Replaced media asset file: ${item.name}`, 'Media', item.name);
        return item;
      },
      { bumpContentVersion: true }
    );

    return res.json(updated);
  }
);

app.put(
  '/api/media/:id',
  authenticateUser,
  requireAnyPermission('media.upload', 'media.manage'),
  async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const canManageAll = can(user, 'media.manage', rolesRepo.list());
    const body = req.body || {};

    try {
      const updated = await mediaRepo.write(db => {
        const item = db.media.find(m => m.id === req.params.id);
        if (!item) throw new Error('NOT_FOUND:Media asset not found');
        if (!canManageAll && item.uploadedBy !== user.id) {
          throw new Error('FORBIDDEN:You can only edit media assets you uploaded.');
        }
        if (typeof body.altText === 'string') item.altText = body.altText.slice(0, 300);
        if (typeof body.name === 'string' && body.name.trim()) item.name = body.name.trim().slice(0, 180);
        if (typeof body.folder === 'string' && body.folder.trim()) item.folder = body.folder.trim();
        if (Array.isArray(body.tags)) item.tags = sanitizeStringArray(body.tags);
        if (body.focalPoint && typeof body.focalPoint.x === 'number' && typeof body.focalPoint.y === 'number') {
          item.focalPoint = { x: body.focalPoint.x, y: body.focalPoint.y };
        }
        appendActivity(db, user, `Updated media metadata: ${item.name}`, 'Media', item.name);
        return item;
      });
      return res.json(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
      if (msg.startsWith('FORBIDDEN:')) return res.status(403).json({ error: msg.slice(10) });
      return res.status(400).json({ error: msg });
    }
  }
);

app.delete(
  '/api/media/:id',
  authenticateUser,
  requireAnyPermission('media.upload', 'media.manage'),
  async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const canManageAll = can(user, 'media.manage', rolesRepo.list());
    const item = mediaRepo.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Media asset not found' });

    if (!canManageAll && item.uploadedBy !== user.id) {
      return res.status(403).json({ error: 'You can only delete media assets you uploaded.' });
    }
    if (item.isLocked || item.url === '/drawing1.png' || item.url === '/5320.jpg') {
      return res.status(400).json({ error: 'The official MoA and RDD logos are locked: they can be replaced but not deleted.' });
    }

    const refs = mediaRepo.getReferences(item.url);
    if (refs.length > 0) {
      return res.status(400).json({
        error: `This asset is currently referenced (${refs.length} place${refs.length === 1 ? '' : 's'}). Remove its references before deleting.`
      });
    }

    await mediaRepo.write(db => {
      db.media = db.media.filter(m => m.id !== req.params.id);
      if (item.url.startsWith('/uploads/')) {
        try {
          const filePath = path.join(UPLOADS_DIR, path.basename(item.url.split('?')[0]));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {
          // Ignore file unlink failure
        }
      }
      appendActivity(db, user, `Deleted media asset: ${item.name}`, 'Media', item.name);
    });

    return res.json({ success: true });
  }
);

// ============================================================================
// SITE CONTENT & PAGE EDITOR
// ============================================================================

app.get('/api/page-content', maintenanceGate, (_req, res) => {
  return res.json(pageContentRepo.get());
});

app.put('/api/page-content', authenticateUser, requirePermission('website.edit'), async (req: AuthenticatedRequest, res) => {
  const urlErr = validateBlocksUrls(req.body, 'pageContent');
  if (urlErr) return res.status(400).json({ error: urlErr });

  const updated = await pageContentRepo.writeWithBump(db => {
    db.contentHistory.unshift({
      id: `snap-${Date.now()}`,
      entityType: 'text',
      entityId: 'pageContent',
      author: req.user!.name,
      authorEmail: req.user!.email,
      timestamp: new Date().toISOString(),
      snapshot: JSON.parse(JSON.stringify(db.pageContent)),
      changeNote: 'Direct content update'
    });
    db.contentHistory = db.contentHistory.slice(0, 50);
    db.pageContent = mergeSiteContentPatch(db.pageContent, req.body);
    appendActivity(db, req.user!, 'Updated site content', 'Website', 'Page Content');
    return db.pageContent;
  });

  return res.json(updated);
});

app.get('/api/page-content/draft', authenticateUser, requirePermission('website.edit'), (_req, res) => {
  return res.json(pageContentRepo.getDraft());
});

app.post('/api/page-content/draft', authenticateUser, requirePermission('website.edit'), async (req, res) => {
  const draftInput = req.body?.draft;
  if (draftInput && typeof draftInput === 'object') {
    const urlErr = validateBlocksUrls(draftInput, 'draft');
    if (urlErr) return res.status(400).json({ error: urlErr });
  }
  await pageContentRepo.write(db => {
    if (!draftInput || typeof draftInput !== 'object') {
      delete db.draftContent;
    } else {
      db.draftContent = mergeSiteContentPatch(db.pageContent, draftInput);
    }
  });
  return res.json({ success: true });
});

app.post('/api/page-content/publish-draft', authenticateUser, requirePermission('website.edit'), async (req: AuthenticatedRequest, res) => {
  try {
    const published = await pageContentRepo.writeWithBump(db => {
      if (!db.draftContent) throw new Error('No draft changes to publish');
      db.contentHistory.unshift({
        id: `snap-${Date.now()}`,
        entityType: 'text',
        entityId: 'pageContent',
        author: req.user!.name,
        authorEmail: req.user!.email,
        timestamp: new Date().toISOString(),
        snapshot: JSON.parse(JSON.stringify(db.pageContent)),
        changeNote: 'Published inline page editor changes'
      });
      db.contentHistory = db.contentHistory.slice(0, 50);
      db.pageContent = mergeSiteContentPatch(db.pageContent, db.draftContent);
      delete db.draftContent;
      appendActivity(db, req.user!, 'Published inline draft changes', 'Website', 'Public Site');
      return db.pageContent;
    });
    return res.json(published);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Nothing to publish' });
  }
});

app.get('/api/page-content/history', authenticateUser, requirePermission('website.edit'), (_req, res) => {
  return res.json(pageContentRepo.getHistory());
});

app.post('/api/page-content/history/:id/restore', authenticateUser, requirePermission('website.edit'), async (req: AuthenticatedRequest, res) => {
  try {
    const restored = await pageContentRepo.writeWithBump(db => {
      const snap = db.contentHistory?.find(s => s.id === req.params.id);
      if (!snap || !snap.snapshot) throw new Error('Snapshot not found');
      db.pageContent = mergeSiteContentPatch(db.pageContent, snap.snapshot);
      appendActivity(db, req.user!, `Restored content version from ${snap.timestamp}`, 'Website', 'Page Content');
      return db.pageContent;
    });
    return res.json(restored);
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : 'Snapshot not found' });
  }
});

// ============================================================================
// SITE SETTINGS, NAVIGATION, SEO & REDIRECTS
// ============================================================================

app.get('/api/settings', (req, res) => {
  const user = getOptionalAuthUser(req);
  const settings = settingsRepo.get();
  if (user && (can(user, 'settings.manage', rolesRepo.list()) || can(user, 'seo.manage', rolesRepo.list()))) {
    return res.json(settings);
  }
  const { securityPolicy: _sp, maintenanceAllowlist: _ma, ...publicSettings } = settings;
  return res.json(publicSettings);
});

app.put(
  '/api/settings',
  authenticateUser,
  requireAnyPermission('settings.manage', 'navigation.manage', 'seo.manage'),
  async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const roles = rolesRepo.list();
    const canSettings = can(user, 'settings.manage', roles);
    const canNav = can(user, 'navigation.manage', roles) || canSettings;
    const canSeo = can(user, 'seo.manage', roles) || canSettings;
    const body = req.body || {};

    if (canSettings) {
      const urlErr =
        validateSafeUrlField(body.moaLogoUrl, 'moaLogoUrl') ||
        validateSafeUrlField(body.loaderLogoUrl, 'loaderLogoUrl') ||
        validateSafeUrlField(body.rddLogoUrl, 'rddLogoUrl') ||
        validateSafeUrlField(body.faviconUrl, 'faviconUrl') ||
        validateSafeUrlField(body.shareImageUrl, 'shareImageUrl');
      if (urlErr) return res.status(400).json({ error: urlErr });
    }

    if (canNav) {
      const navErr = validateNavigationUrls(body.navigation) || validateFooterColumnsUrls(body.footerColumns);
      if (navErr) return res.status(400).json({ error: navErr });
    }

    if (Array.isArray(body.socialLinks) && canSettings) {
      for (const link of body.socialLinks) {
        if (!link || typeof link.url !== 'string' || !isSafeUrl(link.url, true)) {
          return res.status(400).json({ error: 'All social links must use valid http(s) URLs.' });
        }
      }
    }

    if (body.announcementBar && typeof body.announcementBar === 'object' && canSettings) {
      if (body.announcementBar.linkUrl && !isSafeUrl(body.announcementBar.linkUrl)) {
        return res.status(400).json({ error: 'Announcement link URL must be a valid http(s) or relative URL.' });
      }
    }

    if (Array.isArray(body.redirects) && canSeo) {
      const seenFrom = new Set<string>();
      for (const r of body.redirects) {
        if (!r || typeof r.from !== 'string' || typeof r.to !== 'string' || !r.from.trim() || !r.to.trim()) {
          return res.status(400).json({ error: 'Each redirect must specify valid source and destination paths.' });
        }
        if (!isSafeUrl(r.to)) {
          return res.status(400).json({ error: `Redirect destination "${r.to}" is not a safe URL.` });
        }
        const normFrom = normalizeRedirectPath(r.from).toLowerCase();
        if (seenFrom.has(normFrom)) {
          return res.status(400).json({ error: `Duplicate redirect source "${r.from}".` });
        }
        seenFrom.add(normFrom);
        if (wouldCreateRedirectLoop(body.redirects, r.from, r.to, r.id)) {
          return res.status(400).json({ error: `Redirect rule "${r.from}" -> "${r.to}" creates a redirect loop.` });
        }
      }
    }

    const updated = await settingsRepo.writeWithBump(db => {
      const s = db.settings;

      if (canSettings) {
        if (typeof body.siteName === 'string' && body.siteName.trim()) s.siteName = body.siteName.trim();
        if (typeof body.tagline === 'string') s.tagline = body.tagline;
        if (typeof body.moaLogoUrl === 'string' && body.moaLogoUrl) s.moaLogoUrl = body.moaLogoUrl;
        if (typeof body.loaderLogoUrl === 'string' && body.loaderLogoUrl) s.loaderLogoUrl = body.loaderLogoUrl;
        if (typeof body.rddLogoUrl === 'string') {
          s.rddLogoUrl = body.rddLogoUrl.trim();
          const rddDept = db.departments.find(d => d.isRdd || d.id === 'dept-rdd');
          if (rddDept) {
            rddDept.customLogoUrl = s.rddLogoUrl;
          }
        }
        if (typeof body.faviconUrl === 'string') s.faviconUrl = body.faviconUrl.trim();
        if (typeof body.shareImageUrl === 'string') s.shareImageUrl = body.shareImageUrl.trim();
        if (typeof body.contactEmail === 'string' && EMAIL_REGEX.test(body.contactEmail.trim())) {
          s.contactEmail = body.contactEmail.trim();
        }
        if (typeof body.organizationAddress === 'string') s.organizationAddress = body.organizationAddress;
        if (typeof body.language === 'string') s.language = body.language;
        if (typeof body.timezone === 'string') s.timezone = body.timezone;
        if (typeof body.footerText === 'string') s.footerText = body.footerText;
        if (typeof body.notFoundText === 'string') s.notFoundText = body.notFoundText;
        if (typeof body.alwaysShowProducts === 'boolean') s.alwaysShowProducts = body.alwaysShowProducts;
        if (typeof body.maintenanceMode === 'boolean') s.maintenanceMode = body.maintenanceMode;
        if (Array.isArray(body.maintenanceAllowlist)) s.maintenanceAllowlist = sanitizeStringArray(body.maintenanceAllowlist);
        if (Array.isArray(body.projectStatuses)) s.projectStatuses = sanitizeStringArray(body.projectStatuses);
        if (Array.isArray(body.projectCategories)) s.projectCategories = sanitizeStringArray(body.projectCategories);
        if (Array.isArray(body.socialLinks)) s.socialLinks = body.socialLinks;
        if (body.announcementBar && typeof body.announcementBar === 'object') {
          s.announcementBar = {
            enabled: Boolean(body.announcementBar.enabled),
            text: typeof body.announcementBar.text === 'string' ? body.announcementBar.text : '',
            linkUrl: typeof body.announcementBar.linkUrl === 'string' ? body.announcementBar.linkUrl : '',
            linkLabel: typeof body.announcementBar.linkLabel === 'string' ? body.announcementBar.linkLabel : '',
            expiresAt: typeof body.announcementBar.expiresAt === 'string' ? body.announcementBar.expiresAt : ''
          };
        }
        if (body.securityPolicy && typeof body.securityPolicy === 'object') {
          const sp = body.securityPolicy;
          s.securityPolicy = {
            minPasswordLength: Math.min(64, Math.max(12, Number(sp.minPasswordLength) || s.securityPolicy.minPasswordLength)),
            requireUppercase: typeof sp.requireUppercase === 'boolean' ? sp.requireUppercase : s.securityPolicy.requireUppercase,
            requireNumber: typeof sp.requireNumber === 'boolean' ? sp.requireNumber : s.securityPolicy.requireNumber,
            requireSymbol: typeof sp.requireSymbol === 'boolean' ? sp.requireSymbol : s.securityPolicy.requireSymbol,
            sessionTimeoutMinutes: Math.min(1440, Math.max(15, Number(sp.sessionTimeoutMinutes) || s.securityPolicy.sessionTimeoutMinutes)),
            enforce2FAForAdmins: typeof sp.enforce2FAForAdmins === 'boolean' ? sp.enforce2FAForAdmins : s.securityPolicy.enforce2FAForAdmins,
            maxLoginAttempts: Math.min(20, Math.max(3, Number(sp.maxLoginAttempts) || s.securityPolicy.maxLoginAttempts)),
            lockoutDurationMinutes: Math.min(15, Math.max(1, Number(sp.lockoutDurationMinutes) || s.securityPolicy.lockoutDurationMinutes))
          };
        }
      }

      if (canNav) {
        if (Array.isArray(body.navigation)) {
          // Never allow /login or /signin in navigation
          s.navigation = body.navigation.filter(
            (n: { path?: string }) =>
              n &&
              typeof n.path === 'string' &&
              !['/login', '/signin'].includes(n.path.trim().toLowerCase())
          );
        }
        if (Array.isArray(body.footerColumns)) s.footerColumns = body.footerColumns;
      }

      if (canSeo) {
        if (body.seoDefaults && typeof body.seoDefaults === 'object') {
          s.seoDefaults = {
            title: typeof body.seoDefaults.title === 'string' ? body.seoDefaults.title : s.seoDefaults.title,
            description: typeof body.seoDefaults.description === 'string' ? body.seoDefaults.description : s.seoDefaults.description,
            keywords: typeof body.seoDefaults.keywords === 'string' ? body.seoDefaults.keywords : s.seoDefaults.keywords,
            sitemapEnabled:
              typeof body.seoDefaults.sitemapEnabled === 'boolean' ? body.seoDefaults.sitemapEnabled : s.seoDefaults.sitemapEnabled,
            robotsEnabled:
              typeof body.seoDefaults.robotsEnabled === 'boolean' ? body.seoDefaults.robotsEnabled : s.seoDefaults.robotsEnabled
          };
        }
        if (Array.isArray(body.redirects)) {
          s.redirects = body.redirects.map((r: { id?: string; from: string; to: string; type?: '301' | '302'; createdAt?: string; hits?: number }) => ({
            id: typeof r.id === 'string' && r.id ? r.id : `red-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
            from: normalizeRedirectPath(r.from),
            to: normalizeRedirectPath(r.to),
            type: r.type === '302' ? '302' : '301',
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
            hits: typeof r.hits === 'number' ? r.hits : 0
          }));
        }
      }

      appendActivity(db, user, 'Updated site settings', 'Settings', 'Site Settings');
      return s;
    });

    return res.json(updated);
  }
);

app.post(
  '/api/redirects/test',
  authenticateUser,
  requireAnyPermission('seo.manage', 'settings.manage'),
  (req, res) => {
    const rawPath = typeof req.body?.path === 'string' ? req.body.path : '/';
    const normalized = normalizeRedirectPath(rawPath).toLowerCase();
    const redirects = settingsRepo.get().redirects || [];
    const chain: string[] = [rawPath];
    let curr = normalized;
    let firstMatch: (typeof redirects)[number] | null = null;
    const seen = new Set<string>([curr]);

    for (let i = 0; i < 10; i++) {
      const rule = redirects.find(r => normalizeRedirectPath(r.from).toLowerCase() === curr);
      if (!rule) break;
      if (!firstMatch) firstMatch = rule;
      const next = normalizeRedirectPath(rule.to).toLowerCase();
      chain.push(rule.to);
      if (seen.has(next)) {
        return res.json({ matched: true, redirect: firstMatch, finalPath: rule.to, chain, loopDetected: true });
      }
      seen.add(next);
      curr = next;
    }

    return res.json({
      matched: Boolean(firstMatch),
      redirect: firstMatch,
      finalPath: firstMatch ? chain[chain.length - 1] : normalizeRedirectPath(rawPath),
      chain,
      loopDetected: false
    });
  }
);

// ============================================================================
// CUSTOM PAGES
// ============================================================================

app.get('/api/pages', maintenanceGate, async (req, res) => {
  await processScheduledPublications();
  const user = getOptionalAuthUser(req);
  if (user && hasPortalAccess(user, rolesRepo.list())) {
    return res.json(pagesRepo.listAllNonDeleted());
  }
  return res.json(pagesRepo.listPublic());
});

app.post('/api/pages', authenticateUser, requirePermission('pages.manage'), async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const body = req.body || {};

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return res.status(400).json({ error: 'Page title is required' });
  }

  const urlErr =
    validateSafeUrlField(body.seo?.shareImage, 'seo.shareImage') ||
    validateSafeUrlField(body.seo?.canonical, 'seo.canonical') ||
    validateBlocksUrls(body.blocks, 'blocks');
  if (urlErr) return res.status(400).json({ error: urlErr });

  const slug = normalizeSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : body.title, 'page');
  try {
    const saved = await pagesRepo.writeWithBump(db => {
      const id =
        typeof body.id === 'string' && body.id.trim()
          ? body.id.trim()
          : `page-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      const idx = db.pages.findIndex(p => p.id === id);
      if (db.pages.some(p => p.id !== id && !p.deletedAt && p.slug.toLowerCase() === slug)) {
        throw new Error('Another active custom page already uses this slug');
      }
      if (idx >= 0 && db.pages[idx].slug !== slug) {
        addAutoRedirect(db, `/pages/${db.pages[idx].slug}`, `/pages/${slug}`);
      }
      const now = new Date().toISOString();
      const pageRecord = {
        id,
        title: body.title.trim(),
        slug,
        template: (['Standard', 'Landing', 'Article', 'Gallery'].includes(body.template) ? body.template : 'Standard') as 'Standard' | 'Landing' | 'Article' | 'Gallery',
        status: (['Published', 'Draft', 'Hidden'].includes(body.status) ? body.status : 'Draft') as 'Published' | 'Draft' | 'Hidden',
        scheduledPublishDate: typeof body.scheduledPublishDate === 'string' ? body.scheduledPublishDate : undefined,
        blocks: Array.isArray(body.blocks) ? body.blocks : [],
        seo:
          body.seo && typeof body.seo === 'object'
            ? {
                title: typeof body.seo.title === 'string' ? body.seo.title : undefined,
                description: typeof body.seo.description === 'string' ? body.seo.description : undefined,
                shareImage: typeof body.seo.shareImage === 'string' ? body.seo.shareImage : undefined,
                canonical: typeof body.seo.canonical === 'string' ? body.seo.canonical : undefined,
                noindex: typeof body.seo.noindex === 'boolean' ? body.seo.noindex : undefined
              }
            : {},
        createdAt: idx >= 0 ? db.pages[idx].createdAt : now,
        updatedAt: now
      };
      if (idx >= 0) db.pages[idx] = pageRecord;
      else db.pages.push(pageRecord);
      appendActivity(db, user, `Saved page: ${pageRecord.title}`, 'Website', pageRecord.title);
      return pageRecord;
    });
    return res.json(saved);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Could not save page' });
  }
});

app.delete('/api/pages/:id', authenticateUser, requirePermission('pages.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    await pagesRepo.writeWithBump(db => {
      const pg = db.pages.find(p => p.id === req.params.id);
      if (!pg) throw new Error('Page not found');
      pg.deletedAt = new Date().toISOString();
      pg.status = 'Draft';
      appendActivity(db, req.user!, `Moved page to Trash: ${pg.title}`, 'Website', pg.title);
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : 'Page not found' });
  }
});

// ============================================================================
// ACTIVITY LOG, SECURITY LOG & SITE HEALTH
// ============================================================================

app.get('/api/activity-log', authenticateUser, requirePermission('audit.view'), (req, res) => {
  const all = activityRepo.list();
  const pageParam = Number(req.query.page);
  const limitParam = Number(req.query.limit);
  if (Number.isFinite(pageParam) && pageParam > 0) {
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(100, limitParam) : 25;
    const area = typeof req.query.area === 'string' && req.query.area !== 'all' ? req.query.area : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const filtered = all.filter(entry => {
      if (area && entry.area !== area) return false;
      if (
        q &&
        !entry.action.toLowerCase().includes(q) &&
        !entry.userEmail.toLowerCase().includes(q) &&
        !entry.target.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(pageParam, totalPages);
    const items = filtered.slice((safePage - 1) * limit, safePage * limit);
    return res.json({ items, total, page: safePage, limit, totalPages });
  }
  return res.json(all);
});

app.get('/api/security-log', authenticateUser, requirePermission('audit.view'), (_req, res) => {
  return res.json(securityLogRepo.list());
});

app.get(
  '/api/site-health',
  authenticateUser,
  requireAnyPermission('audit.view', 'settings.manage', 'departments.manage', 'projects.editAll', 'projects.publish'),
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const roles = rolesRepo.list();
    const canAdminHealth = can(user, 'settings.manage', roles) || can(user, 'audit.view', roles);
    const db = dbStore.read();
    const items: Array<{ id: string; type: 'warning' | 'info' | 'error'; title: string; message: string; actionTab?: string; actionText?: string }> = [];

    const deptsWithoutIntro = db.departments.filter(d => !d.deletedAt && (!d.introduction || d.introduction.trim() === ''));
    if (canAdminHealth && deptsWithoutIntro.length > 0) {
      items.push({
        id: 'health-depts-intro',
        type: 'warning',
        title: `${deptsWithoutIntro.length} department${deptsWithoutIntro.length === 1 ? '' : 's'} missing introductions`,
        message: `${deptsWithoutIntro.map(d => d.name).join(', ')} currently have empty introduction copy.`,
        actionTab: 'content',
        actionText: 'Edit Departments'
      });
    }

    const mediaMissingAlt = db.media.filter(m => m.type === 'image' && (!m.altText || m.altText.trim() === ''));
    if (canAdminHealth && mediaMissingAlt.length > 0) {
      items.push({
        id: 'health-media-alt',
        type: 'warning',
        title: `${mediaMissingAlt.length} image${mediaMissingAlt.length === 1 ? '' : 's'} missing descriptive alt text`,
        message: 'Descriptive alt text is required for accessibility and SEO on all visual assets.',
        actionTab: 'media',
        actionText: 'Review Media'
      });
    }

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lingeringDrafts = db.projects.filter(
      p =>
        !p.deletedAt &&
        (p.publicationStatus === 'Pending Review' || p.publicationStatus === 'Draft') &&
        (can(user, 'projects.editAll', roles) || p.authorId === user.id) &&
        new Date(p.updatedAt).getTime() < oneWeekAgo
    );
    if (lingeringDrafts.length > 0) {
      items.push({
        id: 'health-stale-drafts',
        type: 'info',
        title: `${lingeringDrafts.length} project draft${lingeringDrafts.length === 1 ? '' : 's'} awaiting attention for over 7 days`,
        message: `${lingeringDrafts.map(p => p.title).join(', ')} have had no updates in the past week.`,
        actionTab: 'content',
        actionText: 'Review Projects'
      });
    }

    const unusedMedia = db.media.filter(m => !m.isLocked && !mediaRepo.isInUse(m.url));
    if (canAdminHealth && unusedMedia.length > 0) {
      items.push({
        id: 'health-unused-media',
        type: 'info',
        title: `${unusedMedia.length} unused media asset${unusedMedia.length === 1 ? '' : 's'} in storage`,
        message: `${unusedMedia.length} uploaded file${unusedMedia.length === 1 ? ' is' : 's are'} not referenced across settings, pages, departments, projects, publications, or products.`,
        actionTab: 'media',
        actionText: 'Review Media'
      });
    }

    if (canAdminHealth && (!db.settings?.contactEmail || !EMAIL_REGEX.test(db.settings.contactEmail))) {
      items.push({
        id: 'health-contact-email',
        type: 'warning',
        title: 'Missing valid official contact email',
        message: 'Configure a valid public contact email address in Organization Settings.',
        actionTab: 'settings',
        actionText: 'Open Settings'
      });
    }

    if (canAdminHealth && (!db.settings?.seoDefaults?.description || db.settings.seoDefaults.description.trim().length < 20)) {
      items.push({
        id: 'health-seo-desc',
        type: 'info',
        title: 'Default SEO meta description is too short',
        message: 'Set a clear global meta description under Website -> SEO & Redirects.',
        actionTab: 'website',
        actionText: 'Configure SEO'
      });
    }

    const pubsMissingPdf = (db.publications || []).filter(p => !p.deletedAt && p.publicationStatus === 'Published' && !p.pdfUrl);
    if (canAdminHealth && pubsMissingPdf.length > 0) {
      items.push({
        id: 'health-pubs-pdf',
        type: 'warning',
        title: `${pubsMissingPdf.length} published publication${pubsMissingPdf.length === 1 ? '' : 's'} missing a PDF file`,
        message: 'Attach PDFs to published papers so visitors can open them directly.',
        actionTab: 'content',
        actionText: 'Review Publications'
      });
    }

    const missingCoverProjs = db.projects.filter(
      p => !p.deletedAt && p.publicationStatus === 'Published' && !p.coverImage
    );
    if (missingCoverProjs.length > 0) {
      items.push({
        id: 'health-project-covers',
        type: 'info',
        title: `${missingCoverProjs.length} published project${missingCoverProjs.length === 1 ? '' : 's'} without cover imagery`,
        message: 'Adding cover visuals improves showcase presentation on the public Our Work page.',
        actionTab: 'content',
        actionText: 'Review Projects'
      });
    }

    return res.json(items);
  }
);

// ============================================================================
// BACKUP & RESTORE
// ============================================================================

app.get('/api/backup/list', authenticateUser, requirePermission('backups.manage'), (_req, res) => {
  try {
    return res.json(backupsRepo.list());
  } catch (err) {
    console.error('[MoA Backup] Failed to list backups:', err);
    return res.status(500).json({ error: 'Could not list server backups' });
  }
});

app.get('/api/backup/download/:filename', authenticateUser, requirePermission('backups.manage'), (req, res) => {
  try {
    const safeExport = backupsRepo.readBackupFile(String(req.params.filename || ''));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(String(req.params.filename))}"`);
    return res.json(safeExport);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Backup read failed';
    return res.status(msg.includes('Invalid') ? 400 : 404).json({ error: msg });
  }
});

app.get('/api/backup/export', authenticateUser, requirePermission('backups.manage'), (_req, res) => {
  const exportData = backupsRepo.exportSafe();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="moa_backup.json"');
  return res.json(exportData);
});

function validateBackupPayload(data: unknown): { ok: true } | { ok: false; error: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Backup payload must be a JSON object.' };
  }
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.departments)) {
    return { ok: false, error: 'Invalid backup: "departments" must be an array.' };
  }
  for (const [idx, d] of obj.departments.entries()) {
    if (!d || typeof d !== 'object' || typeof (d as { id?: unknown }).id !== 'string' || typeof (d as { name?: unknown }).name !== 'string' || typeof (d as { slug?: unknown }).slug !== 'string') {
      return { ok: false, error: `Invalid backup: departments[${idx}] must have string id, name, and slug.` };
    }
  }

  if (!obj.settings || typeof obj.settings !== 'object' || Array.isArray(obj.settings) || typeof (obj.settings as { siteName?: unknown }).siteName !== 'string') {
    return { ok: false, error: 'Invalid backup: "settings" must be an object containing string siteName.' };
  }

  if (obj.projects !== undefined) {
    if (!Array.isArray(obj.projects)) return { ok: false, error: 'Invalid backup: "projects" must be an array.' };
    for (const [idx, p] of obj.projects.entries()) {
      if (!p || typeof p !== 'object' || typeof (p as { id?: unknown }).id !== 'string' || typeof (p as { title?: unknown }).title !== 'string' || typeof (p as { slug?: unknown }).slug !== 'string') {
        return { ok: false, error: `Invalid backup: projects[${idx}] must have string id, title, and slug.` };
      }
    }
  }

  if (obj.publications !== undefined && !Array.isArray(obj.publications)) {
    return { ok: false, error: 'Invalid backup: "publications" must be an array.' };
  }

  if (obj.products !== undefined && !Array.isArray(obj.products)) {
    return { ok: false, error: 'Invalid backup: "products" must be an array.' };
  }

  if (obj.media !== undefined) {
    if (!Array.isArray(obj.media)) return { ok: false, error: 'Invalid backup: "media" must be an array.' };
    for (const [idx, m] of obj.media.entries()) {
      const med = m as { id?: unknown; name?: unknown; url?: unknown; type?: unknown };
      if (
        !m ||
        typeof m !== 'object' ||
        typeof med.id !== 'string' ||
        typeof med.name !== 'string' ||
        typeof med.url !== 'string' ||
        !isSafeUrl(med.url) ||
        !['image', 'video', 'audio', 'document'].includes(String(med.type))
      ) {
        return { ok: false, error: `Invalid backup: media[${idx}] has missing or invalid id, name, url, or type.` };
      }
    }
  }

  // Deep URL check on imported data (reject javascript:/data:)
  const deepUrlErr = validateBlocksUrls(
    {
      departments: obj.departments,
      projects: obj.projects,
      publications: obj.publications,
      products: obj.products,
      settings: obj.settings,
      pageContent: obj.pageContent,
      pages: obj.pages
    },
    'backup'
  );
  if (deepUrlErr) {
    return { ok: false, error: deepUrlErr };
  }

  return { ok: true };
}

app.post(
  '/api/backup/import',
  authenticateUser,
  requirePermission('backups.manage'),
  importJsonParser,
  async (req: AuthenticatedRequest, res) => {
    const validation = validateBackupPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }
    await backupsRepo.importBackup(req.body as Record<string, unknown>, req.user!);
    return res.json({ success: true, message: 'Backup successfully validated and restored.' });
  }
);

// ============================================================================
// CONTACT INBOX (Read-Only)
// ============================================================================

app.get('/api/submissions', authenticateUser, requirePermission('inbox.view'), (req, res) => {
  const all = submissionsRepo.listAll();
  const pageParam = Number(req.query.page);
  const limitParam = Number(req.query.limit);
  const unreadCount = all.filter(s => s.status === 'new').length;

  if (Number.isFinite(pageParam) && pageParam > 0) {
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(100, limitParam) : 25;
    const statusFilter = typeof req.query.status === 'string' && req.query.status !== 'all' ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const filtered = all.filter(sub => {
      if (statusFilter && sub.status !== statusFilter) return false;
      if (
        q &&
        !sub.name.toLowerCase().includes(q) &&
        !sub.email.toLowerCase().includes(q) &&
        !(sub.subject || '').toLowerCase().includes(q) &&
        !sub.message.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(pageParam, totalPages);
    const items = filtered.slice((safePage - 1) * limit, safePage * limit);
    return res.json({ items, total, page: safePage, limit, totalPages, unreadCount });
  }

  return res.json(all);
});

app.post('/api/submissions', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkSubmissionRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many submissions sent from this address. Please try again later.' });
  }

  const body = req.body || {};
  // Honeypot field: return quiet 200 without storing spam
  if (
    (typeof body.website === 'string' && body.website.trim() !== '') ||
    (typeof body._gotcha === 'string' && body._gotcha.trim() !== '') ||
    (typeof body.hp === 'string' && body.hp.trim() !== '')
  ) {
    return res.json({ success: true, message: 'Message received. Thank you.' });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : '';
  const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : 'General Inquiry';

  if (!name) {
    return res.status(400).json({ error: 'Your name is required.' });
  }
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!message || message.length > 5000) {
    return res.status(400).json({ error: 'Message is required and must be 5000 characters or fewer.' });
  }
  if (name.length > 120) {
    return res.status(400).json({ error: 'Name must be 120 characters or fewer.' });
  }
  if (subject.length > 200) {
    return res.status(400).json({ error: 'Subject must be 200 characters or fewer.' });
  }

  await submissionsRepo.write(db => {
    db.submissions.unshift({
      id: `sub-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      formType: 'contact',
      name,
      email,
      subject,
      message,
      status: 'new',
      createdAt: new Date().toISOString()
    });
    if (db.submissions.length > 1000) {
      db.submissions = db.submissions.slice(0, 1000);
    }
  });

  // Fire-and-forget optional email alert to NOTIFY_EMAIL if configured
  void sendSubmissionNotificationEmail({
    siteName: settingsRepo.get().siteName,
    senderName: name,
    senderEmail: email,
    subject,
    message
  });

  return res.json({ success: true, message: 'Message received. Thank you.' });
});

app.patch('/api/submissions/:id', authenticateUser, requirePermission('inbox.view'), async (req: AuthenticatedRequest, res) => {
  const status = req.body?.status;
  if (!['new', 'read', 'archived'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'new', 'read', or 'archived'." });
  }
  try {
    const sub = await submissionsRepo.write(db => {
      const target = db.submissions.find(s => s.id === req.params.id);
      if (!target) throw new Error('Submission not found');
      target.status = status;
      return target;
    });
    return res.json(sub);
  } catch {
    return res.status(404).json({ error: 'Submission not found' });
  }
});

app.delete('/api/submissions/:id', authenticateUser, requirePermission('inbox.view'), async (req: AuthenticatedRequest, res) => {
  try {
    await submissionsRepo.write(db => {
      const before = db.submissions.length;
      db.submissions = db.submissions.filter(s => s.id !== req.params.id);
      if (db.submissions.length === before) throw new Error('Submission not found');
    });
    return res.json({ success: true });
  } catch {
    return res.status(404).json({ error: 'Submission not found' });
  }
});

// ============================================================================
// INVITATIONS
// ============================================================================

app.get('/api/invitations', authenticateUser, requirePermission('team.manage'), (_req, res) => {
  return res.json(invitationsRepo.listAll());
});

app.post('/api/invitations', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
  const requestedRoleId = typeof req.body?.roleId === 'string' ? req.body.roleId.trim() : '';
  const requestedRole = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
  const departmentScope = sanitizeStringArray(req.body?.departmentScope);

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (usersRepo.getByEmail(email)) {
    return res.status(400).json({ error: 'An active or existing account with this email already exists.' });
  }

  const roles = rolesRepo.list();
  const roleObj =
    (requestedRoleId && roles.find(r => r.id === requestedRoleId)) ||
    (requestedRole && roles.find(r => r.name.toLowerCase() === requestedRole.toLowerCase() || r.id === requestedRole)) ||
    roles.find(r => r.id === 'role-member')!;

  const token = crypto.randomBytes(24).toString('hex');
  const inviteUrl = `${getBaseUrl(req)}/invite?token=${token}`;
  const mailResult = await sendInvitationEmail({
    to: email,
    inviteUrl,
    invitedByName: req.user!.name,
    roleName: roleObj.name,
    siteName: settingsRepo.get().siteName
  });

  const invite = await invitationsRepo.write(db => {
    const created = {
      id: `inv-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      email,
      ...(name ? { name } : {}),
      role: roleObj.name,
      roleId: roleObj.id,
      departmentScope,
      invitedBy: req.user!.id,
      invitedByName: req.user!.name,
      token,
      status: 'pending' as const,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      lastSentAt: mailResult.sent ? new Date().toISOString() : undefined,
      emailSent: mailResult.sent,
      emailError: mailResult.sent ? undefined : mailResult.error
    };
    db.invitations.unshift(created);
    appendActivity(db, req.user!, `Created invitation for ${email}`, 'Team', email);
    return created;
  });

  return res.json({
    ...invite,
    inviteUrl,
    smtpConfigured: mailResult.configured,
    emailSent: mailResult.sent,
    emailError: mailResult.error
  });
});

app.post('/api/invitations/:id/resend', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  const existing = invitationsRepo.listAll().find(i => i.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Invitation not found' });
  if (existing.status === 'accepted') return res.status(400).json({ error: 'Invitation was already accepted.' });

  const newToken = crypto.randomBytes(24).toString('hex');
  const inviteUrl = `${getBaseUrl(req)}/invite?token=${newToken}`;
  const mailResult = await sendInvitationEmail({
    to: existing.email,
    inviteUrl,
    invitedByName: req.user!.name,
    roleName: existing.role,
    siteName: settingsRepo.get().siteName
  });

  const updated = await invitationsRepo.write(db => {
    const target = db.invitations.find(i => i.id === req.params.id)!;
    target.token = newToken;
    target.status = 'pending';
    target.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    target.emailSent = mailResult.sent;
    target.emailError = mailResult.sent ? undefined : mailResult.error;
    if (mailResult.sent) target.lastSentAt = new Date().toISOString();
    appendActivity(db, req.user!, `Resent invitation for ${target.email}`, 'Team', target.email);
    return target;
  });

  return res.json({
    ...updated,
    inviteUrl,
    smtpConfigured: mailResult.configured,
    emailSent: mailResult.sent,
    emailError: mailResult.error
  });
});

app.delete('/api/invitations/:id', authenticateUser, requirePermission('team.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    await invitationsRepo.write(db => {
      const idx = db.invitations.findIndex(inv => inv.id === req.params.id);
      if (idx < 0) throw new Error('Invitation not found');
      const target = db.invitations[idx];
      db.invitations.splice(idx, 1);
      appendActivity(db, req.user!, `Revoked invitation for ${target.email}`, 'Team', target.email);
    });
    return res.json({ success: true });
  } catch {
    return res.status(404).json({ error: 'Invitation not found' });
  }
});

app.get('/api/invitations/verify', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkLoginBucket(`invite-verify:${ip}`, 20)) {
    return res.status(429).json({ error: 'Too many verification attempts. Please wait a few minutes.' });
  }

  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (!token) return res.status(400).json({ error: 'Invitation token is required' });

  const invite = invitationsRepo.listAll().find(i => timingSafeTokenEqual(i.token, token));
  if (!invite || invite.status !== 'pending') {
    recordLoginFailure(`invite-verify:${ip}`, 20, 5);
    return res.status(404).json({ error: 'Invitation not found or already used.' });
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    await invitationsRepo.write(db => {
      const target = db.invitations.find(i => i.id === invite.id);
      if (target) target.status = 'expired';
    }, { skipBackup: true });
    return res.status(410).json({ error: 'This invitation link has expired. Ask an administrator for a new invite.' });
  }

  return res.json({
    valid: true,
    email: invite.email,
    name: invite.name,
    role: invite.role,
    roleId: invite.roleId || 'role-member',
    departmentScope: invite.departmentScope || [],
    invitedByName: invite.invitedByName,
    expiresAt: invite.expiresAt
  });
});

app.post('/api/invitations/accept', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkLoginBucket(`invite-accept:${ip}`, 10)) {
    return res.status(429).json({ error: 'Too many invitation acceptance attempts. Please try again later.' });
  }

  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!token || !name || !password) {
    return res.status(400).json({ error: 'Invitation token, full name, and password are required.' });
  }
  if (name.length > 120) {
    return res.status(400).json({ error: 'Name must be 120 characters or fewer.' });
  }

  const pwCheck = validatePasswordAgainstPolicy(password, settingsRepo.get().securityPolicy);
  if (!pwCheck.ok) {
    return res.status(400).json({ error: pwCheck.error });
  }

  try {
    const result = await invitationsRepo.write(db => {
      const invite = db.invitations.find(i => timingSafeTokenEqual(i.token, token));
      if (!invite || invite.status !== 'pending') {
        recordLoginFailure(`invite-accept:${ip}`, 10, 10);
        throw new Error('NOT_FOUND:Invitation link is invalid or no longer active.');
      }
      if (new Date(invite.expiresAt).getTime() < Date.now()) {
        invite.status = 'expired';
        throw new Error('EXPIRED:This invitation link has expired.');
      }
      if (db.users.some(u => u.email.toLowerCase() === invite.email.toLowerCase())) {
        throw new Error('An account with this email already exists. Please sign in normally.');
      }

      const roleId = invite.roleId || (invite.role.toLowerCase() === 'admin' ? 'role-admin' : 'role-member');
      const roleObj = db.roles.find(r => r.id === roleId) || db.roles.find(r => r.id === 'role-member')!;
      const salt = crypto.randomBytes(16).toString('hex');
      const nowIso = new Date().toISOString();

      const newUser: ServerUserRecord = {
        id: `usr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        email: invite.email.toLowerCase(),
        name,
        role: roleObj.name,
        roleId: roleObj.id,
        departmentScope: invite.departmentScope || [],
        salt,
        passwordHash: hashPassword(password, salt),
        mustChangePassword: false,
        twoFactorEnabled: false,
        deactivated: false,
        createdAt: nowIso,
        lastSignIn: nowIso
      };

      invite.status = 'accepted';
      db.users.push(newUser);

      const sessionToken = crypto.randomBytes(32).toString('hex');
      db.sessions.push({
        token: sessionToken,
        userId: newUser.id,
        role: newUser.role,
        roleId: newUser.roleId,
        lastActivity: Date.now(),
        createdAt: Date.now()
      });

      appendActivity(db, newUser, `Accepted invitation and activated ${roleObj.name} account`, 'Team', newUser.email);
      const sanitized = sanitizeUserResponse(newUser, db);
      return { token: sessionToken, requires2FASetup: sanitized.requires2FASetup, user: sanitized };
    });

    return res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invitation acceptance failed';
    if (msg.startsWith('NOT_FOUND:')) return res.status(404).json({ error: msg.slice(10) });
    if (msg.startsWith('EXPIRED:')) return res.status(410).json({ error: msg.slice(8) });
    return res.status(400).json({ error: msg });
  }
});

// ============================================================================
// TRASH & RESTORE
// ============================================================================

app.get('/api/trash', authenticateUser, requirePermission('trash.manage'), (_req, res) => {
  return res.json(trashRepo.list());
});

app.post('/api/trash/restore', authenticateUser, requirePermission('trash.manage'), async (req: AuthenticatedRequest, res) => {
  const { type, id } = req.body || {};
  try {
    await trashRepo.restore(String(type || ''), String(id || ''), req.user!);
    return res.json({ success: true });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : 'Trash item not found' });
  }
});

app.delete('/api/trash/item/:type/:id', authenticateUser, requirePermission('trash.manage'), async (req: AuthenticatedRequest, res) => {
  try {
    await trashRepo.deletePermanently(req.params.type, req.params.id, req.user!);
    return res.json({ success: true });
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : 'Trash item not found' });
  }
});

app.delete('/api/trash/empty', authenticateUser, requirePermission('trash.manage'), async (req: AuthenticatedRequest, res) => {
  const removed = await trashRepo.empty(req.user!);
  return res.json({ success: true, removed });
});

// ============================================================================
// SEO ENDPOINTS (robots.txt, sitemap.xml) & HTTP REDIRECTS
// ============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.get('/robots.txt', (req, res) => {
  const settings = settingsRepo.get();
  const robotsEnabled = settings.seoDefaults?.robotsEnabled !== false;
  const baseUrl = getBaseUrl(req);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (!robotsEnabled) {
    return res.send('User-agent: *\nDisallow: /\n');
  }
  const sitemapEnabled = settings.seoDefaults?.sitemapEnabled !== false;
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /login',
    'Disallow: /admin',
    'Disallow: /portal',
    'Disallow: /invite',
    ...(sitemapEnabled ? [`Sitemap: ${baseUrl}/sitemap.xml`] : [])
  ];
  return res.send(`${lines.join('\n')}\n`);
});

app.get('/sitemap.xml', async (req, res) => {
  await processScheduledPublications();
  const settings = settingsRepo.get();
  if (settings.seoDefaults?.sitemapEnabled === false) {
    return res.status(404).type('text/plain').send('Sitemap disabled');
  }
  const baseUrl = getBaseUrl(req);
  const urls: Array<{ loc: string; priority: string; lastmod?: string }> = [
    { loc: `${baseUrl}/`, priority: '1.0' },
    { loc: `${baseUrl}/about`, priority: '0.8' },
    { loc: `${baseUrl}/departments`, priority: '0.9' },
    { loc: `${baseUrl}/projects`, priority: '0.9' },
    { loc: `${baseUrl}/contact`, priority: '0.7' }
  ];

  const publishedProducts = productsRepo.listPublished();
  if (publishedProducts.length > 0 || settings.alwaysShowProducts) {
    urls.push({ loc: `${baseUrl}/products`, priority: '0.8' });
  }

  for (const dept of departmentsRepo.listPublished()) {
    const pathSegment =
      dept.kind === 'sector'
        ? `departments/rdd/${encodeURIComponent(dept.slug)}`
        : `departments/${encodeURIComponent(dept.slug)}`;
    urls.push({
      loc: `${baseUrl}/${pathSegment}`,
      priority: '0.8',
      lastmod: (dept.updatedAt || dept.createdAt || '').split('T')[0] || undefined
    });
  }

  for (const proj of projectsRepo.listPublished()) {
    if (proj.visibility !== 'Members only') {
      urls.push({
        loc: `${baseUrl}/projects/${encodeURIComponent(proj.slug)}`,
        priority: '0.8',
        lastmod: (proj.updatedAt || proj.createdAt || '').split('T')[0] || undefined
      });
    }
  }

  for (const prod of publishedProducts) {
    urls.push({
      loc: `${baseUrl}/products/${encodeURIComponent(prod.slug)}`,
      priority: '0.8',
      lastmod: (prod.updatedAt || prod.createdAt || '').split('T')[0] || undefined
    });
  }

  for (const pg of pagesRepo.listPublic()) {
    if (!pg.seo?.noindex) {
      urls.push({
        loc: `${baseUrl}/pages/${encodeURIComponent(pg.slug)}`,
        priority: '0.7',
        lastmod: (pg.updatedAt || pg.createdAt || '').split('T')[0] || undefined
      });
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => {
      const lastmodTag = u.lastmod ? `<lastmod>${escapeXml(u.lastmod)}</lastmod>` : '';
      return `  <url><loc>${escapeXml(u.loc)}</loc>${lastmodTag}<priority>${u.priority}</priority></url>`;
    }),
    '</urlset>'
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  return res.send(xml);
});

// Apply configured 301/302 redirect rules for non-API/non-asset GET routes
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET') return next();
  const lower = req.path.toLowerCase();
  if (
    lower.startsWith('/api/') ||
    lower.startsWith('/uploads/') ||
    lower === '/admin' ||
    lower === '/portal' ||
    lower === '/login' ||
    lower === '/signin' ||
    lower === '/invite' ||
    lower.includes('.')
  ) {
    return next();
  }

  const settings = settingsRepo.get();
  const normalizedPath = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  const match = (settings.redirects || []).find(
    r => normalizeRedirectPath(r.from).toLowerCase() === normalizedPath.toLowerCase()
  );
  if (match && match.to && normalizeRedirectPath(match.to).toLowerCase() !== normalizedPath.toLowerCase() && isSafeUrl(match.to)) {
    void settingsRepo.writeWithBump(db => {
      const rule = db.settings.redirects.find(x => x.id === match.id);
      if (rule) rule.hits = (rule.hits || 0) + 1;
    });
    return res.redirect(match.type === '302' ? 302 : 301, match.to);
  }
  return next();
});

// Serve uploaded media files: PDFs inline (for new-tab reading), Word docs attachment
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const ext = path.extname(filePath).toLowerCase();
      const safeFilename = path.basename(filePath).replace(/[^A-Za-z0-9._-]/g, '_');
      if (ext === '.pdf') {
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      } else if (ext === '.doc' || ext === '.docx') {
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      }
    }
  })
);

// Return 404 JSON for unmatched /api/* or /uploads/* instead of ever falling back to index.html
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found' }));
app.use('/uploads', (_req, res) => res.status(404).type('text/plain').send('Upload not found'));

// ============================================================================
// SERVER-SIDE HTML SEO & JSON-LD INJECTION
// ============================================================================

function computeRouteSeoMeta(req: Request): {
  title: string;
  description: string;
  keywords: string;
  image: string;
  favicon: string;
  lang: string;
  noindex: boolean;
  statusCode: number;
  jsonLd: string;
} {
  const settings = settingsRepo.get();
  const baseUrl = getBaseUrl(req);
  const rawPath = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  const lower = rawPath.toLowerCase();
  const siteName = settings.siteName || 'Masters Of All';
  const defaultTitle = settings.seoDefaults?.title || `${siteName} — ${settings.tagline || 'Believe. Build. Become.'}`;
  const defaultDesc = settings.seoDefaults?.description || '';
  const defaultKeywords = settings.seoDefaults?.keywords || '';
  const defaultImage = settings.shareImageUrl || settings.moaLogoUrl || '/drawing1.png';
  const favicon = settings.faviconUrl || settings.moaLogoUrl || '/drawing1.png';
  const lang = settings.language || 'en';

  const sameAs = (settings.socialLinks || []).map(l => l.url).filter(u => isSafeUrl(u));
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: baseUrl,
    logo: defaultImage.startsWith('http') ? defaultImage : `${baseUrl}${defaultImage.startsWith('/') ? '' : '/'}${defaultImage}`,
    description: defaultDesc,
    email: settings.contactEmail,
    ...(sameAs.length > 0 ? { sameAs } : {})
  };
  const jsonLd = JSON.stringify(orgSchema).replace(/</g, '\\u003c');

  if (lower === '/signin') {
    return { title: `Not Found — ${siteName}`, description: defaultDesc, keywords: defaultKeywords, image: defaultImage, favicon, lang, noindex: true, statusCode: 404, jsonLd };
  }
  if (lower === '/admin' || lower === '/portal') {
    // Document navigation never carries Bearer token; return 404 for unauthenticated requests to /admin or /portal while allowing SPA bootstrap
    const hasAuth = Boolean(getOptionalAuthUser(req));
    return {
      title: hasAuth ? `Control Room — ${siteName}` : `Not Found — ${siteName}`,
      description: defaultDesc,
      keywords: defaultKeywords,
      image: defaultImage,
      favicon,
      lang,
      noindex: true,
      statusCode: hasAuth ? 200 : 404,
      jsonLd
    };
  }
  if (lower === '/login' || lower === '/invite') {
    return {
      title: `${lower === '/login' ? 'Sign In' : 'Accept Invitation'} — ${siteName}`,
      description: defaultDesc,
      keywords: defaultKeywords,
      image: defaultImage,
      favicon,
      lang,
      noindex: true,
      statusCode: 200,
      jsonLd
    };
  }

  let title = defaultTitle;
  let description = defaultDesc;
  let image = defaultImage;
  let noindex = false;
  let statusCode = 200;

  if (lower === '/about') {
    title = `About — ${siteName}`;
  } else if (lower === '/departments') {
    title = `Departments — ${siteName}`;
  } else if (lower === '/projects') {
    title = `Projects — ${siteName}`;
  } else if (lower === '/products') {
    const hasPublishedProducts = productsRepo.listPublished().length > 0;
    if (hasPublishedProducts || settings.alwaysShowProducts) {
      title = `Products — ${siteName}`;
    } else {
      statusCode = 404;
      title = `Not Found — ${siteName}`;
    }
  } else if (lower === '/contact') {
    title = `Contact — ${siteName}`;
  } else if (lower.startsWith('/departments/rdd/') || lower.startsWith('/departments/') || lower.startsWith('/sectors/')) {
    const prefix = lower.startsWith('/departments/rdd/')
      ? '/departments/rdd/'
      : lower.startsWith('/sectors/')
        ? '/sectors/'
        : '/departments/';
    const slug = decodeURIComponent(rawPath.slice(prefix.length));
    const dept = departmentsRepo.getBySlugPublished(slug);
    if (dept) {
      title = dept.seoTitle || `${dept.name} — ${siteName}`;
      description = dept.seoDescription || dept.introduction || defaultDesc;
      image = dept.seoShareImage || dept.heroImage || defaultImage;
    } else {
      statusCode = 404;
      title = `Not Found — ${siteName}`;
    }
  } else if (lower.startsWith('/projects/')) {
    const slug = decodeURIComponent(rawPath.slice('/projects/'.length)).toLowerCase();
    const proj = projectsRepo.listPublished().find(p => p.slug.toLowerCase() === slug && p.visibility !== 'Members only');
    if (proj) {
      title = proj.seoTitle || `${proj.title} — ${siteName}`;
      description = proj.seoDescription || proj.shortDescription || defaultDesc;
      image = proj.seoShareImage || proj.coverImage || defaultImage;
    } else {
      statusCode = 404;
      title = `Not Found — ${siteName}`;
    }
  } else if (lower.startsWith('/products/')) {
    const slug = decodeURIComponent(rawPath.slice('/products/'.length)).toLowerCase();
    const publishedProducts = productsRepo.listPublished();
    const prod = publishedProducts.find(p => p.slug.toLowerCase() === slug);
    if (prod && (publishedProducts.length > 0 || settings.alwaysShowProducts)) {
      title = prod.seoTitle || `${prod.name} — ${siteName}`;
      description = prod.seoDescription || prod.shortDescription || prod.tagline || defaultDesc;
      image = prod.seoShareImage || prod.coverImage || defaultImage;
    } else {
      statusCode = 404;
      title = `Not Found — ${siteName}`;
    }
  } else if (lower.startsWith('/pages/') || lower !== '/') {
    const candidateSlug = lower.startsWith('/pages/')
      ? decodeURIComponent(rawPath.slice('/pages/'.length)).toLowerCase()
      : decodeURIComponent(rawPath.slice(1)).toLowerCase();
    const pg = pagesRepo.listPublic().find(p => p.slug.toLowerCase() === candidateSlug);
    if (pg) {
      title = pg.seo?.title || `${pg.title} — ${siteName}`;
      description = pg.seo?.description || defaultDesc;
      image = pg.seo?.shareImage || defaultImage;
      noindex = Boolean(pg.seo?.noindex);
    } else {
      statusCode = 404;
      title = `Not Found — ${siteName}`;
    }
  }

  return { title, description, keywords: defaultKeywords, image, favicon, lang, noindex, statusCode, jsonLd };
}

function injectHtmlSeo(templateHtml: string, req: Request): { html: string; statusCode: number; noindex: boolean } {
  const meta = computeRouteSeoMeta(req);
  const esc = escapeHtmlAttr;
  let html = templateHtml;

  html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${esc(meta.lang)}"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(meta.title)}</title>`);
  html = html.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${esc(meta.description)}" />`);
  html = html.replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${esc(meta.title)}" />`);
  html = html.replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${esc(meta.description)}" />`);
  html = html.replace(/<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${esc(meta.image)}" />`);
  html = html.replace(/<link\s+rel="icon"[^>]*>/i, `<link rel="icon" href="${esc(meta.favicon)}" />`);

  const extraTags = [
    meta.keywords ? `<meta name="keywords" content="${esc(meta.keywords)}" />` : '',
    meta.noindex ? `<meta name="robots" content="noindex, nofollow" />` : '',
    `<script type="application/ld+json">${meta.jsonLd}</script>`
  ]
    .filter(Boolean)
    .join('\n    ');

  html = html.replace('</head>', `    ${extraTags}\n  </head>`);
  return { html, statusCode: meta.statusCode, noindex: meta.noindex };
}

// ============================================================================
// SERVER STARTUP (Dev Vite dynamic import / Prod static assets)
// ============================================================================

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch:
          process.env.DISABLE_HMR === 'true'
            ? null
            : {
                ignored: [
                  '**/data/**',
                  '**/data/moa.sqlite*',
                  '**/public/uploads/**',
                  '**/.git/**',
                  '**/dist/**'
                ]
              }
      },
      appType: 'custom'
    });

    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      try {
        const rawHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const { html, statusCode, noindex } = injectHtmlSeo(transformed, req);
        if (noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.status(statusCode).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    app.use(
      '/assets',
      express.static(path.resolve('dist/assets'), {
        maxAge: '365d',
        immutable: true
      })
    );
    app.use(
      express.static(path.resolve('dist'), {
        index: false,
        maxAge: '1h'
      })
    );

    const distHtmlPath = path.resolve('dist/index.html');
    app.get('*', (req, res) => {
      if (!fs.existsSync(distHtmlPath)) {
        return res.status(500).type('text/plain').send('Application build not found. Run npm run build.');
      }
      const rawHtml = fs.readFileSync(distHtmlPath, 'utf-8');
      const { html, statusCode, noindex } = injectHtmlSeo(rawHtml, req);
      if (noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(statusCode).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`MoA Control Room server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`[MoA Server] Received ${signal}, flushing pending state...`);
    dbStore.flushPendingNow();
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

if (process.env.MOA_NO_LISTEN !== '1') {
  void startServer();
}

export { app };
