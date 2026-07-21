import { useAuth } from "@/context/auth-context";
import { userPreferenceService } from "@/services/api/user-preference-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type LanguageOption = "en" | "es" | "fr" | "tl" | "ceb" | "war" | "hil";
export type AlertPreference = "all" | "critical" | "none";

type PreferencesContextType = {
  isLoading: boolean;
  language: LanguageOption;
  alertPreferences: {
    crimes: boolean;
    emergencies: boolean;
    communityAlerts: boolean;
    weather: boolean;
    traffic: boolean;
    health: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  incidentHistory: {
    calls: number;
    reports: number;
    lastCall?: string;
    lastReport?: string;
  };
  setLanguage: (lang: LanguageOption) => Promise<void>;
  updateAlertPreferences: (
    prefs: Partial<PreferencesContextType["alertPreferences"]>,
  ) => Promise<void>;
  updateIncidentHistory: (
    history: Partial<PreferencesContextType["incidentHistory"]>,
  ) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);

export const PreferencesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguageState] = useState<LanguageOption>("en");
  const [alertPreferences, setAlertPreferencesState] = useState({
    crimes: true,
    emergencies: true,
    communityAlerts: true,
    weather: true,
    traffic: true,
    health: true,
    email: false,
    sms: false,
    push: true,
  });
  const [incidentHistory, setIncidentHistoryState] = useState({
    calls: 0,
    reports: 0,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [lang, alerts, history] = await Promise.all([
          AsyncStorage.getItem("language"),
          AsyncStorage.getItem("alertPreferences"),
          AsyncStorage.getItem("incidentHistory"),
        ]);

        if (lang) setLanguageState(lang as LanguageOption);
        if (alerts) setAlertPreferencesState(JSON.parse(alerts));
        if (history) setIncidentHistoryState(JSON.parse(history));
      } catch (e) {
        console.error("Failed to load preferences:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const preferencesContext: PreferencesContextType = {
    isLoading,
    language,
    alertPreferences,
    incidentHistory,
    setLanguage: async (lang: LanguageOption) => {
      try {
        setLanguageState(lang);
        await AsyncStorage.setItem("language", lang);

        // Sync to backend if user is logged in
        if (userProfile?.id) {
          try {
            await userPreferenceService.savePreferences({
              user_id: userProfile.id,
              preferred_language: lang,
              sms_notifications: alertPreferences.sms,
              email_notifications: alertPreferences.email,
              push_notifications: alertPreferences.push,
              alert_categories: JSON.stringify({
                crimes: alertPreferences.crimes,
                emergencies: alertPreferences.emergencies,
                community: alertPreferences.communityAlerts,
                weather: alertPreferences.weather,
                traffic: alertPreferences.traffic,
                health: alertPreferences.health,
              }),
            });
          } catch (backendError) {
            console.error("Failed to sync language to backend:", backendError);
            // Don't throw error - local storage update succeeded
          }
        }
      } catch (error) {
        console.error("Failed to set language:", error);
        throw error;
      }
    },
    updateAlertPreferences: async (
      prefs: Partial<PreferencesContextType["alertPreferences"]>,
    ) => {
      try {
        const updated = { ...alertPreferences, ...prefs };
        setAlertPreferencesState(updated);
        await AsyncStorage.setItem("alertPreferences", JSON.stringify(updated));

        // Sync to backend if user is logged in
        if (userProfile?.id) {
          try {
            await userPreferenceService.savePreferences({
              user_id: userProfile.id,
              preferred_language: language,
              sms_notifications: updated.sms,
              email_notifications: updated.email,
              push_notifications: updated.push,
              alert_categories: JSON.stringify({
                crimes: updated.crimes,
                emergencies: updated.emergencies,
                community: updated.communityAlerts,
                weather: updated.weather,
                traffic: updated.traffic,
                health: updated.health,
              }),
            });
          } catch (backendError) {
            console.error("Failed to sync alert preferences to backend:", backendError);
            // Don't throw error - local storage update succeeded
          }
        }
      } catch (error) {
        console.error("Failed to update alert preferences:", error);
        throw error;
      }
    },
    updateIncidentHistory: async (
      history: Partial<PreferencesContextType["incidentHistory"]>,
    ) => {
      try {
        const updated = { ...incidentHistory, ...history };
        setIncidentHistoryState(updated);
        await AsyncStorage.setItem("incidentHistory", JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to update incident history:", error);
        throw error;
      }
    },
  };

  return (
    <PreferencesContext.Provider value={preferencesContext}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
};
