import { Header } from "@/components/header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

type ModuleCard = {
  title: string;
  icon: IconSymbolName;
  desc: string;
  access: "user" | "admin";
  // For user-side routing. For admin modules, this is what we suggest instead.
  userRoute: string;
  userCtaLabel: string;
};

export default function EcsHome() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [locked, setLocked] = useState<ModuleCard | null>(null);
  const bg = isDarkMode ? Colors.dark.background : Colors.light.background;
  const cardBg = isDarkMode ? "#1f2933" : "#ffffff";
  const text = isDarkMode ? Colors.dark.text : Colors.light.text;
  const muted = isDarkMode ? "#cbd5e1" : "#555";
  const border = isDarkMode ? "#334155" : "#e2e5ea";
  const accent = "#16a34a";

  const modules: ModuleCard[] = useMemo(
    () => [
      // Admin-side modules (show "what this is", then send users to the right feature)
      {
        title: "Mass Notification",
        icon: "antenna.radiowaves.left.and.right",
        desc: "Central Command uses this to send official alerts via SMS, email, and public channels.",
        access: "admin",
        userRoute: "/notification",
        userCtaLabel: "View Alerts Feed",
      },
      {
        title: "Alert Catalog",
        icon: "tray.full",
        desc: "Central Command maintains templates and categories for consistent emergency messaging.",
        access: "admin",
        userRoute: "/about",
        userCtaLabel: "See App Info",
      },
      // User-side modules (direct navigation)
      {
        title: "Two-Way Feedback",
        icon: "bubble.left.and.bubble.right",
        desc: "Report an incident, chat for updates, and manage all threads in Messages.",
        access: "user",
        userRoute: "/(tabs)/messages",
        userCtaLabel: "Open Messages",
      },
      {
        title: "Language Support",
        icon: "globe",
        desc: "Change language and region settings for a better experience.",
        access: "user",
        userRoute: "/me",
        userCtaLabel: "Change Language",
      },
      {
        title: "Subscriptions",
        icon: "person.crop.circle.badge.checkmark",
        desc: "Control which alerts you receive and how you receive them.",
        access: "user",
        userRoute: "/me",
        userCtaLabel: "Manage Preferences",
      },
      {
        title: "My History",
        icon: "doc.text.magnifyingglass",
        desc: "Review your past reports and conversations in the Messages inbox.",
        access: "user",
        userRoute: "/(tabs)/messages",
        userCtaLabel: "Open Messages",
      },
    ],
    [],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <Header />
      <ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: bg }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <View style={styles.backRow}>
            <IconSymbol name="arrow.left" size={16} color={accent} />
            <ThemedText style={[styles.backText, { color: accent }]}>
              Back
            </ThemedText>
          </View>
        </Pressable>

        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: accent }]}>
            <IconSymbol
              name="antenna.radiowaves.left.and.right"
              size={26}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={[styles.title, { color: text }]}>
              Emergency Communication System
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]}>
              Mass notifications, multilingual delivery, two-way feedback, and
              auditability.
            </ThemedText>
          </View>
        </View>

        <View style={styles.grid}>
          {modules.map((m) => (
            <Pressable
              key={m.title}
              style={[
                styles.card,
                {
                  backgroundColor: cardBg,
                  borderColor: border,
                  shadowColor: "#000",
                },
              ]}
              onPress={() => {
                if (m.access === "admin") {
                  setLocked(m);
                  return;
                }
                if (m.title === "Language Support") {
                  // Switch to Profile and jump to the Language picker in Preferences.
                  router.push({
                    pathname: "/me",
                    params: { scrollTo: "language" },
                  } as never);
                  return;
                }
                router.push(m.userRoute as never);
              }}
            >
              <View
                style={[
                  styles.cardIcon,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(22,163,74,0.16)"
                      : "#e8f1ff",
                  },
                ]}
              >
                <IconSymbol name={m.icon} size={20} color={accent} />
              </View>
              <ThemedText style={[styles.cardTitle, { color: text }]}>
                {m.title}
              </ThemedText>
              <ThemedText style={[styles.cardDesc, { color: muted }]}>
                {m.desc}
              </ThemedText>
              <View style={styles.cardFooter}>
                {m.access === "admin" ? (
                  <ThemedText style={[styles.lockedPill, { color: accent }]}>
                    Central Command
                  </ThemedText>
                ) : null}
                <ThemedText style={[styles.cardAction, { color: accent }]}>
                  {m.access === "admin" ? "Learn more" : "Open"}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={!!locked}
        transparent
        animationType="fade"
        onRequestClose={() => setLocked(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLocked(null)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: cardBg, borderColor: border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIcon,
                  { backgroundColor: "rgba(22,163,74,0.16)" },
                ]}
              >
                <IconSymbol
                  name={locked?.icon ?? "info"}
                  size={18}
                  color={accent}
                />
              </View>
              <ThemedText style={[styles.modalTitle, { color: text }]}>
                {locked?.title}
              </ThemedText>
            </View>
            <ThemedText style={[styles.modalDesc, { color: muted }]}>
              {locked?.desc}
            </ThemedText>
            <ThemedText style={[styles.modalHint, { color: muted }]}>
              This module is managed by Central Command staff. You can still
              access the user feature below.
            </ThemedText>
            <Pressable
              style={[styles.modalCta, { backgroundColor: accent }]}
              onPress={() => {
                if (!locked) return;
                const route = locked.userRoute;
                setLocked(null);
                if (locked.title === "Language Support") {
                  router.push({
                    pathname: "/me",
                    params: { scrollTo: "language" },
                  } as never);
                  return;
                }
                router.push(route as never);
              }}
            >
              <ThemedText style={styles.modalCtaText}>
                {locked?.userCtaLabel ?? "Open"}
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.modalClose}
              onPress={() => setLocked(null)}
            >
              <ThemedText style={[styles.modalCloseText, { color: accent }]}>
                Close
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Match the header's left/right inset (Header uses 14px).
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { fontSize: 16, fontWeight: "700" },
  // Match the reference: icon aligns with the top of the title block (not vertically centered)
  hero: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingTop: 2,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  title: { fontSize: 24, fontWeight: "800", lineHeight: 28 },
  subtitle: { fontSize: 14, lineHeight: 18, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "48%", borderRadius: 16, borderWidth: 1, padding: 12, gap: 6 },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardDesc: { fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    paddingTop: 2,
  },
  lockedPill: { fontSize: 11, fontWeight: "800" },
  cardAction: { fontSize: 12, fontWeight: "700", marginLeft: "auto" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "900" },
  modalDesc: { fontSize: 13, lineHeight: 18 },
  modalHint: { fontSize: 12, lineHeight: 16, opacity: 0.9 },
  modalCta: { borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  modalCtaText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  modalClose: { paddingVertical: 8, alignItems: "center" },
  modalCloseText: { fontSize: 13, fontWeight: "800" },
});
