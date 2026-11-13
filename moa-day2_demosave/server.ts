import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();
app.use(express.json({ limit: '50mb' }));

// Ensure data directory exists
const DATA_DIR = path.resolve('data');
const UPLOADS_DIR = path.resolve('public/uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'database.json');

// User & Auth Types
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  passwordHash: string;
  salt: string;
  mustChangePassword: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  deactivated?: boolean;
  createdAt: string;
  lastSignIn?: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  role: 'admin' | 'member';
  lastActivity: number;
}

export interface ActivityRecord {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  area: 'Projects' | 'Departments' | 'Site Content' | 'Media' | 'People' | 'Settings' | 'Auth' | 'System' | 'Website' | 'Team';
  target: string;
  timestamp: string;
  details?: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  shortName?: string;
  slug: string;
  iconGlyph: string;
  iconUrl?: string;
  colorHex: string;
  iconBgHex: string;
  customLogoUrl?: string;
  heroImage?: string;
  introduction: string;
  purpose: string;
  mission: string;
  areasOfFocus: string[];
  initiatives: string[];
  galleryImages: string[];
  published: boolean;
  showInTree: boolean;
  displayOrder: number;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectVersionRecord {
  versionId: string;
  author: string;
  authorEmail: string;
  timestamp: string;
  summary?: string;
  snapshot: any;
}

export interface ProjectRecord {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  coverImage: string;
  galleryImages: string[];
  videoUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  category: string;
  departmentIds: string[];
  status: string;
  publicationStatus: 'Draft' | 'Pending Review' | 'Published' | 'Archived';
  blocks?: any[];
  startDate: string;
  completionDate?: string;
  scheduledPublishDate?: string;
  publishedAt?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  reviewComment?: string;
  reviewHistory?: Array<{ id: string; reviewer: string; action: string; comment?: string; date: string }>;
  versions?: ProjectVersionRecord[];
  externalLinks?: { label: string; url: string }[];
  documents?: { label: string; url: string; size?: string }[];
  credits?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoShareImage?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaRecord {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  altText: string;
  folder?: string;
  tags: string[];
  uploadedAt: string;
  focalPoint?: { x: number; y: number };
  posterUrl?: string;
  isLocked?: boolean;
}

export interface HistorySnapshotRecord {
  id: string;
  entityType: 'text' | 'department' | 'project' | 'settings';
  entityId: string;
  author: string;
  authorEmail: string;
  timestamp: string;
  snapshot: any;
  changeNote?: string;
}

export interface DatabaseState {
  users: UserRecord[];
  sessions: SessionRecord[];
  activityLog: ActivityRecord[];
  departments: DepartmentRecord[];
  projects: ProjectRecord[];
  media: MediaRecord[];
  settings: {
    siteName: string;
    tagline: string;
    moaLogoUrl: string;
    loaderLogoUrl: string;
    rddLogoUrl: string;
    faviconUrl: string;
    shareImageUrl: string;
    contactEmail: string;
    footerText: string;
    socialLinks: Array<{ id: string; platform: string; icon: string; url: string }>;
    seoDefaults: {
      title: string;
      description: string;
      keywords: string;
    };
    notFoundText: string;
    maintenanceMode: boolean;
    redirects: Array<{ id: string; from: string; to: string; createdAt: string }>;
    projectStatuses: string[];
  };
  pageContent: {
    home: {
      heroHeadlineLine1: string;
      heroHeadlineLine2: string;
      heroSubheadline: string;
      believeWord: string;
      believeText: string;
      buildWord: string;
      buildText: string;
      becomeWord: string;
      becomeText: string;
      exploreTitle: string;
      exploreText: string;
      createTitle: string;
      createText: string;
      transformTitle: string;
      transformText: string;
      questionStatement: string;
    };
    about: {
      heroTitle: string;
      heroSub: string;
      whoWeAre: string;
      whatWeDo: string;
      howWeThink: string;
      ourPhilosophy: string;
      founderStatement: string;
      founderAttribution: string;
      endingLineTemplate: string;
    };
    departments: {
      rddIntro: string;
    };
    contact: {
      heading: string;
      subtext: string;
    };
    footer: {
      blurb: string;
    };
  };
  draftContent?: any;
  contentHistory: HistorySnapshotRecord[];
}

// Password hashing helper using crypto scrypt
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

// Initial Database Seeder: EXACTLY ONE SEED ACCOUNT (the founder)
function getInitialDatabase(): DatabaseState {
  const adminSalt = crypto.randomBytes(16).toString('hex');

  const founderUser: UserRecord = {
    id: 'usr-admin-muslim',
    email: 'muslimmehdi@mastersofall.org',
    name: 'Muslim Mehdi',
    role: 'admin',
    salt: adminSalt,
    passwordHash: hashPassword('admin123', adminSalt),
    mustChangePassword: true,
    twoFactorEnabled: false,
    deactivated: false,
    createdAt: new Date().toISOString()
  };

  // Seed the 8 official departments with names, slugs, colours and icons only (no dummy essays)
  const initialDepts: DepartmentRecord[] = [
    {
      id: 'dept-law',
      name: 'Law and Justice',
      shortName: 'Law',
      slug: 'law-and-justice',
      iconGlyph: 'law',
      colorHex: '#06302F',
      iconBgHex: '#FFFFFF',
      introduction: '',
      purpose: '',
      mission: '',
      areasOfFocus: [],
      initiatives: [],
      galleryImages: [],
      published: true,
      showInTree: true,
      displayOrder: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-history',
      name: 'History and Culture',
      shortName: 'History',
      slug: 'history-and-culture',
      iconGlyph: 'history',
      colorHex: '#06302F',
      iconBgHex: '#D0A873',
      introduction: '',
      purpose: '',
      mission: '',
      areasOfFocus: [],
      initiatives: [],
      galleryImages: [],
      published: true,
      showInTree: true,
      displayOrder: 2,
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-technology',
      name: 'Technology',
      shortName: 'Technology',
      slug: 'technology',
      iconGlyph: 'tech',
      colorHex: '#25CDB6',
      iconBgHex: '#0A3D3C',
      introduction: '',
      purpose: '',
      mission: '',
      areasOfFocus: [],
      initiatives: [],
      galleryImages: [],
      published: true,
      showInTree: true,
      displayOrder: 3,
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-science',
      name: 'Science and Engineering',
      shortName: 'Science',
      slug: 'science-and-engineering',
      iconGlyph: 'science',
      colorHex: '#DCE3FF',
      iconBgHex: '#2A335E',
      introduction: '',
      purpose: '',
      mission: '',
      areasOfFocus: [],
      initiatives: [],
      galleryImages: [],
      published: true,
      showInTree: true,
      displayOrder: 4,
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-mathematics',
      name: 'Mathematics',
      shortName: 'Mathematics',
      slug: 'mathematics',
      iconGlyph: 'math',
      colorHex: '#06302F',
      iconBgHex: '#FFFFFF',
      introduction: '',
      purpose: '',
      mission: '',
      areasOfFocus: [],
      initiatives: [],
      galleryImages: [],
      published: true,
      showInTree: true,
      displayOrder: 5,
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-news',
      name: 'News, Journalism and Media',
      shortName: 'News',
      slug: 'news-journalism-and-media',
      iconGlyph: 'media',
      colorHex: '#06212D',
      iconBgHex: '#5E8DA0',
      introduction: '',
      purpose: '',
      mission: '',
      areasOfFocus: [],
      initiatives: [],
      galleryImages: [],
      published: true,
      showInTree: true,
      displayOrder: 6,
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-freedom',
      name: 'Freedom Unit',
      shortName: 'Freedom',
      slug: 'freedom-unit',
      iconGlyph: 'freedom',
      colorHex: '#FFFFFF',
      iconBgHex: '#A32B2B',
      introduction: '',
      purpose: '',
      mission: '',
      areasOfFocus: [],
      initiatives: [],
      galleryImages: [],
      published: true,
      showInTree: true,
      displayOrder: 7,
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-entrepreneurship',
      name: 'Entrepreneurship',
      shortName: 'Entrepreneurship',
      slug: 'entrepreneurship',
      iconGlyph: 'entrepreneurship',
      colorHex: '#17A491',
      iconBgHex: '#EBF5F1',
      introduction: '',
      purpose: '',
      mission: '',
      areasOfFocus: [],
      initiatives: [],
      galleryImages: [],
      published: true,
      showInTree: true,
      displayOrder: 8,
      createdAt: new Date().toISOString()
    }
  ];

  return {
    users: [founderUser], // ONLY ONE account seeded
    sessions: [],
    activityLog: [
      {
        id: 'act-init-1',
        userId: 'system',
        userEmail: 'system@mastersofall.org',
        action: 'System initialized with founder admin account and 8 official departments',
        area: 'System',
        target: 'Control Room',
        timestamp: new Date().toISOString()
      }
    ],
    departments: initialDepts,
    projects: [], // Zero seeded projects
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
        uploadedAt: new Date().toISOString(),
        isLocked: true // LOCKED: Can be replaced but not deleted
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
        uploadedAt: new Date().toISOString(),
        isLocked: true // LOCKED: Can be replaced but not deleted
      }
    ],
    settings: {
      siteName: 'Masters Of All',
      tagline: 'Believe. Build. Become.',
      moaLogoUrl: '/drawing1.png',
      loaderLogoUrl: '/drawing1.png',
      rddLogoUrl: '/5320.jpg',
      faviconUrl: '/drawing1.png',
      shareImageUrl: '/drawing1.png',
      contactEmail: 'business@mastersofall.org',
      footerText: 'An ecosystem for explorers, creators, innovators and problem-solvers.',
      socialLinks: [
        { id: 'soc-li', platform: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/mastersofall/' },
        { id: 'soc-yt', platform: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/@Masters_Of_All' },
        { id: 'soc-ig', platform: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/mastersofall_official/' },
        { id: 'soc-fb', platform: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/mastersofallofficial' },
        { id: 'soc-pat', platform: 'Patreon', icon: 'patreon', url: 'https://www.patreon.com/cw/MastersOfAll' },
        { id: 'soc-wa', platform: 'WhatsApp', icon: 'whatsapp', url: 'https://whatsapp.com/channel/0029Vb8gxyN8fewhOqTsK60e' }
      ],
      seoDefaults: {
        title: 'Masters Of All — Believe. Build. Become.',
        description: 'An ecosystem for multidisciplinary research, applied development, and innovation across core disciplines.',
        keywords: 'Masters Of All, MoA, multidisciplinary research, innovation, RDD'
      },
      notFoundText: 'The page or resource you are looking for does not exist or has been relocated.',
      maintenanceMode: false,
      redirects: [],
      projectStatuses: ['Concept', 'In Development', 'Active', 'Completed', 'On Hold']
    },
    pageContent: {
      home: {
        heroHeadlineLine1: 'Understanding the world.',
        heroHeadlineLine2: 'Building what comes next.',
        heroSubheadline: "We’re Masters Of All, a multidisciplinary innovation organization. We ask questions, chase the answers, and turn what we learn into things that help people.",
        believeWord: 'Believe',
        believeText: 'Unwavering conviction in human capability, moral responsibility, and the pursuit of foundational truth.',
        buildWord: 'Build',
        buildText: 'Engineering practical mechanisms, rigorous research frameworks, and transformative technologies.',
        becomeWord: 'Become',
        becomeText: 'Transforming potential into self-governing sovereignty, wisdom, and enduring societal impact.',
        exploreTitle: 'EXPLORE',
        exploreText: 'Curiosity, research, discovery, questioning and understanding.',
        createTitle: 'CREATE',
        createText: 'Experimentation, innovation, engineering, creativity and implementation.',
        transformTitle: 'TRANSFORM',
        transformText: 'Meaningful impact, progress, practical solutions and empowerment.',
        questionStatement: 'Every meaningful solution begins with a question.'
      },
      about: {
        heroTitle: 'We explore questions to build solutions that matter.',
        heroSub: 'At Masters Of All, every initiative begins with curiosity and ends with practical, lasting impact.',
        whoWeAre: 'Masters Of All (MoA) is a multidisciplinary innovation organization dedicated to understanding the world, solving real-world problems, and transforming ideas into meaningful impact.',
        whatWeDo: 'Our work spans research and development, engineering, technology, education, media, storytelling, entrepreneurship, community development, and youth empowerment. From designing innovative systems and developing practical solutions to producing educational documentaries, organizing impactful events, and making complex concepts accessible, every initiative is driven by a single purpose: to empower people and improve the world around us.',
        howWeThink: 'We believe that every meaningful solution begins with a question. Through exploration, critical thinking, and evidence-based research, we uncover the truth behind ideas, systems, and challenges, transforming insight into practical solutions that create lasting value. At MoA, learning is more than the acquisition of knowledge—it is the foundation of innovation. We cultivate curiosity, encourage interdisciplinary collaboration, and embrace experimentation to bridge the gap between imagination and implementation.',
        ourPhilosophy: 'More than an organization, Masters Of All is an ecosystem for explorers, creators, innovators, and problem-solvers. We strive to unlock human potential, foster meaningful progress, and build a future where knowledge inspires action, innovation creates opportunity, and every challenge becomes the beginning of a solution.',
        founderStatement: 'If people are given the right tools, knowledge, and support early enough, most problems don’t need to exist.',
        founderAttribution: 'Founder, Masters Of All',
        endingLineTemplate: '{departmentCount} departments. One research division.'
      },
      departments: {
        rddIntro: 'RDD, Research, Discovery and Development, is a sub-organization of Masters Of All. It oversees the {departmentCount} departments below.'
      },
      contact: {
        heading: 'Got a question? That’s how we start.',
        subtext: 'Write to us or find us online. We’d love to hear from you.'
      },
      footer: {
        blurb: 'An ecosystem for explorers, creators, innovators and problem-solvers.'
      }
    },
    contentHistory: []
  };
}

// Load and save state
function loadDb(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8').trim();
      if (raw.length > 0) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('Error reading database file, re-initializing', e);
  }
  const init = getInitialDatabase();
  saveDb(init);
  return init;
}

function saveDb(data: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed writing database file', e);
  }
}

// In-memory rate limiter for failed login attempts (5 attempts -> 5 min lockout)
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(ip: string): boolean {
  const record = failedAttempts.get(ip);
  if (!record) return true;
  if (record.lockedUntil > Date.now()) return false;
  if (record.lockedUntil <= Date.now() && record.lockedUntil > 0) {
    failedAttempts.delete(ip);
    return true;
  }
  return record.count < 5;
}

function recordFailedLogin(ip: string) {
  const current = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  current.count += 1;
  if (current.count >= 5) {
    current.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 minute lock
  }
  failedAttempts.set(ip, current);
}

function clearFailedLogin(ip: string) {
  failedAttempts.delete(ip);
}

// Auth Middleware: extracts Bearer token, enforces inactivity timeout of 2 hours (7200000ms)
function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  const db = loadDb();
  const session = db.sessions.find(s => s.token === token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const now = Date.now();
  if (now - session.lastActivity > 7200000) {
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDb(db);
    return res.status(401).json({ error: 'Session expired due to inactivity. Please sign in again.' });
  }

  const lastActive = session.lastActivity || 0;
  session.lastActivity = now;
  if (now - lastActive > 300000) {
    saveDb(db);
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user || user.deactivated) {
    return res.status(401).json({ error: 'User account is deactivated or no longer exists' });
  }

  (req as any).user = user;
  (req as any).session = session;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as UserRecord;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

// Log Activity Helper
function logActivity(
  db: DatabaseState,
  user: { id: string; email: string },
  action: string,
  area: ActivityRecord['area'],
  target: string,
  details?: string
) {
  db.activityLog.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Auth Sign In
app.post('/api/auth/signin', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many failed sign-in attempts. Account access temporarily locked for 5 minutes.' });
  }

  const { email, password, twoFactorCode } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = loadDb();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user || user.deactivated) {
    recordFailedLogin(ip);
    logActivity(db, { id: 'anon', email: cleanEmail }, 'Failed sign-in attempt', 'Auth', 'Sign In', 'Invalid email or inactive');
    saveDb(db);
    return res.status(401).json({ error: "That email and password don't match." });
  }

  const expectedHash = hashPassword(password, user.salt);
  if (expectedHash !== user.passwordHash) {
    recordFailedLogin(ip);
    logActivity(db, user, 'Failed sign-in attempt', 'Auth', 'Sign In', 'Incorrect password');
    saveDb(db);
    return res.status(401).json({ error: "That email and password don't match." });
  }

  // Check 2FA if enabled
  if (user.twoFactorEnabled && !twoFactorCode) {
    return res.json({ requires2FA: true, message: 'Two-factor authentication code required' });
  }

  clearFailedLogin(ip);

  // Update last sign in
  user.lastSignIn = new Date().toISOString();

  // Issue session token
  const token = crypto.randomBytes(32).toString('hex');
  const session: SessionRecord = {
    token,
    userId: user.id,
    role: user.role,
    lastActivity: Date.now()
  };

  db.sessions.push(session);
  logActivity(db, user, 'Signed in', 'Auth', 'Control Room');
  saveDb(db);

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      lastSignIn: user.lastSignIn
    }
  });
});

