import {
  User,
  RoleDefinition,
  Department,
  Project,
  Publication,
  Product,
  MediaAsset,
  MediaUploadLimits,
  SiteContent,
  SiteSettings,
  ActivityRecord,
  SecurityLogRecord,
  SiteHealthItem,
  BackupFileInfo,
  BackupExportPayload,
  ContentHistorySnapshot,
  PageRecord,
  FormSubmission,
  UserInvitation,
  InviteVerifyResponse,
  TrashItemsResponse,
  PaginatedResult,
  RedirectRule
} from '../types';

const TOKEN_KEY = 'moa_control_room_token';
const USER_KEY = 'moa_control_room_user';

export class HttpError extends Error {
  status: number;
  data?: Record<string, unknown>;

  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
}

export interface SubmissionsPaginatedResponse extends PaginatedResult<FormSubmission> {
  unreadCount: number;
}

export interface RedirectTestResult {
  matched: boolean;
  redirect: RedirectRule | null;
  finalPath: string;
  chain: string[];
  loopDetected: boolean;
}

export interface HealthResponse {
  ok: boolean;
  status: string;
  timestamp: string;
  schemaVersion?: number;
  contentVersion?: number;
}

export interface MaintenanceInfoResponse {
  maintenanceMode: boolean;
  siteName: string;
  moaLogoUrl: string;
  maintenance: SiteContent['maintenance'];
}

