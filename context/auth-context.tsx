import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiClient } from '@/services/api/api-config';

type AuthContextType = {
  isLoading: boolean;
  userToken: string | null;
  userProfile: UserProfile | null;
  onboardingCompleted: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signUp: (name: string, email: string, password: string, phone: string) => Promise<UserProfile>;
  activateSession: (user: UserProfile) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string | null;
  user_type: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const [token, onboarded, profile] = await Promise.all([
          AsyncStorage.getItem('userToken'),
          AsyncStorage.getItem('onboardingCompleted'),
          AsyncStorage.getItem('userProfile'),
        ]);

        // Only set token if it exists after the clear
        if (token) {
          setUserToken(token);
        }

        if (profile) {
          setUserProfile(JSON.parse(profile) as UserProfile);
        } else {
          setUserProfile(null);
        }

        // Only set onboarding completed if it was saved (should be null due to above clear)
        if (onboarded === 'true') {
          setOnboardingCompleted(true);
        }
      } catch (e) {
        console.error('Failed to restore token:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = {
    isLoading,
    userToken,
    userProfile,
    onboardingCompleted,
    signIn: async (email: string, password: string) => {
      try {
        const response = await apiClient.post('/login', {
          email,
          password,
        });

        const signedInUser = response.data.user as UserProfile;
        return signedInUser;
      } catch (error) {
        console.error('Login failed:', error);
        if (error instanceof Error && error.message) {
          throw new Error(error.message);
        }
        if (axios.isAxiosError(error) && error.response?.status === 422) {
          const data = error.response.data as {
            message?: string;
            errors?: Record<string, string[]>;
          };

          const firstError =
            data.errors ? Object.values(data.errors).flat()[0] : undefined;
          throw new Error(firstError ?? data.message ?? 'Validation failed.');
        }
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          throw new Error('Invalid email or password.');
        }
        throw error;
      }
    },
    signUp: async (name: string, email: string, password: string, phone: string) => {
      try {
        const response = await apiClient.post('/register', {
          name,
          email,
          password,
          phone,
        });

        const createdUser = response.data.user as UserProfile;
        return createdUser;
      } catch (error) {
        console.error('Signup failed:', error);
        if (error instanceof Error && error.message) {
          throw new Error(error.message);
        }
        if (axios.isAxiosError(error) && error.response?.status === 422) {
          const data = error.response.data as {
            message?: string;
            errors?: Record<string, string[]>;
          };

          const firstError =
            data.errors ? Object.values(data.errors).flat()[0] : undefined;
          throw new Error(firstError ?? data.message ?? 'Validation failed.');
        }
        throw error;
      }
    },
    activateSession: async (user: UserProfile) => {
      setUserProfile(user);
      await AsyncStorage.setItem('userProfile', JSON.stringify(user));
    },
    signOut: async () => {
      try {
        try {
          await apiClient.post('/logout');
        } catch (logoutError) {
          console.warn(
            'Logout API call failed, continuing local sign-out:',
            logoutError
          );
        }

        setUserToken(null);
        setUserProfile(null);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userProfile');
      } catch (error) {
        console.error('Logout failed:', error);
        throw error;
      }
    },
    completeOnboarding: async () => {
      try {
        setOnboardingCompleted(true);
        await AsyncStorage.setItem('onboardingCompleted', 'true');
      } catch (error) {
        console.error('Failed to save onboarding state:', error);
        throw error;
      }
    },
  };

  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
