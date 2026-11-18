import crypto from 'crypto';
import { DEFAULT_ROLES } from '../../src/shared/permissions';
import { isSafeUrl, normalizeSlug } from '../../src/shared/url';
import { INITIAL_DEPARTMENTS, INITIAL_SITE_CONTENT, INITIAL_SETTINGS } from '../../src/data/initialData';
import type { SiteContent, Publication, SiteSettings, Department } from '../../src/types/index';
import type { DatabaseState } from './schema';
import { CURRENT_SCHEMA_VERSION } from './schema';

function deepMergePageContent(stored: unknown, defaults: SiteContent): SiteContent {
  if (!stored || typeof stored !== 'object') {
    return JSON.parse(JSON.stringify(defaults)) as SiteContent;
  }
  const s = stored as Record<string, unknown>;
  const mergeObj = <T extends object>(defObj: T, rawObj: unknown): T => {
    if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
      return JSON.parse(JSON.stringify(defObj)) as T;
    }
    const r = rawObj as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(defObj)) {
      const defVal = (defObj as Record<string, unknown>)[key];
      const rawVal = r[key];
      if (typeof defVal === 'string') {
        out[key] = typeof rawVal === 'string' ? rawVal : defVal;
      } else if (Array.isArray(defVal)) {
        out[key] = Array.isArray(rawVal) ? rawVal : JSON.parse(JSON.stringify(defVal));
      } else if (defVal && typeof defVal === 'object') {
        out[key] = mergeObj(defVal, rawVal);
      } else {
        out[key] = rawVal !== undefined ? rawVal : defVal;
      }
    }
    return out as T;
  };

  return {
    home: mergeObj(defaults.home, s.home),
    about: mergeObj(defaults.about, s.about),
    departments: mergeObj(defaults.departments, s.departments),
    work: mergeObj(defaults.work, s.work),
    contact: mergeObj(defaults.contact, s.contact),
    products: defaults.products ? mergeObj(defaults.products, s.products) : undefined,
    detailFallback: defaults.detailFallback ? mergeObj(defaults.detailFallback, s.detailFallback) : undefined,
    footer: mergeObj(defaults.footer, s.footer),
    notFound: mergeObj(defaults.notFound, s.notFound),
    maintenance: mergeObj(defaults.maintenance, s.maintenance)
  };
}

function replaceDepartmentCountStrings(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw;
  return raw
    .replace(/\{departmentCount\}\s+departments\b/gi, '{{departmentCountWordCap}} {{departmentsNoun}}')
    .replace(/oversees the \{departmentCount\} departments/gi, 'oversees the {{departmentCountWord}} {{departmentsNoun}}')
    .replace(/\bEight departments\b/g, '{{departmentCountWordCap}} {{departmentsNoun}}')
    .replace(/\beight departments\b/g, '{{departmentCountWord}} {{departmentsNoun}}')
    .replace(/\b8 departments\b/gi, '{{departmentCount}} {{departmentsNoun}}');
}

export interface MigrationStep {
  version: number;
  name: string;
  apply: (db: Record<string, unknown>) => void;
}

