import { Header } from "@/components/header";
import {
    SettingsDivider,
    SettingsMenuItem,
    SettingsSection,
    SettingsSelect,
    SettingsToggle,
} from "@/components/settings-components";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
    Colors,
    DARK_CARD_BG,
    LIGHT_CARD_BG,
    TealColors,
} from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { LanguageOption, usePreferences } from "@/context/preferences-context";
import { useTheme } from "@/context/theme-context";
import { getTranslation } from "@/data/emergency-translations";
import { useTranslate } from "@/hooks/useTranslate";
import { EMERGENCY_ALERT_CHANNEL_ID, notificationChannelForSound } from "@/constants/notification-channels";
import { playAlertaraActionSound } from "@/services/sound/action-sounds";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import * as IntentLauncher from "expo-intent-launcher";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    InteractionManager,
    LayoutAnimation,
    Linking,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    UIManager,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

const NOTIFICATION_PREF_KEYS = {
  sound: "alertara.notification.soundEnabled",
  popOnScreen: "alertara.notification.popOnScreen",
  lockScreen: "alertara.notification.lockScreen",
  vibration: "alertara.notification.vibration",
  soundChoice: "alertara.notification.soundChoice",
} as const;

type EmergencyNotificationPrefs = {
  soundEnabled: boolean;
  popOnScreen: boolean;
  lockScreen: boolean;
  vibration: boolean;
  soundChoice: string;
};
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
export default function MeScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();
  const { userProfile, signOut, updateProfile } = useAuth();
  const { scrollTo } = useGlobalSearchParams<{ scrollTo?: string }>();
  const scrollTarget = Array.isArray(scrollTo) ? scrollTo[0] : scrollTo;
  const scrollRef = useRef<ScrollView>(null);
  const languageAnchorY = useRef<number | null>(null);
  const languageAnchorRef = useRef<View>(null);
  const didAutoScroll = useRef(false);
  const scrollRetryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    language,
    setLanguage,
    alertPreferences,
    updateAlertPreferences,
    incidentHistory,
    updateIncidentHistory,
  } = usePreferences();
  const { t } = useTranslate();

  const [changePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyType, setPolicyType] = useState<"privacy" | "terms">("privacy");
  const [logoutSuccessVisible, setLogoutSuccessVisible] = useState(false);
  const logoutScale = useRef(new Animated.Value(0.7)).current;
  const logoutOpacity = useRef(new Animated.Value(0)).current;
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [alertCategoriesExpanded, setAlertCategoriesExpanded] = useState(false);
  const [notificationChannelsExpanded, setNotificationChannelsExpanded] = useState(false);
  const [notificationPermissionLabel, setNotificationPermissionLabel] = useState("Checking...");
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [notificationPopOnScreen, setNotificationPopOnScreen] = useState(true);
  const [notificationLockScreen, setNotificationLockScreen] = useState(true);
  const [notificationVibration, setNotificationVibration] = useState(true);
  const [notificationSoundChoice, setNotificationSoundChoice] = useState("default");
  const animateSettingsDropdown = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 240,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, []);
  const isLoggedIn = Boolean(userProfile?.id);
  const displayName = userProfile?.name ?? "Guest Mode";
  const displayEmail = userProfile?.email ?? "No account connected";
  const displayPhone = userProfile?.phone ?? "Phone not set";

  const languageLabels: Record<string, string> = {
    en: t("language.english", "English"),
    fil: t("language.tagalog", "Filipino"),
    tl: t("language.tagalog", "Filipino"),
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(getTranslation("all_clear", language as any), getTranslation("please_remain_calm", language as any));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(getTranslation("all_clear", language as any), getTranslation("please_remain_calm", language as any));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(getTranslation("all_clear", language as any), getTranslation("please_remain_calm", language as any));
      return;
    }

    // TODO: Make API call to change password
    Alert.alert(getTranslation("all_clear", language as any), getTranslation("help_is_on_the_way", language as any));
    setChangePasswordModalVisible(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        onPress: async () => {
          try {
            await signOut();
            setLogoutSuccessVisible(true);
            Animated.parallel([
              Animated.timing(logoutOpacity, {
                toValue: 1,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.spring(logoutScale, {
                toValue: 1,
                friction: 7,
                tension: 70,
                useNativeDriver: true,
              }),
            ]).start();

            setTimeout(() => {
              setLogoutSuccessVisible(false);
              router.replace("/(auth)/login");
            }, 1200);
          } catch {
            Alert.alert("Error", "Failed to log out. Please try again.");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const handleEditProfile = () => {
    setEditName(userProfile?.name || "");
    setEditEmail(userProfile?.email || "");
    setEditPhone(userProfile?.phone || "");
    setEditProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!userProfile?.id) return;
    
    if (!editName || !editEmail) {
      Alert.alert("Error", "Name and email are required");
      return;
    }

    try {
      await updateProfile({
        user_id: userProfile.id,
        name: editName,
        email: editEmail,
        phone: editPhone || null,
      });
      setEditProfileModalVisible(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const handleRegister = () => {
    router.push("/(auth)/signup");
  };

  const handleLogin = () => {
    router.push("/(auth)/login");
  };

  const handleLanguageSelect = (value: string) => {
    const langValue = value as LanguageOption;
    if (langValue === language) return;
    const label = languageLabels[langValue] ?? langValue.toUpperCase();

    Alert.alert(
      t("settings.language.confirmTitle", "Change language?"),
      t(
        "settings.language.confirmMessage",
        "Switch app language to {language}? The app will reload text instantly.",
      ).replace("{language}", label),
      [
        { text: t("action.cancel", "Cancel"), style: "cancel" },
        {
          text: t("action.change", "Change"),
          onPress: async () => {
            try {
              await setLanguage(langValue);
              Alert.alert(t("settings.language.updated", "Language updated"));
            } catch {
              Alert.alert(
                t(
                  "settings.language.updateError",
                  "Could not change language. Please try again.",
                ),
              );
            }
          },
        },
      ],
    );
  };

  const handleViewHistory = () => {
    if (!isLoggedIn) {
      Alert.alert("Login Required", "Please log in to view your history.");
      return;
    }
    router.push("/history" as any);
  };
  const applyEmergencyNotificationChannel = useCallback(async (prefs: EmergencyNotificationPrefs) => {
    if (Platform.OS !== "android") return;

    await Notifications.setNotificationChannelAsync(notificationChannelForSound(prefs.soundChoice), {
      name: "Emergency Alerts",
      description: "Critical Alertara alerts, reports, and emergency updates.",
      importance: prefs.popOnScreen
        ? Notifications.AndroidImportance.MAX
        : Notifications.AndroidImportance.DEFAULT,
      sound: prefs.soundEnabled && prefs.soundChoice !== "silent" ? "default" : null,
      enableVibrate: prefs.vibration,
      vibrationPattern: prefs.vibration ? [0, 350, 160, 350] : [0],
      lockscreenVisibility: prefs.lockScreen
        ? Notifications.AndroidNotificationVisibility.PUBLIC
        : Notifications.AndroidNotificationVisibility.PRIVATE,
      bypassDnd: false,
      showBadge: true,
      lightColor: "#E63946",
    });
  }, []);

  const refreshNotificationPermissionLabel = useCallback(async () => {
    const permissions = await Notifications.getPermissionsAsync();
    setNotificationPermissionLabel(
      permissions.granted || permissions.status === "granted" ? "Allowed" : "Needs permission",
    );
  }, []);

  const loadEmergencyNotificationSettings = useCallback(async () => {
    const [sound, popOnScreen, lockScreen, vibration, soundChoice] = await Promise.all([
      AsyncStorage.getItem(NOTIFICATION_PREF_KEYS.sound),
      AsyncStorage.getItem(NOTIFICATION_PREF_KEYS.popOnScreen),
      AsyncStorage.getItem(NOTIFICATION_PREF_KEYS.lockScreen),
      AsyncStorage.getItem(NOTIFICATION_PREF_KEYS.vibration),
      AsyncStorage.getItem(NOTIFICATION_PREF_KEYS.soundChoice),
    ]);

    const prefs = {
      soundEnabled: sound !== "false",
      popOnScreen: popOnScreen !== "false",
      lockScreen: lockScreen !== "false",
      vibration: vibration !== "false",
      soundChoice: soundChoice || "default",
    };

    setNotificationSoundEnabled(prefs.soundEnabled);
    setNotificationPopOnScreen(prefs.popOnScreen);
    setNotificationLockScreen(prefs.lockScreen);
    setNotificationVibration(prefs.vibration);
    setNotificationSoundChoice(prefs.soundChoice);
    await refreshNotificationPermissionLabel();
    await applyEmergencyNotificationChannel(prefs);
  }, [applyEmergencyNotificationChannel, refreshNotificationPermissionLabel]);

  const saveEmergencyNotificationSettings = useCallback(
    async (updates: Partial<EmergencyNotificationPrefs>) => {
      const prefs = {
        soundEnabled: notificationSoundEnabled,
        popOnScreen: notificationPopOnScreen,
        lockScreen: notificationLockScreen,
        vibration: notificationVibration,
        soundChoice: notificationSoundChoice,
        ...updates,
      };

      setNotificationSoundEnabled(prefs.soundEnabled);
      setNotificationPopOnScreen(prefs.popOnScreen);
      setNotificationLockScreen(prefs.lockScreen);
      setNotificationVibration(prefs.vibration);
      setNotificationSoundChoice(prefs.soundChoice);

      await Promise.all([
        AsyncStorage.setItem(NOTIFICATION_PREF_KEYS.sound, String(prefs.soundEnabled)),
        AsyncStorage.setItem(NOTIFICATION_PREF_KEYS.popOnScreen, String(prefs.popOnScreen)),
        AsyncStorage.setItem(NOTIFICATION_PREF_KEYS.lockScreen, String(prefs.lockScreen)),
        AsyncStorage.setItem(NOTIFICATION_PREF_KEYS.vibration, String(prefs.vibration)),
        AsyncStorage.setItem(NOTIFICATION_PREF_KEYS.soundChoice, prefs.soundChoice),
      ]);

      await applyEmergencyNotificationChannel(prefs);
    },
    [
      applyEmergencyNotificationChannel,
      notificationLockScreen,
      notificationPopOnScreen,
      notificationSoundChoice,
      notificationSoundEnabled,
      notificationVibration,
    ],
  );

  const requestEmergencyNotificationPermission = async () => {
    const result = await Notifications.requestPermissionsAsync();
    await refreshNotificationPermissionLabel();

    if (!result.granted && result.status !== "granted") {
      Alert.alert(
        "Notifications blocked",
        "Open phone settings and allow Alertara notifications so emergency alerts can show banners, sounds, vibration, and lock-screen alerts.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => void openEmergencyNotificationChannelSettings() },
        ],
      );
      return;
    }

    Alert.alert("Notifications enabled", "Emergency alerts are ready on this device.");
  };

  const openEmergencyNotificationChannelSettings = async () => {
    if (Platform.OS === "android") {
      try {
        await IntentLauncher.startActivityAsync("android.settings.CHANNEL_NOTIFICATION_SETTINGS", {
          extra: {
            "android.provider.extra.APP_PACKAGE": "com.alertara.mobile",
            "android.provider.extra.CHANNEL_ID": notificationChannelForSound(notificationSoundChoice),
          },
        });
        return;
      } catch {
        await Linking.openSettings();
        return;
      }
    }
    await Linking.openSettings();
  };

  const notificationSoundDisplay = notificationSoundEnabled
    ? notificationSoundChoice === "silent"
      ? "Silent"
      : "Alertara Emergency Sound"
    : "Silent";

  const openEmergencyNotificationSettings = () => {
    Alert.alert(
      "Emergency alert settings",
      "For custom sounds, pop-on-screen banners, lock-screen visibility, and vibration, use the phone notification settings for the Emergency Alerts channel. Android controls custom sounds from the system channel settings.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void openEmergencyNotificationChannelSettings() },
      ],
    );
  };


  useEffect(() => {
    loadEmergencyNotificationSettings();
  }, [loadEmergencyNotificationSettings]);

  useEffect(() => {
    // If the route param changes, allow auto-scroll again.
    didAutoScroll.current = false;
    if (scrollRetryTimeout.current) {
      clearTimeout(scrollRetryTimeout.current);
      scrollRetryTimeout.current = null;
    }
  }, [scrollTarget]);

  const maybeScrollToLanguage = useCallback(() => {
    if (didAutoScroll.current) return;
    if (scrollTarget !== "language") return;
    // Prefer a direct measure against the ScrollView to avoid layout-y mismatch.
    const anchor = languageAnchorRef.current;
    const scroller = scrollRef.current;
    if (!anchor || !scroller) return;

    const attemptScroll = (triesLeft: number) => {
      if (didAutoScroll.current) return;
      if (scrollTarget !== "language") return;
      const a = languageAnchorRef.current;
      const s = scrollRef.current;
      if (!a || !s) {
        if (triesLeft <= 0) return;
        scrollRetryTimeout.current = setTimeout(
          () => attemptScroll(triesLeft - 1),
          90,
        );
        return;
      }

      a.measureLayout(
         
        s as any,
        (_x, y) => {
          didAutoScroll.current = true;
          // Direct jump: show the Preferences section immediately.
          // Extra offset so the "PREFERENCES" section header is clearly visible.
          s.scrollTo({ y: Math.max(y - 48, 0), animated: false });
        },
        () => {
          if (triesLeft <= 0) return;
          scrollRetryTimeout.current = setTimeout(
            () => attemptScroll(triesLeft - 1),
            90,
          );
        },
      );
    };

    // Wait for navigation + layout to settle; then retry a few times if needed.
    InteractionManager.runAfterInteractions(() => attemptScroll(10));
  }, [scrollTarget]);

  useFocusEffect(
    useCallback(() => {
      // If we're already laid out, scroll immediately on focus.
      maybeScrollToLanguage();
      return () => {};
    }, [maybeScrollToLanguage]),
  );

  useEffect(() => {
    // Fallback: when coming from another screen, focus+layout timing can vary.
    // This ensures we still scroll even if the first attempt was too early.
    maybeScrollToLanguage();
  }, [maybeScrollToLanguage]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
    >
      <Header />
      <ScrollView
        ref={scrollRef}
        style={[
          styles.content,
          {
            backgroundColor: isDarkMode
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Section */}
        <View style={styles.userInfoContainer}>
          <View
            style={[
              styles.userAvatar,
              {
              backgroundColor: TealColors.primary,
              },
            ]}
          >
            <IconSymbol
              size={40}
              name={isLoggedIn ? "person.fill" : "person"}
              color="#fff"
            />
          </View>
          <View style={styles.userTextContainer}>
            <ThemedText style={styles.userName}>
              {displayName}
            </ThemedText>
            <ThemedText style={styles.userEmail}>
              {isLoggedIn
                ? displayEmail
                : t("profile.createAccount")}
            </ThemedText>
            <ThemedText style={styles.userPhone}>
              {isLoggedIn ? displayPhone : t("profile.noAccount")}
            </ThemedText>
          </View>
        </View>

        {!isLoggedIn && (
          <View style={styles.authPromptCard}>
            <ThemedText style={styles.authPromptTitle}>{t("profile.createOrSignIn")}</ThemedText>
            <ThemedText style={styles.authPromptText}>
              {t("profile.registerDesc")}
            </ThemedText>
            <View style={styles.authActionRow}>
              <Pressable style={styles.primaryAuthButton} onPress={handleRegister}>
                <ThemedText style={styles.primaryAuthButtonText}>
                  {t("profile.register")}
                </ThemedText>
              </Pressable>
              <Pressable style={styles.secondaryAuthButton} onPress={handleLogin}>
                <ThemedText style={styles.secondaryAuthButtonText}>
                  {t("profile.login")}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {isLoggedIn && (
          <View style={styles.authPromptCard}>
            <ThemedText style={styles.authPromptTitle}>{t("profile.accountDetails")}</ThemedText>
            <ThemedText style={styles.authPromptText}>
              {t("profile.accountLinked")}
            </ThemedText>
            <Pressable style={styles.secondaryAuthButton} onPress={handleLogout}>
              <ThemedText style={styles.secondaryAuthButtonText}>
                {t("profile.logout")}
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Account Settings */}
        <SettingsSection title={t("settings.accountSettings", "ACCOUNT SETTINGS")}>
          <SettingsMenuItem
            label={t("settings.editProfile", "Edit Profile")}
            icon="pencil"
            onPress={handleEditProfile}
          />
          <SettingsDivider />
          <SettingsMenuItem
            label={t("settings.emailAddress", "Email Address")}
            value={displayEmail}
            icon="mail"
            onPress={() =>
              Alert.alert(
                getTranslation("stay_informed", language as any),
                getTranslation("help_is_on_the_way", language as any),
              )
            }
          />
          <SettingsDivider />
          <SettingsMenuItem
            label={t("settings.phoneNumber", "Phone Number")}
            value={displayPhone}
            icon="phone"
            onPress={() =>
              Alert.alert(
                getTranslation("stay_informed", language as any),
                getTranslation("help_is_on_the_way", language as any),
              )
            }
          />
        </SettingsSection>

        {/* Alert Preferences */}
        <SettingsSection title={t("settings.alertPreferences", "ALERT PREFERENCES")}>
          <SettingsMenuItem
            label={t("settings.alertCategories", "Alert Categories")}
            icon="list.bullet"
            onPress={() => { animateSettingsDropdown(); setAlertCategoriesExpanded(!alertCategoriesExpanded); }}
            showChevron={true}
            expanded={alertCategoriesExpanded}
          />
          
          {alertCategoriesExpanded && (
            <>
              <SettingsToggle
                label={t("settings.crimes", "Crime Alerts")}
                description={t("settings.crimesDesc", "Get notified of crime incidents nearby")}
                value={alertPreferences.crimes}
                onValueChange={(value) => updateAlertPreferences({ crimes: value })}
                icon="exclamationmark.triangle"
              />
              <SettingsDivider />
              <SettingsToggle
                label={t("settings.emergencies", "Emergency Alerts")}
                description={t("settings.emergenciesDesc", "High priority emergency notifications")}
                value={alertPreferences.emergencies}
                onValueChange={(value) =>
                  updateAlertPreferences({ emergencies: value })
                }
                icon="bell"
              />
              <SettingsDivider />
              <SettingsToggle
                label={t("settings.communityAlerts", "Community Alerts")}
                description={t("settings.communityAlertsDesc", "Community-shared alerts and updates")}
                value={alertPreferences.communityAlerts}
                onValueChange={(value) =>
                  updateAlertPreferences({ communityAlerts: value })
                }
                icon="person.2"
              />
              <SettingsDivider />
              <SettingsToggle
                label={t("settings.weatherAlerts", "Weather Alerts")}
                description={t("settings.weatherAlertsDesc", "Weather forecasts and warnings")}
                value={alertPreferences.weather}
                onValueChange={(value) =>
                  updateAlertPreferences({ weather: value })
                }
                icon="cloud"
              />
              <SettingsDivider />
              <SettingsToggle
                label={t("settings.seismicAlerts", "Earthquake Alerts")}
                description={t("settings.seismicAlertsDesc", "PHIVOLCS earthquake bulletins and seismic advisories")}
                value={alertPreferences.seismic}
                onValueChange={(value) =>
                  updateAlertPreferences({ seismic: value })
                }
                icon="waveform.path.ecg"
              />
              <SettingsDivider />
              <SettingsToggle
                label={t("settings.trafficAlerts", "Traffic Alerts")}
                description={t("settings.trafficAlertsDesc", "Traffic updates and road closures")}
                value={alertPreferences.traffic}
                onValueChange={(value) =>
                  updateAlertPreferences({ traffic: value })
                }
                icon="car"
              />
              <SettingsDivider />
              <SettingsToggle
                label={t("settings.healthAlerts", "Health Alerts")}
                description={t("settings.healthAlertsDesc", "Health advisories and medical updates")}
                value={alertPreferences.health}
                onValueChange={(value) =>
                  updateAlertPreferences({ health: value })
                }
                icon="heart"
              />
            </>
          )}
          
          <SettingsDivider />
          
          <SettingsMenuItem
            label={t("settings.notificationChannels", "Notification Channels")}
            icon="antenna.radiowaves.left.and.right"
            onPress={() => { animateSettingsDropdown(); setNotificationChannelsExpanded(!notificationChannelsExpanded); }}
            showChevron={true}
            expanded={notificationChannelsExpanded}
          />
          
          {notificationChannelsExpanded && (
            <>
              <SettingsToggle
                label={t("settings.pushNotifications", "Push Notifications")}
                description={t("settings.pushNotificationsDesc", "Receive alerts via app notifications")}
                value={alertPreferences.push}
                onValueChange={(value) => updateAlertPreferences({ push: value })}
                icon="iphone"
              />
              <SettingsDivider />
              <SettingsToggle
                label={t("settings.emailNotifications", "Email Notifications")}
                description={t("settings.emailNotificationsDesc", "Receive alerts via email")}
                value={alertPreferences.email}
                onValueChange={(value) => updateAlertPreferences({ email: value })}
                icon="mail"
              />
              <SettingsDivider />
              <SettingsToggle
                label={t("settings.smsNotifications", "SMS Notifications")}
                description={t("settings.smsNotificationsDesc", "Receive alerts via SMS")}
                value={alertPreferences.sms}
                onValueChange={(value) => updateAlertPreferences({ sms: value })}
                icon="message"
              />
            </>
          )}

          <SettingsDivider />
          <SettingsMenuItem
            label={t("settings.notificationPermission", "Notification Permission")}
            value={notificationPermissionLabel}
            icon="bell"
            onPress={requestEmergencyNotificationPermission}
          />
          <SettingsDivider />
          <SettingsToggle
            label={t("settings.sound", "Sound")}
            description={t("settings.soundDesc", "Play a sound when an emergency alert arrives")}
            value={notificationSoundEnabled}
            onValueChange={(value) =>
              saveEmergencyNotificationSettings({
                soundEnabled: value,
                soundChoice: value ? "default" : "silent",
              })
            }
            icon="bell.fill"
          />
          <SettingsDivider />
          <SettingsToggle
            label={t("settings.banner", "Pop on Screen / Banner")}
            description={t("settings.bannerDesc", "Use high-priority alert banners for emergency notifications")}
            value={notificationPopOnScreen}
            onValueChange={(value) => saveEmergencyNotificationSettings({ popOnScreen: value })}
            icon="exclamationmark.triangle"
          />
          <SettingsDivider />
          <SettingsToggle
            label={t("settings.lockScreen", "Lock Screen")}
            description={t("settings.lockScreenDesc", "Allow emergency alerts to appear on the lock screen")}
            value={notificationLockScreen}
            onValueChange={(value) => saveEmergencyNotificationSettings({ lockScreen: value })}
            icon="lock"
          />
          <SettingsDivider />
          <SettingsToggle
            label={t("settings.vibration", "Vibration")}
            description={t("settings.vibrationDesc", "Vibrate when high-priority alerts arrive")}
            value={notificationVibration}
            onValueChange={(value) => saveEmergencyNotificationSettings({ vibration: value })}
            icon="phone"
          />
          <SettingsDivider />
          <SettingsMenuItem
            label={t("settings.alertSound", "Alert Sound")}
            value={notificationSoundDisplay}
            icon="bell"
            onPress={openEmergencyNotificationSettings}
          />
          <SettingsDivider />
          <SettingsMenuItem
            label={t("settings.inAppSound", "In-App Sound")}
            value="Preview app action tone"
            icon="speaker.wave.2"
            onPress={() => playAlertaraActionSound("reportSend")}
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title={t("settings.preferences", "PREFERENCES")}>
          <View
            ref={languageAnchorRef}
            onLayout={(e) => {
              languageAnchorY.current = e.nativeEvent.layout.y;
              maybeScrollToLanguage();
            }}
          >
            <SettingsSelect
              label={t("settings.language.label", "Language")}
              description={t(
                "settings.language.description",
                "Choose your preferred language",
              )}
              value={language}
              icon="globe"
              options={[
                { label: "English", value: "en" },
                { label: "Filipino (Tagalog)", value: "fil" },
              ]}
              onSelect={handleLanguageSelect}
            />
          </View>
          <SettingsDivider />
          <SettingsToggle
            label={t("settings.darkTheme", "Dark Theme")}
            description={
              isDarkMode ? "Currently enabled" : "Currently disabled"
            }
            value={isDarkMode}
            onValueChange={toggleTheme}
            icon="moon"
          />
        </SettingsSection>

        {/* Incident History */}
        <SettingsSection title={t("settings.activity", "ACTIVITY")}>
          <SettingsMenuItem
            label={t("settings.totalCalls", "Total Emergency Calls")}
            value={incidentHistory.calls.toString()}
            icon="phone"
            showChevron={false}
            onPress={() => {}}
          />
          <SettingsDivider />
          <SettingsMenuItem
            label={t("settings.totalReports", "Total Reports Submitted")}
            value={incidentHistory.reports.toString()}
            icon="checkmark.circle"
            showChevron={false}
            onPress={() => {}}
          />
          <SettingsDivider />
          <SettingsMenuItem
            label={t("settings.viewHistory", "View Full History")}
            icon="list.bullet"
            onPress={handleViewHistory}
          />
        </SettingsSection>

        {/* Security */}
        {isLoggedIn && (
          <SettingsSection title={t("settings.security", "SECURITY")}>
            <SettingsMenuItem
              label={t("profile.changePassword", "Change Password")}
              icon="lock"
              onPress={() => setChangePasswordModalVisible(true)}
            />
          </SettingsSection>
        )}

        {/* Legal */}
        <SettingsSection title="LEGAL & PRIVACY">
          <SettingsMenuItem
            label="Privacy Policy"
            icon="shield"
            onPress={() => {
              setPolicyType("privacy");
              setPolicyModalVisible(true);
            }}
          />
          <SettingsDivider />
          <SettingsMenuItem
            label="Terms of Service"
            icon="doc.text"
            onPress={() => {
              setPolicyType("terms");
              setPolicyModalVisible(true);
            }}
          />
        </SettingsSection>

        {/* About & Logout */}
        <SettingsSection title="APP">
          <SettingsMenuItem
            label="App Version"
            value="1.0.0"
            showChevron={false}
            icon="info.circle"
            onPress={() => {}}
          />
          <SettingsDivider />
          <SettingsMenuItem
            label="About Alertara"
            icon="questionmark.circle"
            onPress={() =>
              Alert.alert(
                getTranslation("your_safety_first", language as any),
                getTranslation("help_is_on_the_way", language as any),
              )
            }
          />
        </SettingsSection>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent
        animationType="fade"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setChangePasswordModalVisible(false)}
        >
          <Pressable
            style={[
              styles.passwordModal,
              { backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText style={styles.modalTitle}>{t("profile.changePassword")}</ThemedText>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("profile.currentPassword")}
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: isDarkMode ? "#333" : "#f5f5f5",
                    color: isDarkMode ? "#fff" : "#000",
                    borderColor: isDarkMode ? "#555" : "#ddd",
                  },
                ]}
                placeholder="Enter current password"
                placeholderTextColor={isDarkMode ? "#999" : "#ccc"}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={styles.inputLabel}>{t("profile.newPassword")}</ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: isDarkMode ? "#333" : "#f5f5f5",
                    color: isDarkMode ? "#fff" : "#000",
                    borderColor: isDarkMode ? "#555" : "#ddd",
                  },
                ]}
                placeholder="Enter new password"
                placeholderTextColor={isDarkMode ? "#999" : "#ccc"}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("profile.confirmPassword")}
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: isDarkMode ? "#333" : "#f5f5f5",
                    color: isDarkMode ? "#fff" : "#000",
                    borderColor: isDarkMode ? "#555" : "#ddd",
                  },
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={isDarkMode ? "#999" : "#ccc"}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#ddd" }]}
                onPress={() => setChangePasswordModalVisible(false)}
              >
                <ThemedText style={styles.modalButtonText}>{t("profile.cancel")}</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: TealColors.primary },
                ]}
                onPress={handleChangePassword}
              >
                <ThemedText style={[styles.modalButtonText, { color: "#fff" }]}>
                  {t("profile.change")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModalVisible}
        transparent
        animationType="fade"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditProfileModalVisible(false)}
        >
          <Pressable
            style={[
              styles.passwordModal,
              { backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText style={styles.modalTitle}>{t("profile.editProfile")}</ThemedText>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("profile.name")}
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: isDarkMode ? "#333" : "#f5f5f5",
                    color: isDarkMode ? "#fff" : "#000",
                    borderColor: isDarkMode ? "#555" : "#ddd",
                  },
                ]}
                placeholder="Enter your name"
                placeholderTextColor={isDarkMode ? "#999" : "#ccc"}
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("profile.email")}
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: isDarkMode ? "#333" : "#f5f5f5",
                    color: isDarkMode ? "#fff" : "#000",
                    borderColor: isDarkMode ? "#555" : "#ddd",
                  },
                ]}
                placeholder="Enter your email"
                placeholderTextColor={isDarkMode ? "#999" : "#ccc"}
                keyboardType="email-address"
                autoCapitalize="none"
                value={editEmail}
                onChangeText={setEditEmail}
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("profile.phone")}
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: isDarkMode ? "#333" : "#f5f5f5",
                    color: isDarkMode ? "#fff" : "#000",
                    borderColor: isDarkMode ? "#555" : "#ddd",
                  },
                ]}
                placeholder="Enter your phone number"
                placeholderTextColor={isDarkMode ? "#999" : "#ccc"}
                keyboardType="phone-pad"
                value={editPhone}
                onChangeText={setEditPhone}
              />
            </View>

            <View style={styles.modalButtonContainer}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#ddd" }]}
                onPress={() => setEditProfileModalVisible(false)}
              >
                <ThemedText style={styles.modalButtonText}>{t("profile.cancel")}</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: TealColors.primary },
                ]}
                onPress={handleSaveProfile}
              >
                <ThemedText style={[styles.modalButtonText, { color: "#fff" }]}>
                  {t("profile.save")}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Policy Modal */}
      <Modal visible={policyModalVisible} transparent animationType="slide">
        <SafeAreaView
          style={[
            styles.policyModalContainer,
            {
              backgroundColor: isDarkMode
                ? Colors.dark.background
                : Colors.light.background,
            },
          ]}
        >
          <View style={styles.policyHeader}>
            <Pressable onPress={() => setPolicyModalVisible(false)}>
              <IconSymbol size={24} name="xmark" color={TealColors.primary} />
            </Pressable>
            <ThemedText style={styles.policyTitle}>
              {policyType === "privacy" ? t("profile.privacyPolicy") : t("profile.termsOfService")}
            </ThemedText>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.policyContent}
            showsVerticalScrollIndicator={false}
          >
            {policyType === "privacy" ? (
              <>
                <ThemedText style={styles.policyText}>
                  <ThemedText style={styles.policyHeading}>
                    Privacy Policy
                  </ThemedText>
                  {"\n\n"}
                  At Alertara, we take your privacy seriously. This Privacy
                  Policy explains how we collect, use, disclose, and safeguard
                  your information.
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    1. Information We Collect
                  </ThemedText>
                  {"\n"}Ã¢â‚¬Â¢ Personal identification information (name, email,
                  phone number)
                  {"\n"}Ã¢â‚¬Â¢ Location data when you use crime mapping features
                  {"\n"}Ã¢â‚¬Â¢ Device information (device type, operating system)
                  {"\n"}Ã¢â‚¬Â¢ Usage data and analytics
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    2. How We Use Your Information
                  </ThemedText>
                  {"\n"}Ã¢â‚¬Â¢ To provide and improve our services
                  {"\n"}Ã¢â‚¬Â¢ To send notifications and alerts
                  {"\n"}Ã¢â‚¬Â¢ To enhance user experience
                  {"\n"}Ã¢â‚¬Â¢ For analytics and research
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    3. Data Security
                  </ThemedText>
                  {"\n"}
                  We implement appropriate technical and organizational measures
                  to protect your personal data against unauthorized processing.
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    4. Your Rights
                  </ThemedText>
                  {"\n"}
                  You have the right to access, modify, or delete your personal
                  information. Contact us at privacy@alertara.com for requests.
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.policyText}>
                  <ThemedText style={styles.policyHeading}>
                    Terms of Service
                  </ThemedText>
                  {"\n\n"}
                  Welcome to Alertara. These Terms of Service govern your use of
                  our platform.
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    1. Acceptance of Terms
                  </ThemedText>
                  {"\n"}
                  By using Alertara, you agree to comply with these terms and
                  all applicable laws and regulations.
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    2. User Responsibilities
                  </ThemedText>
                  {"\n"}Ã¢â‚¬Â¢ You must provide accurate information
                  {"\n"}Ã¢â‚¬Â¢ You are responsible for your account security
                  {"\n"}Ã¢â‚¬Â¢ You agree not to use the app for illegal activities
                  {"\n"}Ã¢â‚¬Â¢ You will not submit false crime reports
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    3. Disclaimer
                  </ThemedText>
                  {"\n"}
                  Alertara is provided &quot;as is&quot; without warranties. We
                  are not liable for inaccurate location data or incident
                  information.
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    4. Limitation of Liability
                  </ThemedText>
                  {"\n"}
                  To the fullest extent permitted by law, Alertara shall not be
                  liable for any indirect, incidental, or consequential damages.
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    5. Termination
                  </ThemedText>
                  {"\n"}
                  We reserve the right to terminate accounts that violate these
                  terms.
                </ThemedText>
              </>
            )}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {logoutSuccessVisible && (
        <Animated.View
          style={[styles.logoutOverlay, { opacity: logoutOpacity }]}
        >
          <Animated.View
            style={[
              styles.logoutCard,
              { transform: [{ scale: logoutScale }] },
            ]}
          >
            <View style={styles.logoutIconCircle}>
              <IconSymbol size={30} name="checkmark" color="#fff" />
            </View>
            <ThemedText style={styles.logoutTitle}>Logout complete</ThemedText>
            <ThemedText style={styles.logoutSubtitle}>
              You have been signed out successfully.
            </ThemedText>
            <ActivityIndicator
              color={TealColors.primary}
              style={{ marginTop: 12 }}
            />
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  authPromptCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    backgroundColor: "rgba(58, 118, 117, 0.08)",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(58, 118, 117, 0.18)",
  },
  authPromptTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  authPromptText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#666",
  },
  authActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryAuthButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: TealColors.primary,
  },
  primaryAuthButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryAuthButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: TealColors.primary,
  },
  secondaryAuthButtonText: {
    color: TealColors.primary,
    fontWeight: "700",
  },
  userAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#777",
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: "#777",
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  historyModal: {
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  historyLoading: {
    padding: 40,
    alignItems: "center",
  },
  historyLoadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  historyContent: {
    flex: 1,
    maxHeight: 500,
  },
  historySection: {
    marginBottom: 24,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  historyStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  historyStat: {
    flex: 1,
    backgroundColor: "rgba(58, 118, 117, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  historyStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: TealColors.primary,
  },
  historyStatLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  historyRecent: {
    marginTop: 12,
  },
  historyRecentTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#666",
  },
  historyItem: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  historyItemDesc: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  historyItemStatus: {
    fontSize: 12,
    color: TealColors.primary,
    fontWeight: "600",
  },
  passwordModal: {
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  passwordInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalButtonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  policyModalContainer: {
    flex: 1,
  },
  policyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  policyContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#666",
  },
  policyHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: TealColors.primary,
  },
  policySubheading: {
    fontSize: 16,
    fontWeight: "600",
  },
  logoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutCard: {
    width: "78%",
    maxWidth: 320,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logoutIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TealColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1d1d1d",
  },
  logoutSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#666",
  },
});











