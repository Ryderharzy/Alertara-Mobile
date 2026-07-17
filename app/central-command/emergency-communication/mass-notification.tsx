import { Header } from "@/components/header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { usePreferences } from "@/context/preferences-context";
import { useTheme } from "@/context/theme-context";
import { getAvailablePhraseKeys, getTranslation, languageNames } from "@/data/emergency-translations";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function MassNotificationScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = usePreferences();
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  
  const bg = isDarkMode ? Colors.dark.background : Colors.light.background;
  const cardBg = isDarkMode ? "#1f2933" : "#ffffff";
  const text = isDarkMode ? Colors.dark.text : Colors.light.text;
  const muted = isDarkMode ? "#cbd5e1" : "#555";
  const border = isDarkMode ? "#334155" : "#e2e5ea";
  const accent = "#c0392b";

  const phraseKeys = getAvailablePhraseKeys();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <Header />
      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>‹ Back</ThemedText>
        </Pressable>
        <ThemedText type="title" style={styles.title}>Mass Notification</ThemedText>
        <ThemedText style={styles.subtitle}>
          Draft, review, and send alerts across SMS, Email, and PA channels.
        </ThemedText>
        
        {/* Language Indicator */}
        <View style={[styles.languageIndicator, { backgroundColor: cardBg, borderColor: border }]}>
          <IconSymbol name="globe" size={16} color={accent} />
          <ThemedText style={[styles.languageText, { color: muted }]}>
            Sending in: {languageNames[language as keyof typeof languageNames] || language}
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Quick Alert Templates</ThemedText>
          <Text style={styles.cardText}>Select a pre-translated emergency phrase</Text>
          <ScrollView style={styles.phraseList} showsVerticalScrollIndicator={false}>
            {phraseKeys.slice(0, 10).map((key) => (
              <Pressable
                key={key}
                style={[styles.phraseItem, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => setSelectedPhrase(key)}
              >
                <ThemedText style={[styles.phraseKey, { color: muted }]}>{key}</ThemedText>
                <ThemedText style={[styles.phraseTranslation, { color: text }]}>
                  {getTranslation(key, language)}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Custom Alert</ThemedText>
          <Text style={styles.cardText}>Title, category, severity, and channels.</Text>
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Compose Alert</Text>
          </Pressable>
        </View>
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
  languageIndicator: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  languageText: { fontSize: 13 },
  card: { borderWidth: 1, borderColor: "#e2e5ea", borderRadius: 16, padding: 14, gap: 8, backgroundColor: "#fff" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardText: { fontSize: 13, color: "#444" },
  phraseList: { maxHeight: 200, marginTop: 8 },
  phraseItem: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  phraseKey: { fontSize: 11, textTransform: "capitalize", marginBottom: 2 },
  phraseTranslation: { fontSize: 13 },
  primaryBtn: { backgroundColor: "#c0392b", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
