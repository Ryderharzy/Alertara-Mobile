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
import { useTranslate } from "@/hooks/useTranslate";
import { useFocusEffect } from "@react-navigation/native";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  InteractionManager,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function MeScreen() {
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();
  const { userProfile, signOut } = useAuth();
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
  } = usePreferences();
  const { t } = useTranslate();

  const [changePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyType, setPolicyType] = useState<"privacy" | "terms">("privacy");
  const isLoggedIn = Boolean(userProfile?.id);
  const displayName = userProfile?.name ?? "Guest Mode";
  const displayEmail = userProfile?.email ?? "No account connected";
  const displayPhone = userProfile?.phone ?? "Phone not set";

  const languageLabels: Record<LanguageOption, string> = {
    en: t("language.english", "English"),
    es: t("language.spanish", "Español"),
    fr: t("language.french", "Français"),
    tl: t("language.tagalog", "Tagalog"),
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    // TODO: Make API call to change password
    Alert.alert("Success", "Password changed successfully");
    setChangePasswordModalVisible(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert("Error", "Failed to logout");
          }
        },
        style: "destructive",
      },
    ]);
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
                : "Create an account to save your profile and preferences."}
            </ThemedText>
            <ThemedText style={styles.userPhone}>
              {isLoggedIn ? displayPhone : "No account connected"}
            </ThemedText>
          </View>
        </View>

        {!isLoggedIn && (
          <View style={styles.authPromptCard}>
            <ThemedText style={styles.authPromptTitle}>Create or sign in</ThemedText>
            <ThemedText style={styles.authPromptText}>
              Register to manage your account, save details, and keep your profile synced.
            </ThemedText>
            <View style={styles.authActionRow}>
              <Pressable style={styles.primaryAuthButton} onPress={handleRegister}>
                <ThemedText style={styles.primaryAuthButtonText}>
                  Register
                </ThemedText>
              </Pressable>
              <Pressable style={styles.secondaryAuthButton} onPress={handleLogin}>
                <ThemedText style={styles.secondaryAuthButtonText}>
                  Log In
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {isLoggedIn && (
          <View style={styles.authPromptCard}>
            <ThemedText style={styles.authPromptTitle}>Account Details</ThemedText>
            <ThemedText style={styles.authPromptText}>
              Your account is linked and ready. Review your details below.
            </ThemedText>
            <Pressable style={styles.secondaryAuthButton} onPress={handleLogout}>
              <ThemedText style={styles.secondaryAuthButtonText}>
                Log Out
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Account Settings */}
        <SettingsSection title="ACCOUNT SETTINGS">
          <SettingsMenuItem
            label="Edit Profile"
            icon="pencil"
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Edit profile feature will be available soon",
              )
            }
          />
          <SettingsDivider />
          <SettingsMenuItem
            label="Email Address"
            value={displayEmail}
            icon="mail"
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Email change feature will be available soon",
              )
            }
          />
          <SettingsDivider />
          <SettingsMenuItem
            label="Phone Number"
            value={displayPhone}
            icon="phone"
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Phone change feature will be available soon",
              )
            }
          />
        </SettingsSection>

        {/* Alert Preferences */}
        <SettingsSection title="ALERT PREFERENCES">
          <SettingsToggle
            label="Crime Alerts"
            description="Get notified of crime incidents nearby"
            value={alertPreferences.crimes}
            onValueChange={(value) => updateAlertPreferences({ crimes: value })}
            icon="exclamationmark.triangle"
          />
          <SettingsDivider />
          <SettingsToggle
            label="Emergency Alerts"
            description="High priority emergency notifications"
            value={alertPreferences.emergencies}
            onValueChange={(value) =>
              updateAlertPreferences({ emergencies: value })
            }
            icon="bell"
          />
          <SettingsDivider />
          <SettingsToggle
            label="Community Alerts"
            description="Community-shared alerts and updates"
            value={alertPreferences.communityAlerts}
            onValueChange={(value) =>
              updateAlertPreferences({ communityAlerts: value })
            }
            icon="person.2"
          />
          <SettingsDivider />
          <SettingsToggle
            label="Email Notifications"
            description="Receive alerts via email"
            value={alertPreferences.email}
            onValueChange={(value) => updateAlertPreferences({ email: value })}
            icon="mail"
          />
          <SettingsDivider />
          <SettingsToggle
            label="SMS Notifications"
            description="Receive alerts via SMS"
            value={alertPreferences.sms}
            onValueChange={(value) => updateAlertPreferences({ sms: value })}
            icon="message"
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="PREFERENCES">
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
                { label: languageLabels.en, value: "en" },
                { label: languageLabels.es, value: "es" },
                { label: languageLabels.fr, value: "fr" },
                { label: languageLabels.tl, value: "tl" },
              ]}
              onSelect={handleLanguageSelect}
            />
          </View>
          <SettingsDivider />
          <SettingsToggle
            label="Dark Theme"
            description={
              isDarkMode ? "Currently enabled" : "Currently disabled"
            }
            value={isDarkMode}
            onValueChange={toggleTheme}
            icon="moon"
          />
        </SettingsSection>

        {/* Incident History */}
        <SettingsSection title="ACTIVITY">
          <SettingsMenuItem
            label="Total Emergency Calls"
            value={incidentHistory.calls.toString()}
            icon="phone"
            showChevron={false}
            onPress={() => {}}
          />
          <SettingsDivider />
          <SettingsMenuItem
            label="Total Reports Submitted"
            value={incidentHistory.reports.toString()}
            icon="checkmark.circle"
            showChevron={false}
            onPress={() => {}}
          />
          <SettingsDivider />
          <SettingsMenuItem
            label="View Full History"
            icon="list.bullet"
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Full history view will be available soon",
              )
            }
          />
        </SettingsSection>

        {/* Security */}
        {isLoggedIn && (
          <SettingsSection title="SECURITY">
            <SettingsMenuItem
              label="Change Password"
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
                "About Alertara",
                "Alertara is a community safety platform designed to keep you informed and safe.",
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
            <ThemedText style={styles.modalTitle}>Change Password</ThemedText>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={styles.inputLabel}>
                Current Password
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
              <ThemedText style={styles.inputLabel}>New Password</ThemedText>
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
                Confirm Password
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
                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: TealColors.primary },
                ]}
                onPress={handleChangePassword}
              >
                <ThemedText style={[styles.modalButtonText, { color: "#fff" }]}>
                  Change
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
              {policyType === "privacy" ? "Privacy Policy" : "Terms of Service"}
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
                  {"\n"}• Personal identification information (name, email,
                  phone number)
                  {"\n"}• Location data when you use crime mapping features
                  {"\n"}• Device information (device type, operating system)
                  {"\n"}• Usage data and analytics
                  {"\n\n"}
                  <ThemedText style={styles.policySubheading}>
                    2. How We Use Your Information
                  </ThemedText>
                  {"\n"}• To provide and improve our services
                  {"\n"}• To send notifications and alerts
                  {"\n"}• To enhance user experience
                  {"\n"}• For analytics and research
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
                  {"\n"}• You must provide accurate information
                  {"\n"}• You are responsible for your account security
                  {"\n"}• You agree not to use the app for illegal activities
                  {"\n"}• You will not submit false crime reports
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
});
