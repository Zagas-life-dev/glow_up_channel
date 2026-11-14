const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

import { getOrCreateAnonId, clearAnonId } from '@/lib/anon-id';
import { takeSignupPlaylist } from '@/lib/playlist-attribution';
import { viewerGeoHeaders } from '@/lib/geo/viewer-geo';

/** Listing kinds that carry public engagement metrics. */
export type FeedMetricItemType = 'opportunity' | 'job' | 'event' | 'resource';

/** The public engagement counts shown on a card or detail page. */
export interface ContentMetrics {
  viewCount: number;
  likeCount: number;
  saveCount: number;
  playlistAddCount: number;
  shareCount: number;
  clickCount: number;
}


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
  onboarding?: {
    country?: string;
    /** ISO code. The backend normalises free-text country input to this on save
     *  (see transformOnboardingData); the type simply never declared it. */
    countryCode?: string;
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

/** Founder Batch tier state for the signed-in user. */
export interface FounderBatchStatus {
  role: string | null;
  /** True only while an unexpired term is held. */
  isFounder: boolean;
  /** True for founders and admins alike — the practical "can I post?" answer. */
  canPublish: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | null;
  priceNgn: number;
  termMonths: number;
  postLimit: number;
}

/** Per-collection counts of items moved into the `past_*` collections. */
export interface PastContentCleanupCounts {
  opportunities: number;
  events: number;
  jobs: number;
}

/** Result of a past-content cleanup run, split by source collection. */
export interface PastContentCleanupResult {
  live: PastContentCleanupCounts;
  inactive: PastContentCleanupCounts;
  /** Documents carrying no usable date — these can never expire and need data fixes. */
  skippedNoDate?: number;
  /** Documents the sweep could not move; see `errors`. */
  failed?: number;
  errors?: string[];
  runAt?: string;
}

export type ListingKind = 'opportunity' | 'event' | 'job' | 'resource';

/** Why two listings look alike: >50% shared title or description words, or shared tags on a borderline pair. */
export type DuplicateReason = 'title' | 'description' | 'tags';

/** One listing as the duplicate check describes it. */
export interface ListingDuplicate {
  _id: string;
  type: ListingKind;
  title: string;
  state: 'live' | 'pending' | 'hidden';
  country: string | null;
  city: string | null;
  organization: string | null;
  link: string | null;
  locationGroupId: string | null;
  createdAt: string | null;
  /** What it shares with the listing it was compared to. Absent on a group's first (oldest) listing. */
  reasons?: DuplicateReason[];
}

/** A listing and the newer ones of its type and country that look like it, oldest first. */
export interface DuplicateGroup {
  id: string;
  type: ListingKind;
  key: string;
  normalizedTitle: string;
  countryKey: string;
  title: string;
  country: string | null;
  reasons: DuplicateReason[];
  liveCount: number;
  items: ListingDuplicate[];
}

/** Approving would put a second, similar listing live in this country. */
export class DuplicateListingError extends Error {
  constructor(message: string, readonly duplicates: ListingDuplicate[]) {
    super(message);
    this.name = 'DuplicateListingError';
  }
}

// API Client Class
export class ApiClient {
  private static getAuthHeaders(): HeadersInit {
    const token = this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      // Coarse reader place (country/state/city) for location analytics on
      // views, clicks and applications. See lib/geo/viewer-geo.ts.
      ...viewerGeoHeaders(),
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

  /**
   * Message shown when a write is attempted with no connection. Exported shape
   * is a plain Error, so every existing `catch` that surfaces `error.message`
   * displays it without changes.
   */
  static readonly OFFLINE_WRITE_MESSAGE =
    "You're offline. You can keep reading saved listings, but changes can't be saved until you reconnect.";

  /**
   * Offline is read-only, and this is where that is enforced.
   *
   * The UI hides write controls when the connection drops (see
   * hooks/use-online-status.ts), but that is presentation and it only covers the
   * surfaces someone remembered to gate. This covers all of them: nothing is
   * queued for replay, so a write with no connection can only fail, and failing
   * here produces a sentence a user can act on instead of "Failed to fetch"
   * from somewhere deep in a form handler.
   *
   * Reads are deliberately left alone — the service worker answers those from
   * cache, which is the entire point of the offline mode.
   */
  private static assertWritableOffline(method?: string): void {
    const verb = (method || 'GET').toUpperCase();
    if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return;
    if (typeof navigator === 'undefined' || navigator.onLine) return;
    throw new Error(ApiClient.OFFLINE_WRITE_MESSAGE);
  }

  public static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    this.assertWritableOffline(options.method);
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
   * Authenticated multipart request.
   *
   * `getAuthHeaders` forces `Content-Type: application/json`, which destroys the
   * multipart boundary the browser must set for a FormData body — so this sends
   * only Authorization and lets fetch fill in the content type, while keeping
   * the 401-refresh-retry that makeAuthenticatedRequest provides.
   */
  public static async makeAuthenticatedFormRequest(
    url: string,
    method: 'POST' | 'PUT' | 'PATCH',
    formData: FormData,
  ): Promise<Response> {
    this.assertWritableOffline(method);
    const doFetch = () => {
      const headers: Record<string, string> = {};
      const token = this.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      return fetch(url, { method, headers, body: formData });
    };

    let response = await doFetch();
    if (response.status === 401) {
      const refreshed = await this.refreshTokenIfNeeded();
      if (refreshed) response = await doFetch();
    }
    return response;
  }

  // Authentication Methods
  static async login(email: string, password: string): Promise<LoginResponse> {
    // Raw fetch, so the read-only rule is restated rather than inherited.
    this.assertWritableOffline('POST');
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
    // Raw fetch, so the read-only rule is restated rather than inherited.
    this.assertWritableOffline('POST');
    const body: Record<string, unknown> = { email, password, firstName, lastName, dateOfBirth };
    if (typeof window !== 'undefined') {
      body.anonId = getOrCreateAnonId();
      // Creators Program: the public playlist that brought this visitor, if any.
      const sourcePlaylist = takeSignupPlaylist();
      if (sourcePlaylist) body.signupSourcePlaylistId = sourcePlaylist;
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/register/opportunity-seeker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Sends the signed device cookie, so this signup and an earlier anonymous view
      // of the same playlist count as one viewer.
      credentials: 'include',
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
      this.clearOfflineCaches();
    }
  }

  /**
   * Drop the service worker's cached pages and listing data on sign-out.
   *
   * Only endpoints that return identical bytes to every caller are ever cached
   * (see PUBLIC_API in public/sw.js), so nothing user-specific is sitting there
   * to leak. This is here so that stays true by construction on a shared device
   * rather than by anyone remembering to re-check that list.
   */
  private static clearOfflineCaches(): void {
    if (typeof navigator === 'undefined') return;
    navigator.serviceWorker?.controller?.postMessage('up-clear-caches');
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

  /**
   * Create a resource from an uploaded file (PDF / Word / PowerPoint).
   * Sends multipart/form-data; the file field must be named "file".
   * `fields` contains the text metadata (title, description, category, tags, etc.).
   */
  static async createResourceWithFile(file: File, fields: Record<string, any>): Promise<any> {
    // Multipart uploads bypass makeAuthenticatedRequest, so the read-only rule
    // has to be restated here rather than inherited.
    this.assertWritableOffline('POST');
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      // Arrays (e.g. tags) are serialized as JSON; the backend parses them.
      formData.append(key, Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
    formData.append('file', file);

    // Send with only an Authorization header. We deliberately bypass
    // makeAuthenticatedRequest/getAuthHeaders here because they force
    // Content-Type: application/json, which would break the multipart boundary
    // the browser needs to set for FormData.
    const url = `${API_BASE_URL}/api/resources`;
    const doFetch = () => {
      const headers: Record<string, string> = {};
      const t = this.getAccessToken();
      if (t) headers.Authorization = `Bearer ${t}`;
      return fetch(url, { method: 'POST', headers, body: formData });
    };

    let response = await doFetch();
    if (response.status === 401) {
      const refreshed = await this.refreshTokenIfNeeded();
      if (refreshed) response = await doFetch();
    }

    return this.handleResponse(response);
  }

  /**
   * Update a resource, replacing its uploaded file (PDF / Word / PowerPoint).
   * Sends multipart/form-data; the file field must be named "file".
   */
  static async updateResourceWithFile(id: string, file: File, fields: Record<string, any>): Promise<any> {
    // Multipart uploads bypass makeAuthenticatedRequest, so the read-only rule
    // has to be restated here rather than inherited.
    this.assertWritableOffline('POST');
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
    formData.append('file', file);

    const url = `${API_BASE_URL}/api/resources/${id}`;
    const doFetch = () => {
      const headers: Record<string, string> = {};
      const t = this.getAccessToken();
      if (t) headers.Authorization = `Bearer ${t}`;
      return fetch(url, { method: 'PUT', headers, body: formData });
    };

    let response = await doFetch();
    if (response.status === 401) {
      const refreshed = await this.refreshTokenIfNeeded();
      if (refreshed) response = await doFetch();
    }

    return this.handleResponse(response);
  }

  /**
   * Fetch an uploaded resource's PDF content through the authenticated backend proxy.
   * Returns a Blob suitable for the in-app PDF viewer. The Cloudinary URL is never exposed.
   */
  static async getResourceContentBlob(id: string): Promise<Blob> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources/${id}/content`);
    if (!response.ok) {
      throw new Error(`Failed to load resource content (HTTP ${response.status})`);
    }
    return response.blob();
  }

  /** Get the current user's saved reading progress for a resource (or null). */
  static async getResourceProgress(id: string): Promise<{ page: number; pageCount: number | null; updatedAt: string } | null> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources/${id}/progress`);
    const data = await this.handleResponse<{ progress: any }>(response);
    return data?.progress ?? null;
  }

  /** Save the current user's reading progress for a resource. */
  static async saveResourceProgress(id: string, page: number, pageCount?: number | null): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ page, ...(pageCount != null && { pageCount }) }),
    });
    await this.handleResponse(response);
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

  static async getEventById(id: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/events/${id}`, {
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

  static async getResourceById(id: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/resources/${id}`, {
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
   * Report an engagement to the public metrics endpoints.
   *
   * These are beacons: they never throw, never block a UI action, and are safe to call
   * signed out — the server identifies the viewer by an HttpOnly cookie it sets itself,
   * which is why `credentials: 'include'` is required here.
   *
   * `X-View-Source: client` marks this as a real browser event. The server drops
   * anything without it so server renders, prefetches and crawlers cannot inflate counts.
   *
   * Returns whether the event was newly counted, so callers can bump their optimistic
   * number only when the server actually accepted it. A repeat within the same day
   * returns false, which is a normal outcome and not an error.
   */
  private static async _sendMetricBeacon(
    itemType: FeedMetricItemType,
    contentId: string,
    action: 'view' | 'share',
    source?: string
  ): Promise<boolean> {
    if (!contentId) return false;
    try {
      const token = this.getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/api/metrics/${itemType}/${contentId}/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-View-Source': 'client',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(getOrCreateAnonId() ? { 'X-Anon-Id': getOrCreateAnonId() } : {}),
            ...viewerGeoHeaders(),
          },
          body: JSON.stringify({ source: source ?? null }),
        }
      );
      if (!response.ok) return false;
      const result = await response.json();
      return Boolean(result?.data?.counted);
    } catch {
      // A metric is never worth surfacing an error for.
      return false;
    }
  }

  /**
   * Record that a human viewed this listing.
   *
   * Deduplicated server-side to one view per viewer per day, so this is safe to call on
   * every open — including from signed-out visitors, who used to be invisible to the
   * view count entirely.
   *
   * Resolves to true only when the view was newly counted.
   */
  static async recordFeedContentView(
    itemType: FeedMetricItemType,
    contentId: string,
    source: string = 'feed'
  ): Promise<boolean> {
    const counted = await this._sendMetricBeacon(itemType, contentId, 'view', source);
    // Feed the recommender separately. Signed-out users have nothing to learn against,
    // and a failure here must not affect the public count.
    if (this.isAuthenticated()) {
      this.trackEngagement(itemType, contentId, 'view').catch(() => {});
    }
    return counted;
  }

  /**
   * Record a completed share — native share sheet, copy link, or the in-app composer.
   * Deduplicated per viewer per day. Resolves to true when newly counted.
   */
  static async recordFeedShare(
    itemType: FeedMetricItemType,
    contentId: string,
    source: string = 'feed'
  ): Promise<boolean> {
    const counted = await this._sendMetricBeacon(itemType, contentId, 'share', source);
    if (this.isAuthenticated()) {
      this.trackEngagement(itemType, contentId, 'share').catch(() => {});
    }
    return counted;
  }

  /**
   * Record add-to-playlist.
   *
   * Unlike views and shares there is no beacon for this: `metrics.playlistAddCount` is
   * derived from playlist membership by the backend when the item is actually added or
   * removed, so it is already correct by the time the playlist call returns. This only
   * feeds the recommender.
   */
  static async recordFeedPlaylistAdd(
    itemType: FeedMetricItemType,
    contentId: string
  ): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      await this.trackEngagement(itemType, contentId, 'playlist_add');
    } catch {
      // Recommendation learning is best-effort.
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

  /**
   * Change the signed-in user's password. The backend endpoint has always existed at
   * POST /api/users/change-password; the settings form simply never called it.
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<{ message?: string }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/users/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await this.handleResponse<{ message?: string; tokens?: AuthTokens }>(response);
    // A password change signs out every other device (the backend bumps the token
    // version), and hands this one a fresh pair so it stays signed in.
    if (result?.tokens?.accessToken && result.tokens.refreshToken) this.setTokens(result.tokens);
    return result;
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

  /**
   * Daily active users, visitors, and new signups over a window, oldest day first. Backed by the
   * `platform_daily_stats` rollup, so this returns real history rather than just today.
   */
  static async getDailyStats(days: number = 30): Promise<{
    series: { date: string; activeUsers: number; visitors: number; signups: number }[];
    range: { start: string; end: string; days: number };
    totals: {
      activeUsers: number;
      visitors: number;
      signups: number;
      peakActiveUsers: number;
      peakVisitors: number;
      peakSignups: number;
    };
  }> {
    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/admin/stats/daily?days=${days}`
    );
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
    collection: 'all' | 'opportunities' | 'events' | 'jobs',
    options?: {
      limit?: number;
      skip?: number;
      reason?: string;
      pastStatus?: 'expired' | 'moved';
      /** Server-side search over title, description, reason and organisation. */
      q?: string;
      /** The previous page's `nextCursor`, for infinite scroll. */
      before?: string;
    }
  ): Promise<{
    /** Each post carries `collection`, the archive it came from. */
    posts: any[];
    /** Counted on the first page only; null when `before` is set. */
    total: number | null;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const searchParams = new URLSearchParams();
    if (options?.limit) searchParams.append('limit', options.limit.toString());
    if (options?.skip) searchParams.append('skip', options.skip.toString());
    if (options?.reason) searchParams.append('reason', options.reason);
    if (options?.pastStatus) searchParams.append('pastStatus', options.pastStatus);
    if (options?.q) searchParams.append('q', options.q);
    if (options?.before) searchParams.append('before', options.before);

    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/admin/past-posts/${collection}?${searchParams.toString()}`
    );
    return this.handleResponse(response);
  }

  /**
   * Move a past post back into the collection it came from, with new dates.
   *
   * The dates are mandatory and the server enforces the rules in
   * `lib/listings/restore-dates.ts`: it refuses a restore whose governing date is
   * unchanged or already behind us, because the nightly cleanup sweep would archive the
   * post again on its next run. A rejection arrives as a thrown Error carrying that
   * message, so the dialog can show the admin exactly which date to fix.
   *
   * `dates` keys are per type — applicationDeadline/startDate/endDate for opportunities,
   * startDate/endDate/registrationDeadline for events, applicationDeadline/startDate for
   * jobs. Omit a key to keep the archived value; send null to clear it.
   */
  static async restorePastPost(
    collection: 'opportunities' | 'events' | 'jobs',
    postId: string,
    input: {
      dates: Record<string, string | null>;
      /**
       * Whitelisted edits. The link fields are the full set a listing detail page
       * consults — `url` outranks the rest, and jobs read nothing else — so a restore can
       * correct whichever one actually reaches readers. See lib/listings/listing-links.ts.
       */
      updates?: {
        title?: string;
        description?: string;
        url?: string;
        applicationLink?: string;
        application_link?: string;
        registrationLink?: string;
        eventLink?: string;
        externalUrl?: string;
        externalLink?: string;
      };
      note?: string;
    }
  ): Promise<{
    restoredId: string;
    restoredTo: string;
    isLive: boolean;
    expiryDate: string;
    expiryField: string;
    previousExpiryDate: string | null;
    changedDateFields: string[];
    updatedFields: string[];
  }> {
    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/admin/past-posts/restore/${collection}/${postId}`,
      { method: 'POST', body: JSON.stringify(input) }
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
    search?: string;
    /** Rows the caller already holds; takes precedence over `page` server-side. */
    offset?: number;
  }): Promise<{
    content: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    counts?: { live: number; pending: number; hidden: number };
  }> {
    try {
      // Use the proper admin endpoint that returns ALL content regardless of approval status
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.search && { search: filters.search }),
        ...(filters?.offset !== undefined && { offset: filters.offset.toString() })
      });

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/admin/content/moderation?${queryParams.toString()}`
      );

      return this.handleResponse(response);

    } catch (error) {
      console.error('Error fetching content for moderation:', error);
      // Keep the server's reason (expired session, access denied) instead of a generic line.
      throw error instanceof Error ? error : new Error('Failed to fetch content for moderation');
    }
  }

  /**
   * Trigger past-content cleanup (expired events, opportunities, jobs from live + inactive).
   *
   * Resolves with the move counts only. `handleResponse` strips the
   * `{ success, message, data }` envelope and throws when `success` is false, so
   * reaching the caller already means the run succeeded — do not re-check `success`
   * on the result (it isn't there).
   */
  static async triggerPastContentCleanup(): Promise<PastContentCleanupResult> {
    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/cleanup/past-content`,
      { method: 'POST' }
    );
    const result = await this.handleResponse<Partial<PastContentCleanupResult>>(response);
    // A response without `data` falls through handleResponse as the bare envelope,
    // so treat a missing breakdown as "nothing moved" instead of reading undefined.
    const none = { opportunities: 0, events: 0, jobs: 0 };
    return {
      live: result?.live ?? none,
      inactive: result?.inactive ?? none,
      skippedNoDate: result?.skippedNoDate,
      failed: result?.failed,
      errors: result?.errors,
      runAt: result?.runAt,
    };
  }

  /**
   * Throws `DuplicateListingError` when a similar live listing already exists in
   * this country; resend with `allowDuplicate: true` once the admin confirms.
   */
  static async approveContent(
    contentId: string,
    contentType: string,
    options?: { bypassPayment?: boolean; allowDuplicate?: boolean },
  ): Promise<void> {
    const endpoint = this.getContentEndpoint(contentType, contentId, 'approve');
    const response = await this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: options ? JSON.stringify(options) : undefined,
    });
    if (response.status === 409) {
      const body = await response.clone().json().catch(() => null);
      if (body?.error === 'DUPLICATE_LISTING') {
        throw new DuplicateListingError(body.message, body.data?.duplicates ?? []);
      }
    }
    return this.handleResponse(response);
  }

  /** Admin: every group of similar same-type, same-country listings. */
  static async getDuplicateGroups(type?: ListingKind): Promise<{
    groups: DuplicateGroup[];
    counts: Record<'all' | ListingKind, number>;
  }> {
    const qs = type ? `?type=${type}` : '';
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/duplicates${qs}`);
    return this.handleResponse(response);
  }

  /** Admin: mark a group as not duplicates. It re-opens if another listing joins it. */
  static async dismissDuplicateGroup(group: Pick<DuplicateGroup, 'type' | 'key'> & { ids: string[] }): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/duplicates/dismiss`, {
      method: 'POST',
      body: JSON.stringify(group),
    });
    return this.handleResponse(response);
  }

  /**
   * Listings in this country that look like the draft: similar title,
   * description, or tags on a borderline pair. Posters get live ones only;
   * admins also get pending and hidden ones.
   */
  static async checkDuplicateTitle(params: {
    type: ListingKind;
    title: string;
    description?: string;
    canonicalTags?: string[];
    country?: string;
    countryCode?: string;
    isRemote?: boolean;
    excludeId?: string;
  }, signal?: AbortSignal): Promise<{ matches: ListingDuplicate[]; total: number }> {
    // POST: the description is too long for a query string.
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/duplicates/check`, {
      method: 'POST',
      body: JSON.stringify(params),
      signal,
    });
    return this.handleResponse(response);
  }

  /** Admin: which of these listings look like others, keyed by listing id. Listings with none are absent. */
  static async getDuplicatesForListings(
    items: { id: string; type: ListingKind }[],
  ): Promise<{ matches: Record<string, ListingDuplicate[]> }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/duplicates/for-listings`, {
      method: 'POST',
      body: JSON.stringify({ items }),
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
      isPaid?: boolean
      paymentAmount?: number | null
      paymentNotes?: string | null
      price?: number | null
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

  /** Provider wallet: get balance (NGN). */
  // Founder Batch: paid tier granting publishing rights for a fixed term.

  /** Current Founder Batch state for the signed-in user. */
  static async getFounderBatchStatus(): Promise<FounderBatchStatus> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/founder-batch/status`);
    return this.handleResponse<FounderBatchStatus>(response);
  }

  /**
   * Start a Founder Batch purchase. Resolves with the Paystack URL to redirect to;
   * the term is only granted after {@link verifyFounderBatch} confirms the payment.
   */
  static async initializeFounderBatch(callbackUrl?: string): Promise<{
    authorizationUrl: string;
    reference: string;
    amountNgn: number;
    termMonths: number;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/founder-batch/initialize`, {
      method: 'POST',
      body: JSON.stringify({ callbackUrl }),
    });
    return this.handleResponse(response);
  }

  /** Verify a Paystack reference and activate the term. Safe to call twice. */
  static async verifyFounderBatch(reference: string): Promise<{
    role: string;
    startedAt?: string;
    expiresAt?: string;
    alreadyApplied?: boolean;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/founder-batch/verify`, {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
    return this.handleResponse(response);
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

  /**
   * Record an extreme announcement delivery event.
   *
   * Separate from `recordPromotionClick` on purpose. That endpoint answers
   * "was this a billable interaction with promoted content?" and carries the
   * per-click accounting with it; this one only counts what the extreme tier's
   * announcement channels delivered. Sharing a counter would file popup
   * dismissals alongside feed clicks and make both numbers useless.
   *
   * Returns quietly on any failure — every caller is a fire-and-forget side
   * effect next to something the reader actually asked for.
   */
  static async recordAnnouncementEvent(
    promotionId: string,
    event: 'popup_impression' | 'popup_dismiss' | 'popup_click' | 'announcement_click',
  ): Promise<void> {
    try {
      await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/promoted/announcements/${promotionId}/event`,
        { method: 'POST', body: JSON.stringify({ event }) },
      );
    } catch {
      // Analytics must never surface to the reader.
    }
  }

  /**
   * Start a promotion at no cost. Providers are never billed for promotion, so
   * there is no payment step, no redirect and no budget — just a duration.
   */
  /**
   * Upload a hero image for a promotion.
   *
   * Returns the hosted URL to pass as `heroImageUrl` when starting the
   * promotion. Separate from the start call because the upload is multipart and
   * the start is JSON, and because an image chosen but never confirmed should
   * not start a campaign.
   *
   * The listing has to be named here even though nothing is written to it yet:
   * the endpoint checks the caller owns it before accepting the file, and
   * rejects the upload outright without these two fields.
   */
  static async uploadPromotionHeroImage(params: {
    file: File;
    contentId: string;
    contentType: 'opportunity' | 'event' | 'job' | 'resource';
  }): Promise<string> {
    // Multipart uploads bypass makeAuthenticatedRequest, so the read-only rule
    // has to be restated here rather than inherited.
    this.assertWritableOffline('POST');
    const formData = new FormData();
    // Text parts go in ahead of the file so they are already parsed by the time
    // multer hands the stream to storage, rather than arriving after it.
    formData.append('contentId', params.contentId);
    formData.append('contentType', params.contentType);
    formData.append('heroImage', params.file);

    const url = `${API_BASE_URL}/api/promotions/upload-hero-image`;
    const doFetch = () => {
      const headers: Record<string, string> = {};
      const t = this.getAccessToken();
      if (t) headers.Authorization = `Bearer ${t}`;
      // No Content-Type: the browser sets the multipart boundary itself.
      return fetch(url, { method: 'POST', headers, body: formData });
    };

    let response = await doFetch();
    if (response.status === 401) {
      const refreshed = await this.refreshTokenIfNeeded();
      if (refreshed) response = await doFetch();
    }

    const json = await this.handleResponse(response) as any;
    const heroImageUrl = json?.data?.heroImageUrl ?? json?.heroImageUrl;
    if (!heroImageUrl) throw new Error(json?.message || 'Failed to upload image');
    return heroImageUrl as string;
  }

  static async startFreePromotion(params: {
    contentId: string;
    contentType: 'opportunity' | 'event' | 'job' | 'resource';
    durationDays: number;
    /** Hosted URL from uploadPromotionHeroImage. Applied to the listing for the
     *  run of the promotion and cleared again when it expires. */
    heroImageUrl?: string | null;
    /**
     * Tier. Omitted for an ordinary promotion.
     *
     * 'extreme' honours `durationDays` like any other run, with a floor of 3
     * rather than 7. It used to ignore it and fix the run at 21 days, because
     * the announcement schedule was a set of offsets into that window; the
     * schedule is now drawn from the campaign's own span, and the number of
     * announcements scales with it, so the length is the caller's to choose.
     */
    packageType?: 'extreme';
  }): Promise<{ promotion: any; duration: number }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/promotions/start-free`, {
      method: 'POST',
      body: JSON.stringify({
        contentId: params.contentId,
        contentType: params.contentType,
        durationDays: params.durationDays,
        ...(params.heroImageUrl && { heroImageUrl: params.heroImageUrl }),
        ...(params.packageType && { packageType: params.packageType }),
      }),
    });
    const json = await this.handleResponse(response) as ApiResponse<{ promotion: any; duration?: number }>;
    const data = (json as any)?.data ?? json;
    if (!data?.promotion) throw new Error((json as any)?.message || 'Failed to start promotion');
    return { promotion: data.promotion, duration: data.duration ?? params.durationDays };
  }

  /**
   * Change how long a running promotion lasts.
   *
   * `durationDays` is measured from the campaign's original start, so 30 means
   * thirty days of campaign rather than thirty more from today. Trimming below
   * what has already elapsed ends it — the response says so with `ended`.
   */
  static async updatePromotionDuration(
    promotionId: string,
    durationDays: number,
  ): Promise<{ duration: number; endDate: string; ended: boolean; remainingDays: number }> {
    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/promotions/${promotionId}/duration`,
      { method: 'PATCH', body: JSON.stringify({ durationDays }) },
    );
    const json = await this.handleResponse(response) as ApiResponse<{
      duration: number; endDate: string; ended: boolean; remainingDays: number;
    }>;
    const data = (json as any)?.data;
    if (!data) throw new Error((json as any)?.message || 'Failed to update the promotion');
    return data;
  }

  /** Stop a running promotion. The record is kept; only delivery stops. */
  static async cancelPromotion(promotionId: string): Promise<void> {
    const response = await this.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/promotions/${promotionId}`,
      { method: 'DELETE' },
    );
    await this.handleResponse(response);
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
    // Raw fetch, so the read-only rule is restated rather than inherited.
    this.assertWritableOffline('POST');
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    return this.handleResponse(response);
  }

  static async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    // Raw fetch, so the read-only rule is restated rather than inherited.
    this.assertWritableOffline('POST');
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

}

export default ApiClient;
