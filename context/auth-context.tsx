import { activityService } from "@/services/api/activity-service";
import { apiClient } from "@/services/api/api-config";
import { deviceService } from "@/services/api/device-service";
import { locationService } from "@/services/api/location-service";
import { sessionService } from "@/services/api/session-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

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
  updateProfile: (data: Partial<UserProfile> & { user_id: number }) => Promise<UserProfile>;
  saveUserLocation: (latitude: number, longitude: number, address?: string) => Promise<void>;
  logActivity: (activityType: string, description?: string, status?: string, metadata?: Record<string, any>) => Promise<void>;
};

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string | null;
  user_type: string | null;
  profile_pic?: string | null;
  nationality?: string | null;
  district?: string | null;
  barangay?: string | null;
  house_number?: string | null;
  house_unit?: string | null;
  street?: string | null;
  address?: string | null;
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

  const getDeviceId = async (): Promise<string> => {
    try {
      const existingDeviceId = await AsyncStorage.getItem("deviceId");
      if (existingDeviceId) {
        return existingDeviceId;
      }
      
      // Generate a new device ID
      const newDeviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem("deviceId", newDeviceId);
      return newDeviceId;
    } catch (error) {
      console.error("Failed to get/generate device ID:", error);
      return `unknown-${Platform.OS}-${Date.now()}`;
    }
  };

  const generateSessionToken = async (): Promise<string> => {
    try {
      const existingToken = await AsyncStorage.getItem("sessionToken");
      if (existingToken) {
        return existingToken;
      }
      
      // Generate a new session token
      const newToken = `session-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
      await AsyncStorage.setItem("sessionToken", newToken);
      return newToken;
    } catch (error) {
      console.error("Failed to get/generate session token:", error);
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
    }
  };

  const registerDevice = async (userId: number): Promise<void> => {
    try {
      const deviceId = await getDeviceId();
      const deviceType = Platform.OS;
      
      await deviceService.registerDevice({
        user_id: userId,
        device_id: deviceId,
        device_type: deviceType,
        device_name: `${Platform.OS} Device`,
      });
      
      console.log("Device registered successfully");
    } catch (error) {
      console.error("Device registration failed:", error);
      // Don't throw error - device registration shouldn't block auth
    }
  };

  const createSession = async (userId: number, sessionToken: string): Promise<void> => {
    try {
      await sessionService.createSession({
        user_id: userId,
        session_token: sessionToken,
        device_type: Platform.OS,
      });
      
      console.log("Session created successfully");
    } catch (error) {
      console.error("Session creation failed:", error);
      // Don't throw error - session creation shouldn't block auth
    }
  };

  const endSession = async (sessionToken: string): Promise<void> => {
    try {
      if (userProfile) {
        await sessionService.endSession(userProfile.id, sessionToken);
        console.log("Session ended successfully");
      }
    } catch (error) {
      console.error("Session termination failed:", error);
      // Don't throw error - session termination shouldn't block auth
    }
  };

  const saveUserLocation = async (latitude: number, longitude: number, address?: string): Promise<void> => {
    try {
      if (userProfile) {
        await locationService.saveLocation({
          user_id: userProfile.id,
          latitude,
          longitude,
          address,
          source: 'gps',
          is_current: 1,
        });
        console.log("Location saved successfully");
      }
    } catch (error) {
      console.error("Location save failed:", error);
      // Don't throw error - location save shouldn't block auth
    }
  };

  const logActivity = async (activityType: string, description?: string, status = 'success', metadata?: Record<string, any>): Promise<void> => {
    try {
      if (userProfile) {
        await activityService.logActivity({
          user_id: userProfile.id,
          activity_type: activityType,
          description,
          status,
          metadata,
        });
        console.log("Activity logged successfully");
      }
    } catch (error) {
      console.error("Activity logging failed:", error);
      // Don't throw error - activity logging shouldn't block auth
    }
  };

  const getApiErrorMessage = (error: unknown): string => {
    if (isAxiosError(error)) {
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
      // Register device when session is activated
      await registerDevice(user.id);
      // Create session when session is activated
      const sessionToken = await generateSessionToken();
      await createSession(user.id, sessionToken);
      // Log login activity
      await logActivity('login', 'User logged in successfully', 'success', { user_id: user.id });
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

        // End session on logout
        try {
          const sessionToken = await AsyncStorage.getItem("sessionToken");
          if (sessionToken) {
            await endSession(sessionToken);
            await AsyncStorage.removeItem("sessionToken");
          }
        } catch (sessionError) {
          console.warn("Session termination failed, continuing sign-out:", sessionError);
        }

        // Deactivate device on logout
        try {
          const deviceId = await getDeviceId();
          if (userProfile) {
            await deviceService.deactivateDevice(userProfile.id, deviceId);
            console.log("Device deactivated successfully");
          }
        } catch (deviceError) {
          console.warn("Device deactivation failed, continuing sign-out:", deviceError);
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
    updateProfile: async (data: Partial<UserProfile> & { user_id: number }) => {
      try {
        const response = await apiClient.post("/auth/update_profile.php", data);
        const updatedUser = response.data.user as UserProfile;
        if (!updatedUser) {
          throw new Error("Profile update succeeded but no user data was returned.");
        }
        setUserProfile(updatedUser);
        await AsyncStorage.setItem("userProfile", JSON.stringify(updatedUser));
        return updatedUser;
      } catch (error) {
        console.error("Profile update failed:", error);
        throw new Error(getApiErrorMessage(error));
      }
    },
    saveUserLocation,
    logActivity,
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
