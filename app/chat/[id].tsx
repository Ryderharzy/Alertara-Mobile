import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import { useTranslate } from "@/hooks/useTranslate";
import {
  emergencyReportService,
  formatReportStatusLabel,
  INCIDENT_STATUS_OPTIONS,
  IncidentStatus,
  parseReportIdFromThreadId,
  statusLabelToKey,
  statusToTranslationKey,
} from "@/services/api/emergency-report-service";
import { upsertConversationThread } from "@/utils/conversation-inbox";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ChatMessage = {
  id: string;
  from: "bot" | "user";
  text: string;
  sentAt: number;
};

const promptMap: Record<string, string[]> = {
  Alert: [
    "Type of alert?",
    "Who is the source?",
    "Latest data update?",
    "What should I do now?",
    "Evac routes?",
    "Emergency contacts?",
  ],
  Weather: [
    "Rainfall or wind strength?",
    "Flood risk level?",
    "When does it pass?",
    "Safe routes?",
    "What to prepare?",
  ],
  Fire: [
    "Evacuation routes?",
    "Shelter locations?",
    "Air quality/smoke?",
    "Who to call?",
  ],
  General: [
    "How to stay informed?",
    "Nearest help desk?",
    "Emergency contacts?",
    "Preparedness checklist?",
  ],
};

const STORAGE_PREFIX = "chat-thread-";
const MAX_HISTORY = 50;

const statusColors: Record<IncidentStatus, string> = {
  pending: "#e3b341",
  received: "#3b82f6",
  in_progress: "#8b5cf6",
  resolved: "#2f9d63",
  rejected: "#ef4444",
};

