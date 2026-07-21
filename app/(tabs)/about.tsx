import { Header } from '@/components/header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useTranslate } from '@/hooks/useTranslate';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

export default function AboutScreen() {
  const { isDarkMode } = useTheme();
  const { t } = useTranslate();

  return (
    <SafeAreaView style={[styles.containerStyle, { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background }]}>
      <Header />
      <ScrollView style={[styles.content, { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background }]}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">{t("about.title")}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">{t("about.version")} 1.0.0</ThemedText>
          <ThemedText style={styles.description}>
            {t("about.description")}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">{t("about.features")}</ThemedText>
          <ThemedText style={styles.description}>
            • {t("stay_informed")}{'\n'}
            • {t("emergency_alert")}{'\n'}
            • {t("about.crossPlatform")}
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
