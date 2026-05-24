const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

import { getOrCreateAnonId, clearAnonId } from '@/lib/anon-id';

if (!API_BASE_URL && typeof window !== 'undefined') {
  console.error('NEXT_PUBLIC_BACKEND_URL environment variable is required');
  throw new Error('Backend URL not configured. Please set NEXT_PUBLIC_BACKEND_URL environment variable.');
}


// Types for API responses
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

export interface User {
  _id: string;
  id?: string; // Alias for _id for compatibility
  email: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  role: string;
  status: string;
  isActive: boolean;
  emailVerified: boolean;
  // Premium membership (optional fields; may be absent for non-premium users)
  isPremium?: boolean;
  premiumExpiresAt?: string | null;
  /** Some API responses use premiumEndsAt (mirrors backend User model). */
  premiumEndsAt?: string | null;
  premiumPlanId?: string;
  createdAt: string;
  approvedAt?: string;
  profileImage?: string;
  phoneNumber?: string;
  name?: string;
}

export interface UserProfile {
  _id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  country: string;
  province: string;
  city?: string;
  careerStage: string;
  interests: string[];
  industrySectors: string[];
  educationLevel: string;
  fieldOfStudy?: string;
  institution?: string;
  skills: string[];
  aspirations: string[];
  onboardingCompleted: boolean;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
  bio?: string;
  headline?: string;
  website?: string;
  work?: {
    company?: string;
    title?: string;
  };
  education?: {
    school?: string;
    degree?: string;
    field?: string;
  };
  socialLinks?: Record<string, string>;
  profileImage?: string;
  phoneNumber?: string;
  isPrivate?: boolean;
  showConnections?: boolean;
  onboarding?: {
    country?: string;
    province?: string;
    city?: string;
    careerStage?: string;
    interests?: string[];
    industrySectors?: string[];
    educationLevel?: string;
    fieldOfStudy?: string;
    institution?: string;
    aspirations?: string[];
    skills?: string[];
  };
  // Optional gamification fields (Glow Score)
  xp_total?: number;
  level?: number;
  current_streak?: number;
}

// Glow Score response (backend shape)
export interface GlowScoreResponse {
  xp_total: number;
  level: number;
  current_streak: number;
  xp_to_next_level?: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
  needsApproval: boolean;
}

// Channels
export interface Channel {
  _id: string;
  name: string;
  slug: string;
  description: string;
  type: 'public' | 'private' | 'pro';
  ownerId: string | null;
  moderatorIds: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
}

export interface ChannelMembership {
  role: 'owner' | 'moderator' | 'member';
  joinedAt: string;
}

/** Playlist rows from GET /api/playlists/premium (premium subscribers or admin on backend). */
export interface PremiumPlaylistSummary {
  _id: string;
  name: string;
  description: string;
  hashtags: string[];
  isPublic: boolean;
  isPremiumPlaylist?: boolean;
  itemCount: number;
  createdBy: { _id: string; email: string; firstName?: string };
  createdAt: string;
  updatedAt: string;
}

export interface PremiumPlaylistsPage {
  playlists: PremiumPlaylistSummary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// API Client Class
export class ApiClient {
  private static getAuthHeaders(): HeadersInit {
    const token = this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private static setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  private static clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error('Too many requests from this IP, please try again later.');
      }

      // Handle authentication errors specifically
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in to perform this action.');
      }