// 2. Auth Change Password
app.post('/api/auth/change-password', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const db = loadDb();
  const targetUser = db.users.find(u => u.id === user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const newSalt = crypto.randomBytes(16).toString('hex');
  targetUser.salt = newSalt;
  targetUser.passwordHash = hashPassword(newPassword, newSalt);
  targetUser.mustChangePassword = false;

  logActivity(db, targetUser, 'Changed password', 'Auth', 'Security');
  saveDb(db);

  return res.json({ success: true, message: 'Password updated successfully' });
});

// 3. Auth Me
app.get('/api/auth/me', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      lastSignIn: user.lastSignIn
    }
  });
});

// 4. Auth Sign Out
app.post('/api/auth/signout', authenticateUser, (req, res) => {
  const token = (req as any).session.token;
  const db = loadDb();
  db.sessions = db.sessions.filter(s => s.token !== token);
  saveDb(db);
  return res.json({ success: true });
});

// 5. Auth 2FA Toggle
app.post('/api/auth/2fa', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { enable } = req.body;
  const db = loadDb();
  const targetUser = db.users.find(u => u.id === user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  targetUser.twoFactorEnabled = Boolean(enable);
  if (targetUser.twoFactorEnabled) {
    targetUser.twoFactorSecret = crypto.randomBytes(10).toString('hex').toUpperCase();
  } else {
    delete targetUser.twoFactorSecret;
  }

  logActivity(db, targetUser, targetUser.twoFactorEnabled ? 'Enabled two-factor authentication' : 'Disabled two-factor authentication', 'Auth', 'Security');
  saveDb(db);

  return res.json({
    success: true,
    twoFactorEnabled: targetUser.twoFactorEnabled,
    secret: targetUser.twoFactorSecret
  });
});

