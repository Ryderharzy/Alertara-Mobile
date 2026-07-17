import { apiClient } from "@/services/api/api-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";

type SignUpData = {
  name: string;
  email: string;
  password: string;
  phone: string;
  nationality: string;
  district: string;
  barangay: string;
  house_unit: string;
  street: string;
};

type AuthContextType = {
  isLoading: boolean;
  userToken: string | null;
  userProfile: UserProfile | null;
  onboardingCompleted: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signUp: (data: SignUpData) => Promise<UserProfile>;
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
          AsyncStorage.getItem("userToken"),
          AsyncStorage.getItem("onboardingCompleted"),
          AsyncStorage.getItem("userProfile"),
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
        if (onboarded === "true") {
          setOnboardingCompleted(true);
        }
      } catch (e) {
        console.error("Failed to restore token:", e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const getApiErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const data = error.response.data as
          | {
              message?: string;
              errors?: Record<string, string[]>;
            }
          | string
          | undefined;

        if (typeof data === "object" && data !== null) {
          const firstError = data.errors
            ? Object.values(data.errors).flat()[0]
            : undefined;
          if (firstError) {
            return firstError;
          }
          if (data.message) {
            return data.message;
          }
        }

        switch (error.response.status) {
          case 401:
            return "Invalid email or password.";
          case 422:
            return "Please check your login details and try again.";
          case 503:
            return "Service unavailable. Please try again later.";
          default:
            return `Server error (${error.response.status}). Please try again.`;
        }
      }

      if (error.code === "ECONNABORTED") {
        return "Request timeout. Please try again.";
      }

      return "Network error. Please check your connection.";
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "An unexpected error occurred. Please try again.";
  };

  const authContext = {
    isLoading,
    userToken,
    userProfile,
    onboardingCompleted,
    signIn: async (email: string, password: string) => {
      try {
        const response = await apiClient.post("/auth/login.php", {
          email,
          password,
        });

        const signedInUser = response.data.user as UserProfile;
        if (!signedInUser) {
          throw new Error("Login succeeded but no user data was returned.");
        }
        return signedInUser;
      } catch (error) {
        console.error("Login failed:", error);
        throw new Error(getApiErrorMessage(error));
      }
    },
    signUp: async (data: SignUpData) => {
      try {
        const response = await apiClient.post("/auth/register.php", {
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          nationality: data.nationality,
          district: data.district,
          barangay: data.barangay,
          house_unit: data.house_unit,
          street: data.street,
        });

        const createdUser = response.data.user as UserProfile;
        if (!createdUser) {
          throw new Error("Signup succeeded but no user data was returned.");
        }
        return createdUser;
      } catch (error) {
        console.error("Signup failed:", error);
        throw new Error(getApiErrorMessage(error));
      }
    },
    activateSession: async (user: UserProfile) => {
      setUserProfile(user);
      await AsyncStorage.setItem("userProfile", JSON.stringify(user));
    },
    signOut: async () => {
      try {
        try {
          await apiClient.post("/auth/logout.php");
        } catch (logoutError) {
          console.warn(
            "Logout API call failed, continuing local sign-out:",
            logoutError,
          );
        }

        setUserToken(null);
        setUserProfile(null);
        await AsyncStorage.removeItem("userToken");
        await AsyncStorage.removeItem("userProfile");
      } catch (error) {
        console.error("Logout failed:", error);
        throw error;
      }
    },
    completeOnboarding: async () => {
      try {
        setOnboardingCompleted(true);
        await AsyncStorage.setItem("onboardingCompleted", "true");
      } catch (error) {
        console.error("Failed to save onboarding state:", error);
        throw error;
      }
    },
  };

  return (
    <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
