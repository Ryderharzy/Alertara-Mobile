import { Header } from '@/components/header';
import { SettingsSection, SettingsSelect } from '@/components/settings-components';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { usePreferences } from '@/context/preferences-context';
import { useTheme } from '@/context/theme-context';
import { getTranslation } from '@/data/emergency-translations';
import { useTranslation } from '@/hooks/useTranslation';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  const { isDarkMode } = useTheme();
  const { language, setLanguage } = usePreferences();
  const { t } = useTranslation();

  const languageOptions = [
    { label: "English", value: "en" },
    { label: "Filipino (Tagalog)", value: "tl" },
    { label: "Cebuano (Bisaya)", value: "ceb" },
    { label: "Waray", value: "war" },
    { label: "Hiligaynon (Ilonggo)", value: "hil" },
    { label: "Español", value: "es" },
    { label: "Français", value: "fr" },
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
          <ThemedText type="title">{getTranslation("your_safety_first", language as any)}</ThemedText>
        </ThemedView>

        <SettingsSection title="General">
          <SettingsSelect
            label={t("settings.language.label")}
            description={t("settings.language.description")}
            value={language}
            options={languageOptions}
            onSelect={handleLanguageChange}
            icon="globe"
          />
        </SettingsSection>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">{getTranslation("stay_informed", language as any)}</ThemedText>
          <ThemedText style={styles.description}>
            • {getTranslation("emergency_alert", language as any)}{'\n'}
            • {getTranslation("help_is_on_the_way", language as any)}{'\n'}
            • {getTranslation("stay_calm", language as any)}
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
