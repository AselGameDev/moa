/**
 * Masters Of All — Unified Type Definitions
 */

export type UserRole =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'author'
  | 'reviewer'
  | 'viewer'
  | 'member'
  | 'Owner'
  | 'Admin'
  | 'Editor'
  | 'Author'
  | 'Reviewer'
  | 'Viewer'
  | 'Member';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  departmentScope?: string[]; // IDs of departments this user can edit
  mustChangePassword: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  recoveryCodes?: string[];
  deactivated?: boolean;
  createdAt: string;
  lastSignIn?: string;
}

export interface UserSession {
  token: string;
  user: User;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  departmentScope?: string[];
  invitedBy: string;
  invitedByName: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export type DepartmentGlyph =
  | 'law'
  | 'history'
  | 'tech'
  | 'science'
  | 'math'
  | 'media'
  | 'freedom'
  | 'entrepreneurship'
  | 'globe'
  | 'book'
  | 'heart'
  | 'cpu'
  | 'lightbulb'
  | 'compass'
  | 'layers'
  | 'shield'
  | 'target'
  | 'code'
  | 'users'
  | 'atom'
  | 'custom';

export interface InitiativeItem {
  id: string;
  title: string;
  status: 'Active' | 'In Development' | 'Planned' | 'Completed';
  link?: string;
  owner?: string;
  summary?: string;
}

export interface AreaOfFocusCard {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface Department {
  id: string;
  name: string;
  shortName?: string;
  slug: string;
  iconGlyph: DepartmentGlyph;
  iconUrl?: string;
  colorHex: string;
  iconBgHex: string;
  customLogoUrl?: string;
  heroImage?: string;
  introduction: string;
  purpose: string;
  mission: string;
  areasOfFocus: string[];
  structuredAreasOfFocus?: AreaOfFocusCard[];
  initiatives: string[];
  structuredInitiatives?: InitiativeItem[];
  teamLeadIds?: string[];
  galleryImages?: string[];
  template?: 'Standard' | 'Research-heavy' | 'Media-heavy' | 'Programmes-heavy';
  published: boolean;
  archived?: boolean;
  showInTree: boolean;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  seoShareImage?: string;
  deletedAt?: string; // Soft delete for trash
  createdAt?: string;
  updatedAt?: string;
}

export type ProjectStatus = 'Concept' | 'In Development' | 'Active' | 'Completed' | 'On Hold' | string;
export type PublicationStatus = 'Draft' | 'Pending Review' | 'Published' | 'Archived';

export interface StoryBlock {
  id: string;
  type:
    | 'text'
    | 'heading'
    | 'quote'
    | 'image'
    | 'gallery'
    | 'video'
    | 'audio'
    | 'file'
    | 'callout'
    | 'stats'
    | 'timeline'
    | 'code'
    | 'embed'
    | 'divider';
  content: any;
}

export type ContentBlock = StoryBlock;

export interface ProjectVersion {
  versionId: string;
  author: string;
  authorEmail: string;
  timestamp: string;
  summary?: string;
  snapshot: Partial<Project>;
}

export interface ProjectReviewEntry {
  id: string;
  reviewer: string;
  action: 'approved' | 'rejected' | 'requested_changes';
  comment?: string;
  date: string;
}

export interface ProjectCredit {
  id: string;
  name: string;
  role: string;
  link?: string;
  avatarUrl?: string;
}

export interface ProjectMetric {
  id: string;
  value: string;
  label: string;
  context?: string;
}

export interface ProjectMilestone {
  id: string;
  date: string;
  title: string;
  description?: string;
  completed: boolean;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  storyBlocks?: StoryBlock[];
  blocks?: any[];
  coverImage: string;
  coverFocalPoint?: { x: number; y: number };
  galleryImages: string[];
  videoUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  documents?: { label: string; url: string; size?: string }[];
  externalLinks?: { label: string; url: string }[];
  category: string;
  departmentIds: string[];
  primaryDepartmentId?: string;
  status: ProjectStatus;
  publicationStatus: PublicationStatus;
  visibility?: 'Public' | 'Unlisted' | 'Members only';
  tags?: string[];
  featured?: boolean;
  impactMetrics?: ProjectMetric[];
  timelineMilestones?: ProjectMilestone[];
  creditsList?: ProjectCredit[];
  relatedProjectIds?: string[];
  startDate: string;
  completionDate?: string;
  scheduledPublishDate?: string;
  publishedAt?: string;
  credits?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoShareImage?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  reviewComment?: string;
  reviewHistory?: ProjectReviewEntry[];
  versions?: ProjectVersion[];
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Modular Content Types System
export type FieldType = 'text' | 'rich-text' | 'number' | 'date' | 'file' | 'image' | 'select' | 'relation';

export interface ContentTypeField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for select
  helpText?: string;
}

export interface ContentType {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  fields: ContentTypeField[];
  isSystem?: boolean;
}

export interface ContentItem {
  id: string;
  typeSlug: string;
  title: string;
  slug: string;
  status: 'Draft' | 'Published' | 'Archived';
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// Media
export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  type: MediaType;
  size: number;
  altText: string;
  caption?: string;
  credit?: string;
  folder?: string;
  tags: string[];
  uploadedAt: string;
  focalPoint?: { x: number; y: number };
  posterUrl?: string;
  isLocked?: boolean;
  width?: number;
  height?: number;
  usedInCount?: number;
}

// Forms & Inbox
export interface FormSubmission {
  id: string;
  formType: 'contact' | 'collaboration' | 'volunteer' | 'newsletter';
  name: string;
  email: string;
  organization?: string;
  subject?: string;
  message: string;
  status: 'new' | 'replied' | 'archived';
  assignee?: string;
  internalNotes?: string;
  createdAt: string;
  submittedAt?: string;
  repliedAt?: string;
}

export interface FormConfig {
  id: string;
  name: string;
  enabled: boolean;
  notifyEmails: string[];
  autoReplySubject?: string;
  autoReplyMessage?: string;
}

// Pages & Page Editor Blocks
export interface PageBlock {
  id: string;
  type:
    | 'hero'
    | 'text'
    | 'image-text'
    | 'quote'
    | 'stats'
    | 'cards-grid'
    | 'timeline'
    | 'accordion'
    | 'cta-band'
    | 'video'
    | 'gallery'
    | 'logo-strip'
    | 'team-grid'
    | 'department-grid'
    | 'hierarchy-diagram'
    | 'contact-form'
    | 'embed';
  config: Record<string, any>;
  sectionSettings?: {
    background?: 'default' | 'surface' | 'deep' | 'accent' | 'transparent';
    spacing?: 'compact' | 'normal' | 'relaxed';
    width?: 'standard' | 'wide' | 'full';
    anchorId?: string;
    isGlobal?: boolean;
    hiddenDevices?: ('mobile' | 'tablet' | 'desktop')[];
  };
}

export interface PageRecord {
  id: string;
  title: string;
  slug: string;
  template: 'Standard' | 'Landing' | 'Article' | 'Team' | 'FAQ' | 'Gallery';
  status: 'Published' | 'Draft' | 'Hidden' | 'Password-protected';
  passwordHash?: string;
  scheduledPublishDate?: string;
  blocks: PageBlock[];
  seo: {
    title?: string;
    description?: string;
    shareImage?: string;
    canonical?: string;
    noindex?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  isExternal?: boolean;
  children?: { label: string; path: string; isExternal?: boolean }[];
}

export interface FooterColumn {
  id: string;
  title: string;
  links: { label: string; url: string; isExternal?: boolean }[];
}

export interface SocialLink {
  id: string;
  platform: string;
  icon: string;
  url: string;
}

export interface RedirectRule {
  id: string;
  from: string;
  to: string;
  type: '301' | '302';
  createdAt: string;
  hits?: number;
}

// Diagrams & Layouts
export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  type: 'nucleus' | 'division' | 'department' | 'initiative' | 'custom';
  color?: string;
  link?: string;
  children?: string[];
}

export interface DiagramConfig {
  id: string;
  title: string;
  type: 'tree' | 'orbit' | 'flowchart' | 'timeline' | 'matrix';
  description?: string;
  nodes: DiagramNode[];
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  moaLogoUrl: string;
  loaderLogoUrl: string;
  rddLogoUrl: string;
  faviconUrl: string;
  shareImageUrl: string;
  contactEmail: string;
  organizationAddress?: string;
  language?: string;
  timezone?: string;
  footerText: string;
  socialLinks: SocialLink[];
  seoDefaults: {
    title: string;
    description: string;
    keywords: string;
    sitemapEnabled?: boolean;
    robotsEnabled?: boolean;
  };
  announcementBar?: {
    enabled: boolean;
    text: string;
    linkUrl?: string;
    linkLabel?: string;
    expiresAt?: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    copperColor: string;
    radius: 'sm' | 'md' | 'lg' | 'xl';
    buttonStyle: 'rounded' | 'sharp' | 'pill';
    density: 'compact' | 'comfortable' | 'spacious';
    preset: 'brand-deep' | 'emerald' | 'copper' | 'light-slate';
  };
  navigation: NavigationItem[];
  footerColumns: FooterColumn[];
  notFoundText: string;
  maintenanceMode: boolean;
  maintenanceAllowlist?: string[];
  redirects: RedirectRule[];
  projectStatuses: string[];
  projectCategories: string[];
  securityPolicy: {
    minPasswordLength: number;
    requireUppercase: boolean;
    requireNumber: boolean;
    requireSymbol: boolean;
    sessionTimeoutMinutes: number;
    enforce2FAForAdmins: boolean;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
  };
}

export interface SiteContent {
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
}

export interface ActivityRecord {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  area: 'Projects' | 'Departments' | 'Website' | 'Media' | 'Team' | 'Settings' | 'Auth' | 'System';
  target: string;
  timestamp: string;
  details?: string;
}

export interface SiteHealthItem {
  id: string;
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
  actionText?: string;
  actionTab?: string;
  fixPath?: string;
}
