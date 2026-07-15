import { Header } from '@/components/header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { usePreferences } from '@/context/preferences-context';
import { useTheme } from '@/context/theme-context';
import { getTranslation } from '@/data/emergency-translations';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

export default function AboutScreen() {
  const { isDarkMode } = useTheme();
  const { language } = usePreferences();

  return (
    <SafeAreaView style={[styles.containerStyle, { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background }]}>
      <Header />
      <ScrollView style={[styles.content, { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background }]}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">About This App</ThemedText>
        </ThemedView>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Version 1.0.0</ThemedText>
          <ThemedText style={styles.description}>
            {getTranslation("your_safety_first", language)} - This is a modern mobile application built with React Native and Expo.
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Features</ThemedText>
          <ThemedText style={styles.description}>
            • {getTranslation("stay_informed", language)}{'\n'}
            • {getTranslation("emergency_alert", language)}{'\n'}
            • Cross-platform compatibility
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
