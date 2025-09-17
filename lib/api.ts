const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://latest-glowup-channel-761979347865.europe-west1.run.app'  // Update with your production URL
  : 'http://localhost:3001';

interface OnboardingData {
  location?: {
    country: string;
    province: string;
    city?: string;
  };
  interests?: string[];
  industry?: string[];
  education?: {
    education_level?: string;
    field_of_study?: string;
    institution?: string;
  };
  career?: {
    career_stage?: string;
  };
  skills?: string[];
  aspirations?: string[];
}

interface UserProfile {
  id: string;
  user_id: string;
  location_data: any;
  interests: string[];
  industry: string[];
  education_level: string;
  field_of_study: string;
  institution: string;
  career_stage: string;
  skills: string[];
  aspirations: string[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export class ApiClient {
  
  static async saveOnboardingData(userId: string, data: OnboardingData): Promise<UserProfile> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save onboarding data');
      }

      return result.data;
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      throw error;
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get user profile');
      }

      return result.data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  static async getRecommendations(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations/${userId}`);
      const result = await response.json();

      if (!result.success) {
        return []; // Return empty array if recommendations fail
      }

      return result.data || [];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  static async searchContent(query: string, filters?: { type?: string; location?: string; industry?: string[] }): Promise<any[]> {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.location && { location: filters.location }),
        ...(filters?.industry && { industry: filters.industry.join(',') }),
      });

      const response = await fetch(`${API_BASE_URL}/api/search?${searchParams}`);
      const result = await response.json();

      return result.data || [];
    } catch (error) {
      console.error('Error searching content:', error);
      return [];
    }
  }
} 