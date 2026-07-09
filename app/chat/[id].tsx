import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/theme-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

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

export default function ChatScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { id, title, category } = useLocalSearchParams<{
    id?: string;
    title?: string;
    category?: string;
  }>();
  const alertTitle = decodeURIComponent(title ?? "Alert chat");
  const threadId = id ?? "general";
  const storageKey = `${STORAGE_PREFIX}${threadId}`;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const promptChips = useMemo(() => {
    const key = (category ?? "General").toString();
    return promptMap[key] ?? promptMap.General;
  }, [category]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

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
            text: `You’re chatting about "${alertTitle}". Ask for instructions, sources, or next steps.`,
            sentAt: Date.now(),
          },
        ]);
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey, alertTitle]);

  useEffect(() => {
    if (!messages.length) return;
    void AsyncStorage.setItem(
      storageKey,
      JSON.stringify(messages.slice(-MAX_HISTORY))
    );
  }, [messages, storageKey]);

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
    // Mock bot reply
    setTimeout(() => {
      setMessages((prev) =>
        [
          ...prev,
          {
            id: `b-${Date.now()}`,
            from: "bot",
            text: `Bot: For "${alertTitle}", here’s a quick check — follow official guidance, stay tuned for updates, and ensure your household is ready.`,
            sentAt: Date.now(),
          },
        ].slice(-MAX_HISTORY)
      );
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

  const screenBg = isDarkMode ? Colors.dark.background : Colors.light.background;
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
              <MaterialCommunityIcons name="robot" size={26} color="#0f172a" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.heroTitle} numberOfLines={1}>
                {alertTitle}
              </ThemedText>
              <ThemedText style={styles.heroSubtitle} numberOfLines={1}>
                {(category ? decodeURIComponent(category) : "General") + " · AI Assistant"}
              </ThemedText>
            </View>
            <Pressable onPress={handleReset} style={styles.resetBtn} accessibilityLabel="Reset chat history">
              <IconSymbol name="arrow.counterclockwise" size={18} color="#e0f2f1" />
            </Pressable>
          </View>

          <View style={[styles.threadCard, { backgroundColor: cardBg }]}>
            <ScrollView ref={scrollRef} contentContainerStyle={styles.threadContent}>
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    m.from === "user"
                      ? [styles.userBubble, { backgroundColor: bubbleUser }]
                      : [styles.botBubble, { backgroundColor: bubbleBot }]
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
                    backgroundColor: pressed ? `${TealColors.primary}1A` : `${TealColors.primary}10`,
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
                { opacity: input.trim().length ? 1 : 0.4, borderColor: TealColors.primary },
              ]}
              disabled={!input.trim().length}
              onPress={() => send(input)}
            >
              <IconSymbol name="paperplane.fill" size={18} color={TealColors.primary} />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function SafeHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <Pressable onPress={onBack} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
        <ThemedText style={{ fontSize: 14, color: TealColors.primary }}>‹ Back</ThemedText>
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
});
