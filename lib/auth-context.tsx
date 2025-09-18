'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import ApiClient from './api-client';

interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
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

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerOpportunitySeeker: (email: string, password: string) => Promise<void>;
  registerOpportunityPoster: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  upgradeToProvider: (email: string, password: string) => Promise<{ user: any; needsApproval: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const isOnboardingCompleted = profile?.onboardingCompleted || profile?.completionPercentage === 100 || false;

  // Helper function to safely clear user state
  const clearUserState = () => {
    setUser(null);
    setProfile(null);
  };

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up periodic token refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(async () => {
      try {
        if (ApiClient.isAuthenticated()) {
          await ApiClient.getCurrentUser(); // This will trigger token refresh if needed
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, logout user
        await logout();
      }
    }, 60 * 60 * 1000); // Refresh every 60 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

  // Handle page visibility changes to refresh tokens when user returns
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        try {
          if (ApiClient.isAuthenticated()) {
            await ApiClient.getCurrentUser(); // This will trigger token refresh if needed
          }
        } catch (error) {
          console.error('Token refresh on visibility change failed:', error);
          // If refresh fails, logout user
          await logout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated]);

  const initializeAuth = async () => {
    try {
      if (ApiClient.isAuthenticated()) {
        const userData = await ApiClient.getCurrentUser();
        setUser(userData.user);
        setProfile(userData.profile);
      }
    } catch (error: any) {
      console.error('Auth initialization failed:', error);
      
      // Handle rate limiting specifically
      if (error.message?.includes('Too many requests')) {
        console.warn('Rate limited - will retry later');
        // Don't clear tokens for rate limiting, just set loading to false
        setIsLoading(false);
        return;
      }
      
      // Clear invalid tokens and reset state for other errors
      clearUserState();
      await ApiClient.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await ApiClient.login(email, password);
      setUser(response.user);
      
      // Try to get user profile
      try {
        const userData = await ApiClient.getCurrentUser();
        setProfile(userData.profile);
      } catch (profileError) {
        console.warn('Could not fetch user profile:', profileError);
        setProfile(null);
        // Don't throw error for profile fetch failure, login was successful
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Clear any partial state on login failure
      clearUserState();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerOpportunitySeeker = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await ApiClient.registerOpportunitySeeker(email, password);
      setUser(response.user);
      setProfile(null); // New user won't have profile yet
    } catch (error) {
      console.error('Registration failed:', error);
      // Clear any partial state on registration failure
      clearUserState();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerOpportunityPoster = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setIsLoading(true);
      const response = await ApiClient.registerOpportunityPoster(email, password);
      setUser(response.user);
      setProfile(null); // New user won't have profile yet
    } catch (error) {
      console.error('Registration failed:', error);
      // Clear any partial state on registration failure
      clearUserState();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeToProvider = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await ApiClient.upgradeToProvider(email, password);
      setUser(response.user);
      // Keep existing profile data
      return response;
    } catch (error) {
      console.error('Role upgrade failed:', error);
      // Don't clear user data on upgrade failure, just throw error
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await ApiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearUserState();
    }
  };

  const refreshUser = async () => {
    try {
      if (ApiClient.isAuthenticated()) {
        const userData = await ApiClient.getCurrentUser();
        setUser(userData.user);
        setProfile(userData.profile);
      } else {
        // If not authenticated, clear user data
        clearUserState();
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If refresh fails, user might need to login again
      await logout();
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      const updatedProfile = await ApiClient.updateUserProfile(data);
      setProfile(updatedProfile);
      
      // If firstName or lastName are being updated, also update the user object
      if (data.firstName !== undefined || data.lastName !== undefined) {
        setUser(prev => prev ? {
          ...prev,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName
        } : null);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };


  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated,
    isOnboardingCompleted,
    login,
    registerOpportunitySeeker,
    registerOpportunityPoster,
    upgradeToProvider,
    logout,
    refreshUser,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
}

