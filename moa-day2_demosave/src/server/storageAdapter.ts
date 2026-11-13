/**
 * Masters Of All — Storage Adapter Layer
 * 
 * Abstract interface that decouples the database layer from express routes.
 * Enables zero-downtime swapping from JSON files to PostgreSQL / Supabase.
 */

import fs from 'fs';
import path from 'path';
import {
  User,
  Department,
  Project,
  MediaAsset,
  SiteContent,
  SiteSettings,
  ActivityRecord,
  ContentType,
  ContentItem,
  FormSubmission,
  PageRecord,
  UserInvitation,
  DiagramConfig
} from '../types';

export interface DatabaseSchema {
  users: Array<User & { passwordHash: string; salt: string }>;
  sessions: Array<{ token: string; userId: string; role: string; lastActivity: number }>;
  invitations: UserInvitation[];
  departments: Department[];
  projects: Project[];
  contentTypes: ContentType[];
  contentItems: ContentItem[];
  pages: PageRecord[];
  media: MediaAsset[];
  submissions: FormSubmission[];
  diagrams: DiagramConfig[];
  pageContent: SiteContent;
  settings: SiteSettings;
  activityLog: ActivityRecord[];
}

export interface IStorageAdapter {
  getDb(): Promise<DatabaseSchema>;
  saveDb(data: DatabaseSchema): Promise<void>;
  // Entity helpers
  getDepartments(): Promise<Department[]>;
  saveDepartment(dept: Department): Promise<Department>;
  deleteDepartment(id: string, hard?: boolean): Promise<boolean>;
  getProjects(includeDrafts?: boolean): Promise<Project[]>;
  saveProject(project: Project): Promise<Project>;
  deleteProject(id: string, hard?: boolean): Promise<boolean>;
  getContentItems(typeSlug?: string): Promise<ContentItem[]>;
  saveContentItem(item: ContentItem): Promise<ContentItem>;
  getSubmissions(): Promise<FormSubmission[]>;
  saveSubmission(sub: FormSubmission): Promise<FormSubmission>;
  getMedia(): Promise<MediaAsset[]>;
  saveMedia(asset: MediaAsset): Promise<MediaAsset>;
  logActivity(userId: string, userEmail: string, action: string, area: any, target: string, details?: string): Promise<void>;
}

export class JsonFileStorageAdapter implements IStorageAdapter {
  private filePath: string;
  private cache: DatabaseSchema | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async getDb(): Promise<DatabaseSchema> {
    if (this.cache) return this.cache;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.cache = JSON.parse(raw);
        return this.cache!;
      }
    } catch (err) {
      console.warn('Failed to read database file, initializing default fallback:', err);
    }
    // Return empty fallback
    return {
      users: [],
      sessions: [],
      invitations: [],
      departments: [],
      projects: [],
      contentTypes: [],
      contentItems: [],
      pages: [],
      media: [],
      submissions: [],
      diagrams: [],
      pageContent: {} as any,
      settings: {} as any,
      activityLog: []
    };
  }

  async saveDb(data: DatabaseSchema): Promise<void> {
    this.cache = data;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
      throw err;
    }
  }

  async getDepartments(): Promise<Department[]> {
    const db = await this.getDb();
    return db.departments || [];
  }

  async saveDepartment(dept: Department): Promise<Department> {
    const db = await this.getDb();
    const idx = db.departments.findIndex(d => d.id === dept.id);
    if (idx >= 0) {
      db.departments[idx] = { ...dept, updatedAt: new Date().toISOString() };
    } else {
      db.departments.push({ ...dept, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    await this.saveDb(db);
    return dept;
  }

  async deleteDepartment(id: string, hard = false): Promise<boolean> {
    const db = await this.getDb();
    const idx = db.departments.findIndex(d => d.id === id);
    if (idx < 0) return false;
    if (hard) {
      db.departments.splice(idx, 1);
    } else {
      db.departments[idx].deletedAt = new Date().toISOString();
      db.departments[idx].published = false;
    }
    await this.saveDb(db);
    return true;
  }

  async getProjects(includeDrafts = false): Promise<Project[]> {
    const db = await this.getDb();
    const list = db.projects || [];
    if (includeDrafts) return list;
    return list.filter(p => p.publicationStatus === 'Published' && !p.deletedAt);
  }

  async saveProject(project: Project): Promise<Project> {
    const db = await this.getDb();
    const idx = db.projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      db.projects[idx] = { ...project, updatedAt: new Date().toISOString() };
    } else {
      db.projects.push({ ...project, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    await this.saveDb(db);
    return project;
  }

  async deleteProject(id: string, hard = false): Promise<boolean> {
    const db = await this.getDb();
    const idx = db.projects.findIndex(p => p.id === id);
    if (idx < 0) return false;
    if (hard) {
      db.projects.splice(idx, 1);
    } else {
      db.projects[idx].deletedAt = new Date().toISOString();
      db.projects[idx].publicationStatus = 'Archived';
    }
    await this.saveDb(db);
    return true;
  }

  async getContentItems(typeSlug?: string): Promise<ContentItem[]> {
    const db = await this.getDb();
    const list = db.contentItems || [];
    if (!typeSlug) return list;
    return list.filter(item => item.typeSlug === typeSlug && !item.deletedAt);
  }

  async saveContentItem(item: ContentItem): Promise<ContentItem> {
    const db = await this.getDb();
    if (!db.contentItems) db.contentItems = [];
    const idx = db.contentItems.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      db.contentItems[idx] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      db.contentItems.push({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    await this.saveDb(db);
    return item;
  }

  async getSubmissions(): Promise<FormSubmission[]> {
    const db = await this.getDb();
    return db.submissions || [];
  }

  async saveSubmission(sub: FormSubmission): Promise<FormSubmission> {
    const db = await this.getDb();
    if (!db.submissions) db.submissions = [];
    const idx = db.submissions.findIndex(s => s.id === sub.id);
    if (idx >= 0) {
      db.submissions[idx] = sub;
    } else {
      db.submissions.unshift(sub);
    }
    await this.saveDb(db);
    return sub;
  }

  async getMedia(): Promise<MediaAsset[]> {
    const db = await this.getDb();
    return db.media || [];
  }

  async saveMedia(asset: MediaAsset): Promise<MediaAsset> {
    const db = await this.getDb();
    if (!db.media) db.media = [];
    const idx = db.media.findIndex(m => m.id === asset.id);
    if (idx >= 0) {
      db.media[idx] = asset;
    } else {
      db.media.unshift(asset);
    }
    await this.saveDb(db);
    return asset;
  }

  async logActivity(
    userId: string,
    userEmail: string,
    action: string,
    area: any,
    target: string,
    details?: string
  ): Promise<void> {
    const db = await this.getDb();
    if (!db.activityLog) db.activityLog = [];
    db.activityLog.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userEmail,
      action,
      area,
      target,
      timestamp: new Date().toISOString(),
      details
    });
    // Cap log to 500 entries
    if (db.activityLog.length > 500) {
      db.activityLog = db.activityLog.slice(0, 500);
    }
    await this.saveDb(db);
  }
}