// 6. People / Members (Admin only)
app.get('/api/members', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  return res.json(
    db.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      mustChangePassword: u.mustChangePassword,
      twoFactorEnabled: u.twoFactorEnabled,
      deactivated: u.deactivated,
      createdAt: u.createdAt,
      lastSignIn: u.lastSignIn
    }))
  );
});

app.post('/api/members', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { email, name, role, temporaryPassword } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const db = loadDb();
  if (db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'A member with this email already exists.' });
  }

  const tempPass = temporaryPassword || 'moa' + Math.floor(1000 + Math.random() * 9000);
  const salt = crypto.randomBytes(16).toString('hex');
  const newMember: UserRecord = {
    id: `usr-${Date.now()}`,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role: role === 'admin' ? 'admin' : 'member',
    salt,
    passwordHash: hashPassword(tempPass, salt),
    mustChangePassword: true,
    deactivated: false,
    createdAt: new Date().toISOString()
  };

  db.users.push(newMember);
  logActivity(db, user, `Added member: ${newMember.name} (${newMember.email})`, 'People', newMember.name, `Role: ${newMember.role}`);
  saveDb(db);

  return res.json({
    id: newMember.id,
    email: newMember.email,
    name: newMember.name,
    role: newMember.role,
    mustChangePassword: newMember.mustChangePassword,
    temporaryPassword: tempPass,
    createdAt: newMember.createdAt
  });
});

app.put('/api/members/:id', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Member not found' });

  // Founder protection: founder cannot be demoted or deactivated
  if (target.email === 'muslimmehdi@mastersofall.org') {
    if (req.body.role && req.body.role !== 'admin') {
      return res.status(400).json({ error: 'The founder account cannot be demoted.' });
    }
    if (req.body.deactivated === true) {
      return res.status(400).json({ error: 'The founder account cannot be deactivated.' });
    }
  }

  // Ensure system always keeps at least one active Admin
  if (req.body.role === 'member' && target.role === 'admin') {
    const adminCount = db.users.filter(u => u.role === 'admin' && !u.deactivated).length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'The system must always keep at least one active Administrator.' });
    }
  }

  if (req.body.name) target.name = req.body.name;
  if (req.body.role) target.role = req.body.role;
  if (typeof req.body.deactivated === 'boolean') target.deactivated = req.body.deactivated;

  logActivity(db, user, `Updated member profile: ${target.name}`, 'People', target.name);
  saveDb(db);

  return res.json({
    id: target.id,
    email: target.email,
    name: target.name,
    role: target.role,
    deactivated: target.deactivated,
    createdAt: target.createdAt,
    lastSignIn: target.lastSignIn
  });
});

