import type { PermissionKey, RoleRecord } from '../shared/permissions';

/**
 * Masters Of All — Unified Type Definitions (Client + Server)
 */

export type UserRole = string;

export type RoleDefinition = RoleRecord;

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roleId: string;
  permissions?: PermissionKey[];
  avatarUrl?: string;
  departmentScope?: string[];
  mustChangePassword: boolean;
  isFounder?: boolean;
  isTestAccount?: boolean;
  twoFactorEnabled?: boolean;
  requires2FASetup?: boolean;
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

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
  lastActivity: number;
  createdAt: number;
  ip?: string;
  userAgent?: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  roleId: string;
  departmentScope?: string[];
  invitedBy: string;
  invitedByName: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  lastSentAt?: string;
  emailSent?: boolean;
  emailError?: string;
}

export interface InviteVerifyResponse {
  valid: boolean;
  email: string;
  name?: string;
  role: string;
  roleId: string;
  departmentScope: string[];
  invitedByName: string;
  expiresAt: string;
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
  kind?: 'department' | 'sector';
  parentDepartmentId?: string;
  isRdd?: boolean;
  tagline?: string;
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
  pinnedLast?: boolean;
  supportsSectors?: boolean;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  seoShareImage?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SectorGlyph = DepartmentGlyph;

export interface Sector extends Department {
  departmentId?: string;
}

export interface PendingRevision {
  submittedByName?: string;
  submittedAt?: string;
  summary?: string;
  [key: string]: unknown;
}

export type ProjectStatus = 'Concept' | 'In Development' | 'Active' | 'Completed' | 'On Hold' | string;
export type PublicationStatus = 'Draft' | 'Pending Review' | 'Published' | 'Archived';

export interface StoryBlockImageContent {
  url?: string;
  caption?: string;
  alt?: string;
}

export type StoryBlockContent = string | string[] | StoryBlockImageContent | Record<string, unknown>;

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
  content: StoryBlockContent;
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
  blocks?: StoryBlock[];
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
  sectorIds?: string[];
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
  pendingRevision?: PendingRevision;
  versions?: ProjectVersion[];
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Publications
export type PublicationType = 'Paper' | 'Monograph' | 'Whitepaper' | 'Report' | string;

export interface Publication {
  id: string;
  title: string;
  slug: string;
  authors: string;
  abstract: string;
  publicationDate: string;
  publicationType: PublicationType;
  pdfUrl: string;
  thumbnailUrl?: string;
  doiOrUrl?: string;
  departmentIds: string[];
  sectorIds?: string[];
  relatedProjectId?: string;
  tags: string[];
  publicationStatus: PublicationStatus;
  scheduledPublishDate?: string;
  publishedAt?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  reviewComment?: string;
  reviewHistory?: ProjectReviewEntry[];
  pendingRevision?: PendingRevision;
  seoTitle?: string;
  seoDescription?: string;
  seoShareImage?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Products
export type ProductStage = 'Concept' | 'In development' | 'Released';
export type ProductPricingType = 'free' | 'paid' | 'contact';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductLinks {
  download?: string;
  website?: string;
  repository?: string;
  documentationPdf?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: string;
  status: ProductStage;
  version?: string;
  shortDescription: string;
  fullDescription: string;
  keyFeatures: string[];
  specs: ProductSpec[];
  galleryImages: string[];
  demoVideoUrl?: string;
  coverImage: string;
  releaseDate?: string;
  availabilityPricing: ProductPricingType;
  priceText?: string;
  links: ProductLinks;
  departmentIds: string[];
  sectorIds?: string[];
  relatedProjectIds: string[];
  credits?: string;
  tags: string[];
  publicationStatus: PublicationStatus;
  scheduledPublishDate?: string;
  publishedAt?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  reviewComment?: string;
  reviewHistory?: ProjectReviewEntry[];
  pendingRevision?: PendingRevision;
  seoTitle?: string;
  seoDescription?: string;
  seoShareImage?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Media
export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaUploadLimits {
  image: number;
  document: number;
  audio: number;
  video: number;
}

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
  uploadedBy?: string;
  uploadedAt: string;
  focalPoint?: { x: number; y: number };
  posterUrl?: string;
  isLocked?: boolean;
  width?: number;
  height?: number;
  usedInCount?: number;
}

// Forms & Inbox (read-only)
export interface FormSubmission {
  id: string;
  formType: 'contact' | 'collaboration' | 'volunteer' | 'newsletter';
  name: string;
  email: string;
  organization?: string;
  subject?: string;
  message: string;
  status: 'new' | 'read' | 'archived';
  createdAt: string;
  submittedAt?: string;
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
  config: Record<string, unknown>;
  sectionSettings?: {
    background?: 'default' | 'surface' | 'deep' | 'accent' | 'transparent';
    spacing?: 'compact' | 'normal' | 'relaxed';
    width?: 'standard' | 'wide' | 'full';
    anchorId?: string;
    isGlobal?: boolean;
  };
}

export interface PageRecord {
  id: string;
  title: string;
  slug: string;
  template: 'Standard' | 'Landing' | 'Article' | 'Gallery';
  status: 'Published' | 'Draft' | 'Hidden';
  scheduledPublishDate?: string;
  blocks: PageBlock[];
  seo: {
    title?: string;
    description?: string;
    shareImage?: string;
    canonical?: string;
    noindex?: boolean;
  };
  deletedAt?: string;
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
  navigation: NavigationItem[];
  footerColumns: FooterColumn[];
  notFoundText: string;
  alwaysShowProducts?: boolean;
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

export interface WhatWeDoCardContent {
  id: string;
  index: string;
  title: string;
  tagline: string;
  desc: string;
  color: string;
  deliverables: string[];
}

export interface ThinkingStepContent {
  step: number;
  label: string;
  subtitle: string;
  desc: string;
  deepDive: string;
  color: string;
}

export interface PhilosophyPillarContent {
  id: string;
  romanLabel: string;
  word: string;
  text: string;
  accentColor: string;
}

export interface SiteContent {
  home: {
    heroHeadlineLine1: string;
    heroHeadlineLine2: string;
    heroSubheadline: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    methodologyEyebrow: string;
    methodologyHeading: string;
    methodologySubheading: string;
    exploreTitle: string;
    exploreText: string;
    exploreSubtext: string;
    createTitle: string;
    createText: string;
    createSubtext: string;
    transformTitle: string;
    transformText: string;
    transformSubtext: string;
    believeWord: string;
    believeText: string;
    buildWord: string;
    buildText: string;
    becomeWord: string;
    becomeText: string;
    questionStatement: string;
    readStoryLabel: string;
    bottomTaglineSubtext: string;
  };
  about: {
    heroTitle: string;
    heroSub: string;
    whoWeAreBadge: string;
    whoWeAreHeading: string;
    whoWeAre: string;
    whoWeAreSecondary: string;
    whatWeDoBadge: string;
    whatWeDoHeading: string;
    whatWeDo: string;
    deliverablesHeading: string;
    whatWeDoCards: WhatWeDoCardContent[];
    howWeThinkBadge: string;
    howWeThinkHeading: string;
    howWeThink: string;
    thinkingSteps: ThinkingStepContent[];
    ourPhilosophyBadge: string;
    ourPhilosophyHeading: string;
    philosophyPillars: PhilosophyPillarContent[];
    ourPhilosophy: string;
    philosophyEthosTag: string;
    founderStatement: string;
    founderAttribution: string;
    endingLineTemplate: string;
  };
  departments: {
    heading: string;
    rddIntro: string;
    directoryEyebrow: string;
    directoryTitleTemplate: string;
    directorySubtitle: string;
    exploreButtonLabel: string;
    flagshipLabel?: string;
    viewSectorsLabel?: string;
    hideSectorsLabel?: string;
  };
  work: {
    heading: string;
    subtitle: string;
    projectsTabLabel: string;
    publicationsTabLabel: string;
    productsTabLabel: string;
    emptyTitle: string;
    emptySubtitle: string;
    searchPlaceholder: string;
  };
  contact: {
    heading: string;
    subtext: string;
    directEyebrow: string;
    directHeading: string;
    directDescription: string;
    emailBoxLabel: string;
    sendEmailLabel: string;
    copyEmailLabel: string;
    copiedEmailLabel: string;
    formHeading: string;
    formNamePlaceholder: string;
    formEmailPlaceholder: string;
    formSubjectPlaceholder: string;
    formMessagePlaceholder: string;
    formSubmitLabel: string;
    formSuccessMessage: string;
    responseNote: string;
    channelsEyebrow: string;
    channelsHeading: string;
    channelsDescription: string;
    channelsVisitLabel: string;
    channelsFooterNote: string;
  };
  products?: {
    heading: string;
    subtext: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptySubtitle: string;
  };
  detailFallback?: {
    moreDetailsComingSoon: string;
    departmentEmpty?: string;
    sectorEmpty?: string;
  };
  footer: {
    blurb: string;
    departmentsHeading: string;
    sectorsHeading?: string;
    communityHeading: string;
    copyrightSuffix: string;
  };
  notFound: {
    badge: string;
    heading: string;
    message: string;
    homeButtonLabel: string;
  };
  maintenance: {
    badge: string;
    heading: string;
    message: string;
  };
}

export interface ActivityRecord {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  area:
    | 'Projects'
    | 'Publications'
    | 'Products'
    | 'Departments'
    | 'Website'
    | 'Media'
    | 'Team'
    | 'Settings'
    | 'Auth'
    | 'System';
  target: string;
  timestamp: string;
  details?: string;
}

export interface SecurityLogRecord {
  id: string;
  event: string;
  email: string;
  ip: string;
  timestamp: string;
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

export interface BackupFileInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'auto' | 'pre-import' | 'pre-migration';
}

export interface BackupExportPayload {
  version: number;
  schemaVersion?: number;
  exportedAt: string;
  sourceBackup?: string;
  roles: RoleDefinition[];
  departments: Department[];
  projects: Project[];
  publications: Publication[];
  products: Product[];
  media: MediaAsset[];
  settings: SiteSettings;
  pageContent: SiteContent;
  pages: PageRecord[];
}

export interface ContentHistorySnapshot {
  id: string;
  entityType: string;
  entityId: string;
  author: string;
  authorEmail: string;
  timestamp: string;
  snapshot: Partial<SiteContent>;
  changeNote?: string;
}

export interface TrashItemsResponse {
  departments: Department[];
  projects: Project[];
  publications: Publication[];
  products: Product[];
  pages: PageRecord[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
