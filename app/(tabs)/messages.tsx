import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { useTranslate } from "@/hooks/useTranslate";
import {
  clearConversationInbox,
  ConversationThread,
  formatRelativeTime,
  getSystemAccent,
  isReportCompleted,
  loadConversationInbox,
  resolveStatusColor,
  threadToChatParams,
} from "@/utils/conversation-inbox";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function previewPrefix(
  from: ConversationThread["lastMessageFrom"],
  t: (key: string, fallback?: string) => string,
): string {
  if (from === "user") return `${t("messages.you", "You")}: `;
  if (from === "bot") return `${t("messages.assistant", "Assistant")}: `;
  return "";
}

export default function MessagesScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { userProfile } = useAuth();
  const { t } = useTranslate();
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const background = isDarkMode
    ? Colors.dark.background
    : Colors.light.background;
  const cardBg = isDarkMode ? "#18252a" : "#ffffff";
  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const mutedColor = isDarkMode ? "#94a3b8" : "#64748b";
  const borderColor = isDarkMode ? "#24333b" : "#e1e7ec";

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      try {
        const items = await loadConversationInbox({
          userId: userProfile?.id,
        });
        setThreads(items);
      } catch {
        setThreads([]);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [userProfile?.id],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {};
    }, [load]),
  );

  const openChat = (thread: ConversationThread) => {
    router.push({
      pathname: "/chat/[id]",
      params: threadToChatParams(thread),
    } as never);
  };

  const openGeneralChat = () => {
    setNewChatOpen(false);
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: "general",
        title: encodeURIComponent("General Support"),
        category: "General",
        status: "Active",
        icon: "robot",
      },
    } as never);
  };

  const openNewReport = () => {
    setNewChatOpen(false);
    router.push("/(tabs)/report" as never);
  };

  const handleClear = () => {
    if (!threads.length) return;
    const hasActiveReport = threads.some((thread) =>
      (thread.id.startsWith("report-") ||
        thread.id.startsWith("pending-") ||
        thread.id.startsWith("incident-")) &&
      !isReportCompleted(thread.status),
    );
    if (hasActiveReport) {
      Alert.alert(
        "Active report conversations cannot be deleted",
        "A report can be removed only after the response team marks it Completed.",
      );
      return;
    }
    Alert.alert(
      t("messages.clearTitle", "Clear conversations?"),
      t(
        "messages.clearBody",
        "This removes your conversation list. Chat messages stay on this device until you reset each thread.",
      ),
      [
        { text: t("action.cancel", "Cancel"), style: "cancel" },
        {
          text: t("action.clear", "Clear"),
          style: "destructive",
          onPress: async () => {
            await clearConversationInbox();
            setThreads([]);
          },
        },
      ],
    );
  };

  const renderStatusLabel = (status?: string) => {
    const key = (status ?? "pending").toLowerCase().replace(/\s+/g, "_");
    if (key === "pending") return t("status.pending");
    if (key === "received") return t("status.received");
    if (key === "in_progress" || key === "in progress")
      return t("status.inProgress");
    if (key === "resolved") return t("status.resolved");
    if (key === "rejected") return t("status.rejected");
    if (key === "pending sync") return t("status.pendingSync");
    if (key === "active") return t("messages.active", "Active");
    return status ?? t("status.pending");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <ThemedText type="title" style={[styles.title, { color: textColor }]}>
            {t("messages.title", "Messages")}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
            {userProfile?.id
              ? t(
                  "messages.subtitleSynced",
                  "Synced with your account and local conversations",
                )
              : t(
                  "messages.subtitle",
                  "Your conversations with city systems and support",
                )}
          </ThemedText>
        </View>
        <Pressable
          style={[styles.clearBtn, { borderColor: TealColors.primary }]}
          onPress={handleClear}
          disabled={!threads.length}
        >
          <IconSymbol
            name="trash"
            size={14}
            color={threads.length ? TealColors.primary : "#9ca3af"}
          />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 32 }}
          color={TealColors.primary}
        />
      ) : threads.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: `${TealColors.primary}18` },
            ]}
          >
            <IconSymbol
              name="bubble.left.and.bubble.right"
              size={32}
              color={TealColors.primary}
            />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
            {t("messages.emptyTitle", "No conversations yet")}
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
            {t(
              "messages.emptyBody",
              "Start a general inquiry or submit an incident report to begin.",
            )}
          </ThemedText>
          <Pressable
            style={[styles.emptyCta, { backgroundColor: TealColors.primary }]}
            onPress={() => setNewChatOpen(true)}
          >
            <IconSymbol name="plus" size={16} color="#fff" />
            <Text style={styles.emptyCtaText}>
              {t("messages.startConversation", "Start a conversation")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={TealColors.primary}
              colors={[TealColors.primary]}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: borderColor }]} />
          )}
          renderItem={({ item }) => {
            const accent = getSystemAccent(item.systemId);
            const statusColor = resolveStatusColor(item.status);
            const icon = item.icon ?? "exclamationmark.triangle";
            const preview = item.lastMessage
              ? `${previewPrefix(item.lastMessageFrom, t)}${item.lastMessage}`
              : t("messages.noPreview", "No messages yet");

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed
                      ? isDarkMode
                        ? "#1f2d34"
                        : "#f8fafc"
                      : cardBg,
                  },
                ]}
                onPress={() => openChat(item)}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: `${accent}20`, borderColor: accent },
                  ]}
                >
                  <IconSymbol name={icon} size={20} color={accent} />
                </View>

                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <ThemedText
                      style={[styles.rowTitle, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </ThemedText>
                    <Text style={[styles.rowTime, { color: mutedColor }]}>
                      {formatRelativeTime(item.updatedAt)}
                    </Text>
                  </View>

                  <View style={styles.systemRow}>
                    <View
                      style={[
                        styles.systemBadge,
                        {
                          backgroundColor: `${accent}15`,
                          borderColor: `${accent}40`,
                        },
                      ]}
                    >
                      <Text style={[styles.systemBadgeText, { color: accent }]}>
                        {item.systemLabel}
                      </Text>
                    </View>
                    {item.status ? (
                      <View
                        style={[
                          styles.statusPill,
                          {
                            borderColor: statusColor,
                            backgroundColor: `${statusColor}15`,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: statusColor }]}
                        >
                          {renderStatusLabel(item.status)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <ThemedText
                    style={[styles.preview, { color: mutedColor }]}
                    numberOfLines={2}
                  >
                    {preview}
                  </ThemedText>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => setNewChatOpen(true)}
        accessibilityLabel={t("messages.newConversation", "New conversation")}
      >
        <IconSymbol name="plus" size={24} color="#fff" />
      </Pressable>

      <Modal
        visible={newChatOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNewChatOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNewChatOpen(false)}
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDarkMode ? "#1c2830" : "#ffffff",
                borderColor,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText style={[styles.modalTitle, { color: textColor }]}>
              {t("messages.newConversation", "New conversation")}
            </ThemedText>

            <Pressable
              style={[styles.modalOption, { borderColor }]}
              onPress={openGeneralChat}
            >
              <View
                style={[
                  styles.modalIcon,
                  { backgroundColor: `${getSystemAccent("general")}20` },
                ]}
              >
                <IconSymbol
                  name="robot"
                  size={18}
                  color={getSystemAccent("general")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.modalOptionTitle, { color: textColor }]}>
                  {t("messages.generalInquiry", "General inquiry")}
                </ThemedText>
                <ThemedText style={[styles.modalOptionDesc, { color: mutedColor }]}>
                  {t(
                    "messages.generalInquiryDesc",
                    "Ask questions and get safety guidance",
                  )}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={[styles.modalOption, { borderColor }]}
              onPress={openNewReport}
            >
              <View
                style={[
                  styles.modalIcon,
                  { backgroundColor: `${getSystemAccent("ecs")}20` },
                ]}
              >
                <IconSymbol
                  name="exclamationmark.triangle"
                  size={18}
                  color={getSystemAccent("ecs")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.modalOptionTitle, { color: textColor }]}>
                  {t("messages.reportIncident", "Report an incident")}
                </ThemedText>
                <ThemedText style={[styles.modalOptionDesc, { color: mutedColor }]}>
                  {t(
                    "messages.reportIncidentDesc",
                    "Submit a report and open a follow-up thread",
                  )}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={styles.modalCancel}
              onPress={() => setNewChatOpen(false)}
            >
              <Text style={{ color: TealColors.primary, fontWeight: "700" }}>
                {t("action.cancel", "Cancel")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    maxWidth: 280,
  },
  clearBtn: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 78,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  rowTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  systemBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  preview: {
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCtaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TealColors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCancel: {
    alignItems: "center",
    paddingVertical: 12,
  },
});