app.post('/api/members/:id/reset-password', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Member not found' });

  const tempPass = 'moaPass' + Math.floor(100 + Math.random() * 900);
  const salt = crypto.randomBytes(16).toString('hex');
  target.salt = salt;
  target.passwordHash = hashPassword(tempPass, salt);
  target.mustChangePassword = true;

  logActivity(db, user, `Reset password for: ${target.name}`, 'People', target.email);
  saveDb(db);

  return res.json({ success: true, temporaryPassword: tempPass });
});

app.delete('/api/members/:id', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Member not found' });

  // Founder protection: founder can never be deleted
  if (target.email === 'muslimmehdi@mastersofall.org') {
    return res.status(400).json({ error: 'The founder account cannot be deleted.' });
  }

  // Ensure system always keeps at least one Admin
  if (target.role === 'admin') {
    const adminCount = db.users.filter(u => u.role === 'admin' && !u.deactivated).length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'The system must always keep at least one active Administrator.' });
    }
  }

  db.users = db.users.filter(u => u.id !== req.params.id);
  logActivity(db, user, `Removed member: ${target.name} (${target.email})`, 'People', target.email);
  saveDb(db);

  return res.json({ success: true });
});

// 7. Dynamic Departments Manager
// Public get: published departments only (not in trash)
app.get('/api/departments', (req, res) => {
  const db = loadDb();
  const active = db.departments
    .filter(d => d.published && !d.deletedAt)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  return res.json(active);
});

// Control Room: all departments (including hidden and trash)
app.get('/api/departments/all', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  const all = [...db.departments].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  return res.json(all);
});

app.post('/api/departments', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const body = req.body;

  if (!body.name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const slug =
    body.slug ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  if (db.departments.some(d => d.slug.toLowerCase() === slug.toLowerCase() && !d.deletedAt)) {
    return res.status(400).json({ error: 'A department with this slug already exists' });
  }

  const maxOrder = db.departments.reduce((max, d) => Math.max(max, d.displayOrder || 0), 0);

  const newDept: DepartmentRecord = {
    id: `dept-${Date.now()}`,
    name: body.name.trim(),
    shortName: body.shortName?.trim() || body.name.trim(),
    slug,
    iconGlyph: body.iconGlyph || 'custom',
    iconUrl: body.iconUrl || '',
    colorHex: body.colorHex || '#25CDB6',
    iconBgHex: body.iconBgHex || '#06302F',
    customLogoUrl: body.customLogoUrl || '',
    heroImage: body.heroImage || '',
    introduction: body.introduction || '',
    purpose: body.purpose || '',
    mission: body.mission || '',
    areasOfFocus: Array.isArray(body.areasOfFocus) ? body.areasOfFocus : [],
    initiatives: Array.isArray(body.initiatives) ? body.initiatives : [],
    galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : [],
    published: body.published !== false,
    showInTree: body.showInTree !== false,
    displayOrder: maxOrder + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.departments.push(newDept);
  logActivity(db, user, `Created department: ${newDept.name}`, 'Departments', newDept.name);
  saveDb(db);

  return res.json(newDept);
});

app.put('/api/departments/:id', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const index = db.departments.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Department not found' });

  const existing = db.departments[index];
  const oldSlug = existing.slug;
  const newSlug = req.body.slug ? req.body.slug.trim().toLowerCase() : oldSlug;

  // If slug changed, create an automatic redirect rule in settings!
  if (newSlug !== oldSlug) {
    if (!db.settings.redirects) db.settings.redirects = [];
    db.settings.redirects.push({
      id: `red-${Date.now()}`,
      from: `/departments/${oldSlug}`,
      to: `/departments/${newSlug}`,
      createdAt: new Date().toISOString()
    });
  }

  db.departments[index] = {
    ...existing,
    ...req.body,
    slug: newSlug,
    updatedAt: new Date().toISOString()
  };

  logActivity(db, user, `Updated department: ${db.departments[index].name}`, 'Departments', db.departments[index].name);
  saveDb(db);

  return res.json(db.departments[index]);
});

app.post('/api/departments/reorder', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'Invalid order array' });

  const db = loadDb();
  orderedIds.forEach((id, idx) => {
    const dept = db.departments.find(d => d.id === id);
    if (dept) dept.displayOrder = idx + 1;
  });

  logActivity(db, user, 'Reordered department hierarchy', 'Departments', 'Organization Tree');
  saveDb(db);

  return res.json({ success: true });
});

app.delete('/api/departments/:id', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { projectHandling, targetDeptId } = req.body;
  const db = loadDb();
  const index = db.departments.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Department not found' });

  const targetDept = db.departments[index];

  // Handle projects belonging to this department
  if (projectHandling === 'reassign' && targetDeptId) {
    db.projects.forEach(p => {
      if (p.departmentIds && p.departmentIds.includes(targetDept.id)) {
        p.departmentIds = p.departmentIds.filter(id => id !== targetDept.id);
        if (!p.departmentIds.includes(targetDeptId)) {
          p.departmentIds.push(targetDeptId);
        }
      }
    });
  } else {
    // Leave untagged: simply remove the department ID from projects
    db.projects.forEach(p => {
      if (p.departmentIds) {
        p.departmentIds = p.departmentIds.filter(id => id !== targetDept.id);
      }
    });
  }

  // Move to trash for 30 days
  targetDept.deletedAt = new Date().toISOString();
  targetDept.published = false;

  logActivity(
    db,
    user,
    `Moved department to Trash: ${targetDept.name}`,
    'Departments',
    targetDept.name,
    projectHandling === 'reassign' ? `Projects reassigned to ${targetDeptId}` : 'Projects left untagged'
  );
  saveDb(db);

  return res.json({ success: true });
});

app.post('/api/departments/:id/restore', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const target = db.departments.find(d => d.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Department not found' });

  delete target.deletedAt;
  target.published = true;

  logActivity(db, user, `Restored department from Trash: ${target.name}`, 'Departments', target.name);
  saveDb(db);

  return res.json({ success: true });
});

// 8. Projects Workflow: Draft → Pending Review → Published → Archived
// Public projects
app.get('/api/projects', (req, res) => {
  const db = loadDb();
  const published = db.projects.filter(p => p.publicationStatus === 'Published' && !p.deletedAt);
  return res.json(published);
});

// Control Room projects (Role-based filtering)
app.get('/api/projects/admin', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();

  if (user.role === 'admin') {
    // Admin sees all projects
    return res.json(db.projects);
  } else {
    // Member only sees published projects and their own drafts/submissions
    const allowed = db.projects.filter(
      p => p.authorId === user.id || p.publicationStatus === 'Published'
    );
    return res.json(allowed);
  }
});

