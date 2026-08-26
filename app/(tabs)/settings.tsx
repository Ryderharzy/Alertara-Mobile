import { Header } from '@/components/header';
import { SettingsSection, SettingsSelect } from '@/components/settings-components';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { usePreferences } from '@/context/preferences-context';
import { useTheme } from '@/context/theme-context';
import { useTranslation } from '@/hooks/useTranslation';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  const { isDarkMode } = useTheme();
  const { language, setLanguage } = usePreferences();
  const { t } = useTranslation();

  const languageOptions = [
    { label: t("settings.english", "English"), value: "en" },
    { label: t("settings.filipino", "Filipino"), value: "fil" },
  ];

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await setLanguage(newLanguage as any);
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.containerStyle, { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background }]}>
      <Header />
      <ScrollView style={[styles.content, { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background }]}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">{t("settings.title", "Settings")}</ThemedText>
        </ThemedView>

        <SettingsSection title={t("settings.language", "Language")}>
          <SettingsSelect
            label={t("settings.preferredLanguage", "Preferred App Language")}
            description={t("settings.languageDescription", "Select app UI language")}
            value={language}
            options={languageOptions}
            onSelect={handleLanguageChange}
            icon="globe"
          />
        </SettingsSection>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">{t("home.activeAlerts", "Active Emergency Alerts")}</ThemedText>
          <ThemedText style={styles.description}>
            • {t("earthquake.dropCoverHold", "Drop, Cover, and Hold On!")}{'\n'}
            • {t("flood.lowLyingArea", "Low-Lying Area Advisory")}{'\n'}
            • {t("home.safetyStatus", "Safety Status")}
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  titleContainer: {
    gap: 8,
    marginBottom: 16,
  },
  section: {
    gap: 8,
    marginBottom: 16,
  },
  description: {
    lineHeight: 20,
    color: '#666',
  },
});