export default function ChatScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { t } = useTranslate();
  const {
    id,
    title,
    category,
    status: rawStatus,
    icon: rawIcon,
  } = useLocalSearchParams<{
    id?: string;
    title?: string;
    category?: string;
    status?: string;
    icon?: string;
  }>();
  const alertTitle = decodeURIComponent(title ?? "Alert chat");
  const threadId = id ?? "general";
  const threadIcon = rawIcon ? decodeURIComponent(rawIcon) : "robot";
  const storageKey = `${STORAGE_PREFIX}${threadId}`;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusLabel, setStatusLabel] = useState<string | undefined>(() =>
    rawStatus ? decodeURIComponent(rawStatus) : undefined,
  );
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const categoryLabel = category ? decodeURIComponent(category) : "General";
  const iconName = threadIcon || "robot";
  const reportId = parseReportIdFromThreadId(threadId);
  const canChangeStatus = reportId !== null;
  const currentStatusKey = statusLabel ? statusLabelToKey(statusLabel) : null;
  const statusColor =
    currentStatusKey && statusColors[currentStatusKey]
      ? statusColors[currentStatusKey]
      : "#9ca3af";

  useEffect(() => {
    if (rawStatus) {
      setStatusLabel(decodeURIComponent(rawStatus));
    }
  }, [rawStatus]);

  const promptChips = useMemo(() => {
    const key = (category ?? "General").toString();
    return promptMap[key] ?? promptMap.General;
  }, [category]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const buildInitialMessage = () => {
    const statusText = statusLabel ? `Current status: ${statusLabel}. ` : "";
    const categoryText =
      categoryLabel !== "General" ? `${categoryLabel} incident. ` : "";
    return `You’re chatting about "${alertTitle}". ${categoryText}${statusText}I can help with safety guidance, updates, next steps, or follow-up information.`;
  };

  const generateBotReply = (message: string) => {
    const normalized = message.toLowerCase();
    const categoryPrefix =
      categoryLabel !== "General" ? `${categoryLabel} incident: ` : "";

    if (normalized.includes("status") || normalized.includes("update")) {
      return `${categoryPrefix}Your reported incident is currently marked as ${statusLabel ?? "pending"}. If the situation changes, update the details here so you can stay coordinated with responders.`;
    }

    if (
      normalized.includes("evac") ||
      normalized.includes("route") ||
      normalized.includes("safe")
    ) {
      return `${categoryPrefix}Choose the safest route away from affected areas. Avoid hazard zones, follow official directions, and keep a clear path for emergency vehicles.`;
    }

    if (
      normalized.includes("contact") ||
      normalized.includes("authority") ||
      normalized.includes("police") ||
      normalized.includes("fire")
    ) {
      return `${categoryPrefix}Contact the nearest emergency response team if the situation worsens. For non-critical updates, I can help you phrase the message to the right authority.`;
    }

    if (
      normalized.includes("help") ||
      normalized.includes("what") ||
      normalized.includes("how")
    ) {
      return `${categoryPrefix}I can help by summarizing your current status, suggesting next steps, or pointing you to the right local support resources. What would you like to do next?`;
    }

    return `${categoryPrefix}Here are the best next steps:
• Keep clear of the affected area.
• Stay available for updates.
• Share any new details or changes in status.
• Contact authorities if conditions get worse.`;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (!active) return;
        if (saved) {
          const parsed = JSON.parse(saved) as ChatMessage[];
          setMessages(parsed);
          return;
        }
      } catch {}
      if (active) {
        setMessages([
          {
            id: "m-0",
            from: "bot",
            text: buildInitialMessage(),
            sentAt: Date.now(),
          },
        ]);
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey, alertTitle, statusLabel, categoryLabel]);

  useEffect(() => {
    if (!messages.length) return;
    void AsyncStorage.setItem(
      storageKey,
      JSON.stringify(messages.slice(-MAX_HISTORY)),
    );

    const last = messages[messages.length - 1];
    void upsertConversationThread({
      id: threadId,
      title: alertTitle,
      category: categoryLabel,
      status: statusLabel,
      icon: iconName,
      lastMessage: last.text,
      lastMessageFrom: last.from,
      updatedAt: new Date(last.sentAt).toISOString(),
    });
  }, [
    messages,
    storageKey,
    threadId,
    alertTitle,
    categoryLabel,
    statusLabel,
    iconName,
  ]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      from: "user",
      text: trimmed,
      sentAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg].slice(-MAX_HISTORY));
    setInput("");

    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        from: "bot",
        text: generateBotReply(trimmed),
        sentAt: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg].slice(-MAX_HISTORY));
    }, 900);
  };

  const handleReset = async () => {
    await AsyncStorage.removeItem(storageKey);
    setMessages([
      {
        id: "m-0",
        from: "bot",
        text: `You’re chatting about "${alertTitle}". Ask for instructions, sources, or next steps.`,
        sentAt: Date.now(),
      },
    ]);
  };

  const syncLastIncidentChatStatus = async (nextLabel: string) => {
    try {
      const saved = await AsyncStorage.getItem("last-incident-chat");
      if (!saved) return;
      const last = JSON.parse(saved) as { id?: string; status?: string };
      if (last.id !== threadId) return;
      await AsyncStorage.setItem(
        "last-incident-chat",
        JSON.stringify({ ...last, status: nextLabel }),
      );
    } catch {
      // non-blocking
    }
  };

  const handleStatusChange = async (nextStatus: IncidentStatus) => {
    if (!reportId || isUpdatingStatus) return;

    setShowStatusMenu(false);
    setIsUpdatingStatus(true);

    try {
      await emergencyReportService.updateStatus({
        report_id: reportId,
        status: nextStatus,
      });

      const nextLabel = formatReportStatusLabel(nextStatus);
      setStatusLabel(nextLabel);

      const statusMessage = t("chat.statusUpdated", "Status updated to {status}.").replace(
        "{status}",
        t(statusToTranslationKey(nextStatus), nextLabel),
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          from: "bot",
          text: statusMessage,
          sentAt: Date.now(),
        },
      ].slice(-MAX_HISTORY));

      await upsertConversationThread({
        id: threadId,
        title: alertTitle,
        category: categoryLabel,
        status: nextLabel,
        icon: iconName,
        lastMessage: statusMessage,
        lastMessageFrom: "system",
        updatedAt: new Date().toISOString(),
      });

      await syncLastIncidentChatStatus(nextLabel);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t("chat.statusUpdateFailed", "Could not update status. Please try again.");
      Alert.alert(t("chat.changeStatus", "Change status"), message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const screenBg = isDarkMode
    ? Colors.dark.background
    : Colors.light.background;
  const cardBg = isDarkMode ? "#1c2830" : "#ffffff";
  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const bubbleBot = "rgba(46, 125, 95, 0.12)";
  const bubbleUser = TealColors.primary;

  return (
    <ThemedView style={[styles.container, { backgroundColor: screenBg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.hero}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="arrow.left" size={18} color="#ffffff" />
            </Pressable>
            <View style={styles.avatar}>
              <IconSymbol name={iconName} size={26} color="#0f172a" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.heroTitle} numberOfLines={1}>
                {alertTitle}
              </ThemedText>
              <ThemedText style={styles.heroSubtitle} numberOfLines={1}>
                {categoryLabel} · AI Assistant
              </ThemedText>
              {statusLabel ? (
                <Pressable
                  onPress={() => {
                    if (canChangeStatus && !isUpdatingStatus) {
                      setShowStatusMenu(true);
                    }
                  }}
                  disabled={!canChangeStatus || isUpdatingStatus}
                  accessibilityLabel={t(
                    "chat.tapToChangeStatus",
                    "Tap to update incident status",
                  )}
                  style={({ pressed }) => [
                    styles.statusPill,
                    {
                      borderColor: statusColor,
                      backgroundColor: `${statusColor}20`,
                      opacity: pressed && canChangeStatus ? 0.85 : 1,
                    },
                  ]}
                >
                  {isUpdatingStatus ? (
                    <ActivityIndicator size="small" color={statusColor} />
                  ) : (
                    <ThemedText
                      style={[styles.statusPillText, { color: statusColor }]}
                    >
                      Status:{" "}
                      {currentStatusKey
                        ? t(
                            statusToTranslationKey(currentStatusKey),
                            statusLabel,
                          )
                        : statusLabel}
                      {canChangeStatus ? " ▾" : ""}
                    </ThemedText>
                  )}
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={handleReset}
              style={styles.resetBtn}
              accessibilityLabel="Reset chat history"
            >
              <IconSymbol
                name="arrow.counterclockwise"
                size={18}
                color="#e0f2f1"
              />
            </Pressable>
          </View>

          <View style={[styles.threadCard, { backgroundColor: cardBg }]}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.threadContent}
            >
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    m.from === "user"
                      ? [styles.userBubble, { backgroundColor: bubbleUser }]
                      : [styles.botBubble, { backgroundColor: bubbleBot }],
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.bubbleText,
                      { color: m.from === "user" ? "#ffffff" : textColor },
                    ]}
                  >
                    {m.text}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.promptsScroller}
            contentContainerStyle={styles.promptsRow}
          >
            {promptChips.map((chip) => (
              <Pressable
                key={chip}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: pressed
                      ? `${TealColors.primary}1A`
                      : `${TealColors.primary}10`,
                    borderColor: `${TealColors.primary}40`,
                  },
                ]}
                onPress={() => send(chip)}
              >
                <ThemedText style={styles.chipText}>{chip}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.composer, { backgroundColor: cardBg }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask a question..."
              placeholderTextColor="#6b7280"
              style={[styles.input, { color: textColor }]}
              multiline
            />
            <View style={styles.composerIcons}>
              <Ionicons name="attach" size={18} color="#6b7280" />
              <Ionicons name="camera" size={18} color="#6b7280" />
              <Ionicons name="mic" size={18} color="#6b7280" />
            </View>
            <Pressable
              style={[
                styles.sendBtn,
                {
                  opacity: input.trim().length ? 1 : 0.4,
                  borderColor: TealColors.primary,
                },
              ]}
              disabled={!input.trim().length}
              onPress={() => send(input)}
            >
              <IconSymbol
                name="paperplane.fill"
                size={18}
                color={TealColors.primary}
              />
            </Pressable>
          </View>
        </SafeAreaView>

        <Modal
          visible={showStatusMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStatusMenu(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowStatusMenu(false)}
          >
            <Pressable
              style={[
                styles.statusSheet,
                {
                  backgroundColor: isDarkMode ? "#1c2830" : "#ffffff",
                  borderColor: isDarkMode ? "#24333b" : "#e1e7ec",
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <ThemedText style={[styles.statusSheetTitle, { color: textColor }]}>
                {t("chat.changeStatus", "Change status")}
              </ThemedText>

              {INCIDENT_STATUS_OPTIONS.map((option) => {
                const optionColor = statusColors[option];
                const isActive = currentStatusKey === option;
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.statusOption,
                      {
                        borderColor: isActive ? optionColor : isDarkMode ? "#24333b" : "#e1e7ec",
                        backgroundColor: isActive ? `${optionColor}15` : "transparent",
                      },
                    ]}
                    onPress={() => void handleStatusChange(option)}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: optionColor },
                      ]}
                    />
                    <Text style={[styles.statusOptionText, { color: textColor }]}>
                      {t(statusToTranslationKey(option), formatReportStatusLabel(option))}
                    </Text>
                    {isActive ? (
                      <IconSymbol name="checkmark" size={16} color={optionColor} />
                    ) : null}
                  </Pressable>
                );
              })}

              <Pressable
                style={styles.statusCancel}
                onPress={() => setShowStatusMenu(false)}
              >
                <Text style={{ color: TealColors.primary, fontWeight: "700" }}>
                  {t("action.cancel", "Cancel")}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function SafeHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <Pressable
        onPress={onBack}
        style={{ paddingVertical: 6, paddingHorizontal: 4 }}
      >
        <ThemedText style={{ fontSize: 14, color: TealColors.primary }}>
          ‹ Back
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    backgroundColor: TealColors.primary,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0f2f1",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#e0f2f1",
    marginTop: 2,
  },
  statusLabel: {
    fontSize: 11,
    color: "#d7f7ee",
    marginTop: 4,
    opacity: 0.88,
  },
  statusPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  resetBtn: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
  },
  promptsScroller: {
    maxHeight: 36,
  },
  promptsRow: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 6,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 22,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "600",
    color: TealColors.primary,
  },
  threadCard: {
    marginTop: 15,
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 1,
    minHeight: 260,
  },
  threadContent: {
    gap: 10,
    paddingVertical: 4,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
  },
  botBubble: {
    alignSelf: "flex-start",
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  composer: {
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  composerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    minHeight: 38,
    maxHeight: 110,
  },
  sendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#ffffff",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  statusSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
    gap: 8,
  },
  statusSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  statusCancel: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
});