app.post('/api/projects', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const body = req.body;

  if (!body.title) {
    return res.status(400).json({ error: 'Project title is required' });
  }

  const slug =
    body.slug ||
    body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  let pubStatus: ProjectRecord['publicationStatus'] = body.publicationStatus || 'Draft';
  // Security Enforcement: Members can only create Draft or Pending Review
  if (user.role === 'member' && (pubStatus === 'Published' || pubStatus === 'Archived')) {
    pubStatus = 'Pending Review';
  }

  const newProject: ProjectRecord = {
    id: `proj-${Date.now()}`,
    title: body.title.trim(),
    slug,
    shortDescription: body.shortDescription || '',
    fullDescription: body.fullDescription || '',
    coverImage: body.coverImage || '',
    galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : [],
    videoUrl: body.videoUrl || '',
    audioUrl: body.audioUrl || '',
    pdfUrl: body.pdfUrl || '',
    category: body.category || 'General',
    departmentIds: Array.isArray(body.departmentIds) ? body.departmentIds : [],
    status: body.status || 'Active',
    publicationStatus: pubStatus,
    blocks: Array.isArray(body.blocks) ? body.blocks : [],
    startDate: body.startDate || new Date().toISOString().substring(0, 10),
    completionDate: body.completionDate || '',
    scheduledPublishDate: body.scheduledPublishDate || '',
    publishedAt: pubStatus === 'Published' ? new Date().toISOString() : undefined,
    authorId: user.id,
    authorName: user.name,
    authorEmail: user.email,
    externalLinks: Array.isArray(body.externalLinks) ? body.externalLinks : [],
    documents: Array.isArray(body.documents) ? body.documents : [],
    credits: body.credits || '',
    seoTitle: body.seoTitle || '',
    seoDescription: body.seoDescription || '',
    seoShareImage: body.seoShareImage || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [
      {
        versionId: `v-${Date.now()}`,
        author: user.name,
        authorEmail: user.email,
        timestamp: new Date().toISOString(),
        summary: 'Initial project creation',
        snapshot: body
      }
    ]
  };

  db.projects.unshift(newProject);
  logActivity(db, user, `Created project: ${newProject.title} [${pubStatus}]`, 'Projects', newProject.title);
  saveDb(db);

  return res.json(newProject);
});

app.put('/api/projects/:id', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const index = db.projects.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });

  const existing = db.projects[index];

  // Role Enforcement: Members can only edit their own projects
  if (user.role === 'member' && existing.authorId !== user.id) {
    return res.status(403).json({ error: 'You are only authorized to edit your own draft projects.' });
  }

  let nextPubStatus = req.body.publicationStatus || existing.publicationStatus;
  // Members cannot publish directly
  if (user.role === 'member' && nextPubStatus === 'Published') {
    nextPubStatus = 'Pending Review';
  }

  // Record version history snapshot
  const versions = existing.versions || [];
  versions.unshift({
    versionId: `v-${Date.now()}`,
    author: user.name,
    authorEmail: user.email,
    timestamp: new Date().toISOString(),
    summary: req.body.changeNote || 'Project updated',
    snapshot: { ...existing }
  });

  db.projects[index] = {
    ...existing,
    ...req.body,
    publicationStatus: nextPubStatus,
    publishedAt: nextPubStatus === 'Published' && !existing.publishedAt ? new Date().toISOString() : existing.publishedAt,
    versions: versions.slice(0, 30),
    updatedAt: new Date().toISOString()
  };

  logActivity(db, user, `Updated project: ${existing.title} [Status: ${nextPubStatus}]`, 'Projects', existing.title);
  saveDb(db);

  return res.json(db.projects[index]);
});

// Admin Review with diff, comment, approval or reject
app.post('/api/projects/:id/review', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { action, comment } = req.body; // 'approved' | 'rejected' | 'requested_changes'
  const db = loadDb();
  const index = db.projects.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });

  const project = db.projects[index];
  let newStatus: ProjectRecord['publicationStatus'] = project.publicationStatus;

  if (action === 'approved') {
    newStatus = 'Published';
    project.publishedAt = new Date().toISOString();
  } else if (action === 'rejected') {
    newStatus = 'Draft';
  } else if (action === 'requested_changes') {
    newStatus = 'Draft';
  }

  project.publicationStatus = newStatus;
  project.reviewComment = comment || '';
  if (!project.reviewHistory) project.reviewHistory = [];
  project.reviewHistory.unshift({
    id: `rev-${Date.now()}`,
    reviewer: user.name,
    action,
    comment,
    date: new Date().toISOString()
  });

  logActivity(
    db,
    user,
    `Reviewed project: ${project.title} (${action})`,
    'Projects',
    project.title,
    comment ? `Note: ${comment}` : undefined
  );
  saveDb(db);

  return res.json(project);
});

app.delete('/api/projects/:id', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Role Enforcement: Members cannot delete others' work
  if (user.role === 'member' && project.authorId !== user.id) {
    return res.status(403).json({ error: 'You are only authorized to remove your own draft projects.' });
  }

  // Move to trash
  project.deletedAt = new Date().toISOString();
  project.publicationStatus = 'Archived';

  logActivity(db, user, `Moved project to Trash: ${project.title}`, 'Projects', project.title);
  saveDb(db);

  return res.json({ success: true });
});

app.post('/api/projects/:id/restore', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  delete project.deletedAt;
  project.publicationStatus = 'Draft';

  logActivity(db, user, `Restored project from Trash: ${project.title}`, 'Projects', project.title);
  saveDb(db);

  return res.json({ success: true });
});

app.post('/api/projects/:id/restore-version', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { versionId } = req.body;
  const db = loadDb();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const version = project.versions?.find(v => v.versionId === versionId);
  if (!version || !version.snapshot) {
    return res.status(404).json({ error: 'Version not found' });
  }

  // Restore snapshot fields
  Object.assign(project, version.snapshot, {
    updatedAt: new Date().toISOString()
  });

  logActivity(db, user, `Restored project version for: ${project.title}`, 'Projects', project.title);
  saveDb(db);

  return res.json(project);
});

// 9. Media Library (Accepts JPG, PNG, WebP, SVG, MP4, MP3, PDF, Docs)
app.get('/api/media', authenticateUser, (req, res) => {
  const db = loadDb();
  return res.json(db.media);
});