export const MIGRATIONS: MigrationStep[] = [
  {
    version: 1,
    name: 'Initialize roles, publications, products, passwordResets, contentVersion',
    apply: (rawDb) => {
      if (!Array.isArray(rawDb.roles) || rawDb.roles.length === 0) {
        rawDb.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
      } else {
        // Ensure system roles exist
        const roles = rawDb.roles as Array<{ id: string; name: string; permissions: string[]; isSystem?: boolean; locked?: boolean }>;
        for (const defRole of DEFAULT_ROLES) {
          if (!roles.some(r => r.id === defRole.id)) {
            roles.push(JSON.parse(JSON.stringify(defRole)));
          }
        }
      }

      if (!Array.isArray(rawDb.publications)) rawDb.publications = [];
      if (!Array.isArray(rawDb.products)) rawDb.products = [];
      if (!Array.isArray(rawDb.passwordResets)) rawDb.passwordResets = [];
      if (!Array.isArray(rawDb.sessions)) rawDb.sessions = [];
      if (!Array.isArray(rawDb.activityLog)) rawDb.activityLog = [];
      if (!Array.isArray(rawDb.securityLog)) rawDb.securityLog = [];
      if (!Array.isArray(rawDb.projects)) rawDb.projects = [];
      if (!Array.isArray(rawDb.media)) rawDb.media = [];
      if (!Array.isArray(rawDb.contentHistory)) rawDb.contentHistory = [];
      if (!Array.isArray(rawDb.pages)) rawDb.pages = [];
      if (!Array.isArray(rawDb.submissions)) rawDb.submissions = [];
      if (!Array.isArray(rawDb.invitations)) rawDb.invitations = [];
      if (typeof rawDb.contentVersion !== 'number') rawDb.contentVersion = 1;

      // Normalize user roles and roleIds cleanly
      const users = Array.isArray(rawDb.users) ? (rawDb.users as Array<Record<string, unknown>>) : [];
      for (const u of users) {
        const lower = String(u.role || '').toLowerCase();
        if (!u.roleId) {
          u.roleId = lower === 'admin' || lower === 'owner' ? 'role-admin' : 'role-member';
        }
        u.role = u.roleId === 'role-admin' ? 'Admin' : u.roleId === 'role-member' ? 'Member' : String(u.role || 'Member');
      }
      if (!users.some(u => u.isFounder === true)) {
        const founder =
          users.find(u => ['admin@mastersofall.org', 'muslimmehdi@mastersofall.org'].includes(String(u.email || '').toLowerCase())) ||
          users.find(u => u.roleId === 'role-admin');
        if (founder) founder.isFounder = true;
      }

      const sessions = rawDb.sessions as Array<Record<string, unknown>>;
      for (const s of sessions) {
        if (!s.roleId) {
          s.roleId = String(s.role || '').toLowerCase() === 'admin' ? 'role-admin' : 'role-member';
        }
      }

      const invites = rawDb.invitations as Array<Record<string, unknown>>;
      for (const inv of invites) {
        if (!inv.roleId) {
          inv.roleId = String(inv.role || '').toLowerCase() === 'admin' ? 'role-admin' : 'role-member';
        }
      }
    }
  },
  {
    version: 2,
    name: 'Migrate legacy publication items and remove contentTypes/contentItems/theme/diagrams',
    apply: (rawDb) => {
      const legacyItems = Array.isArray(rawDb.contentItems) ? (rawDb.contentItems as Array<Record<string, unknown>>) : [];
      const publications = (rawDb.publications as Publication[]) || [];
      for (const item of legacyItems) {
        if (item.typeSlug === 'publications' && typeof item.title === 'string') {
          const id = String(item.id || `pub-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`);
          if (!publications.some(p => p.id === id)) {
            const data = (item.data && typeof item.data === 'object' ? item.data : {}) as Record<string, unknown>;
            const pubDate =
              typeof item.createdAt === 'string'
                ? item.createdAt.slice(0, 10)
                : new Date().toISOString().slice(0, 10);
            const rawStatus = String(item.status || 'Draft');
            const mappedStatus: Publication['publicationStatus'] =
              rawStatus === 'Published' ? 'Published' : rawStatus === 'Archived' ? 'Archived' : 'Draft';

            publications.push({
              id,
              title: item.title,
              slug: normalizeSlug(item.slug || item.title, 'pub'),
              authors: typeof data.authors === 'string' ? data.authors : '',
              abstract: typeof data.abstract === 'string' ? data.abstract : '',
              publicationDate: pubDate,
              publicationType: 'Paper',
              pdfUrl: isSafeUrl(data.pdfUrl) ? String(data.pdfUrl) : '',
              thumbnailUrl: isSafeUrl(data.thumbnailUrl) ? String(data.thumbnailUrl) : '',
              doiOrUrl: isSafeUrl(data.doi) ? String(data.doi) : '',
              departmentIds: [],
              tags: [],
              publicationStatus: mappedStatus,
              authorId: typeof item.authorId === 'string' ? item.authorId : 'system',
              authorName: 'Masters Of All',
              authorEmail: '',
              deletedAt: typeof item.deletedAt === 'string' ? item.deletedAt : undefined,
              createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
              updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
            });
          }
        }
      }
      rawDb.publications = publications;
      delete rawDb.contentTypes;
      delete rawDb.contentItems;
      delete rawDb.diagramConfigs;
      delete rawDb.formConfigs;

      if (rawDb.settings && typeof rawDb.settings === 'object') {
        const s = rawDb.settings as Record<string, unknown>;
        delete s.theme;
      }
    }
  },
  {
    version: 3,
    name: 'Normalize inbox submissions (remove replied), sanitize page blocks, and merge settings/pageContent',
    apply: (rawDb) => {
      const submissions = Array.isArray(rawDb.submissions) ? (rawDb.submissions as Array<Record<string, unknown>>) : [];
      for (const sub of submissions) {
        if (sub.status === 'replied') {
          sub.status = 'read';
        }
        if (sub.status !== 'new' && sub.status !== 'read' && sub.status !== 'archived') {
          sub.status = 'new';
        }
        delete sub.repliedAt;
        delete sub.assignee;
        delete sub.internalNotes;
      }

      // Strip hiddenDevices from page blocks
      const pages = Array.isArray(rawDb.pages) ? (rawDb.pages as Array<Record<string, unknown>>) : [];
      for (const pg of pages) {
        if (pg.template === 'Team' || pg.template === 'FAQ') {
          pg.template = 'Standard';
        }
        if (pg.status === 'Password-protected') {
          pg.status = 'Hidden';
        }
        if (Array.isArray(pg.blocks)) {
          for (const blk of pg.blocks as Array<Record<string, unknown>>) {
            if (blk.sectionSettings && typeof blk.sectionSettings === 'object') {
              delete (blk.sectionSettings as Record<string, unknown>).hiddenDevices;
            }
          }
        }
      }

      // Merge settings cleanly preserving custom values
      const rawSettings = (rawDb.settings && typeof rawDb.settings === 'object' ? rawDb.settings : {}) as Partial<SiteSettings>;
      const mergedSettings: SiteSettings = {
        ...JSON.parse(JSON.stringify(INITIAL_SETTINGS)),
        ...rawSettings,
        seoDefaults: {
          ...INITIAL_SETTINGS.seoDefaults,
          ...(rawSettings.seoDefaults || {})
        },
        announcementBar: {
          enabled: Boolean(rawSettings.announcementBar?.enabled),
          text: typeof rawSettings.announcementBar?.text === 'string' ? rawSettings.announcementBar.text : '',
          linkUrl: typeof rawSettings.announcementBar?.linkUrl === 'string' ? rawSettings.announcementBar.linkUrl : '',
          linkLabel: typeof rawSettings.announcementBar?.linkLabel === 'string' ? rawSettings.announcementBar.linkLabel : '',
          expiresAt: typeof rawSettings.announcementBar?.expiresAt === 'string' ? rawSettings.announcementBar.expiresAt : ''
        },
        securityPolicy: {
          ...INITIAL_SETTINGS.securityPolicy,
          ...(rawSettings.securityPolicy || {}),
          minPasswordLength: Math.max(12, Number(rawSettings.securityPolicy?.minPasswordLength || 12))
        }
      };
      delete (mergedSettings as unknown as Record<string, unknown>).theme;
      rawDb.settings = mergedSettings;

      rawDb.pageContent = deepMergePageContent(rawDb.pageContent, INITIAL_SITE_CONTENT);
    }
  },
  {
    version: 4,
    name: 'Upgrade department count templates to {{departmentCount}} / {{departmentCountWord}} tokens',
    apply: (rawDb) => {
      const pc = deepMergePageContent(rawDb.pageContent, INITIAL_SITE_CONTENT);
      pc.about.endingLineTemplate = replaceDepartmentCountStrings(pc.about.endingLineTemplate);
      pc.departments.rddIntro = replaceDepartmentCountStrings(pc.departments.rddIntro);
      pc.departments.directoryTitleTemplate = replaceDepartmentCountStrings(pc.departments.directoryTitleTemplate);
      rawDb.pageContent = pc;

      // Ensure legacy /rdd-logo.jpg url references are normalized to /5320.jpg
      const s = rawDb.settings as SiteSettings;
      if (s.rddLogoUrl === '/rdd-logo.jpg') s.rddLogoUrl = '/5320.jpg';
      if (s.moaLogoUrl === '/rdd-logo.jpg') s.moaLogoUrl = '/5320.jpg';
      const media = Array.isArray(rawDb.media) ? (rawDb.media as Array<Record<string, unknown>>) : [];
      for (const m of media) {
        if (m.url === '/rdd-logo.jpg') m.url = '/5320.jpg';
      }
    }
  },
  {
    version: 5,
    name: 'Separate organizational departments from RDD sectors, seed RDD department, update Projects/Products labels, and remove default Member products.manage',
    apply: (rawDb) => {
      const settings = (rawDb.settings && typeof rawDb.settings === 'object' ? rawDb.settings : {}) as SiteSettings;
      const depts = Array.isArray(rawDb.departments) ? (rawDb.departments as Department[]) : [];

      // Convert legacy pre-v5 entries (which were all RDD sectors) into explicit RDD sectors
      const sectorIdsSet = new Set<string>();
      for (const d of depts) {
        if (d.id !== 'dept-rdd' && !d.isRdd && d.slug?.toLowerCase() !== 'rdd') {
          if (!d.kind) {
            d.kind = 'sector';
          }
          if (d.kind === 'sector') {
            d.parentDepartmentId = d.parentDepartmentId || 'dept-rdd';
            d.shortName = d.name;
            sectorIdsSet.add(d.id);
          }
        }
      }

      // Ensure RDD exists as an official department with its own logo
      let rddDept = depts.find(d => d.id === 'dept-rdd' || d.isRdd || d.slug?.toLowerCase() === 'rdd');
      const rddSeed = INITIAL_DEPARTMENTS.find(d => d.isRdd)!;
      if (!rddDept) {
        rddDept = {
          ...JSON.parse(JSON.stringify(rddSeed)),
          customLogoUrl: settings.rddLogoUrl || rddSeed.customLogoUrl || '/5320.jpg',
          createdAt: new Date().toISOString()
        };
        depts.push(rddDept!);
      } else {
        rddDept.kind = 'department';
        rddDept.isRdd = true;
        rddDept.shortName = rddDept.name;
        if (!rddDept.customLogoUrl) {
          rddDept.customLogoUrl = settings.rddLogoUrl || '/5320.jpg';
        }
      }
      rawDb.departments = depts;

      // Normalize item departmentIds & sectorIds so legacy sector associations remain linked to RDD + sector
      const normalizeWorkItemDepts = (item: { departmentIds?: string[]; sectorIds?: string[] }) => {
        const curDeptIds = Array.isArray(item.departmentIds) ? item.departmentIds : [];
        const existingSectors = Array.isArray(item.sectorIds) ? item.sectorIds : [];
        const legacySectorsInDept = curDeptIds.filter(id => sectorIdsSet.has(id));
        const mergedSectors = Array.from(new Set([...existingSectors, ...legacySectorsInDept]));
        if (mergedSectors.length > 0) {
          item.sectorIds = mergedSectors;
          if (!curDeptIds.includes(rddDept!.id)) {
            item.departmentIds = [...curDeptIds, rddDept!.id];
          }
        }
      };

      if (Array.isArray(rawDb.projects)) {
        (rawDb.projects as Array<{ departmentIds?: string[]; sectorIds?: string[] }>).forEach(normalizeWorkItemDepts);
      }
      if (Array.isArray(rawDb.publications)) {
        (rawDb.publications as Array<{ departmentIds?: string[]; sectorIds?: string[] }>).forEach(normalizeWorkItemDepts);
      }
      if (Array.isArray(rawDb.products)) {
        (rawDb.products as Array<{ departmentIds?: string[]; sectorIds?: string[] }>).forEach(normalizeWorkItemDepts);
      }

      // Remove 'products.manage' from default Member role per D10
      const roles = Array.isArray(rawDb.roles) ? (rawDb.roles as Array<{ id: string; permissions: string[] }>) : [];
      const memberRole = roles.find(r => r.id === 'role-member');
      if (memberRole && Array.isArray(memberRole.permissions)) {
        memberRole.permissions = memberRole.permissions.filter(p => p !== 'products.manage');
      }

      // Update default navigation labels & add Products entry + alwaysShowProducts default
      if (typeof settings.alwaysShowProducts !== 'boolean') {
        settings.alwaysShowProducts = false;
      }
      if (Array.isArray(settings.navigation)) {
        settings.navigation = settings.navigation.map(item =>
          item.path === '/projects' && item.label === 'Our Work' ? { ...item, label: 'Projects' } : item
        );
        if (!settings.navigation.some(item => item.path === '/products')) {
          const contactIdx = settings.navigation.findIndex(item => item.path === '/contact');
          const productsNav = { id: 'nav-products', label: 'Products', path: '/products' };
          if (contactIdx >= 0) {
            settings.navigation.splice(contactIdx, 0, productsNav);
          } else {
            settings.navigation.push(productsNav);
          }
        }
      }
      rawDb.settings = settings;

      // Upgrade pageContent headings cleanly where still on pre-addendum defaults
      const pc = deepMergePageContent(rawDb.pageContent, INITIAL_SITE_CONTENT);
      if (pc.work.heading === 'Our Work') pc.work.heading = INITIAL_SITE_CONTENT.work.heading;
      if (pc.work.searchPlaceholder === 'Search our work...') pc.work.searchPlaceholder = INITIAL_SITE_CONTENT.work.searchPlaceholder;
      if (pc.work.subtitle === 'Published projects, research publications, and products from across our departments.') {
        pc.work.subtitle = INITIAL_SITE_CONTENT.work.subtitle;
      }
      if (pc.departments.heading === 'Departments & RDD') pc.departments.heading = INITIAL_SITE_CONTENT.departments.heading;
      if (pc.departments.rddIntro.includes('oversees the {{departmentCountWord}}')) {
        pc.departments.rddIntro = INITIAL_SITE_CONTENT.departments.rddIntro;
      }
      if (pc.departments.exploreButtonLabel === 'Explore') {
        pc.departments.exploreButtonLabel = INITIAL_SITE_CONTENT.departments.exploreButtonLabel;
      }
      rawDb.pageContent = pc;
    }
  },
  {
    version: 6,
    name: 'Normalize RDD name to Research Discover and Development and set Departments directory defaults',
    apply: (rawDb) => {
      const replaceRddName = (val: unknown): unknown => {
        if (typeof val !== 'string') return val;
        return val.replace(/Research,?\s+Discover(?:y)?\s+and\s+Development/gi, 'Research Discover and Development');
      };

      const depts = Array.isArray(rawDb.departments) ? (rawDb.departments as Department[]) : [];
      for (const d of depts) {
        if (d.isRdd || d.id === 'dept-rdd' || d.slug?.toLowerCase() === 'rdd') {
          d.name = String(replaceRddName(d.name));
          d.shortName = String(replaceRddName(d.shortName || d.name));
          if (d.name === 'RDD') d.name = 'Research Discover and Development';
          d.introduction = String(replaceRddName(d.introduction));
          if (typeof d.tagline === 'string') {
            d.tagline = String(replaceRddName(d.tagline));
          }
        }
      }

      const media = Array.isArray(rawDb.media) ? (rawDb.media as Array<Record<string, unknown>>) : [];
      for (const m of media) {
        if (typeof m.altText === 'string') {
          m.altText = String(replaceRddName(m.altText));
        }
      }

      const pc = deepMergePageContent(rawDb.pageContent, INITIAL_SITE_CONTENT);
      pc.departments.rddIntro = String(replaceRddName(pc.departments.rddIntro));
      if (pc.departments.directoryTitleTemplate === 'Organizational Directory') {
        pc.departments.directoryTitleTemplate = 'Departments';
      }
      rawDb.pageContent = pc;
    }
  }
];

export function runMigrations(rawDb: Record<string, unknown>): {
  db: DatabaseState;
  appliedVersions: number[];
} {
  const startVersion = typeof rawDb.schemaVersion === 'number' ? rawDb.schemaVersion : 0;
  const appliedVersions: number[] = [];

  for (const step of MIGRATIONS) {
    if (startVersion < step.version) {
      step.apply(rawDb);
      rawDb.schemaVersion = step.version;
      appliedVersions.push(step.version);
    }
  }

  // Always run defensive shape completion for forward safety
  if (typeof rawDb.schemaVersion !== 'number' || rawDb.schemaVersion < CURRENT_SCHEMA_VERSION) {
    rawDb.schemaVersion = CURRENT_SCHEMA_VERSION;
  }
  rawDb.pageContent = deepMergePageContent(rawDb.pageContent, INITIAL_SITE_CONTENT);

  return {
    db: rawDb as unknown as DatabaseState,
    appliedVersions
  };
}
