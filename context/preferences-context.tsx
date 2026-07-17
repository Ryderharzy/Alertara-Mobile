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
    email: boolean;
    sms: boolean;
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
    email: false,
    sms: false,
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
              language: lang,
              alert_crimes: alertPreferences.crimes,
              alert_emergencies: alertPreferences.emergencies,
              alert_community: alertPreferences.communityAlerts,
              notification_email: alertPreferences.email,
              notification_sms: alertPreferences.sms,
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
              language: language,
              alert_crimes: updated.crimes,
              alert_emergencies: updated.emergencies,
              alert_community: updated.communityAlerts,
              notification_email: updated.email,
              notification_sms: updated.sms,
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