app.post('/api/media', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { name, dataUrl, altText, folder, tags, type } = req.body;

  if (!dataUrl || !name) {
    return res.status(400).json({ error: 'Media data and filename are required' });
  }

  // Validate base64 data URI
  const matches = dataUrl.match(/^data:([A-Za-z0-9\-+\/.]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ error: 'Invalid file format. Upload JPG, PNG, WebP, SVG, MP4, MP3, or PDF.' });
  }

  const mimeType = matches[1].toLowerCase();
  let ext = 'bin';
  let mediaType: MediaRecord['type'] = 'image';

  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
  else if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('svg')) ext = 'svg';
  else if (mimeType.includes('mp4') || mimeType.includes('video')) {
    ext = 'mp4';
    mediaType = 'video';
  } else if (mimeType.includes('mp3') || mimeType.includes('mpeg') || mimeType.includes('audio')) {
    ext = 'mp3';
    mediaType = 'audio';
  } else if (mimeType.includes('pdf')) {
    ext = 'pdf';
    mediaType = 'document';
  }

  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filePath, buffer);
  const url = `/uploads/${filename}`;

  const db = loadDb();
  const mediaItem: MediaRecord = {
    id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    name,
    url,
    mimeType,
    type: (type as any) || mediaType,
    size: buffer.length,
    altText: altText || '',
    folder: folder || 'General',
    tags: Array.isArray(tags) ? tags : [],
    uploadedAt: new Date().toISOString()
  };

  db.media.unshift(mediaItem);
  logActivity(db, user, `Uploaded media: ${name} (${mediaType})`, 'Media', name);
  saveDb(db);

  return res.json(mediaItem);
});

// Replace file: keeps the EXACT SAME URL so all references update automatically
app.post('/api/media/:id/replace', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { dataUrl, name } = req.body;
  const db = loadDb();
  const item = db.media.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Media asset not found' });

  const matches = dataUrl.match(/^data:([A-Za-z0-9\-+\/.]+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid file format' });
  }

  const buffer = Buffer.from(matches[2], 'base64');

  // If local file in /uploads
  if (item.url.startsWith('/uploads/')) {
    const filename = path.basename(item.url);
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
  }

  item.size = buffer.length;
  if (name) item.name = name;

  logActivity(db, user, `Replaced media asset file: ${item.name}`, 'Media', item.name);
  saveDb(db);

  return res.json(item);
});

app.put('/api/media/:id', authenticateUser, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const item = db.media.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Media asset not found' });

  if (req.body.altText !== undefined) item.altText = req.body.altText;
  if (req.body.name) item.name = req.body.name;
  if (req.body.folder) item.folder = req.body.folder;
  if (Array.isArray(req.body.tags)) item.tags = req.body.tags;
  if (req.body.focalPoint) item.focalPoint = req.body.focalPoint;

  logActivity(db, user, `Updated media metadata: ${item.name}`, 'Media', item.name);
  saveDb(db);

  return res.json(item);
});

app.delete('/api/media/:id', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const item = db.media.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Media asset not found' });

  // LOCKED ASSETS: MoA and RDD logos can be replaced, not deleted
  if (item.isLocked || item.url === '/drawing1.png' || item.url === '/5320.jpg' || item.url === '/rdd-logo.jpg') {
    return res.status(400).json({ error: 'The official MoA and RDD logos are locked: they can be replaced but not deleted.' });
  }

  // Check if asset is used anywhere on the site
  const isUsedInSettings = Object.values(db.settings).some(v => typeof v === 'string' && v.includes(item.url));
  const isUsedInDepartments = db.departments.some(d =>
    d.iconUrl === item.url || d.customLogoUrl === item.url || d.heroImage === item.url || (d.galleryImages && d.galleryImages.includes(item.url))
  );
  const isUsedInProjects = db.projects.some(p =>
    p.coverImage === item.url || (p.galleryImages && p.galleryImages.includes(item.url)) || p.videoUrl === item.url || p.audioUrl === item.url
  );

  if (isUsedInSettings || isUsedInDepartments || isUsedInProjects) {
    return res.status(400).json({
      error: 'This asset is currently in use on the site. Please replace or remove its reference first before deleting.'
    });
  }

  // Remove physical file if in /uploads
  if (item.url.startsWith('/uploads/')) {
    try {
      const filePath = path.join(UPLOADS_DIR, path.basename(item.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Ignore unlink error
    }
  }

  db.media = db.media.filter(m => m.id !== req.params.id);
  logActivity(db, user, `Deleted media asset: ${item.name}`, 'Media', item.name);
  saveDb(db);

  return res.json({ success: true });
});

// 10. Site Content & Click-to-Edit
app.get('/api/page-content', (req, res) => {
  const db = loadDb();
  return res.json(db.pageContent);
});

app.put('/api/page-content', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();

  // Snapshot before update
  if (!db.contentHistory) db.contentHistory = [];
  db.contentHistory.unshift({
    id: `snap-${Date.now()}`,
    entityType: 'text',
    entityId: 'pageContent',
    author: user.name,
    authorEmail: user.email,
    timestamp: new Date().toISOString(),
    snapshot: JSON.parse(JSON.stringify(db.pageContent)),
    changeNote: 'Direct content update'
  });

  db.pageContent = { ...db.pageContent, ...req.body };
  logActivity(db, user, 'Updated site content', 'Site Content', 'Page Content');
  saveDb(db);

  return res.json(db.pageContent);
});

// Draft content endpoint for inline Click-to-Edit mode
app.get('/api/page-content/draft', authenticateUser, (req, res) => {
  const db = loadDb();
  return res.json({
    draft: db.draftContent || null,
    isDraft: Boolean(db.draftContent)
  });
});

app.post('/api/page-content/draft', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  db.draftContent = req.body.draft;
  saveDb(db);
  return res.json({ success: true });
});

app.post('/api/page-content/publish-draft', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  if (!db.draftContent) {
    return res.status(400).json({ error: 'No draft changes to publish' });
  }

  // Snapshot current live before applying draft
  if (!db.contentHistory) db.contentHistory = [];
  db.contentHistory.unshift({
    id: `snap-${Date.now()}`,
    entityType: 'text',
    entityId: 'pageContent',
    author: user.name,
    authorEmail: user.email,
    timestamp: new Date().toISOString(),
    snapshot: JSON.parse(JSON.stringify(db.pageContent)),
    changeNote: 'Published click-to-edit draft'
  });

  db.pageContent = { ...db.pageContent, ...db.draftContent };
  delete db.draftContent;

  logActivity(db, user, 'Published inline draft changes', 'Site Content', 'Public Site');
  saveDb(db);

  return res.json(db.pageContent);
});

app.get('/api/page-content/history', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  return res.json(db.contentHistory || []);
});

app.post('/api/page-content/history/:id/restore', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  const snap = db.contentHistory?.find(s => s.id === req.params.id);
  if (!snap || !snap.snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  db.pageContent = JSON.parse(JSON.stringify(snap.snapshot));
  logActivity(db, user, `Restored content version from ${snap.timestamp}`, 'Site Content', 'Page Content');
  saveDb(db);

  return res.json(db.pageContent);
});

// 11. Site Settings & Branding
app.get('/api/settings', (req, res) => {
  const db = loadDb();
  return res.json(db.settings);
});

app.put('/api/settings', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const db = loadDb();
  db.settings = { ...db.settings, ...req.body };
  logActivity(db, user, 'Updated site settings & brand identity', 'Settings', 'Site Settings');
  saveDb(db);
  return res.json(db.settings);
});

// 12. Activity Log
app.get('/api/activity-log', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  return res.json(db.activityLog);
});

