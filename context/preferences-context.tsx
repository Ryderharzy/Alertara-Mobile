import i18n from "@/services/i18n";
import { useAuth } from "@/context/auth-context";
import { userPreferenceService } from "@/services/api/user-preference-service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type LanguageOption = "en" | "fil" | "tl";
export type NotificationLanguageOption = "en" | "tl" | "fil" | "both";
export type AlertPreference = "all" | "critical" | "none";

type PreferencesContextType = {
  isLoading: boolean;
  language: LanguageOption;
  notificationLanguage: NotificationLanguageOption;
  alertPreferences: {
    crimes: boolean;
    emergencies: boolean;
    communityAlerts: boolean;
    weather: boolean;
    traffic: boolean;
    health: boolean;
    seismic: boolean;
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
  setNotificationLanguage: (lang: NotificationLanguageOption) => Promise<void>;
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
  const [notificationLanguage, setNotificationLanguageState] = useState<NotificationLanguageOption>("en");
  const [alertPreferences, setAlertPreferencesState] = useState({
    crimes: true,
    emergencies: true,
    communityAlerts: true,
    weather: true,
    traffic: true,
    health: true,
    seismic: true,
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
        const [lang, notificationLang, alerts, history] = await Promise.all([
          AsyncStorage.getItem("language"),
          AsyncStorage.getItem("notificationLanguage"),
          AsyncStorage.getItem("alertPreferences"),
          AsyncStorage.getItem("incidentHistory"),
        ]);

        if (lang === "en" || lang === "fil" || lang === "tl") {
          const norm = (lang === "fil" || lang === "tl") ? "fil" : "en";
          setLanguageState(norm);
          i18n.changeLanguage(norm);
        } else if (lang) {
          await AsyncStorage.setItem("language", "en");
          setLanguageState("en");
          i18n.changeLanguage("en");
        } else {
          // Sync default detected i18n language
          const initialLang = i18n.language === "fil" ? "fil" : "en";
          setLanguageState(initialLang);
        }

        if (notificationLang === "en" || notificationLang === "tl" || notificationLang === "fil" || notificationLang === "both") {
          setNotificationLanguageState(notificationLang);
        } else if (notificationLang) {
          await AsyncStorage.setItem("notificationLanguage", "en");
          setNotificationLanguageState("en");
        }
        if (alerts) setAlertPreferencesState(JSON.parse(alerts));
        if (history) setIncidentHistoryState(JSON.parse(history));

        if (userProfile?.id && !lang) {
          try {
            const response = await userPreferenceService.getPreferences(userProfile.id);
            const remoteLang = (response?.data as any)?.language_preference || (response?.data as any)?.preferred_language;
            if (remoteLang === "en" || remoteLang === "fil" || remoteLang === "tl") {
              const normLang = (remoteLang === "fil" || remoteLang === "tl") ? "fil" : "en";
              setLanguageState(normLang);
              i18n.changeLanguage(normLang);
              await AsyncStorage.setItem("language", normLang);
            }
            const remoteNotificationLang = response?.data?.notification_language;
            if (remoteNotificationLang === "en" || remoteNotificationLang === "tl" || remoteNotificationLang === "fil" || remoteNotificationLang === "both") {
              setNotificationLanguageState(remoteNotificationLang);
              await AsyncStorage.setItem("notificationLanguage", remoteNotificationLang);
            }
          } catch (backendError) {
            console.error("Failed to load notification language from backend:", backendError);
          }
        }
      } catch (e) {
        console.error("Failed to load preferences:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [userProfile?.id]);

  const preferencesContext: PreferencesContextType = {
    isLoading,
    language,
    notificationLanguage,
    alertPreferences,
    incidentHistory,
    setLanguage: async (lang: LanguageOption) => {
      try {
        const normLang = (lang === "fil" || lang === "tl") ? "fil" : "en";
        setLanguageState(normLang);
        setNotificationLanguageState(normLang);
        i18n.changeLanguage(normLang);

        await AsyncStorage.setItem("language", normLang);
        await AsyncStorage.setItem("notificationLanguage", normLang);

        // Sync language_preference to backend asynchronously
        const targetBackendLang = normLang === "fil" ? "fil" : "en";
        userPreferenceService.saveLanguagePreference(targetBackendLang, userProfile?.id).catch(err => {
          console.warn("Offline or backend sync failed for language:", err);
        });

        if (userProfile?.id) {
          try {
            await userPreferenceService.savePreferences({
              user_id: userProfile.id,
              language_preference: targetBackendLang,
              preferred_language: targetBackendLang,
              notification_language: targetBackendLang,
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
                seismic: alertPreferences.seismic,
              }),
            });
          } catch (backendError) {
            console.error("Failed to sync language to backend:", backendError);
          }
        }
      } catch (error) {
        console.error("Failed to set language:", error);
        throw error;
      }
    },
    setNotificationLanguage: async (lang: NotificationLanguageOption) => {
      try {
        setNotificationLanguageState(lang);
        await AsyncStorage.setItem("notificationLanguage", lang);

        if (userProfile?.id) {
          try {
            await userPreferenceService.savePreferences({
              user_id: userProfile.id,
              preferred_language: language,
              notification_language: lang,
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
                seismic: alertPreferences.seismic,
              }),
            });
          } catch (backendError) {
            console.error("Failed to sync notification language to backend:", backendError);
          }
        }
      } catch (error) {
        console.error("Failed to set notification language:", error);
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
              notification_language: notificationLanguage,
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
                seismic: updated.seismic,
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



