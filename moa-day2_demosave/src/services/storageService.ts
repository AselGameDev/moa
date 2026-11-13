import { Department, Project, SiteContent, SiteSettings, User } from '../types';
import { INITIAL_DEPARTMENTS, INITIAL_PROJECTS, INITIAL_SITE_CONTENT, INITIAL_SETTINGS } from '../data/initialData';

const STORAGE_KEYS = {
  DEPARTMENTS: 'moa_departments_v3',
  PROJECTS: 'moa_projects_v3',
  SITE_CONTENT: 'moa_site_content_v3',
  SETTINGS: 'moa_settings_v3',
  AUTH_SESSION: 'moa_control_room_session_v3',
  MEDIA: 'moa_media_v3',
  MEMBERS: 'moa_members_v3'
};

export const storageService = {
  // Departments
  getDepartments(): Department[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed reading departments', e);
    }
    this.saveDepartments(INITIAL_DEPARTMENTS);
    return INITIAL_DEPARTMENTS;
  },

  saveDepartments(departments: Department[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
    } catch (e) {
      console.error('Error saving departments', e);
    }
  },

  getDepartmentBySlug(slug: string): Department | undefined {
    const list = this.getDepartments();
    return list.find(d => d.slug.toLowerCase() === slug.toLowerCase());
  },

  // Projects (Zero seeded projects)
  getProjects(includeDrafts = false): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      const all: Project[] = data ? JSON.parse(data) : INITIAL_PROJECTS;
      if (!data) {
        this.saveProjects(INITIAL_PROJECTS);
      }
      if (includeDrafts) {
        return all;
      }
      return all.filter(p => p.publicationStatus === 'Published');
    } catch (e) {
      console.warn('Failed reading projects', e);
      return [];
    }
  },

  saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Error saving projects', e);
    }
  },

  getProjectBySlug(slug: string): Project | undefined {
    const all = this.getProjects(true);
    return all.find(p => p.slug.toLowerCase() === slug.toLowerCase());
  },

  // Site Content
  getSiteContent(): SiteContent {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SITE_CONTENT);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed reading site content', e);
    }
    this.saveSiteContent(INITIAL_SITE_CONTENT);
    return INITIAL_SITE_CONTENT;
  },

  saveSiteContent(content: SiteContent): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SITE_CONTENT, JSON.stringify(content));
    } catch (e) {
      console.error('Error saving site content', e);
    }
  },

  // Settings
  getSettings(): SiteSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed reading settings', e);
    }
    this.saveSettings(INITIAL_SETTINGS);
    return INITIAL_SETTINGS;
  },

  saveSettings(settings: SiteSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  // Local fallback session
  getUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (data) return JSON.parse(data);
    } catch {
      return null;
    }
    return null;
  },

  saveUser(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(user));
    } catch (e) {
      console.error('Error saving user', e);
    }
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }
};