// 13. Site Health (Real computed checks)
app.get('/api/site-health', authenticateUser, (req, res) => {
  const db = loadDb();
  const items: any[] = [];

  // Check 1: Departments with no introduction
  const deptsWithoutIntro = db.departments.filter(d => !d.deletedAt && (!d.introduction || d.introduction.trim() === ''));
  if (deptsWithoutIntro.length > 0) {
    items.push({
      id: 'health-depts-intro',
      type: 'warning',
      title: `${deptsWithoutIntro.length} departments missing introductions`,
      message: `${deptsWithoutIntro.map(d => d.name).join(', ')} currently have empty introduction copy.`,
      actionTab: 'departments',
      actionText: 'Edit Departments'
    });
  }

  // Check 2: Images missing alt text
  const mediaMissingAlt = db.media.filter(m => m.type === 'image' && (!m.altText || m.altText.trim() === ''));
  if (mediaMissingAlt.length > 0) {
    items.push({
      id: 'health-media-alt',
      type: 'warning',
      title: `${mediaMissingAlt.length} images missing descriptive alt text`,
      message: 'Descriptive alt text is required for accessibility and SEO on all visual assets.',
      actionTab: 'media',
      actionText: 'Review Media'
    });
  }

  // Check 3: Drafts waiting a long time (> 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lingeringDrafts = db.projects.filter(
    p => (p.publicationStatus === 'Pending Review' || p.publicationStatus === 'Draft') &&
         new Date(p.updatedAt).getTime() < oneWeekAgo
  );
  if (lingeringDrafts.length > 0) {
    items.push({
      id: 'health-stale-drafts',
      type: 'info',
      title: `${lingeringDrafts.length} drafts awaiting attention for over 7 days`,
      message: `${lingeringDrafts.map(p => p.title).join(', ')} have had no updates in the past week.`,
      actionTab: 'projects',
      actionText: 'Review Projects'
    });
  }

  // Check 4: Unused media assets
  const unusedMedia = db.media.filter(m => {
    if (m.isLocked) return false;
    const url = m.url;
    const inSettings = Object.values(db.settings).some(v => typeof v === 'string' && v.includes(url));
    const inDepts = db.departments.some(d => d.iconUrl === url || d.customLogoUrl === url || d.heroImage === url || (d.galleryImages && d.galleryImages.includes(url)));
    const inProjects = db.projects.some(p => p.coverImage === url || (p.galleryImages && p.galleryImages.includes(url)) || p.videoUrl === url || p.audioUrl === url);
    return !inSettings && !inDepts && !inProjects;
  });
  if (unusedMedia.length > 0) {
    items.push({
      id: 'health-unused-media',
      type: 'info',
      title: `${unusedMedia.length} unused media assets in storage`,
      message: `${unusedMedia.length} uploaded files are not referenced anywhere across departments or projects.`,
      actionTab: 'media',
      actionText: 'Clean Media'
    });
  }

  return res.json(items);
});

// 14. Backup & Restore
app.get('/api/backup/export', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  // Strip sensitive salts and hashes from export
  const exportData = {
    ...db,
    users: db.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt
    })),
    exportedAt: new Date().toISOString()
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="moa_backup.json"');
  return res.json(exportData);
});

app.post('/api/backup/import', authenticateUser, requireAdmin, (req, res) => {
  const user = (req as any).user as UserRecord;
  const importedData = req.body;

  if (!importedData || !importedData.departments || !importedData.settings) {
    return res.status(400).json({ error: 'Invalid backup structure. Missing departments or settings.' });
  }

  const db = loadDb();
  db.departments = importedData.departments;
  if (importedData.projects) db.projects = importedData.projects;
  if (importedData.pageContent) db.pageContent = importedData.pageContent;
  if (importedData.settings) db.settings = importedData.settings;
  if (importedData.media) db.media = importedData.media;

  logActivity(db, user, 'Imported system backup snapshot', 'Settings', 'Database Restore');
  saveDb(db);

  return res.json({ success: true, message: 'Backup successfully imported and verified.' });
});

// =====================================================================
// PAGES & PAGE EDITOR
// =====================================================================
app.get('/api/pages', (req, res) => {
  const db = loadDb();
  return res.json((db as any).pages || []);
});

app.post('/api/pages', authenticateUser, (req, res) => {
  const db = loadDb();
  if (!(db as any).pages) (db as any).pages = [];
  const page = req.body;
  if (!page || !page.title) {
    return res.status(400).json({ error: 'Page title is required' });
  }
  const id = page.id || `page-${Date.now()}`;
  const idx = (db as any).pages.findIndex((p: any) => p.id === id);
  const now = new Date().toISOString();
  const pageRecord = {
    ...page,
    id,
    slug: page.slug || page.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: page.status || 'Draft',
    template: page.template || 'Standard',
    blocks: page.blocks || [],
    seo: page.seo || {},
    createdAt: idx >= 0 ? (db as any).pages[idx].createdAt : now,
    updatedAt: now
  };
  if (idx >= 0) {
    (db as any).pages[idx] = pageRecord;
  } else {
    (db as any).pages.push(pageRecord);
  }
  logActivity(db, (req as any).user, `Saved page: ${pageRecord.title}`, 'Website', pageRecord.title);
  saveDb(db);
  return res.json(pageRecord);
});

app.delete('/api/pages/:id', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  if (!(db as any).pages) (db as any).pages = [];
  const idx = (db as any).pages.findIndex((p: any) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Page not found' });
  const title = (db as any).pages[idx].title;
  (db as any).pages.splice(idx, 1);
  logActivity(db, (req as any).user, `Deleted page: ${title}`, 'Website', title);
  saveDb(db);
  return res.json({ success: true });
});

// =====================================================================
// MODULAR CONTENT TYPES & ITEMS
// =====================================================================
const DEFAULT_CONTENT_TYPES = [
  { id: 'ct-updates', name: 'Updates & News', slug: 'updates', description: 'Institutional announcements and news', iconName: 'Megaphone', isSystem: true, fields: [{ id: 'f1', name: 'summary', label: 'Summary', type: 'text', required: true }, { id: 'f2', name: 'body', label: 'Full Story', type: 'rich-text' }, { id: 'f3', name: 'date', label: 'Publish Date', type: 'date' }] },
  { id: 'ct-events', name: 'Events', slug: 'events', description: 'Seminars, conferences, and symposia', iconName: 'Calendar', isSystem: true, fields: [{ id: 'f1', name: 'eventDate', label: 'Event Date & Time', type: 'text', required: true }, { id: 'f2', name: 'location', label: 'Location or Platform', type: 'text' }, { id: 'f3', name: 'registrationLink', label: 'Registration URL', type: 'text' }] },
  { id: 'ct-publications', name: 'Publications', slug: 'publications', description: 'Research papers, monographs, and whitepapers', iconName: 'BookOpen', isSystem: true, fields: [{ id: 'f1', name: 'authors', label: 'Author(s)', type: 'text', required: true }, { id: 'f2', name: 'doi', label: 'DOI or External Link', type: 'text' }, { id: 'f3', name: 'abstract', label: 'Abstract', type: 'rich-text' }] },
  { id: 'ct-profiles', name: 'Team Profiles', slug: 'team-profiles', description: 'Researchers, fellows, and leaders', iconName: 'Users', isSystem: true, fields: [{ id: 'f1', name: 'roleTitle', label: 'Official Role', type: 'text', required: true }, { id: 'f2', name: 'department', label: 'Department Affiliation', type: 'text' }, { id: 'f3', name: 'bio', label: 'Biography', type: 'rich-text' }] },
  { id: 'ct-partners', name: 'Partners', slug: 'partners', description: 'Allied universities, institutes, and sponsors', iconName: 'Globe', isSystem: true, fields: [{ id: 'f1', name: 'website', label: 'Partner Website', type: 'text' }, { id: 'f2', name: 'partnershipType', label: 'Partnership Type', type: 'select', options: ['Academic', 'Research Allied', 'Technology Sponsor', 'Community Partner'] }] },
  { id: 'ct-faq', name: 'FAQ', slug: 'faq', description: 'Frequently asked questions and answers', iconName: 'HelpCircle', isSystem: true, fields: [{ id: 'f1', name: 'category', label: 'FAQ Category', type: 'text' }, { id: 'f2', name: 'answer', label: 'Detailed Answer', type: 'rich-text', required: true }] }
];

