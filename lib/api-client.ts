const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL|| 'http://localhost:8080';


// Types for API responses
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

interface User {
  _id: string;
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
}

interface UserProfile {
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
      
      // Handle validation errors with more detail
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors.map((err: any) => err.message || err.field).join(', ');
        throw new Error(`${data.message || 'Validation failed'}: ${errorMessages}`);
      }
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }
    
    if (!data.success) {
      // Handle validation errors with more detail
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors.map((err: any) => err.message || err.field).join(', ');
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

  private static async refreshTokenIfNeeded(): Promise<boolean> {
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
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    this.clearTokens();
    return false;
  }

  private static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
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
    const response = await fetch(`${API_BASE_URL}/api/auth/register/opportunity-seeker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName, dateOfBirth }),
    });

    const data = await this.handleResponse<RegisterResponse>(response);
    this.setTokens(data.tokens);
    return data;
  }

  static async registerOpportunityPoster(email: string, password: string, firstName?: string, lastName?: string, dateOfBirth?: string): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register/opportunity-poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName, dateOfBirth }),
    });

    const data = await this.handleResponse<RegisterResponse>(response);
    this.setTokens(data.tokens);
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

    const response = await fetch(`${API_BASE_URL}/api/opportunities?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getOpportunityById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/opportunities/${id}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/events?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getEventById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/jobs?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getJobById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/resources?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getResourceById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/resources/${id}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Engagement Methods
  static async saveOpportunity(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/api/engagement/opportunities/${id}/save`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async unsaveOpportunity(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/api/engagement/opportunities/${id}/unsave`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async likeOpportunity(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/api/engagement/opportunities/${id}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async unlikeOpportunity(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/api/engagement/opportunities/${id}/unlike`, {
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

    const response = await fetch(`${API_BASE_URL}/api/engagement/opportunities/saved?${searchParams}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/engagement/opportunities/liked?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  // Similar methods for events, jobs, and resources...
  static async saveEvent(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/api/engagement/events/${id}/save`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  static async likeEvent(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/api/engagement/events/${id}/like`, {
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

    const response = await fetch(`${API_BASE_URL}/api/recommended/opportunities?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getRecommendedEvents(limit?: number): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (limit) {
      searchParams.append('limit', limit.toString());
    }

    const response = await fetch(`${API_BASE_URL}/api/recommended/events?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getRecommendedJobs(limit?: number): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (limit) {
      searchParams.append('limit', limit.toString());
    }

    const response = await fetch(`${API_BASE_URL}/api/recommended/jobs?${searchParams}`, {
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getRecommendedResources(limit?: number): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (limit) {
      searchParams.append('limit', limit.toString());
    }

    const response = await fetch(`${API_BASE_URL}/api/recommended/resources?${searchParams}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/recommended/unified?${searchParams}`, {
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

    const response = await fetch(`${API_BASE_URL}/api/recommended/scoring-breakdown?${searchParams}`, {
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
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/engagement/${type}/${id}/status`);
    return this.handleResponse(response);
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

  // Search Methods
  static async searchContent(query: string, filters?: {
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
      // Build search parameters
      const searchParams = new URLSearchParams();
      searchParams.append('search', query);
      searchParams.append('limit', '20'); // Limit results per type
      
      // Add filters
      if (filters?.location) {
        searchParams.append('location', filters.location);
      }

      // Search all content types in parallel
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
    userStats: Record<string, number>;
  }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/admin/stats`);
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

  static async approveContent(contentId: string, contentType: string): Promise<void> {
    const endpoint = this.getContentEndpoint(contentType, contentId, 'approve');
    console.log('Approving content:', { contentId, contentType, endpoint });
    const response = await this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
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
        applicationCount: item.metrics?.applicationCount || 0,
        registrationCount: item.metrics?.registrationCount || 0
      }
    };

    return normalized;
  }

  // Fetch poster information for content items
  static async getPosterInfo(providerId: string): Promise<any> {
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
  static async upgradeToProvider(email: string, password: string): Promise<{ user: any; needsApproval: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register/opportunity-poster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse(response);
  }

  // Provider Onboarding Methods
  static async getProviderOnboarding(): Promise<{ onboarding: any }> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/provider-onboarding`, {
      method: 'GET',
    });
    return this.handleResponse(response);
  }

  static async updateProviderOnboarding(data: any): Promise<void> {
    const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/api/provider-onboarding`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
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
}

export default ApiClient;
