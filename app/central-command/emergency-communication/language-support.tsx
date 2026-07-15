import { Header } from "@/components/header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { usePreferences } from "@/context/preferences-context";
import { useTheme } from "@/context/theme-context";
import { getAvailablePhraseKeys, getSupportedLanguages, languageNames } from "@/data/emergency-translations";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

export default function LanguageSupportScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language: currentLanguage, setLanguage } = usePreferences();
  const [selectedCategory, setSelectedCategory] = useState<"languages" | "phrases">("languages");
  
  const bg = isDarkMode ? Colors.dark.background : Colors.light.background;
  const cardBg = isDarkMode ? "#1f2933" : "#ffffff";
  const text = isDarkMode ? Colors.dark.text : Colors.light.text;
  const muted = isDarkMode ? "#cbd5e1" : "#555";
  const border = isDarkMode ? "#334155" : "#e2e5ea";
  const accent = "#16a34a";

  const supportedLanguages = getSupportedLanguages();
  const phraseKeys = getAvailablePhraseKeys();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <Header />
      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>‹ Back</ThemedText>
        </Pressable>
        <ThemedText type="title" style={styles.title}>Multilingual Support</ThemedText>
        <ThemedText style={styles.subtitle}>Manage translations and localized message variants.</ThemedText>
        
        {/* Category Tabs */}
        <View style={[styles.tabs, { borderColor: border }]}>
          <Pressable
            style={[styles.tab, selectedCategory === "languages" && styles.activeTab, { backgroundColor: selectedCategory === "languages" ? accent : cardBg }]}
            onPress={() => setSelectedCategory("languages")}
          >
            <ThemedText style={[styles.tabText, { color: selectedCategory === "languages" ? "#fff" : text }]}>
              Languages
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, selectedCategory === "phrases" && styles.activeTab, { backgroundColor: selectedCategory === "phrases" ? accent : cardBg }]}
            onPress={() => setSelectedCategory("phrases")}
          >
            <ThemedText style={[styles.tabText, { color: selectedCategory === "phrases" ? "#fff" : text }]}>
              Emergency Phrases
            </ThemedText>
          </Pressable>
        </View>

        {selectedCategory === "languages" ? (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: text }]}>Supported Languages</ThemedText>
            <ThemedText style={[styles.sectionDesc, { color: muted }]}>
              Select your preferred language for emergency alerts
            </ThemedText>
            {supportedLanguages.map((lang) => (
              <Pressable
                key={lang}
                style={[styles.languageCard, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => setLanguage(lang)}
              >
                <View style={styles.languageInfo}>
                  <ThemedText style={[styles.languageName, { color: text }]}>
                    {languageNames[lang]}
                  </ThemedText>
                  <ThemedText style={[styles.languageCode, { color: muted }]}>
                    {lang.toUpperCase()}
                  </ThemedText>
                </View>
                {currentLanguage === lang && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={accent} />
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: text }]}>Emergency Phrase Catalog</ThemedText>
            <ThemedText style={[styles.sectionDesc, { color: muted }]}>
              Pre-translated emergency phrases for quick alert deployment
            </ThemedText>
            <View style={[styles.statsCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: accent }]}>{phraseKeys.length}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: muted }]}>Total Phrases</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: accent }]}>{supportedLanguages.length}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: muted }]}>Languages</ThemedText>
              </View>
            </View>
            <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: border }]}>
              <IconSymbol name="info.circle" size={20} color={accent} />
              <ThemedText style={[styles.infoText, { color: muted }]}>
                All phrases are pre-translated and stored locally for instant access during emergencies.
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 6 },
  backText: { fontSize: 16, color: "#1a73e8", fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#555" },
  tabs: { flexDirection: "row", borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: {},
  tabText: { fontSize: 14, fontWeight: "600" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionDesc: { fontSize: 14, lineHeight: 18 },
  languageCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  languageInfo: { flex: 1 },
  languageName: { fontSize: 15, fontWeight: "600" },
  languageCode: { fontSize: 12, marginTop: 2 },
  statsCard: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 8 },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: "#e2e5ea" },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  infoText: { fontSize: 13, lineHeight: 18, flex: 1 },
});