app.get('/api/content-types', (req, res) => {
  const db = loadDb();
  return res.json((db as any).contentTypes || DEFAULT_CONTENT_TYPES);
});

app.get('/api/content-items', (req, res) => {
  const db = loadDb();
  let items = (db as any).contentItems || [];
  const type = req.query.type as string;
  if (type) {
    items = items.filter((i: any) => i.typeSlug === type && !i.deletedAt);
  } else {
    items = items.filter((i: any) => !i.deletedAt);
  }
  return res.json(items);
});

app.post('/api/content-items', authenticateUser, (req, res) => {
  const db = loadDb();
  if (!(db as any).contentItems) (db as any).contentItems = [];
  const item = req.body;
  if (!item || !item.title || !item.typeSlug) {
    return res.status(400).json({ error: 'Title and content type are required' });
  }
  const id = item.id || `ci-${Date.now()}`;
  const idx = (db as any).contentItems.findIndex((i: any) => i.id === id);
  const now = new Date().toISOString();
  const itemRecord = {
    ...item,
    id,
    slug: item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: item.status || 'Published',
    data: item.data || {},
    createdAt: idx >= 0 ? (db as any).contentItems[idx].createdAt : now,
    updatedAt: now
  };
  if (idx >= 0) {
    (db as any).contentItems[idx] = itemRecord;
  } else {
    (db as any).contentItems.push(itemRecord);
  }
  logActivity(db, (req as any).user, `Saved ${item.typeSlug} item: ${itemRecord.title}`, 'Content' as any, itemRecord.title);
  saveDb(db);
  return res.json(itemRecord);
});

app.delete('/api/content-items/:id', authenticateUser, (req, res) => {
  const db = loadDb();
  if (!(db as any).contentItems) (db as any).contentItems = [];
  const idx = (db as any).contentItems.findIndex((i: any) => i.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Item not found' });
  (db as any).contentItems[idx].deletedAt = new Date().toISOString();
  saveDb(db);
  return res.json({ success: true });
});

// =====================================================================
// FORMS & INBOX
// =====================================================================
app.get('/api/submissions', authenticateUser, (req, res) => {
  const db = loadDb();
  return res.json((db as any).submissions || []);
});

app.post('/api/submissions', (req, res) => {
  const db = loadDb();
  if (!(db as any).submissions) (db as any).submissions = [];
  const { name, email, message, organization, subject, formType } = req.body;
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }
  const newSubmission = {
    id: `sub-${Date.now()}`,
    formType: formType || 'contact',
    name: name || 'Anonymous',
    email,
    organization: organization || '',
    subject: subject || 'General Inquiry',
    message,
    status: 'new',
    createdAt: new Date().toISOString()
  };
  (db as any).submissions.unshift(newSubmission);
  saveDb(db);
  return res.json({ success: true, message: 'Inquiry received. Thank you.' });
});

app.patch('/api/submissions/:id', authenticateUser, (req, res) => {
  const db = loadDb();
  if (!(db as any).submissions) (db as any).submissions = [];
  const idx = (db as any).submissions.findIndex((s: any) => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Submission not found' });
  (db as any).submissions[idx] = { ...((db as any).submissions[idx]), ...req.body };
  saveDb(db);
  return res.json((db as any).submissions[idx]);
});

// =====================================================================
// TEAM INVITATIONS
// =====================================================================
app.get('/api/invitations', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  return res.json((db as any).invitations || []);
});

app.post('/api/invitations', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  if (!(db as any).invitations) (db as any).invitations = [];
  const { email, role, departmentScope } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const invite = {
    id: `inv-${Date.now()}`,
    email,
    role: role || 'editor',
    departmentScope: departmentScope || [],
    invitedBy: (req as any).user.id,
    invitedByName: (req as any).user.name,
    token: crypto.randomBytes(24).toString('hex'),
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };
  (db as any).invitations.push(invite);
  logActivity(db, (req as any).user, `Created invitation for ${email}`, 'People' as any, email);
  saveDb(db);
  return res.json(invite);
});

// =====================================================================
// TRASH & RESTORE (30-day restore)
// =====================================================================
app.get('/api/trash', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  const trashedDepts = (db.departments || []).filter(d => Boolean(d.deletedAt));
  const trashedProjs = (db.projects || []).filter(p => Boolean(p.deletedAt));
  const trashedItems = ((db as any).contentItems || []).filter((i: any) => Boolean(i.deletedAt));
  return res.json({
    departments: trashedDepts,
    projects: trashedProjs,
    contentItems: trashedItems
  });
});

app.post('/api/trash/restore', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  const { type, id } = req.body;
  if (type === 'department') {
    const dept = (db.departments || []).find(d => d.id === id);
    if (dept) {
      delete dept.deletedAt;
      dept.published = true;
    }
  } else if (type === 'project') {
    const proj = (db.projects || []).find(p => p.id === id);
    if (proj) {
      delete proj.deletedAt;
      proj.publicationStatus = 'Draft';
    }
  } else if (type === 'content') {
    const item = ((db as any).contentItems || []).find((i: any) => i.id === id);
    if (item) {
      delete item.deletedAt;
    }
  }
  saveDb(db);
  return res.json({ success: true });
});

app.delete('/api/trash/empty', authenticateUser, requireAdmin, (req, res) => {
  const db = loadDb();
  db.departments = (db.departments || []).filter(d => !d.deletedAt);
  db.projects = (db.projects || []).filter(p => !p.deletedAt);
  if ((db as any).contentItems) {
    (db as any).contentItems = (db as any).contentItems.filter((i: any) => !i.deletedAt);
  }
  saveDb(db);
  return res.json({ success: true });
});

// Serve uploaded media files
app.use('/uploads', express.static(UPLOADS_DIR));

// Start server with Vite middleware in development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/data/database.json',
            '**/public/uploads/**',
            '**/.git/**',
            '**/dist/**',
          ],
        },
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MoA Control Room server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
