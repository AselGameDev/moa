import type {
  ActivityRecord,
  ContentHistorySnapshot,
  Department,
  FormSubmission,
  MediaAsset,
  PageRecord,
  PasswordResetToken,
  Product,
  Project,
  Publication,
  RoleDefinition,
  Sector,
  SecurityLogRecord,
  SiteContent,
  SiteSettings,
  UserInvitation
} from '../../src/types/index';

export const CURRENT_SCHEMA_VERSION = 6;

export interface ServerUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  roleId: string;
  avatarUrl?: string;
  departmentScope?: string[];
  passwordHash: string;
  salt: string;
  mustChangePassword: boolean;
  isFounder?: boolean;
  isTestAccount?: boolean;
  credentialsCustomized?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  pendingTwoFactorSecret?: string;
  recoveryCodes?: string[];
  pendingRecoveryCodes?: string[];
  lastTotpStep?: number;
  deactivated?: boolean;
  createdAt: string;
  lastSignIn?: string;
}

export interface ServerSessionRecord {
  id?: string;
  token: string;
  userId: string;
  role: string;
  roleId: string;
  lastActivity: number;
  createdAt?: number;
  expiresAt?: number;
  userAgent?: string;
  ip?: string;
}

export interface DatabaseState {
  schemaVersion: number;
  contentVersion: number;
  users: ServerUserRecord[];
  roles: RoleDefinition[];
  sessions: ServerSessionRecord[];
  passwordResets: PasswordResetToken[];
  activityLog: ActivityRecord[];
  securityLog: SecurityLogRecord[];
  departments: Department[];
  sectors?: Sector[];
  projects: Project[];
  publications: Publication[];
  products: Product[];
  media: MediaAsset[];
  settings: SiteSettings;
  pageContent: SiteContent;
  draftContent?: Partial<SiteContent>;
  contentHistory: ContentHistorySnapshot[];
  pages: PageRecord[];
  submissions: FormSubmission[];
  invitations: UserInvitation[];
}