class ApiService {
  private token: string | null = null;
  private user: User | null = null;
  private unauthorizedHandler: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
      const userJson = localStorage.getItem(USER_KEY);
      if (userJson) {
        try {
          this.user = JSON.parse(userJson) as User;
        } catch {
          this.user = null;
        }
      }
    }
  }

  public registerUnauthorizedHandler(cb: (() => void) | null) {
    this.unauthorizedHandler = cb;
  }

  public getToken(): string | null {
    return this.token;
  }

  public getCurrentUser(): User | null {
    return this.user;
  }

  public setSession(token: string, user: User) {
    this.token = token;
    this.user = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  public clearSession() {
    this.token = null;
    this.user = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Security note (Token storage tradeoff):
   * The session token is stored in localStorage and sent explicitly via
   * `Authorization: Bearer <token>` + `X-MoA-Request: 1` rather than an
   * httpOnly SameSite=Strict cookie so authenticated Control Room requests work
   * inside cross-site iframe preview environments where SameSite=Strict cookies
   * are suppressed by browsers.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-MoA-Request': '1',
      ...(options.headers as Record<string, string> | undefined)
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errMsg = `Request failed (${res.status})`;
      let errorData: Record<string, unknown> | undefined;
      try {
        const parsed = (await res.json()) as Record<string, unknown>;
        errorData = parsed;
        if (typeof parsed.error === 'string' && parsed.error) {
          errMsg = parsed.error;
        }
      } catch {
        // fallback to status text
      }

      if (res.status === 401 && !endpoint.includes('/api/auth/signin')) {
        const hadToken = Boolean(this.token);
        this.clearSession();
        if (hadToken && this.unauthorizedHandler) {
          this.unauthorizedHandler();
        }
      }

      throw new HttpError(errMsg, res.status, errorData);
    }

    return (await res.json()) as T;
  }

  // Health & Version & Maintenance
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  async getContentVersion(): Promise<{ version: number }> {
    return this.request<{ version: number }>('/api/content-version');
  }

  async getMaintenanceInfo(): Promise<MaintenanceInfoResponse> {
    return this.request<MaintenanceInfoResponse>('/api/maintenance-info');
  }

  // Auth Endpoints
  async getSmtpStatus(): Promise<{ smtpConfigured: boolean }> {
    return this.request<{ smtpConfigured: boolean }>('/api/auth/smtp-status');
  }

  async signIn(
    email: string,
    password: string,
    twoFactorCode?: string
  ): Promise<{ token?: string; user?: User; requires2FA?: boolean; requires2FASetup?: boolean }> {
    const cleanEmail = email.trim().toLowerCase();

    const data = await this.request<{
      token?: string;
      user?: User;
      requires2FA?: boolean;
      requires2FASetup?: boolean;
    }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password, twoFactorCode })
    });

    if (data.requires2FA) {
      return data;
    }

    if (!data.token || !data.user) {
      throw new Error('Authentication failed: server did not return a valid session token.');
    }

    this.setSession(data.token, data.user);
    return data;
  }

  async forgotPassword(email: string): Promise<{ smtpConfigured: boolean; sent: boolean; message: string; error?: string }> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  async changePassword(newPassword: string): Promise<{ success: boolean; message: string; user?: User }> {
    const data = await this.request<{ success: boolean; message: string; user?: User }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    if (data.user && this.token) {
      this.setSession(this.token, data.user);
    }
    return data;
  }

  async getMe(): Promise<{ user: User }> {
    const data = await this.request<{ user: User }>('/api/auth/me');
    if (data.user) {
      this.user = data.user;
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
    }
    return data;
  }

  async signOut(): Promise<void> {
    try {
      await this.request('/api/auth/signout', { method: 'POST' });
    } catch {
      // Ignore error on signout cleanup
    } finally {
      this.clearSession();
    }
  }

  async setup2FA(): Promise<{ secret: string; otpauthUri: string; recoveryCodes: string[] }> {
    return this.request('/api/auth/2fa/setup', { method: 'POST' });
  }

  async verify2FA(code: string): Promise<{ success: boolean; twoFactorEnabled: boolean; user: User }> {
    const res = await this.request<{ success: boolean; twoFactorEnabled: boolean; user: User }>('/api/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    if (res.user && this.token) {
      this.setSession(this.token, res.user);
    }
    return res;
  }

  async disable2FA(password: string, code: string): Promise<{ success: boolean; twoFactorEnabled: boolean; user: User }> {
    const res = await this.request<{ success: boolean; twoFactorEnabled: boolean; user: User }>('/api/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code })
    });
    if (res.user && this.token) {
      this.setSession(this.token, res.user);
    }
    return res;
  }

  // Roles & Permissions
  async getRoles(): Promise<RoleDefinition[]> {
    return this.request<RoleDefinition[]>('/api/roles');
  }

  async createRole(payload: { name: string; permissions: string[] }): Promise<RoleDefinition> {
    return this.request<RoleDefinition>('/api/roles', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateRole(id: string, payload: { name?: string; permissions?: string[] }): Promise<RoleDefinition> {
    return this.request<RoleDefinition>(`/api/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteRole(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/roles/${id}`, {
      method: 'DELETE'
    });
  }

  // Members
  async getMembers(): Promise<User[]> {
    return this.request<User[]>('/api/members');
  }

  async createMember(payload: {
    name: string;
    email: string;
    temporaryPassword?: string;
    roleId?: string;
    role?: string;
    departmentScope?: string[];
  }): Promise<User & { temporaryPassword?: string }> {
    return this.request('/api/members', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateMember(id: string, payload: Partial<User>): Promise<User> {
    return this.request(`/api/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async resetMemberPassword(id: string): Promise<{ success: boolean; temporaryPassword: string }> {
    return this.request(`/api/members/${id}/reset-password`, {
      method: 'POST'
    });
  }

  async deleteMember(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/members/${id}`, {
      method: 'DELETE'
    });
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return this.request<Department[]>('/api/departments');
  }

  async getAllDepartments(): Promise<Department[]> {
    return this.request<Department[]>('/api/departments/all');
  }

  async createDepartment(payload: Partial<Department>): Promise<Department> {
    return this.request<Department>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateDepartment(id: string, payload: Partial<Department>): Promise<Department> {
    return this.request<Department>(`/api/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async reorderDepartments(orderedIds: string[]): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/departments/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds })
    });
  }

  async deleteDepartment(
    id: string,
    options?: { projectHandling: 'leave' | 'reassign'; targetDeptId?: string }
  ): Promise<{ success: boolean }> {
    return this.request(`/api/departments/${id}`, {
      method: 'DELETE',
      body: JSON.stringify(options || {})
    });
  }

  async restoreDepartment(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/departments/${id}/restore`, {
      method: 'POST'
    });
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/api/projects');
  }

  async getProjectBySlug(slug: string): Promise<Project> {
    return this.request<Project>(`/api/projects/by-slug/${encodeURIComponent(slug)}`);
  }

  async getProjectsAdmin(): Promise<Project[]> {
    return this.request<Project[]>('/api/projects/admin');
  }

  async createProject(payload: Partial<Project>): Promise<Project> {
    return this.request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateProject(id: string, payload: Partial<Project>): Promise<Project> {
    return this.request<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async reviewProject(
    id: string,
    payload: { action: 'approved' | 'rejected' | 'requested_changes'; comment?: string }
  ): Promise<Project> {
    return this.request<Project>(`/api/projects/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/projects/${id}`, {
      method: 'DELETE'
    });
  }

  async restoreProject(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/projects/${id}/restore`, {
      method: 'POST'
    });
  }

  async restoreProjectVersion(id: string, versionId: string): Promise<Project> {
    return this.request<Project>(`/api/projects/${id}/restore-version`, {
      method: 'POST',
      body: JSON.stringify({ versionId })
    });
  }

  // Publications
  async getPublications(): Promise<Publication[]> {
    return this.request<Publication[]>('/api/publications');
  }

  async getPublicationsAdmin(): Promise<Publication[]> {
    return this.request<Publication[]>('/api/publications/admin');
  }

  async createPublication(payload: Partial<Publication>): Promise<Publication> {
    return this.request<Publication>('/api/publications', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePublication(id: string, payload: Partial<Publication>): Promise<Publication> {
    return this.request<Publication>(`/api/publications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async reviewPublication(
    id: string,
    payload: { action: 'approved' | 'rejected' | 'requested_changes'; comment?: string }
  ): Promise<Publication> {
    return this.request<Publication>(`/api/publications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deletePublication(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/publications/${id}`, {
      method: 'DELETE'
    });
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/api/products');
  }

  async getProductBySlug(slug: string): Promise<Product> {
    return this.request<Product>(`/api/products/by-slug/${encodeURIComponent(slug)}`);
  }

  async getProductsAdmin(): Promise<Product[]> {
    return this.request<Product[]>('/api/products/admin');
  }

  async createProduct(payload: Partial<Product>): Promise<Product> {
    return this.request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateProduct(id: string, payload: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async reviewProduct(
    id: string,
    payload: { action: 'approved' | 'rejected' | 'requested_changes'; comment?: string }
  ): Promise<Product> {
    return this.request<Product>(`/api/products/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE'
    });
  }

  // Media Library
  async getMedia(): Promise<MediaAsset[]> {
    return this.request<MediaAsset[]>('/api/media');
  }

  async getMediaLimits(): Promise<MediaUploadLimits> {
    return this.request<MediaUploadLimits>('/api/media/limits');
  }

  async uploadMedia(
    payload: {
      name: string;
      dataUrl: string;
      altText?: string;
      caption?: string;
      credit?: string;
      folder?: string;
      tags?: string[];
      type?: string;
    },
    onProgress?: (percent: number) => void
  ): Promise<MediaAsset> {
    if (!onProgress || typeof XMLHttpRequest === 'undefined') {
      return this.request<MediaAsset>('/api/media', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    return new Promise<MediaAsset>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/media');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('X-MoA-Request', '1');
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
        }
      };

      xhr.onload = () => {
        onProgress(100);
        try {
          const parsed = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed as unknown as MediaAsset);
          } else {
            if (xhr.status === 401) {
              const hadToken = Boolean(this.token);
              this.clearSession();
              if (hadToken && this.unauthorizedHandler) {
                this.unauthorizedHandler();
              }
            }
            const errMsg = typeof parsed.error === 'string' && parsed.error ? parsed.error : `Request failed (${xhr.status})`;
            reject(new HttpError(errMsg, xhr.status, parsed));
          }
        } catch {
          reject(new HttpError(`Request failed (${xhr.status})`, xhr.status));
        }
      };

      xhr.onerror = () => {
        reject(new HttpError('Network error while uploading media.', 0));
      };

      xhr.send(JSON.stringify(payload));
    });
  }

  async updateMedia(id: string, payload: Partial<MediaAsset>): Promise<MediaAsset> {
    return this.request<MediaAsset>(`/api/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async replaceMedia(id: string, payload: { dataUrl: string; name?: string }): Promise<MediaAsset> {
    return this.request<MediaAsset>(`/api/media/${id}/replace`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deleteMedia(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/media/${id}`, {
      method: 'DELETE'
    });
  }

  // Site Content
  async getPageContent(): Promise<SiteContent> {
    return this.request<SiteContent>('/api/page-content');
  }

  async updatePageContent(payload: Partial<SiteContent>): Promise<SiteContent> {
    return this.request<SiteContent>('/api/page-content', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async getDraftContent(): Promise<{ draft: Partial<SiteContent> | null; isDraft: boolean }> {
    return this.request('/api/page-content/draft');
  }

  async saveDraftContent(draft: Partial<SiteContent>): Promise<{ success: boolean }> {
    return this.request('/api/page-content/draft', {
      method: 'POST',
      body: JSON.stringify({ draft })
    });
  }

  async publishDraftContent(): Promise<SiteContent> {
    return this.request<SiteContent>('/api/page-content/publish-draft', {
      method: 'POST'
    });
  }

  async getContentHistory(): Promise<ContentHistorySnapshot[]> {
    return this.request<ContentHistorySnapshot[]>('/api/page-content/history');
  }

  async restoreContentHistory(snapshotId: string): Promise<SiteContent> {
    return this.request<SiteContent>(`/api/page-content/history/${snapshotId}/restore`, {
      method: 'POST'
    });
  }

  // Site Settings & Redirect Tester
  async getSettings(): Promise<SiteSettings> {
    return this.request<SiteSettings>('/api/settings');
  }

  async updateSettings(payload: Partial<SiteSettings>): Promise<SiteSettings> {
    return this.request<SiteSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async testRedirect(path: string): Promise<RedirectTestResult> {
    return this.request<RedirectTestResult>('/api/redirects/test', {
      method: 'POST',
      body: JSON.stringify({ path })
    });
  }

  // Activity Log, Security Log & Site Health
  async getActivityLog(params?: {
    page?: number;
    limit?: number;
    area?: string;
    q?: string;
  }): Promise<ActivityRecord[] | PaginatedResult<ActivityRecord>> {
    if (params && params.page) {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit || 25)
      });
      if (params.area && params.area !== 'all') qs.set('area', params.area);
      if (params.q) qs.set('q', params.q);
      return this.request<PaginatedResult<ActivityRecord>>(`/api/activity-log?${qs.toString()}`);
    }
    return this.request<ActivityRecord[]>('/api/activity-log');
  }

  async getSecurityLog(): Promise<SecurityLogRecord[]> {
    return this.request<SecurityLogRecord[]>('/api/security-log');
  }

  async getSiteHealth(): Promise<SiteHealthItem[]> {
    return this.request<SiteHealthItem[]>('/api/site-health');
  }

  // Backup & Restore
  async listBackups(): Promise<BackupFileInfo[]> {
    return this.request<BackupFileInfo[]>('/api/backup/list');
  }

  async downloadBackup(filename: string): Promise<BackupExportPayload> {
    return this.request<BackupExportPayload>(`/api/backup/download/${encodeURIComponent(filename)}`);
  }

  async exportEverything(): Promise<BackupExportPayload> {
    return this.request<BackupExportPayload>('/api/backup/export');
  }

  async importEverything(data: unknown): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Custom Pages
  async getPages(): Promise<PageRecord[]> {
    return this.request<PageRecord[]>('/api/pages');
  }

  async savePage(page: Partial<PageRecord>): Promise<PageRecord> {
    return this.request<PageRecord>('/api/pages', {
      method: 'POST',
      body: JSON.stringify(page)
    });
  }

  async deletePage(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/pages/${id}`, {
      method: 'DELETE'
    });
  }

  // Forms & Inquiries (read-only inbox)
  async getSubmissions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
  }): Promise<FormSubmission[] | SubmissionsPaginatedResponse> {
    if (params && params.page) {
      const qs = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit || 25)
      });
      if (params.status && params.status !== 'all') qs.set('status', params.status);
      if (params.q) qs.set('q', params.q);
      return this.request<SubmissionsPaginatedResponse>(`/api/submissions?${qs.toString()}`);
    }
    return this.request<FormSubmission[]>('/api/submissions');
  }

  async updateSubmission(
    id: string,
    payload: { status: FormSubmission['status'] }
  ): Promise<FormSubmission> {
    return this.request<FormSubmission>(`/api/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteSubmission(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/submissions/${id}`, {
      method: 'DELETE'
    });
  }

  async submitContactForm(data: {
    formType?: FormSubmission['formType'];
    name: string;
    email: string;
    organization?: string;
    subject?: string;
    message: string;
    website?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Team Invitations
  async getInvitations(): Promise<UserInvitation[]> {
    return this.request<UserInvitation[]>('/api/invitations');
  }

  async createInvitation(payload: {
    email: string;
    name?: string;
    roleId?: string;
    role?: string;
    departmentScope?: string[];
  }): Promise<UserInvitation & { inviteUrl?: string; smtpConfigured?: boolean; emailSent?: boolean; emailError?: string }> {
    return this.request('/api/invitations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async resendInvitation(
    id: string
  ): Promise<UserInvitation & { inviteUrl?: string; smtpConfigured?: boolean; emailSent?: boolean; emailError?: string }> {
    return this.request(`/api/invitations/${id}/resend`, {
      method: 'POST'
    });
  }

  async revokeInvitation(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/invitations/${id}`, {
      method: 'DELETE'
    });
  }

  async verifyInvitation(token: string): Promise<InviteVerifyResponse> {
    return this.request<InviteVerifyResponse>(
      `/api/invitations/verify?token=${encodeURIComponent(token)}`
    );
  }

  async acceptInvitation(payload: {
    token: string;
    name: string;
    password: string;
  }): Promise<{ token: string; requires2FASetup?: boolean; user: User }> {
    const res = await this.request<{ token: string; requires2FASetup?: boolean; user: User }>(
      '/api/invitations/accept',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
    if (res.token && res.user) {
      this.setSession(res.token, res.user);
    }
    return res;
  }

  // Trash & Restore
  async getTrashItems(): Promise<TrashItemsResponse> {
    return this.request<TrashItemsResponse>('/api/trash');
  }

  async restoreTrashItem(
    type: 'department' | 'project' | 'publication' | 'product' | 'page',
    id: string
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/trash/restore', {
      method: 'POST',
      body: JSON.stringify({ type, id })
    });
  }

  async deleteTrashItem(
    type: 'department' | 'project' | 'publication' | 'product' | 'page',
    id: string
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/trash/item/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  async emptyTrash(): Promise<{ success: boolean; removed?: number }> {
    return this.request<{ success: boolean; removed?: number }>('/api/trash/empty', {
      method: 'DELETE'
    });
  }
}

export const api = new ApiService();