      // Handle validation errors with more detail (errors may be strings or objects)
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors.map((err: any) => err?.message ?? err?.field ?? (typeof err === 'string' ? err : String(err))).join(', ');
        throw new Error(`${data.message || 'Validation failed'}: ${errorMessages}`);
      }
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }

    if (!data.success) {
      // Handle validation errors with more detail (errors may be strings or objects)
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors.map((err: any) => err?.message ?? err?.field ?? (typeof err === 'string' ? err : String(err))).join(', ');
        throw new Error(`${data.message || 'Request failed'}: ${errorMessages}`);
      }
      throw new Error(data.message || data.error || 'Request failed');
    }

    // Handle different response formats:
    // 1. Responses with data property (most API endpoints)
    // 2. Responses without data property (engagement actions)
    if (data.data !== undefined) {
      return data.data as T;
    } else {
      // For engagement actions that return { success: true, message: "..." }
      return data as T;
    }
  }

  public static async refreshTokenIfNeeded(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.setTokens(data.data.tokens);
          return true;
        }
      } else if (response.status >= 500) {
        // Don't clear tokens on server errors
        console.error('Server error during token refresh');
        return false;
      }
      
      // If we got a 4xx error (like 401 Invalid Refresh Token), clear tokens
      if (response.status >= 400 && response.status < 500) {
        this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed (network error?):', error);
      // Don't clear tokens on network errors
      return false;
    }

    return false;
  }

  public static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      let response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      // If token is expired, try to refresh
      if (response.status === 401) {
        const refreshed = await this.refreshTokenIfNeeded();
        if (refreshed) {
          response = await fetch(url, {
            ...options,
            headers: {
              ...this.getAuthHeaders(),
              ...options.headers,
            },
          });
        }
      }

      return response;
    } catch (error: unknown) {
      const base =
        typeof window !== "undefined"
          ? "Request failed. Check your connection"
          : `Cannot reach ${url.split("?")[0]}`;
      const hint =
        typeof window !== "undefined"
          ? " — ensure the dev server is running and, for API calls, NEXT_PUBLIC_BACKEND_URL matches your backend (e.g. http://localhost:3001)."
          : "";
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === "Failed to fetch" || error instanceof TypeError) {
        throw new Error(`${base}: ${msg}${hint}`);
      }
      throw error;
    }
  }

  /**
   * Subscription endpoints: in the browser, call same-origin Next.js proxies under /api/subscriptions/*
   * so fetch does not cross origins (fixes CORS / "Failed to fetch" to localhost:3001).
   * On the server, use the configured backend URL directly.
   */
  private static subscriptionsApiUrl(path: "initialize" | "verify" | "cancel" | "status"): string {
    if (typeof window !== "undefined") {
      return `/api/subscriptions/${path}`;
    }
    return `${API_BASE_URL}/api/subscriptions/${path}`;
  }

  // Authentication Methods
  static async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await this.handleResponse<LoginResponse>(response);
    this.setTokens(data.tokens);
    return data;
  }

  static async registerOpportunitySeeker(email: string, password: string, firstName?: string, lastName?: string, dateOfBirth?: string): Promise<RegisterResponse> {
    const body: Record<string, unknown> = { email, password, firstName, lastName, dateOfBirth };
    if (typeof window !== 'undefined') {
      body.anonId = getOrCreateAnonId();
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/register/opportunity-seeker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await this.handleResponse<RegisterResponse>(response);
    this.setTokens(data.tokens);
    if (typeof window !== 'undefined') clearAnonId();
    return data;
  }

  static async registerOpportunityPoster(email: string, password: string, firstName?: string, lastName?: string, dateOfBirth?: string): Promise<RegisterResponse> {
    const body: Record<string, unknown> = { email, password, firstName, lastName, dateOfBirth };
    if (typeof window !== 'undefined') {
      body.anonId = getOrCreateAnonId();
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/register/opportunity-poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await this.handleResponse<RegisterResponse>(response);
    this.setTokens(data.tokens);
    if (typeof window !== 'undefined') clearAnonId();
    return data;
  }

  static async getCurrentUser(): Promise<{ user: User; profile: UserProfile | null; preferences: any }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/me`);
    return this.handleResponse(response);
  }

  // Glow Score / gamification
  static async getGlowScore(): Promise<GlowScoreResponse> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/users/me/glow`);
    return this.handleResponse<GlowScoreResponse>(response);
  }

  static async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      // Ignore network errors - clear tokens anyway
      // Backend might be down, but we still want to logout locally
    } finally {
      this.clearTokens();
    }
  }

  // User Profile Methods
  static async createUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return this.handleResponse<UserProfile>(response);
  }

  static async updateUser(data: Partial<User>): Promise<User> {
    console.log('API Client - Updating user with data:', data);
    console.log('API Client - Request URL:', `${API_BASE_URL}/api/auth/update-user`);

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/update-user`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    console.log('API Client - Response status:', response.status);
    console.log('API Client - Response ok:', response.ok);

    return this.handleResponse<User>(response);
  }

  static async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return this.handleResponse<UserProfile>(response);
  }

  static async getUserProfile(): Promise<{ profile: UserProfile | null, hasProfile: boolean }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/users/profile`);
    return this.handleResponse<{ profile: UserProfile | null, hasProfile: boolean }>(response);
  }

  /** Get normalized user (user + profile + onboarding merged). Used by recommendation algo and for consistent user shape. */
  static async getNormalizedUserProfile(): Promise<{ normalizedUser: Record<string, unknown> | null, hasProfile: boolean }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/users/profile/normalized`);
    return this.handleResponse<{ normalizedUser: Record<string, unknown> | null, hasProfile: boolean }>(response);
  }

  // Opportunities Methods
  static async getOpportunities(params?: {
    page?: number;
    limit?: number;
    category?: string;
    type?: string;
    country?: string;
    isRemote?: boolean;
    isPaid?: boolean;
    search?: string;
  }): Promise<{ opportunities: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/opportunities?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getOpportunityById(id: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/opportunities/${id}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async createOpportunity(data: any): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/opportunities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  static async createEvent(data: any): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  static async createJob(data: any): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/jobs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  static async createResource(data: any): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  // Channels
  static async getChannels(params?: {
    page?: number;
    limit?: number;
    type?: 'public' | 'private' | 'pro';
    search?: string;
  }): Promise<{ channels: Channel[]; total: number; page: number; limit: number; totalPages: number }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const url = `${API_BASE_URL}/api/channels${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.makeAuthenticatedRequest(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  /** Premium playlists (`isPremiumPlaylist: true` in DB). Requires auth; backend returns 403 without premium/admin. */
  static async getPremiumPlaylists(params?: { page?: number; limit?: number }): Promise<PremiumPlaylistsPage> {
    const searchParams = new URLSearchParams();
    if (params?.page != null) searchParams.set('page', String(params.page));
    if (params?.limit != null) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    const url = `${API_BASE_URL}/api/playlists/premium${qs ? `?${qs}` : ''}`;
    const response = await this.makeAuthenticatedRequest(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<PremiumPlaylistsPage>(response);
  }

  static async getChannelBySlug(slug: string): Promise<{ channel: Channel; membership: ChannelMembership | null }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${encodeURIComponent(slug)}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  static async createChannel(payload: { name: string; description?: string; type?: 'public' | 'private' | 'pro' }): Promise<Channel> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  static async updateChannel(id: string, payload: { name?: string; description?: string; type?: 'public' | 'private' | 'pro' }): Promise<Channel> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  static async joinChannel(id: string, options?: { viaInvite?: boolean }): Promise<{ status: 'joined' | 'pending'; viaInvite?: boolean }> {
    const searchParams = new URLSearchParams();
    if (options?.viaInvite) {
      searchParams.append('invite', '1');
    }
    const qs = searchParams.toString();
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/join${qs ? `?${qs}` : ''}`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async leaveChannel(id: string): Promise<{ status: 'left' }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/leave`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async getChannelMembers(id: string): Promise<{ members: Array<{ userId: string; role: string; joinedAt: string; user: any | null }> }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/members`);
    return this.handleResponse(response);
  }

  static async getChannelJoinRequests(id: string): Promise<{ requests: Array<{ userId: string; status: string; createdAt: string; user: any | null }> }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/join-requests`);
    return this.handleResponse(response);
  }

  static async approveChannelJoinRequest(id: string, userId: string): Promise<{ status: 'approved' }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/join-requests/${userId}/approve`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async rejectChannelJoinRequest(id: string, userId: string): Promise<{ status: 'rejected' }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/join-requests/${userId}/reject`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async promoteChannelMember(id: string, userId: string): Promise<{ status: 'updated'; role: string }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/members/${userId}/promote`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async demoteChannelMember(id: string, userId: string): Promise<{ status: 'updated'; role: string }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/members/${userId}/demote`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async removeChannelMember(id: string, userId: string): Promise<{ status: 'removed' }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/members/${userId}/remove`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async getChannelPosts(
    id: string,
    params?: { page?: number; limit?: number; after?: string }
  ): Promise<{
    posts: any[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    incremental?: boolean;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.after) searchParams.append('after', params.after);
    const qs = searchParams.toString();
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/posts${qs ? `?${qs}` : ''}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  static async markChannelRead(channelId: string, lastReadPostId: string): Promise<{ lastReadPostId: string; lastReadAt: string }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${channelId}/read`, {
      method: 'POST',
      body: JSON.stringify({ lastReadPostId }),
    });
    return this.handleResponse(response);
  }

  static async getChannelReadSummary(channelId: string): Promise<{
    readers: { userId: string; firstName: string | null; lastReadPostId: string | null; lastReadAt: string | null }[];
    capped: boolean;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${channelId}/read-summary`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  static async setChannelTyping(channelId: string, active: boolean): Promise<{ ok: boolean }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${channelId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    });
    return this.handleResponse(response);
  }

  static async getChannelTyping(channelId: string): Promise<{ typers: { userId: string; firstName: string }[] }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${channelId}/typing`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  static async createChannelPost(id: string, payload: { text?: string; images?: any[]; visibility?: string }): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/channels/${id}/posts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  // Delete Methods
  static async deleteOpportunity(id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/opportunities/${id}`, {
      method: 'DELETE',
    });

    return this.handleResponse(response);
  }

  static async deleteJob(id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/jobs/${id}`, {
      method: 'DELETE',
    });

    return this.handleResponse(response);
  }

  static async deleteEvent(id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/events/${id}`, {
      method: 'DELETE',
    });

    return this.handleResponse(response);
  }

  static async deleteResource(id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources/${id}`, {
      method: 'DELETE',
    });

    return this.handleResponse(response);
  }

  // Update Methods
  static async updateOpportunity(id: string, data: any): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/opportunities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  static async updateJob(id: string, data: any): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  static async updateEvent(id: string, data: any): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  static async updateResource(id: string, data: any): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  // Events Methods
  static async getEvents(params?: {
    page?: number;
    limit?: number;
    eventType?: string;
    country?: string;
    isVirtual?: boolean;
    isPaid?: boolean;
    search?: string;
  }): Promise<{ events: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/events?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getEventById(id: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/events/${id}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Jobs Methods
  static async getJobs(params?: {
    page?: number;
    limit?: number;
    jobType?: string;
    company?: string;
    country?: string;
    isRemote?: boolean;
    isPaid?: boolean;
    search?: string;
  }): Promise<{ jobs: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/jobs?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getJobById(id: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/jobs/${id}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Resources Methods
  static async getResources(params?: {
    page?: number;
    limit?: number;
    category?: string;
    isPremium?: boolean;
    featured?: boolean;
    search?: string;
  }): Promise<{ resources: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getResourceById(id: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources/${id}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Engagement Methods
  static async saveOpportunity(id: string): Promise<void> {
    await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/opportunities/${id}/save`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async unsaveOpportunity(id: string): Promise<void> {
    await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/opportunities/${id}/unsave`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async likeOpportunity(id: string): Promise<void> {
    await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/opportunities/${id}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async unlikeOpportunity(id: string): Promise<void> {
    await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/opportunities/${id}/unlike`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async getSavedOpportunities(params?: { page?: number; limit?: number }): Promise<{ savedOpportunities: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/opportunities/saved?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getLikedOpportunities(params?: { page?: number; limit?: number }): Promise<{ likedOpportunities: any[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/opportunities/liked?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Similar methods for events, jobs, and resources...
  static async saveEvent(id: string): Promise<void> {
    await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/events/${id}/save`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async likeEvent(id: string): Promise<void> {
    await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/events/${id}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }


  // Recommendations
  static async getRecommendedOpportunities(limit?: number): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (limit) {
      searchParams.append('limit', limit.toString());
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/recommended/opportunities?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getRecommendedEvents(limit?: number): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (limit) {
      searchParams.append('limit', limit.toString());
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/recommended/events?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getRecommendedJobs(limit?: number): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (limit) {
      searchParams.append('limit', limit.toString());
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/recommended/jobs?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getRecommendedResources(limit?: number): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (limit) {
      searchParams.append('limit', limit.toString());
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/recommended/resources?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Enhanced unified recommendations with hybrid scoring
  static async getUnifiedRecommendations(options?: {
    includeOpportunities?: boolean;
    includeEvents?: boolean;
    includeJobs?: boolean;
    includeResources?: boolean;
    minScore?: number;
    limit?: number;
  }): Promise<{
    content: any[];
    total: number;
    userProfile: any;
  }> {
    const searchParams = new URLSearchParams();

    if (options?.includeOpportunities !== undefined) {
      searchParams.append('includeOpportunities', options.includeOpportunities.toString());
    }
    if (options?.includeEvents !== undefined) {
      searchParams.append('includeEvents', options.includeEvents.toString());
    }
    if (options?.includeJobs !== undefined) {
      searchParams.append('includeJobs', options.includeJobs.toString());
    }
    if (options?.includeResources !== undefined) {
      searchParams.append('includeResources', options.includeResources.toString());
    }
    if (options?.minScore !== undefined) {
      searchParams.append('minScore', options.minScore.toString());
    }
    if (options?.limit !== undefined) {
      searchParams.append('limit', options.limit.toString());
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/recommended/unified?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Get detailed scoring breakdown for debugging and transparency
  static async getScoringBreakdown(contentType: string, contentId: string): Promise<{
    finalScore: number;
    personalizationScore: number;
    popularityScore: number;
    breakdown: {
      personalization: {
        interestMatch: number;
        locationMatch: number;
        careerStageMatch: number;
        skillMatch: number;
        freshness: number;
        timing: number;
      };
      popularity: {
        views: number;
        likes: number;
        saves: number;
        clicks: number;
        agePenalty: number;
      };
    };
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append('contentType', contentType);
    searchParams.append('contentId', contentId);

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/recommended/scoring-breakdown?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Engagement tracking
  static async trackEngagement(contentType: string, contentId: string, action: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/recommended/engagement`, {
      method: 'POST',
      body: JSON.stringify({
        contentType,
        contentId,
        action
      }),
    });

    return this.handleResponse(response);
  }

  /**
   * Record a feed view for home feed items (increments metrics used for recommendations / analytics).
   * Call when the user expands "Show more" or when they like (like also counts as a view).
   * Requires authentication; no-ops if the request fails (caller can still bump UI optimistically).
   */
  static async recordFeedContentView(
    itemType: 'opportunity' | 'job' | 'event' | 'resource',
    contentId: string,
    _source: 'feed_show_more' | 'feed_like'
  ): Promise<void> {
    const contentType =
      itemType === 'opportunity'
        ? 'opportunity'
        : itemType === 'job'
          ? 'job'
          : itemType === 'event'
            ? 'event'
            : 'resource';
    try {
      await this.trackEngagement(contentType, contentId, 'view');
    } catch {
      try {
        const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/view`, {
          method: 'POST',
          body: JSON.stringify({
            contentType: itemType,
            contentId,
            source: _source,
          }),
        });
        await this.handleResponse(response);
      } catch {
        // Backend may only implement recommended/engagement; ignore
      }
    }
  }

  private static _feedMetricContentType(itemType: 'opportunity' | 'job' | 'event' | 'resource'): string {
    return itemType === 'opportunity'
      ? 'opportunity'
      : itemType === 'job'
        ? 'job'
        : itemType === 'event'
          ? 'event'
          : 'resource';
  }

  /** Record a share from the feed (share button completed). Best-effort backend increment for metrics.shareCount. */
  static async recordFeedShare(
    itemType: 'opportunity' | 'job' | 'event' | 'resource',
    contentId: string
  ): Promise<void> {
    const contentType = this._feedMetricContentType(itemType);
    try {
      await this.trackEngagement(contentType, contentId, 'share');
    } catch {
      try {
        const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/share`, {
          method: 'POST',
          body: JSON.stringify({ contentType: itemType, contentId, source: 'feed' }),
        });
        await this.handleResponse(response);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Record add-to-playlist from the feed (distinct from bookmark/save).
   * Best-effort backend increment for metrics.playlistAddCount.
   */
  static async recordFeedPlaylistAdd(
    itemType: 'opportunity' | 'job' | 'event' | 'resource',
    contentId: string
  ): Promise<void> {
    const contentType = this._feedMetricContentType(itemType);
    try {
      await this.trackEngagement(contentType, contentId, 'playlist_add');
    } catch {
      try {
        const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/playlist-add`, {
          method: 'POST',
          body: JSON.stringify({ contentType: itemType, contentId, source: 'feed' }),
        });
        await this.handleResponse(response);
      } catch {
        // ignore
      }
    }
  }

  // Utility method to check if user is authenticated
  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Utility method to get current user from token (basic)
  static getCurrentUserFromToken(): User | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      // Basic JWT decode (without verification - for client-side display only)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        _id: payload.userId,
        email: payload.email,
        role: payload.role,
        status: 'active',
        isActive: true,
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  // Engagement Methods
  static async getEngagementStatus(type: 'opportunities' | 'events' | 'jobs' | 'resources', id: string): Promise<{
    isSaved: boolean;
    isLiked: boolean;
    hasApplied?: boolean;
    isRegistered?: boolean;
  }> {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/${type}/${id}/status`);
      return this.handleResponse(response);
    } catch (error: any) {
      // If it's a 404 or "not found" error, return default values instead of throwing
      // Backend returns messages like "Opportunity not found", "Content not found", etc.
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('not found') ||
        errorMessage.includes('404') ||
        errorMessage.includes('resource not found')) {
        return {
          isSaved: false,
          isLiked: false,
          hasApplied: false,
          isRegistered: false
        };
      }
      // Re-throw other errors (auth errors, network errors, etc.)
      throw error;
    }
  }

  static async saveItem(type: 'opportunities' | 'events' | 'jobs' | 'resources', id: string, notes?: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/${type}/${id}/save`, {
      method: 'POST',
      body: notes ? JSON.stringify({ notes }) : undefined,
    });
    await this.handleResponse(response);
  }

  static async unsaveItem(type: 'opportunities' | 'events' | 'jobs' | 'resources', id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/${type}/${id}/unsave`, {
      method: 'POST',
    });
    await this.handleResponse(response);
  }

  static async likeItem(type: 'opportunities' | 'events' | 'jobs' | 'resources', id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/${type}/${id}/like`, {
      method: 'POST',
    });
    await this.handleResponse(response);
  }

  static async unlikeItem(type: 'opportunities' | 'events' | 'jobs' | 'resources', id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/${type}/${id}/unlike`, {
      method: 'POST',
    });
    await this.handleResponse(response);
  }

  static async applyForOpportunity(id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/opportunities/${id}/apply`, {
      method: 'POST',
    });
    await this.handleResponse(response);
  }

  static async applyForJob(id: string, notes?: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/jobs/${id}/apply`, {
      method: 'POST',
      body: notes ? JSON.stringify({ notes }) : undefined,
    });
    await this.handleResponse(response);
  }

  static async registerForEvent(id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/events/${id}/register`, {
      method: 'POST',
    });
    await this.handleResponse(response);
  }

  static async unregisterFromEvent(id: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/events/${id}/unregister`, {
      method: 'POST',
    });
    await this.handleResponse(response);
  }

  /**
   * Record an "apply" engagement for external jobs/opportunities/events.
   * This does not perform a full in-platform application; it just logs
   * an engagement click to the backend.
   */
  static async recordApply(
    contentType: 'job' | 'opportunity' | 'event',
    id: string
  ): Promise<void> {
    const typeToPath: Record<string, string> = {
      job: 'jobs',
      opportunity: 'opportunities',
      event: 'events'
    };
    const path = typeToPath[contentType];
    if (!path) return;

    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/engagement/${path}/${id}/click`,
      {
        method: 'POST',
        body: JSON.stringify({ contentType, source: 'apply_button' })
      }
    );

    await this.handleResponse(response);
  }

  // Search Methods
  static async searchContent(query: string, _filters?: {
    type?: string;
    location?: string;
    industry?: string[];
    skills?: string[];
  }): Promise<{
    opportunities: any[];
    events: any[];
    jobs: any[];
    resources: any[];
  }> {
    if (!query.trim()) {
      return {
        opportunities: [],
        events: [],
        jobs: [],
        resources: []
      };
    }

    try {
      const searchParams = new URLSearchParams();
      searchParams.append('search', query.trim());
      searchParams.append('limit', '20');

      const [opportunitiesRes, eventsRes, jobsRes, resourcesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/opportunities?${searchParams.toString()}`),
        fetch(`${API_BASE_URL}/api/events?${searchParams.toString()}`),
        fetch(`${API_BASE_URL}/api/jobs?${searchParams.toString()}`),
        fetch(`${API_BASE_URL}/api/resources?${searchParams.toString()}`)
      ]);

      const [opportunitiesData, eventsData, jobsData, resourcesData] = await Promise.all([
        opportunitiesRes.json(),
        eventsRes.json(),
        jobsRes.json(),
        resourcesRes.json()
      ]);

      return {
        opportunities: opportunitiesData.success ? (opportunitiesData.data?.opportunities || []) : [],
        events: eventsData.success ? (eventsData.data?.events || []) : [],
        jobs: jobsData.success ? (jobsData.data?.jobs || []) : [],
        resources: resourcesData.success ? (resourcesData.data?.resources || []) : []
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        opportunities: [],
        events: [],
        jobs: [],
        resources: []
      };
    }
  }

  // Admin API methods
  static async getPendingUsers(page = 1, limit = 10, role?: string): Promise<{
    users: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    if (role) searchParams.append('role', role);

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/users/pending?${searchParams.toString()}`);
    return this.handleResponse(response);
  }

  static async getAllUsers(page = 1, limit = 10, filters?: {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<{
    users: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    if (filters?.role) searchParams.append('role', filters.role);
    if (filters?.status) searchParams.append('status', filters.status);
    if (filters?.search) searchParams.append('search', filters.search);

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/users?${searchParams.toString()}`);
    return this.handleResponse(response);
  }

  static async getUserDetails(userId: string): Promise<{
    user: any;
    profile: any;
    preferences: any;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/users/${userId}`);
    return this.handleResponse(response);
  }

  static async approveUser(userId: string): Promise<{ user: any }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/users/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    });
    return this.handleResponse(response);
  }

  static async rejectUser(userId: string, rejectionReason: string): Promise<{ user: any }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/users/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', rejectionReason }),
    });
    return this.handleResponse(response);
  }

  static async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return this.handleResponse(response);
  }

  static async getPlatformStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    recentRegistrations: number;
    totalOpportunitySeekers: number;
    totalPosters: number;
    totalOpportunities: number;
    totalEvents: number;
    totalJobs: number;
    totalResources: number;
    dailyActiveUsers?: number;
    dailyVisitors?: number;
    userStats: Record<string, number>;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/stats`);
    return this.handleResponse(response);
  }

  // Past Posts API methods
  static async getPastPostsStats(): Promise<{
    pastOpportunities: number;
    pastEvents: number;
    pastJobs: number;
    total: number;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/past-posts/stats`);
    return this.handleResponse(response);
  }

  static async getPastPosts(
    collection: 'opportunities' | 'events' | 'jobs',
    options?: {
      limit?: number;
      skip?: number;
      reason?: string;
      pastStatus?: 'expired' | 'moved';
    }
  ): Promise<{
    posts: any[];
    total: number;
    hasMore: boolean;
  }> {
    const searchParams = new URLSearchParams();
    if (options?.limit) searchParams.append('limit', options.limit.toString());
    if (options?.skip) searchParams.append('skip', options.skip.toString());
    if (options?.reason) searchParams.append('reason', options.reason);
    if (options?.pastStatus) searchParams.append('pastStatus', options.pastStatus);

    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/admin/past-posts/${collection}?${searchParams.toString()}`
    );
    return this.handleResponse(response);
  }

  // Provider Onboarding Admin Methods
  static async getAllPostersDetails(): Promise<{
    success: boolean;
    posters: any[];
    stats: {
      total: number;
      approved: number;
      pending: number;
      onboardingCompleted: number;
      hasDocuments: number;
    };
    message?: string;
  }> {
    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/provider-onboarding/admin/all`
    );
    return this.handleResponse(response);
  }

  // Content Moderation API methods
  static async getContentForModeration(page = 1, limit = 10, filters?: {
    type?: string;
    status?: string;
    payment?: string;
    search?: string;
  }): Promise<{
    content: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    counts?: { live: number; pending: number; drafts: number; inactive: number };
  }> {
    try {
      // Use the proper admin endpoint that returns ALL content regardless of approval status
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.payment && { payment: filters.payment }),
        ...(filters?.search && { search: filters.search })
      });

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/admin/content/moderation?${queryParams.toString()}`
      );

      return this.handleResponse(response);

    } catch (error) {
      console.error('Error fetching content for moderation:', error);
      throw new Error('Failed to fetch content for moderation');
    }
  }

  /** Trigger past-content cleanup (expired events, opportunities, jobs from live + inactive). */
  static async triggerPastContentCleanup(): Promise<{
    success: boolean;
    message?: string;
    data?: {
      live: { opportunities: number; events: number; jobs: number };
      inactive: { opportunities: number; events: number; jobs: number };
      runAt?: string;
    };
  }> {
    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/cleanup/past-content`,
      { method: 'POST' }
    );
    return this.handleResponse(response);
  }

  static async approveContent(contentId: string, contentType: string, options?: { bypassPayment?: boolean }): Promise<void> {
    const endpoint = this.getContentEndpoint(contentType, contentId, 'approve');
    console.log('Approving content:', { contentId, contentType, endpoint });
    const response = await this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: options ? JSON.stringify(options) : undefined,
    });
    return this.handleResponse(response);
  }

  static async rejectContent(contentId: string, contentType: string, rejectionReason: string): Promise<void> {
    const endpoint = this.getContentEndpoint(contentType, contentId, 'disapprove');
    console.log('Rejecting content:', { contentId, contentType, endpoint, rejectionReason });
    const response = await this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
    return this.handleResponse(response);
  }

  /**
   * Admin delete content: move from live/inactive into corresponding past_* collection.
   * This reuses the same disapprove endpoints used for rejection.
   */
  static async deleteContentByAdmin(contentId: string, contentType: 'opportunity' | 'event' | 'job' | 'resource', reason?: string): Promise<void> {
    const endpoint = this.getContentEndpoint(contentType, contentId, 'disapprove');
    console.log('Deleting content to past:', { contentId, contentType, endpoint, reason });
    const response = await this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason: reason || 'Deleted by admin' }),
    });
    return this.handleResponse(response);
  }

  static async requestPayment(contentId: string, contentType: string, amount: number, notes?: string): Promise<any> {
    console.log('API Client - Requesting payment:', {
      contentId,
      contentType,
      amount,
      notes,
      url: `${API_BASE_URL}/api/payments/${contentType}/${contentId}/request`
    });

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/payments/${contentType}/${contentId}/request`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        notes: notes || null
      }),
    });

    console.log('API Client - Payment response status:', response.status);
    console.log('API Client - Payment response ok:', response.ok);

    return this.handleResponse(response);
  }

  static async verifyPayment(contentId: string, contentType: string, verified: boolean, notes?: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/payments/${contentType}/${contentId}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        verified,
        notes: notes || null
      }),
    });
    return this.handleResponse(response);
  }

  static async uploadPaymentReceipt(contentId: string, contentType: string, receiptUrl: string, paymentCode?: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/payments/${contentType}/${contentId}/upload-receipt`, {
      method: 'POST',
      body: JSON.stringify({
        receiptUrl,
        paymentCode: paymentCode || null
      }),
    });
    return this.handleResponse(response);
  }

  static async getPaymentDetails(contentId: string, contentType: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/payments/${contentType}/${contentId}/details`);
    return this.handleResponse(response);
  }

  /** Admin: update content fields (title, description, status, urls, location, payment, benefits, dates). Backend may accept PATCH/PUT. */
  static async updateContentByAdmin(
    contentId: string,
    contentType: string,
    payload: {
      title?: string
      description?: string
      status?: string
      applicationLink?: string
      externalLink?: string
      eventLink?: string
      url?: string
      location?: { city?: string; country?: string; province?: string; address?: string; isRemote?: boolean; isHybrid?: boolean }
      paymentAmount?: number
      paymentNotes?: string
      price?: number
      currency?: string
      benefits?: string[]
      dates?: {
        applicationDeadline?: string
        startDate?: string
        endDate?: string
        registrationDeadline?: string
        duration?: string
      }
      [key: string]: unknown
    }
  ): Promise<any> {
    const endpointMap: { [key: string]: string } = {
      opportunity: 'opportunities',
      event: 'events',
      job: 'jobs',
      resource: 'resources'
    };
    const apiPath = endpointMap[contentType] || `${contentType}s`;
    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/${apiPath}/${contentId}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    return this.handleResponse(response);
  }

  static async getContentAwaitingPayment(page = 1, limit = 20, contentType?: string): Promise<any> {
    const searchParams = new URLSearchParams();
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    if (contentType) searchParams.append('contentType', contentType);

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/payments/awaiting-payment?${searchParams.toString()}`);
    return this.handleResponse(response);
  }

  static async getContentWithUploadedPayments(page = 1, limit = 20, contentType?: string): Promise<any> {
    const searchParams = new URLSearchParams();
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    if (contentType) searchParams.append('contentType', contentType);

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/payments/uploaded-payments?${searchParams.toString()}`);
    return this.handleResponse(response);
  }

  // Premium subscription methods

  /**
   * Start a premium subscription (recurring) via Paystack. Uses the backend's subscription plan (e.g. ₦1,500/month).
   * Returns authorizationUrl for redirect to Paystack.
   * Paystack expects amount in KOBO (1 NGN = 100 kobo). Pass amount in kobo, e.g. 150000 for ₦1,500.
   * amountKobo is optional when using plan-based subscription (planId).
   */
  static async startPremiumSubscription(
    amountKobo?: number,
    options?: { planId?: string; callbackUrl?: string }
  ): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> {
    const body: Record<string, unknown> = {};
    if (amountKobo != null && Number.isFinite(amountKobo)) body.amountNg = amountKobo;
    if (options?.planId) body.planId = options.planId;
    if (options?.callbackUrl) body.callbackUrl = options.callbackUrl;

    const response = await this.makeAuthenticatedRequest(this.subscriptionsApiUrl("initialize"), {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = await this.handleResponse<{
      authorizationUrl: string;
      reference: string;
      accessCode: string;
    }>(response);

    // Some backends wrap in data, others may return flat; normalize
    if ((data as any)?.authorizationUrl) {
      return data as any;
    }

    const wrapped = data as any;
    return wrapped.data ?? wrapped;
  }

  /**
   * Verify a completed Paystack transaction and activate/renew the premium subscription.
   */
  static async verifyPremiumSubscription(
    reference: string
  ): Promise<{ isPremium: boolean; premiumExpiresAt: string | null }> {
    const response = await this.makeAuthenticatedRequest(this.subscriptionsApiUrl("verify"), {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
    // Be defensive here because this endpoint is only used in a very specific context
    let json: any = null;
    try {
      json = await response.json();
    } catch {
      // ignore JSON parse errors; we'll handle below
    }

    if (!response.ok || !json) {
      throw new Error(json?.message || `Failed to verify premium subscription (HTTP ${response.status})`);
    }

    // Standard { success, data } envelope
    if (json.success === false) {
      throw new Error(json.message || 'Failed to verify premium subscription');
    }

    const payload = json.data ?? json;
    return {
      isPremium: !!payload.isPremium,
      premiumExpiresAt: payload.premiumExpiresAt ?? null,
    };
  }

  /**
   * Get current premium subscription status for the authenticated user.
   * canCancel is true when the user has an active recurring subscription that can be cancelled.
   */
  static async getPremiumStatus(): Promise<{
    isPremium: boolean;
    premiumExpiresAt: string | null;
    canCancel?: boolean;
  }> {
    const response = await this.makeAuthenticatedRequest(this.subscriptionsApiUrl("status"), {
      method: 'GET',
    });
    const result = await this.handleResponse<{
      isPremium: boolean;
      premiumExpiresAt: string | null;
      canCancel?: boolean;
    }>(response);
    if ((result as any)?.isPremium !== undefined) {
      return result as any;
    }
    const wrapped = result as any;
    return wrapped.data ?? wrapped;
  }

  /**
   * Cancel the current user's premium subscription (stops future charges).
   * User keeps premium access until the end of the current period.
   */
  static async cancelPremiumSubscription(): Promise<{
    premiumExpiresAt: string | null;
  }> {
    const response = await this.makeAuthenticatedRequest(this.subscriptionsApiUrl("cancel"), {
      method: 'POST',
    });
    const result = await this.handleResponse<{ premiumExpiresAt: string | null }>(response);
    const wrapped = result as any;
    const data = wrapped.data ?? wrapped;
    return {
      premiumExpiresAt: data.premiumExpiresAt ?? null,
    };
  }

  /** Provider wallet: get balance (NGN). */
  static async getWallet(): Promise<{ balanceNg: number; currency: string }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/wallet`);
    const result = await this.handleResponse<{ balanceNg: number; currency: string } | { data: { balanceNg: number; currency: string } }>(response);
    const payload: any = (result as any)?.data ?? result;
    return {
      balanceNg: typeof payload.balanceNg === 'number' ? payload.balanceNg : 0,
      currency: typeof payload.currency === 'string' ? payload.currency : 'NGN',
    };
  }

  /** Provider wallet: initiate top-up; returns authorizationUrl for Paystack redirect/popup. */
  static async topUpWallet(amountNg: number, callbackUrl?: string): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/wallet/top-up`, {
      method: 'POST',
      body: JSON.stringify({ amountNg, callbackUrl: callbackUrl || undefined }),
    });
    const result = await this.handleResponse<{ authorizationUrl?: string; reference?: string; accessCode?: string } | { data: { authorizationUrl: string; reference: string; accessCode: string } }>(response);
    const payload: any = (result as any)?.data ?? result;
    return {
      authorizationUrl: typeof payload.authorizationUrl === 'string' ? payload.authorizationUrl : '',
      reference: typeof payload.reference === 'string' ? payload.reference : '',
      accessCode: typeof payload.accessCode === 'string' ? payload.accessCode : '',
    };
  }

  /** Provider wallet: verify inline Paystack top-up by reference and return new balance. */
  static async verifyWalletTopUp(reference: string): Promise<{ balanceNg: number }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/wallet/verify-topup`, {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
    let json: any = null;
    try {
      json = await response.json();
    } catch {
      // ignore, handled below
    }
    if (!response.ok || !json) {
      throw new Error(json?.message || `Failed to verify wallet top-up (HTTP ${response.status})`);
    }
    if (json.success === false) {
      throw new Error(json.message || 'Failed to verify wallet top-up');
    }
    const payload = json.data ?? json;
    return { balanceNg: typeof payload.balanceNg === 'number' ? payload.balanceNg : 0 };
  }

  /** Provider wallet: recent transactions for the current provider. */
  static async getWalletTransactions(limit = 50): Promise<{
    transactions: {
      _id: string;
      amount: number;
      type: 'topup' | 'deduction';
      reference: string | null;
      paystackReference: string | null;
      status: string;
      promotionId?: string | null;
      contentId?: string | null;
      contentType?: 'opportunity' | 'event' | 'job' | 'resource' | null;
      matchPercent?: number | null;
      costNg?: number | null;
      createdAt: string;
    }[];
  }> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.append('limit', String(limit));
    const url = `${API_BASE_URL}/api/wallet/transactions${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.makeAuthenticatedRequest(url);
    const result = await this.handleResponse<{ transactions: any[] } | { data: { transactions: any[] } }>(response);
    const payload: any = (result as any)?.data ?? result;
    return {
      transactions: Array.isArray(payload.transactions) ? payload.transactions : [],
    };
  }

  /** Record a promoted click (signed-in user viewed promoted content). Call from detail pages once per load. */
  /** Record a promoted interaction. action: 'view' | 'like' | 'share' | 'show_more' | 'apply' (default 'view'). Costs: like N30, share N50, show_more N20, view/apply match-based. */
  static async recordPromotionClick(
    contentId: string,
    contentType: 'opportunity' | 'event' | 'job' | 'resource',
    action?: 'view' | 'like' | 'share' | 'show_more' | 'apply'
  ): Promise<{ counted: boolean; reason?: string; costNg?: number; balanceNg?: number }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/promotions/click`, {
      method: 'POST',
      body: JSON.stringify({ contentId, contentType, action: action ?? 'view' }),
    });
    const json = await this.handleResponse(response) as ApiResponse<{ counted: boolean; reason?: string; costNg?: number; balanceNg?: number }>;
    return json?.data ?? { counted: false };
  }

  /** Initialize Paystack one-time payment for a promotion. Returns authorizationUrl to redirect user. spendLimitNg is required. */
  static async initializePromotionPayment(params: {
    contentId: string;
    contentType: 'opportunity' | 'event' | 'job' | 'resource';
    durationDays: number;
    spendLimitNg: number;
    callbackUrl?: string;
  }): Promise<{ authorizationUrl: string; reference: string }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/promotions/initialize-payment`, {
      method: 'POST',
      body: JSON.stringify({
        contentId: params.contentId,
        contentType: params.contentType,
        durationDays: params.durationDays,
        spendLimitNg: params.spendLimitNg,
        ...(params.callbackUrl && { callbackUrl: params.callbackUrl }),
      }),
    });
    const json = await this.handleResponse(response) as ApiResponse<{ authorizationUrl: string; reference: string }>;
    const data = (json as any)?.data ?? json;
    if (!data?.authorizationUrl) throw new Error((json as any)?.message || 'Failed to initialize promotion payment');
    return { authorizationUrl: data.authorizationUrl, reference: data.reference || '' };
  }

  /** Verify Paystack promotion payment and create promotion. Call after user returns from Paystack. */
  static async verifyPromotionPayment(reference: string): Promise<{ promotion: any; spendLimitNg: number; duration: number }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/promotions/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
    const json = await this.handleResponse(response) as ApiResponse<{ promotion: any; spendLimitNg?: number; duration?: number }>;
    const data = (json as any)?.data ?? json;
    if (!data?.promotion) throw new Error((json as any)?.message || 'Failed to verify promotion payment');
    return {
      promotion: data.promotion,
      spendLimitNg: data.spendLimitNg ?? 0,
      duration: data.duration ?? 0,
    };
  }

  /** Start a promotion: N100/day upfront + optional per-click budget. Returns chargedNg (upfront) and balanceNg. */
  static async startPromotionWithWallet(params: {
    contentId: string;
    contentType: 'opportunity' | 'event' | 'job' | 'resource';
    durationDays: number;
    spendLimitNg?: number | null;
  }): Promise<{ promotion: any; spendLimitNg: number | null; duration: number; chargedNg: number; balanceNg: number }> {
    const body: Record<string, unknown> = {
      contentId: params.contentId,
      contentType: params.contentType,
      durationDays: params.durationDays,
    };
    if (params.spendLimitNg != null && params.spendLimitNg > 0) {
      body.spendLimitNg = params.spendLimitNg;
    }
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/promotions/start-with-wallet`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const json = await this.handleResponse(response) as ApiResponse<{ promotion: any; spendLimitNg?: number | null; duration?: number; chargedNg?: number; balanceNg?: number }>;
    if (!json?.data) throw new Error((json as any)?.message || 'Failed to start promotion');
    return {
      promotion: json.data.promotion,
      spendLimitNg: json.data.spendLimitNg ?? null,
      duration: json.data.duration ?? params.durationDays,
      chargedNg: json.data.chargedNg ?? params.durationDays * 100,
      balanceNg: json.data.balanceNg ?? 0,
    };
  }

  // Helper method to get the correct endpoint for content type
  private static getContentEndpoint(contentType: string, contentId: string, action: string): string {
    // Map content types to their correct API endpoints
    const endpointMap: { [key: string]: string } = {
      'opportunity': 'opportunities',
      'event': 'events',
      'job': 'jobs',
      'resource': 'resources'
    };

    const apiPath = endpointMap[contentType] || `${contentType}s`;
    const baseUrl = `${API_BASE_URL}/api/${apiPath}/${contentId}/${action}`;
    return baseUrl;
  }

  // Helper method to normalize content items from different types
  private static normalizeContentItem(item: any, type: string): any {
    const normalized = {
      ...item,
      type,
      // Ensure financial information is properly mapped
      isPaid: item.isPaid || item.financial?.isPaid || false,
      price: item.price || item.financial?.amount || null,
      currency: item.currency || item.financial?.currency || 'NGN',
      // Ensure location information is properly mapped
      location: {
        country: item.location?.country || null,
        province: item.location?.province || null,
        city: item.location?.city || null,
        address: item.location?.address || null,
        isRemote: item.location?.isRemote || false,
        isHybrid: item.location?.isHybrid || false,
        isVirtual: item.location?.isVirtual || false
      },
      // Ensure dates are properly mapped
      dates: {
        startDate: item.dates?.startDate || null,
        endDate: item.dates?.endDate || null,
        applicationDeadline: item.dates?.applicationDeadline || null,
        registrationDeadline: item.dates?.registrationDeadline || null,
        duration: item.dates?.duration || null
      },
      // Ensure metrics are properly mapped
      metrics: {
        viewCount: item.metrics?.viewCount || 0,
        likeCount: item.metrics?.likeCount || 0,
        saveCount: item.metrics?.saveCount || 0,
        shareCount: item.metrics?.shareCount ?? 0,
        playlistAddCount: item.metrics?.playlistAddCount ?? item.metrics?.playlistCount ?? 0,
        applicationCount: item.metrics?.applicationCount || 0,
        registrationCount: item.metrics?.registrationCount || 0
      }
    };

    return normalized;
  }

  // Fetch poster information for content items
  static async getPosterInfo(providerId: string | null | undefined): Promise<any> {
    // If we don't have an ID (e.g. ingested/scraper content), don't spam the API
    if (!providerId) {
      return null;
    }
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/users/${providerId}`);
      const result = await response.json();
      return result.data?.user || null;
    } catch (error) {
      console.error('Error fetching poster info:', error);
      return null;
    }
  }

  // User role upgrade API methods
  static async upgradeToProvider(email: string, password: string, userData?: { firstName?: string; lastName?: string; dateOfBirth?: string }): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string }; needsApproval: boolean }> {
    const requestBody: any = { email, password };

    // Include user profile data if provided to ensure data portability
    if (userData) {
      if (userData.firstName) requestBody.firstName = userData.firstName;
      if (userData.lastName) requestBody.lastName = userData.lastName;
      if (userData.dateOfBirth) requestBody.dateOfBirth = userData.dateOfBirth;
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/upgrade-to-provider`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    const result = await this.handleResponse<{ user: any; tokens: { accessToken: string; refreshToken: string }; needsApproval: boolean }>(response);

    // Update tokens if provided
    if (result.tokens) {
      this.setTokens(result.tokens);
    }

    // Return in expected format
    return {
      user: result.user,
      tokens: result.tokens,
      needsApproval: result.needsApproval
    };
  }

  // Provider Onboarding Methods
  static async getProviderOnboarding(): Promise<{ onboarding: any }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/provider-onboarding`, {
      method: 'GET',
    });
    return this.handleResponse(response);
  }

  static async updateProviderOnboarding(data: any): Promise<{ isCompleted: boolean; completionPercentage: number; onboarding?: any }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/provider-onboarding`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ isCompleted: boolean; completionPercentage: number; onboarding?: any }>(response);
  }

  static async completeProviderOnboarding(): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/provider-onboarding/complete`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async checkPostingPermission(): Promise<{ canPost: boolean, completionPercentage: number, isCompleted: boolean, reason: string }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/provider-onboarding/posting-permission`, {
      method: 'GET',
    });
    return this.handleResponse(response);
  }

  /**
   * Returns the current count of the authenticated user's total postings
   * (opportunities + events + jobs + resources; all statuses count). Used to enforce posting limits.
   */
  static async getMyPostingCount(): Promise<{ total: number; opportunities: number; events: number; jobs: number; resources: number }> {
    const limit = 100;
    const [oppRes, evRes, jobRes, resRes] = await Promise.all([
      this.makeAuthenticatedRequest(`${API_BASE_URL}/api/opportunities/my/opportunities?limit=${limit}`, { method: 'GET' }).then((r) => this.handleResponse(r)).catch(() => ({ opportunities: [] })),
      this.makeAuthenticatedRequest(`${API_BASE_URL}/api/events/my/events?limit=${limit}`, { method: 'GET' }).then((r) => this.handleResponse(r)).catch(() => ({ events: [] })),
      this.makeAuthenticatedRequest(`${API_BASE_URL}/api/jobs/my/jobs?limit=${limit}`, { method: 'GET' }).then((r) => this.handleResponse(r)).catch(() => ({ jobs: [] })),
      this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources/my/resources?limit=${limit}`, { method: 'GET' }).then((r) => this.handleResponse(r)).catch(() => ({ resources: [] })),
    ]);
    // handleResponse returns data.data, so we get { opportunities: [] } not { data: { opportunities: [] } }
    const opportunities = Array.isArray((oppRes as any)?.opportunities) ? (oppRes as any).opportunities.length : (Array.isArray((oppRes as any)?.data?.opportunities) ? (oppRes as any).data.opportunities.length : 0);
    const events = Array.isArray((evRes as any)?.events) ? (evRes as any).events.length : (Array.isArray((evRes as any)?.data?.events) ? (evRes as any).data.events.length : 0);
    const jobs = Array.isArray((jobRes as any)?.jobs) ? (jobRes as any).jobs.length : (Array.isArray((jobRes as any)?.data?.jobs) ? (jobRes as any).data.jobs.length : 0);
    const resources = Array.isArray((resRes as any)?.resources) ? (resRes as any).resources.length : (Array.isArray((resRes as any)?.data?.resources) ? (resRes as any).data.resources.length : 0);
    return {
      opportunities,
      events,
      jobs,
      resources,
      total: opportunities + events + jobs + resources,
    };
  }

  // Email Verification Methods
  static async sendVerificationCode(): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/send-verification-code`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  static async verifyEmail(code: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    return this.handleResponse(response);
  }

  static async getVerificationStatus(): Promise<{
    emailVerified: boolean;
    email: string;
    emailVerifiedAt: string | null;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/verification-status`, {
      method: 'GET',
    });
    return this.handleResponse(response);
  }

  // Password Reset Methods (no authentication required)
  static async requestPasswordReset(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this.handleResponse(response);
  }

  static async verifyResetCode(email: string, code: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return this.handleResponse(response);
  }

  static async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    return this.handleResponse(response);
  }

  static async deleteAccount(): Promise<void> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return this.handleResponse(response);
  }

  // Locked In (focus session) methods — available to all authenticated users (not premium-only). Pass signal for timeout (e.g. 10s AbortController).
  static async createLockedInSession(options?: {
    startedAt?: string;
    intention?: string;
    todoList?: Array<{ id?: string; text: string; done?: boolean }>;
    signal?: AbortSignal;
  }): Promise<{
    sessionId: string;
    startedAt: string;
    intention?: string | null;
    todoList?: Array<{ id: string; text: string; done: boolean }>;
    existing?: boolean;
  }> {
    const startedAt = options?.startedAt ?? new Date().toISOString();
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/locked-in/sessions`, {
      method: 'POST',
      body: JSON.stringify({
        startedAt,
        intention: options?.intention,
        todoList: options?.todoList,
      }),
      signal: options?.signal,
    });
    const result = (await response.json()) as {
      success?: boolean;
      data?: { sessionId: string; startedAt: string; intention?: string | null; todoList?: Array<{ id: string; text: string; done: boolean }> };
      message?: string;
      error?: string;
    };
    if (response.status === 409 && result?.data) {
      const d = result.data as { sessionId: string; startedAt: string; intention?: string | null; todoList?: Array<{ id: string; text: string; done: boolean }> };
      return {
        sessionId: d.sessionId,
        startedAt: typeof d.startedAt === 'string' ? d.startedAt : new Date(d.startedAt).toISOString(),
        intention: d.intention ?? null,
        todoList: Array.isArray(d.todoList) ? d.todoList : [],
        existing: true,
      };
    }
    if (!response.ok) {
      throw new Error(result?.message || result?.error || `HTTP ${response.status}`);
    }
    const data = result?.data;
    if (!data?.sessionId) {
      throw new Error('Invalid response: missing session data');
    }
    return {
      sessionId: data.sessionId,
      startedAt: typeof data.startedAt === 'string' ? data.startedAt : new Date(data.startedAt).toISOString(),
      intention: data.intention ?? null,
      todoList: Array.isArray(data.todoList) ? data.todoList : [],
    };
  }

  static async updateLockedInSession(sessionId: string, payload: { intention?: string; todoList?: Array<{ id?: string; text: string; done?: boolean }> }): Promise<{ intention: string | null; todoList: Array<{ id: string; text: string; done: boolean }> }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/locked-in/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const result = await this.handleResponse<{ intention: string | null; todoList: Array<{ id: string; text: string; done: boolean }> }>(response);
    return result;
  }

  static async getLockedInDailyStats(date?: string): Promise<{ date: string; liveCount: number; totalToday: number }> {
    const url = date ? `${API_BASE_URL}/api/locked-in/stats?date=${encodeURIComponent(date)}` : `${API_BASE_URL}/api/locked-in/stats`;
    const response = await fetch(url);
    const result = (await response.json()) as { success?: boolean; data?: { date: string; liveCount: number; totalToday: number } };
    if (!response.ok || !result?.data) {
      return { date: date || new Date().toISOString().slice(0, 10), liveCount: 0, totalToday: 0 };
    }
    return result.data;
  }

  static async getLockedInUsage(): Promise<{
    isPremium: boolean;
    weeklyUsed: number;
    weeklyLimit: number;
    remaining: number | null;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/locked-in/usage`);
    return this.handleResponse(response);
  }

  static async endLockedInSession(sessionId: string, payload: { endedAt: string; durationSeconds: number; endReason?: 'user_ended' | 'tab_closed' }): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/locked-in/sessions/${sessionId}/end`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await this.handleResponse(response);
  }

  static async getLockedInSessions(params?: { page?: number; limit?: number }): Promise<{
    sessions: Array<{ _id: string; durationSeconds: number; startedAt: string; endedAt: string; endReason?: string }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page != null) searchParams.append('page', String(params.page));
    if (params?.limit != null) searchParams.append('limit', String(params.limit));
    const qs = searchParams.toString();
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/locked-in/sessions${qs ? `?${qs}` : ''}`);
    const result = await this.handleResponse<{ sessions: any[]; total: number; page: number; limit: number; totalPages: number }>(response);
    return result;
  }

  static async getActiveLockedInSession(): Promise<{
    sessionId: string;
    startedAt: string;
    elapsedSeconds: number | null;
    intention: string | null;
    todoList: Array<{ id: string; text: string; done: boolean }>;
  } | null> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/locked-in/sessions/active`);
    const result = await this.handleResponse<{
      sessionId: string;
      startedAt: string;
      elapsedSeconds?: number | null;
      intention?: string | null;
      todoList?: Array<{ id: string; text: string; done: boolean }>;
    } | null>(response);
    if (!result) return null;
    return {
      ...result,
      elapsedSeconds: typeof result.elapsedSeconds === 'number' ? result.elapsedSeconds : null,
      intention: result.intention ?? null,
      todoList: Array.isArray(result.todoList) ? result.todoList : [],
    };
  }

  /** Call when page is unloading (visibility hidden / beforeunload). Uses keepalive so request can complete after navigation. */
  static endLockedInSessionOnUnload(sessionId: string, durationSeconds: number, endReason: 'user_ended' | 'tab_closed' = 'tab_closed'): void {
    const token = this.getAccessToken();
    if (!token || typeof fetch === 'undefined') return;
    const payload = { endedAt: new Date().toISOString(), durationSeconds, endReason };
    fetch(`${API_BASE_URL}/api/locked-in/sessions/${sessionId}/end`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => { });
  }

  static pauseLockedInSession(sessionId: string, elapsedSeconds: number, options?: { keepalive?: boolean }): void {
    const token = this.getAccessToken();
    if (!token || typeof fetch === 'undefined') return;
    const payload = { elapsedSeconds };
    fetch(`${API_BASE_URL}/api/locked-in/sessions/${sessionId}/pause`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      keepalive: options?.keepalive ?? false,
    }).catch(() => { });
  }
}

export default ApiClient;
