import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import { useTranslate } from "@/hooks/useTranslate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

type IncidentIndexItem = {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  icon?: string;
  status?: string;
};

const INDEX_KEY = "incident-chat-index";
const LAST_CHAT_KEY = "last-incident-chat";

export default function ReportHistoryScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { t } = useTranslate();
  const [items, setItems] = useState<IncidentIndexItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      } else {
        // fall back to last chat if index not present
        const lastRaw = await AsyncStorage.getItem(LAST_CHAT_KEY);
        if (lastRaw) {
          const last = JSON.parse(lastRaw) as IncidentIndexItem;
          setItems([{ ...last, updatedAt: new Date().toISOString() }]);
        } else {
          setItems([]);
        }
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {};
    }, []),
  );

  const handleClear = async () => {
    await AsyncStorage.removeItem(INDEX_KEY);
    setItems([]);
  };

  const openChat = (item: IncidentIndexItem) => {
    router.push({
      pathname: "/chat/[id]",
      params: item,
    } as never);
  };

  const background = isDarkMode
    ? Colors.dark.background
    : Colors.light.background;
  const cardBg = isDarkMode ? "#18252a" : "#ffffff";
  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const headerBg = isDarkMode ? "#0f1f1b" : "#e6f4ef";
  const headerBorder = isDarkMode ? "#1f2f2b" : "#c8e4d9";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: headerBg, borderBottomColor: headerBorder },
        ]}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <IconSymbol name="arrow.left" size={18} color={TealColors.primary} />
        </Pressable>
        <ThemedText type="title" style={[styles.title, { color: textColor }]}>
          {t("history.title")}
        </ThemedText>
        <Pressable
          style={[styles.clearBtn, { borderColor: TealColors.primary }]}
          onPress={handleClear}
          disabled={!items.length}
        >
          <IconSymbol
            name="trash"
            size={14}
            color={items.length ? TealColors.primary : "#9ca3af"}
          />
          <Text
            style={[
              styles.clearText,
              { color: items.length ? TealColors.primary : "#9ca3af" },
            ]}
          >
            {t("history.clear", "Clear")}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 20 }}
          color={TealColors.primary}
        />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <IconSymbol name="clock.arrow.circlepath" size={26} color="#9ca3af" />
          <ThemedText style={[styles.emptyText, { color: textColor }]}>
            {t("history.empty")}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const statusKey = (item.status ?? "pending").toLowerCase();
            const status =
              statusKey === "pending"
                ? t("status.pending")
                : statusKey === "received"
                  ? t("status.received")
                  : statusKey === "in progress"
                    ? t("status.inProgress")
                    : statusKey === "resolved"
                      ? t("status.resolved")
                      : (item.status ?? t("status.pending"));
            const icon = item.icon ?? "exclamationmark.triangle";
            const statusColor = statusKey === "pending" ? "#e3b341" : "#2f9d63";
            return (
              <Pressable
                style={[
                  styles.card,
                  {
                    backgroundColor: cardBg,
                    borderColor: isDarkMode ? "#24333b" : "#e1e7ec",
                  },
                ]}
                onPress={() => openChat(item)}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${statusColor}1a` },
                    ]}
                  >
                    <IconSymbol name={icon} size={16} color={statusColor} />
                  </View>
                  <ThemedText
                    style={[styles.cardTitle, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {decodeURIComponent(item.title)}
                  </ThemedText>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        borderColor: statusColor,
                        backgroundColor: `${statusColor}15`,
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {status}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText
                    style={[
                      styles.meta,
                      { color: isDarkMode ? "#cbd5e1" : "#475569" },
                    ]}
                  >
                    {t("history.updated")}{" "}
                    {new Date(item.updatedAt).toLocaleString()}
                  </ThemedText>
                  <Pressable
                    style={[
                      styles.chatBtn,
                      {
                        borderColor: TealColors.primary,
                        backgroundColor: isDarkMode ? "#132622" : "#e8f6f2",
                      },
                    ]}
                    onPress={() => openChat(item)}
                  >
                    <IconSymbol
                      name="bubble.right"
                      size={14}
                      color={TealColors.primary}
                    />
                    <Text
                      style={[
                        styles.chatBtnText,
                        { color: TealColors.primary },
                      ]}
                    >
                      {t("history.openConversation")}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        style={styles.messageButton}
        onPress={() =>
          router.push({
            pathname: "/chat/[id]",
            params: {
              id: "general",
              title: "General Support",
              category: "General",
              status: "Active",
              icon: "robot",
            },
          } as never)
        }
        accessibilityLabel="Open general support chat"
      >
        <IconSymbol size={24} name="bubble.right" color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  meta: {
    fontSize: 12,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  chatBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  messageButton: {
    position: "absolute",
    bottom: 20,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TealColors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
