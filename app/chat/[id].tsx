import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { useTranslate } from "@/hooks/useTranslate";
import type { ChatMessage as ApiChatMessage } from "@/services/api/chat-service";
import { chatService } from "@/services/api/chat-service";
import {
  emergencyReportService,
  formatReportStatusLabel,
  INCIDENT_STATUS_OPTIONS,
  IncidentStatus,
  parseReportIdFromThreadId,
  statusLabelToKey,
  statusToTranslationKey,
} from "@/services/api/emergency-report-service";
import { mediaUploadService } from "@/services/api/media-upload-service";
import { markConversationThreadRead, upsertConversationThread } from "@/utils/conversation-inbox";
import { playAlertaraActionSound } from "@/services/sound/action-sounds";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

type LocalChatMessage = {
  id: string;
  from: "bot" | "user";
  text: string;
  sentAt: number;
  attachmentUrl?: string;
  attachmentType?: string;
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
  in_queue: "#14b8a6",
  pending: "#e3b341",
  pending_status: "#e3b341",
  received: "#3b82f6",
  dispatching: "#f59e0b",
  ongoing_dispatch: "#8b5cf6",
  in_progress: "#8b5cf6",
  resolved: "#2f9d63",
  completed: "#16a34a",
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
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [statusLabel, setStatusLabel] = useState<string | undefined>(() =>
    rawStatus ? decodeURIComponent(rawStatus) : undefined,
  );
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRealTimeChat, setIsRealTimeChat] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [adminInChat, setAdminInChat] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const lastSeenAdminMessageIdRef = useRef(0);

  const categoryLabel = category ? decodeURIComponent(category) : "General";
  const iconName = threadIcon || "robot";
  const reportId = parseReportIdFromThreadId(threadId);
  const canChangeStatus = false;
  const currentStatusKey = statusLabel ? statusLabelToKey(statusLabel) : null;
  const statusColor =
    currentStatusKey && statusColors[currentStatusKey]
      ? statusColors[currentStatusKey]
      : "#9ca3af";
  const { userProfile } = useAuth();

  // Check if this is a general support chat (should connect to human operators)
  const isGeneralSupport = threadId === "general" || categoryLabel === "General";
  const supportsResponseTeamChat = isGeneralSupport || reportId !== null;

  useEffect(() => {
    if (rawStatus) {
      setStatusLabel(decodeURIComponent(rawStatus));
    }
  }, [rawStatus]);

  useEffect(() => {
    void markConversationThreadRead(threadId);
  }, [threadId]);

  useEffect(() => {
    if (reportId === null) return;
    let active = true;
    const syncStatus = async () => {
      try {
        const report = await emergencyReportService.getReport(reportId);
        if (!active || !report) return;
        const nextStatus = formatReportStatusLabel(report.status);
        setStatusLabel(nextStatus);
        await upsertConversationThread({
          id: threadId,
          title: alertTitle,
          category: categoryLabel,
          status: nextStatus,
          icon: iconName,
          reportId,
          conversationId: report.conversation_id,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Keep the last known status while the device is offline.
      }
    };
    void syncStatus();
    const timer = setInterval(syncStatus, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [alertTitle, categoryLabel, iconName, reportId, threadId]);

  // Load the server conversation created for general support or an incident report.
  useEffect(() => {
    if (!supportsResponseTeamChat) return;

    const loadRealTimeConversation = async () => {
      try {
        setIsLoadingMessages(true);
        
        // Try to get conversation ID from storage
        const storedConvId = await AsyncStorage.getItem(`conversation-${threadId}`);
        
        if (storedConvId) {
          const convId = parseInt(storedConvId);
          setConversationId(convId);
          setIsRealTimeChat(true);
          
          // Try to load messages to verify conversation is still open
          try {
            const apiMessages = await chatService.getMessages(convId, userProfile?.id);
            setAdminInChat(apiMessages.some((msg) => msg.sender_type === 'admin'));
            
            // Convert API messages to local format
            const localMessages: LocalChatMessage[] = apiMessages.map((msg: ApiChatMessage) => ({
              id: msg.message_id.toString(),
              from: msg.sender_type === 'admin' ? 'bot' : 'user',
              text: msg.message_text,
              sentAt: new Date(msg.created_at).getTime(),
              attachmentUrl: msg.attachment_url,
              attachmentType: msg.attachment_mime,
            }));
            
            setMessages(localMessages);
          } catch (error) {
            // If loading messages fails, conversation might be closed
            console.error('Failed to load conversation messages, clearing ID:', error);
            await AsyncStorage.removeItem(`conversation-${threadId}`);
            setConversationId(null);
            setIsRealTimeChat(true);
          }
        } else {
          // No existing conversation, will create on first message
          setIsRealTimeChat(true);
        }
      } catch (error) {
        console.error('Failed to load real-time conversation:', error);
        // Fall back to local storage
        setIsRealTimeChat(false);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadRealTimeConversation();
  }, [threadId, supportsResponseTeamChat, userProfile?.id]);

  // Keep the mobile thread synchronized with replies from the admin console.
  useEffect(() => {
    if (!isRealTimeChat || !conversationId) return;
    let active = true;

    const refreshMessages = async () => {
      try {
        const apiMessages = await chatService.getMessages(conversationId, userProfile?.id);
        if (!active) return;
        setAdminInChat(apiMessages.some((msg) => msg.sender_type === 'admin'));
        const latestAdminMessage = [...apiMessages]
          .reverse()
          .find((msg) => msg.sender_type === 'admin');
        const latestAdminMessageId = Number(latestAdminMessage?.message_id || 0);
        if (latestAdminMessageId && latestAdminMessageId > lastSeenAdminMessageIdRef.current) {
          void playAlertaraActionSound("reportSend");
          lastSeenAdminMessageIdRef.current = latestAdminMessageId;
        }
        await markConversationThreadRead(threadId);
        setMessages(apiMessages.map((msg: ApiChatMessage) => ({
          id: msg.message_id.toString(),
          from: msg.sender_type === 'admin' ? 'bot' : 'user',
          text: msg.message_text,
          sentAt: new Date(msg.created_at).getTime(),
          attachmentUrl: msg.attachment_url,
          attachmentType: msg.attachment_mime,
        })));
      } catch (error) {
        console.warn('Unable to refresh response-team messages:', error);
      }
    };

    void refreshMessages();
    const timer = setInterval(() => void refreshMessages(), 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationId, isRealTimeChat, threadId, userProfile?.id]);

  const promptChips = useMemo(() => {
    const key = (category ?? "General").toString();
    return promptMap[key] ?? promptMap.General;
  }, [category]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const buildInitialMessage = () => {
    const statusText = statusLabel ? `Current status: ${statusLabel}. ` : "Current status: In Queue. ";
    const categoryText =
      categoryLabel !== "General" ? `${categoryLabel} incident. ` : "";
    return `You’re chatting about "${alertTitle}". ${categoryText}${statusText}I can help with safety guidance, updates, next steps, or follow-up information.`;
  };

  const generateBotReply = (message: string) => {
    const normalized = message.toLowerCase();
    const categoryPrefix =
      categoryLabel !== "General" ? `${categoryLabel} incident: ` : "";

    if (normalized.includes("status") || normalized.includes("update")) {
      return `${categoryPrefix}Your reported incident is currently marked as ${statusLabel ?? "In Queue"}. If the situation changes, update the details here so you can stay coordinated with responders.`;
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
          const parsed = JSON.parse(saved) as LocalChatMessage[];
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

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    const userMsg: LocalChatMessage = {
      id: `u-${Date.now()}`,
      from: "user",
      text: trimmed,
      sentAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg].slice(-MAX_HISTORY));
    setInput("");

    // Handle real-time chat for general support and submitted incident reports.
    if (supportsResponseTeamChat && isRealTimeChat) {
      try {
        let currentConvId = conversationId;
        
        // Create conversation if it doesn't exist
        if (!currentConvId) {
          if (!isGeneralSupport) {
            throw new Error('This report is still connecting to the response team. Please reopen it and try again.');
          }
          const newConv = await chatService.createConversation({
            user_id: userProfile?.id,
            user_name: userProfile?.name || 'Guest User',
            user_email: userProfile?.email || undefined,
            user_phone: userProfile?.phone || undefined,
            user_concern: 'general_enquiry',
            is_guest: !userProfile?.id ? 1 : 0,
            message: trimmed,
          });
          
          currentConvId = newConv.conversation_id;
          setConversationId(currentConvId);
          await AsyncStorage.setItem(`conversation-${threadId}`, currentConvId.toString());
        } else {
          // Send message to existing conversation
          await chatService.sendMessage({
            conversation_id: currentConvId,
            sender_id: userProfile?.id?.toString(),
            sender_name: userProfile?.name || 'Guest User',
            sender_type: 'user',
            message_text: trimmed,
          });
        }
        
        // Add system message indicating connection to human operator
        const systemMsg: LocalChatMessage = {
          id: `s-${Date.now()}`,
          from: "bot" as const,
          text: "Your message has been sent to our support team. An operator will respond shortly.",
          sentAt: Date.now(),
        };
        setMessages((prev) => [...prev, systemMsg].slice(-MAX_HISTORY));
        
      } catch (error) {
        console.error('Failed to send real-time message:', error);
        
        // Check if conversation is closed, clear it and try creating new one
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('closed conversation') && conversationId) {
          console.log('Conversation closed, clearing stored ID and creating new one');
          await AsyncStorage.removeItem(`conversation-${threadId}`);
          setConversationId(null);
          
          // Try again with new conversation
          try {
            const newConv = await chatService.createConversation({
              user_id: userProfile?.id,
              user_name: userProfile?.name || 'Guest User',
              user_email: userProfile?.email || undefined,
              user_phone: userProfile?.phone || undefined,
              user_concern: 'general_enquiry',
              is_guest: !userProfile?.id ? 1 : 0,
              message: trimmed,
            });
            
            setConversationId(newConv.conversation_id);
            await AsyncStorage.setItem(`conversation-${threadId}`, newConv.conversation_id.toString());
            
            const systemMsg: LocalChatMessage = {
              id: `s-${Date.now()}`,
              from: "bot" as const,
              text: "Your message has been sent to our support team. An operator will respond shortly.",
              sentAt: Date.now(),
            };
            setMessages((prev) => [...prev, systemMsg].slice(-MAX_HISTORY));
            return;
          } catch (retryError) {
            console.error('Failed to create new conversation:', retryError);
          }
        }
        
        // Fall back to bot response
        const botMsg: LocalChatMessage = {
          id: `b-${Date.now()}`,
          from: "bot" as const,
          text: "Sorry, there was an error connecting to our support team. " + generateBotReply(trimmed),
          sentAt: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg].slice(-MAX_HISTORY));
      }
    } else {
      // Use simulated bot for incident-related chats
      setTimeout(() => {
        const botMsg: LocalChatMessage = {
          id: `b-${Date.now()}`,
          from: "bot" as const,
          text: generateBotReply(trimmed),
          sentAt: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg].slice(-MAX_HISTORY));
      }, 900);
    }
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

  const handleMediaPicker = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to attach media.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate file size (max 10MB)
        if (asset.fileSize && !mediaUploadService.validateFileSize(asset.fileSize)) {
          Alert.alert('File too large', 'Please select a file smaller than 10MB.');
          return;
        }

        setSelectedMedia(asset);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const handleMediaUpload = async () => {
    if (!selectedMedia) return;

    try {
      setIsUploadingMedia(true);
      setUploadProgress(0);

      const uploadData = {
        file: {
          uri: selectedMedia.uri,
          type: selectedMedia.mimeType || 'image/jpeg',
          name: selectedMedia.fileName || `media_${Date.now()}.jpg`,
          size: selectedMedia.fileSize,
        },
        conversation_id: conversationId || undefined,
      };

      const response = await mediaUploadService.uploadMedia(uploadData, (progress: any) => {
        setUploadProgress(progress.percentage);
      });

      // For general support chats with real-time connection
      if (supportsResponseTeamChat && isRealTimeChat && conversationId) {
        await chatService.sendMessage({
          conversation_id: conversationId,
          sender_id: userProfile?.id,
          sender_name: userProfile?.name || 'Guest User',
          sender_type: 'user',
          message_text: input || 'Sent an attachment',
          attachment_url: response.file_url,
          attachment_mime: response.file_type,
          attachment_size: response.file_size,
        });
      }

      // Add local message with media attachment for all chat types
      const mediaMsg: LocalChatMessage = {
        id: `m-${Date.now()}`,
        from: "user",
        text: input || 'Sent an attachment',
        sentAt: Date.now(),
        attachmentUrl: response.file_url,
        attachmentType: response.file_type,
      };
      setMessages((prev) => [...prev, mediaMsg].slice(-MAX_HISTORY));

      setSelectedMedia(null);
      setInput('');
      setUploadProgress(0);

    } catch (error) {
      console.error('Failed to upload media:', error);
      Alert.alert('Upload failed', 'Failed to upload media. Please try again.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
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
          from: "bot" as const,
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
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.keyboardAware}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
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
            {reportId === null ? (
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
            ) : null}
          </View>

          <View style={[styles.threadCard, { backgroundColor: cardBg, flex: 1 }]}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
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
                  {m.attachmentUrl && (
                    <Image 
                      source={{ uri: m.attachmentUrl }} 
                      style={styles.chatMedia}
                      resizeMode="cover"
                    />
                  )}
                  {m.text && (
                    <ThemedText
                      style={[
                        styles.bubbleText,
                        { color: m.from === "user" ? "#ffffff" : textColor },
                      ]}
                    >
                      {m.text}
                    </ThemedText>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.bottomSection}>
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

            {/* Media Preview */}
            {selectedMedia && (
              <View style={styles.mediaPreview}>
                <Image 
                  source={{ uri: selectedMedia.uri }} 
                  style={styles.mediaThumbnail}
                  resizeMode="cover"
                />
                <Pressable 
                  style={styles.removeMediaBtn}
                  onPress={handleRemoveMedia}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </Pressable>
                {isUploadingMedia && (
                  <View style={styles.uploadProgress}>
                    <ActivityIndicator size="small" color={TealColors.primary} />
                    <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.composer, { backgroundColor: cardBg }]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask a question..."
                placeholderTextColor="#6b7280"
                style={[styles.input, { color: textColor }]}
                onFocus={() => {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
                }}
                multiline
              />
              <View style={styles.composerIcons}>
                <Pressable onPress={handleMediaPicker} style={styles.attachBtn}>
                  <Ionicons name="attach" size={18} color="#6b7280" />
                </Pressable>
                <Pressable style={styles.attachBtn}>
                  <Ionicons name="camera" size={18} color="#6b7280" />
                </Pressable>
                <Pressable style={styles.attachBtn}>
                  <Ionicons name="mic" size={18} color="#6b7280" />
                </Pressable>
              </View>
              <Pressable
                style={[
                  styles.sendBtn,
                  {
                    opacity: (input.trim().length || selectedMedia) ? 1 : 0.4,
                    borderColor: TealColors.primary,
                  },
                ]}
                disabled={!input.trim().length && !selectedMedia}
                onPress={() => selectedMedia ? handleMediaUpload() : send(input)}
              >
                <IconSymbol
                  name="paperplane.fill"
                  size={18}
                  color={TealColors.primary}
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

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
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAware: { flex: 1 },
  hero: {
    backgroundColor: TealColors.primary,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#0f172a",
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
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    color: TealColors.primary,
    fontWeight: "600",
  },
  threadCard: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  bottomSection: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  threadContent: {
    padding: 12,
    gap: 12,
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
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
  chatMedia: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
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
  attachBtn: {
    padding: 8,
  },
  mediaPreview: {
    marginHorizontal: 12,
    marginBottom: 8,
    position: 'relative',
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  uploadProgress: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadProgressText: {
    color: '#ffffff',
    fontSize: 10,
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
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 15,
  },
  statusCancel: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});



