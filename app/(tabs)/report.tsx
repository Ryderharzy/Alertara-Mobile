import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { useTranslate } from "@/hooks/useTranslate";
import {
    buildReportThreadId,
    emergencyReportService,
    formatReportStatusLabel,
    mapIncidentTypeToReportType,
} from "@/services/api/emergency-report-service";
import { mediaUploadService } from "@/services/api/media-upload-service";
import { upsertConversationThread } from "@/utils/conversation-inbox";
import {
    buildReportDescription,
    enqueueReportSubmission,
    flushPendingReportQueue,
    getPendingReportCount,
    isRetriableSubmitError,
    PENDING_SYNC_STATUS,
    queuedReportToInboxThread,
} from "@/utils/report-submit-queue";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
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
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LatLng = {
  latitude: number;
  longitude: number;
};


const formatCoordsDescription = (coords: LatLng) =>
  `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;

const formatAddress = (address: Location.LocationGeocodedAddress) => {
  return [
    address.name,
    address.street,
    address.district,
    address.city,
    address.subregion,
    address.region,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
};

export default function ReportScreen() {
  const { isDarkMode } = useTheme();
  const { t } = useTranslate();
  const { userProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [locationNote, setLocationNote] = useState("Detecting location...");
  const [showDetails, setShowDetails] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<"idle" | "sending" | "success" | "modal">("idle");
  const [locationCoords, setLocationCoords] = useState<LatLng>({
    latitude: 14.654459,
    longitude: 121.072997,
  });
  const [manualLock, setManualLock] = useState(false);
  const [locationWarning, setLocationWarning] = useState("");
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryingQueue, setIsRetryingQueue] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastIncidentChat, setLastIncidentChat] = useState<{
    id: string;
    title: string;
    category: string;
    status: string;
    icon: string;
  } | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);

  const background = isDarkMode
    ? Colors.dark.background
    : Colors.light.background;
  const cardBackground = isDarkMode ? "#152126" : "#ffffff";
  const borderColor = isDarkMode ? "#1f2b32" : "#e6e6e6";
  const accent = TealColors.primary;
  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const tabBarHeight = (Platform.OS === "ios" ? 80 : 60) + insets.bottom;

  const refreshAddress = useCallback(async (coords: LatLng) => {
    try {
      const addresses = await Location.reverseGeocodeAsync(coords);
      if (addresses.length) {
        setLocationNote(formatAddress(addresses[0]));
        setLocationWarning("");
        return;
      }
    } catch {
      setLocationWarning("Precise address unavailable");
    }

    setLocationNote(formatCoordsDescription(coords));
  }, []);

  const applyManualCoords = async (coords: LatLng) => {
    setLocationCoords(coords);
    await refreshAddress(coords);
  };

  const incidentTypes = [
    { id: "fire", label: t("type.fire"), icon: "flame", color: "#f0543c" },
    {
      id: "medical",
      label: t("type.medical"),
      icon: "bandage",
      color: "#8f44fd",
    },
    { id: "crime", label: t("type.crime"), icon: "shield", color: "#e77a3e" },
    {
      id: "accident",
      label: t("type.accident"),
      icon: "car-sport",
      color: "#2d98da",
    },
    { id: "flood", label: t("type.flood"), icon: "drop", color: "#3a86ff" },
  ];
  const [selectedType, setSelectedType] = useState(incidentTypes[0].id);
  const selectedTypeMeta =
    incidentTypes.find((t) => t.id === selectedType) ?? incidentTypes[0];
  const quickPresets = [
    { label: t("report.quickFire"), type: "fire", severity: "High" },
    { label: t("report.quickMedical"), type: "medical", severity: "High" },
  ];

  const handlePreset = (preset: (typeof quickPresets)[number]) => {
    setSelectedType(preset.type);
    setSeverity(preset.severity as "Low" | "Medium" | "High");
    setSummary(`${preset.label} – ${t("status.pending")}`);
    setDetails(t("report.quickNote"));
  };

  const handleLocationToggle = () => {
    setManualLock((prev) => !prev);
  };

  const handleRefreshLocation = async () => {
    setIsRefreshingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationWarning("Location permission denied");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setLocationCoords(coords);
      await refreshAddress(coords);
      setLocationWarning("");
    } catch {
      setLocationWarning("Couldn't refresh location");
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  const handleMediaPicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to attach media.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // Check file size - limit videos to 50MB
        const maxSize = asset.type?.startsWith('video') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (asset.fileSize && !mediaUploadService.validateFileSize(asset.fileSize, maxSize)) {
          const maxSizeMB = asset.type?.startsWith('video') ? 50 : 10;
          Alert.alert('File too large', `Please select a file smaller than ${maxSizeMB}MB.`);
          return;
        }
        setSelectedMedia(asset);
        // Reset uploaded URL when new media is selected
        setUploadedMediaUrl(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setUploadedMediaUrl(null);
    setUploadProgress(0);
  };

  const finalizeSuccessfulReport = async (input: {
    threadId: string;
    icon: string;
    statusLabel: string;
    submittedAt: string;
    openChat?: boolean;
  }) => {
    const chatParams = {
      id: input.threadId,
      title: encodeURIComponent(summary.trim() || "Incident Report"),
      category: "Alert",
      icon: input.icon,
      status: input.statusLabel,
    };

    setConfirmation(t("report.confirmationOk"));
    setShowDetails(false);

    try {
      await upsertConversationThread({
        id: input.threadId,
        title: summary.trim() || "Incident Report",
        category: "Alert",
        status: input.statusLabel,
        icon: input.icon,
        lastMessage: t("report.confirmationOk"),
        lastMessageFrom: "system",
        updatedAt: input.submittedAt,
      });
    } catch {
      // ignore index write errors
    }

    await AsyncStorage.setItem(
      "last-incident-chat",
      JSON.stringify(chatParams),
    );
    setLastIncidentChat(chatParams);

    // Show success modal instead of navigating to chat
    setSuccessModalVisible(true);
  };

  const openPendingReportChat = async (
    localId: string,
    icon: string,
    queuedMessage: string,
  ) => {
    const chatParams = {
      id: localId,
      title: encodeURIComponent(summary.trim() || "Incident Report"),
      category: "Alert",
      icon,
      status: PENDING_SYNC_STATUS,
    };

    await AsyncStorage.setItem(
      "last-incident-chat",
      JSON.stringify(chatParams),
    );
    setLastIncidentChat(chatParams);
    setConfirmation(queuedMessage);
    setShowDetails(false);
    router.push({
      pathname: "/chat/[id]",
      params: chatParams,
    } as never);
  };

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await getPendingReportCount());
  }, []);

  const handleRetryQueue = useCallback(
    async (options?: { silent?: boolean }) => {
      if (isRetryingQueue) return;
      const count = await getPendingReportCount();
      if (!count) {
        setPendingCount(0);
        return;
      }

      setIsRetryingQueue(true);
      try {
        const result = await flushPendingReportQueue();
        await refreshPendingCount();

        if (result.synced > 0 && !options?.silent) {
          setConfirmation(
            t(
              "report.queueSynced",
              "{count} report(s) sent successfully.",
            ).replace("{count}", String(result.synced)),
          );
        }

        if (result.failed > 0 && !options?.silent) {
          setConfirmation(
            result.lastError ??
              t(
                "report.queueRetryFailed",
                "Some reports are still waiting to send. Try again.",
              ),
          );
        }
      } finally {
        setIsRetryingQueue(false);
      }
    },
    [isRetryingQueue, refreshPendingCount, t],
  );

  const handleSubmit = async () => {
    if (!summary.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setConfirmation("");
    setSubmissionPhase("sending");

    // Upload media if selected
    let mediaUrl = null;
    if (selectedMedia && !uploadedMediaUrl) {
      setIsUploadingMedia(true);
      setUploadProgress(0);
      try {
        const uploadData = {
          file: {
            uri: selectedMedia.uri,
            type: selectedMedia.mimeType || 'image/jpeg',
            name: selectedMedia.fileName || `media_${Date.now()}.jpg`,
            size: selectedMedia.fileSize,
          },
        };
        const response = await mediaUploadService.uploadMedia(uploadData, (progress: any) => {
          setUploadProgress(progress.percentage);
        });
        mediaUrl = response.file_url;
        setUploadedMediaUrl(mediaUrl);
      } catch (error) {
        setSubmissionPhase("idle");
        setIsUploadingMedia(false);
        Alert.alert('Upload failed', 'Failed to upload media. Please try again or remove the attachment.');
        setIsSubmitting(false);
        return;
      } finally {
        setIsUploadingMedia(false);
      }
    } else if (uploadedMediaUrl) {
      mediaUrl = uploadedMediaUrl;
    }

    const icon =
      incidentTypes.find((item) => item.id === selectedType)?.icon ??
      "exclamationmark.triangle";

    try {
      const report = await emergencyReportService.submitReport({
        report_type: mapIncidentTypeToReportType(selectedType),
        description: buildReportDescription({
          summary,
          details,
          severity,
          locationNote,
        }),
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
        user_id: userProfile?.id,
        media_url: mediaUrl || undefined,
      });

      // Show success checkmark animation
      setSubmissionPhase("success");
      
      // Wait for checkmark animation, then show modal
      setTimeout(() => {
        setSubmissionPhase("modal");
        setSuccessModalVisible(true);
      }, 1500);

      await finalizeSuccessfulReport({
        threadId: buildReportThreadId(report.id),
        icon,
        statusLabel: formatReportStatusLabel(report.status),
        submittedAt: report.created_at ?? new Date().toISOString(),
      });
    } catch (error) {
      setSubmissionPhase("idle");
      if (isRetriableSubmitError(error)) {
        const queued = await enqueueReportSubmission({
          summary: summary.trim(),
          details,
          severity,
          selectedType,
          locationNote,
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
          icon,
          userId: userProfile?.id,
          lastError:
            error instanceof Error ? error.message : t("report.confirmationFail"),
        });

        await queuedReportToInboxThread(queued);
        await refreshPendingCount();
        await openPendingReportChat(
          queued.localId,
          icon,
          t(
            "report.queuedOffline",
            "Saved offline. Your report will send automatically when connection returns.",
          ),
        );
      } else {
        setConfirmation(
          error instanceof Error && error.message
            ? error.message
            : t("report.confirmationFail"),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await refreshPendingCount();
        await handleRetryQueue({ silent: true });
      })();
    }, [handleRetryQueue, refreshPendingCount]),
  );

  useEffect(() => {
    let subscribed = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("last-incident-chat");
        if (saved && subscribed) {
          setLastIncidentChat(JSON.parse(saved));
        }
      } catch {
        // ignore load errors
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (subscribed) {
          setLocationWarning("Location permission denied");
          setLocationNote("Enable location services to auto-fill");
        }
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      if (subscribed) {
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setLocationCoords(coords);
        await refreshAddress(coords);
      }
    })();
    return () => {
      subscribed = false;
    };
  }, [refreshAddress]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20 },
          // Ensure the last fields aren't hidden behind the floating submit CTA
          // and the bottom tab bar.
          { paddingBottom: tabBarHeight + 56 + 6 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {pendingCount > 0 ? (
          <Pressable
            style={[
              styles.queueBanner,
              {
                backgroundColor: isDarkMode ? "#3b2f14" : "#fff7e6",
                borderColor: isDarkMode ? "#854d0e" : "#f59e0b",
              },
            ]}
            onPress={() => void handleRetryQueue()}
            disabled={isRetryingQueue}
          >
            <View style={styles.queueBannerLeft}>
              <IconSymbol
                name="clock.arrow.circlepath"
                size={18}
                color={isDarkMode ? "#fbbf24" : "#b45309"}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.queueBannerTitle,
                    { color: isDarkMode ? "#fde68a" : "#92400e" },
                  ]}
                >
                  {t(
                    "report.queueBannerTitle",
                    "{count} report(s) waiting to send",
                  ).replace("{count}", String(pendingCount))}
                </Text>
                <Text
                  style={[
                    styles.queueBannerText,
                    { color: isDarkMode ? "#fcd34d" : "#a16207" },
                  ]}
                >
                  {isRetryingQueue
                    ? t("report.queueRetrying", "Retrying now...")
                    : t("report.queueBannerAction", "Tap to retry now")}
                </Text>
              </View>
            </View>
            {isRetryingQueue ? (
              <ActivityIndicator color={TealColors.primary} />
            ) : null}
          </Pressable>
        ) : null}

        <View
          style={[
            styles.heroCard,
            { backgroundColor: isDarkMode ? "#0f172a" : "#e8f5f2" },
          ]}
        >
          <View style={styles.heroHeader}>
            <IconSymbol
              size={28}
              name="exclamationmark.triangle"
              color={TealColors.primary}
            />
            <ThemedText style={styles.heroKicker}>
              Step 1 of 3 · {t("report.title")}
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            {t("report.title")}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {t("report.subtitle")}
          </ThemedText>
          <Pressable
            style={[
              styles.historyButton,
              {
                borderColor,
                backgroundColor: isDarkMode ? "#102026" : "#ffffff",
              },
            ]}
            onPress={() => router.push("/(tabs)/messages" as never)}
          >
            <IconSymbol
              name="clock.arrow.circlepath"
              size={16}
              color={TealColors.primary}
            />
            <Text
              style={[styles.historyButtonText, { color: TealColors.primary }]}
            >
              {t("report.historyButton")}
            </Text>
          </Pressable>
        </View>
        <View style={styles.quickRow}>
          {quickPresets.map((preset) => (
            <Pressable
              key={preset.label}
              style={[
                styles.quickButton,
                {
                  borderColor,
                  backgroundColor: isDarkMode ? "#102026" : "#f7fbff",
                },
              ]}
              onPress={() => handlePreset(preset)}
            >
              <ThemedText style={styles.quickText}>{preset.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("report.incidentType")}
          </ThemedText>
          <Pressable
            style={[
              styles.typeSelect,
              {
                borderColor,
                backgroundColor: isDarkMode ? "#0f1b20" : "#f8fafc",
              },
            ]}
            onPress={() => setTypePickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("report.incidentType")}
          >
            <View style={styles.typeSelectLeft}>
              <View
                style={[
                  styles.typeIconBubble,
                  {
                    backgroundColor: `${selectedTypeMeta.color}22`,
                    borderColor: `${selectedTypeMeta.color}55`,
                  },
                ]}
              >
                <IconSymbol
                  name={selectedTypeMeta.icon}
                  size={18}
                  color={selectedTypeMeta.color}
                />
              </View>
              <ThemedText
                style={[styles.typeSelectLabel, { color: textColor }]}
              >
                {selectedTypeMeta.label}
              </ThemedText>
            </View>
            <IconSymbol
              name="chevron.down"
              size={16}
              color={isDarkMode ? "#cbd5e1" : "#475569"}
            />
          </Pressable>
          <Text style={styles.helperText}>
            {t("report.typeHelp", "Tap to change the incident type.")}
          </Text>
        </View>

        <Modal
          visible={typePickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setTypePickerOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setTypePickerOpen(false)}
          >
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: cardBackground, borderColor },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                {t("report.incidentType")}
              </ThemedText>
              {incidentTypes.map((type) => {
                const active = selectedType === type.id;
                return (
                  <Pressable
                    key={type.id}
                    style={[
                      styles.modalItem,
                      {
                        borderColor: active ? type.color : borderColor,
                        backgroundColor: active
                          ? `${type.color}18`
                          : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setSelectedType(type.id);
                      setTypePickerOpen(false);
                    }}
                  >
                    <View style={styles.modalItemLeft}>
                      <View
                        style={[
                          styles.modalIconBubble,
                          { backgroundColor: `${type.color}22` },
                        ]}
                      >
                        <IconSymbol
                          name={type.icon}
                          size={18}
                          color={type.color}
                        />
                      </View>
                      <ThemedText
                        style={[styles.modalItemLabel, { color: textColor }]}
                      >
                        {type.label}
                      </ThemedText>
                    </View>
                    {active ? (
                      <IconSymbol
                        name="checkmark"
                        size={16}
                        color={type.color}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("report.location")}
          </ThemedText>
          <View style={styles.locationRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.locationLabel}>
                {t("report.currentLocation")}
              </ThemedText>
              <ThemedText style={styles.locationValue}>
                {locationNote}
              </ThemedText>
            </View>
            <Pressable
              style={[styles.refreshChip, { borderColor: accent }]}
              onPress={handleRefreshLocation}
            >
              {isRefreshingLocation ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <IconSymbol name="location" size={16} color={accent} />
              )}
              <Text style={[styles.refreshText, { color: accent }]}>
                {t("report.refresh")}
              </Text>
            </Pressable>
          </View>
          <MapView
            style={styles.mapPreview}
            region={{
              latitude: locationCoords.latitude,
              longitude: locationCoords.longitude,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            }}
            showsUserLocation
            onPress={(event) => {
              if (manualLock) {
                const coords = event.nativeEvent.coordinate;
                void applyManualCoords(coords);
              }
            }}
          >
            <Marker
              coordinate={locationCoords}
              pinColor={accent}
              draggable={manualLock}
              onDragEnd={(event) => {
                const coords = event.nativeEvent.coordinate;
                void applyManualCoords(coords);
              }}
            />
          </MapView>
          {locationWarning ? (
            <Text style={styles.locationWarning}>{locationWarning}</Text>
          ) : null}
          <Pressable
            style={[styles.lockButton, { borderColor }]}
            onPress={handleLocationToggle}
          >
            <IconSymbol
              name={manualLock ? "lock.open" : "lock"}
              size={16}
              color={accent}
            />
            <Text style={styles.lockText}>
              {manualLock ? t("report.manualPin") : t("report.autoGPS")}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("report.severity")}
          </ThemedText>
          <View style={styles.severityRow}>
            {["Low", "Medium", "High"].map((level) => {
              const active = severity === level;
              const color =
                level === "High"
                  ? "#e53935"
                  : level === "Medium"
                    ? "#ff9800"
                    : "#4caf50";
              return (
                <Pressable
                  key={level}
                  onPress={() =>
                    setSeverity(level as "Low" | "Medium" | "High")
                  }
                  style={[
                    styles.severityPill,
                    {
                      borderColor: color,
                      backgroundColor: active ? `${color}22` : "transparent",
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.severityText, active && { color }]}
                  >
                    {level === "High"
                      ? t("severity.high")
                      : level === "Medium"
                        ? t("severity.medium")
                        : t("severity.low")}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("report.details")}
          </ThemedText>
          <TextInput
            style={[styles.input, { color: isDarkMode ? "#fff" : "#111" }]}
            value={summary}
            onChangeText={setSummary}
            placeholder={t("report.shortSummary")}
            placeholderTextColor={isDarkMode ? "#6c6c70" : "#999"}
            maxLength={140}
          />
          <Text style={styles.helperText}>{summary.length}/140 characters</Text>
          <TextInput
            style={[
              styles.input,
              styles.detailsInput,
              { color: isDarkMode ? "#fff" : "#111" },
            ]}
            value={details}
            onChangeText={setDetails}
            placeholder={t("report.optionalNotes")}
            placeholderTextColor={isDarkMode ? "#6c6c70" : "#999"}
            multiline
          />
          <Text style={styles.helperText}>{t("report.helper")}</Text>
          
          {/* Media Attachment Section */}
          <Pressable
            style={[styles.attachButton, { borderColor }]}
            onPress={handleMediaPicker}
          >
            <IconSymbol
              name="camera"
              size={18}
              color={isDarkMode ? "#fff" : "#111"}
            />
            <Text style={styles.attachText}>
              {selectedMedia ? "Change Media" : t("report.attach")}
            </Text>
          </Pressable>
          
          {selectedMedia && (
            <View style={styles.mediaPreviewContainer}>
              {selectedMedia.type?.startsWith('video') ? (
                <View style={styles.videoPreview}>
                  <IconSymbol name="play.circle" size={48} color={TealColors.primary} />
                  <Text style={styles.videoText}>Video Selected</Text>
                  <Text style={styles.mediaSizeText}>
                    {mediaUploadService.formatFileSize(selectedMedia.fileSize || 0)}
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: selectedMedia.uri }}
                  style={styles.mediaPreview}
                  resizeMode="cover"
                />
              )}
              {isUploadingMedia && (
                <View style={styles.uploadProgressOverlay}>
                  <ActivityIndicator color={TealColors.primary} />
                  <Text style={styles.uploadProgressText}>
                    Uploading... {uploadProgress}%
                  </Text>
                </View>
              )}
              <Pressable
                style={styles.removeMediaButton}
                onPress={handleRemoveMedia}
              >
                <IconSymbol name="xmark.circle.fill" size={24} color="#e53935" />
              </Pressable>
            </View>
          )}
          
          {showDetails && (
            <ThemedText style={styles.noteText}>
              {t("report.attachNote")}
            </ThemedText>
          )}
        </View>

        {confirmation ? (
          <View
            style={[
              styles.confirmationCard,
              {
                borderColor,
                backgroundColor: isDarkMode ? "#122024" : "#f1f9f6",
              },
            ]}
          >
            <ThemedText style={styles.confirmationText}>
              {confirmation}
            </ThemedText>
            <Pressable
              style={[
                styles.confirmationButton,
                { backgroundColor: TealColors.primary },
              ]}
              onPress={() => {
                if (lastIncidentChat) {
                  router.push({
                    pathname: "/chat/[id]",
                    params: lastIncidentChat,
                  } as never);
                }
              }}
            >
              <IconSymbol name="bubble.right" size={16} color="#fff" />
              <Text style={styles.confirmationButtonText}>
                {t("report.openChat")}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {!confirmation && lastIncidentChat ? (
          <Pressable
            style={[
              styles.resumeChip,
              {
                borderColor: TealColors.primary,
                backgroundColor: isDarkMode ? "#102026" : "#e8f6f2",
              },
            ]}
            onPress={() =>
              router.push({
                pathname: "/chat/[id]",
                params: lastIncidentChat,
              } as never)
            }
          >
            <IconSymbol
              name="arrow.uturn.right"
              size={14}
              color={TealColors.primary}
            />
            <Text style={[styles.resumeText, { color: TealColors.primary }]}>
              {t("report.resumeChip")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      
      {/* Loading Animation Overlay */}
      {(submissionPhase === "sending" || submissionPhase === "success") && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            {submissionPhase === "sending" ? (
              <>
                <ActivityIndicator size="large" color={TealColors.primary} />
                <ThemedText style={[styles.loadingText, { color: textColor }]}>
                  {t("report.sending", "Sending Report...")}
                </ThemedText>
              </>
            ) : (
              <View style={styles.checkmarkContainer}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={80}
                  color="#4caf50"
                />
                <ThemedText style={[styles.checkmarkText, { color: textColor }]}>
                  {t("report.sent", "Report Sent!")}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      )}
      
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSuccessModalVisible(false)}
        >
          <Pressable
            style={[
              styles.successModalCard,
              { backgroundColor: cardBackground, borderColor },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.successModalContent}>
              <View style={styles.successIconContainer}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={60}
                  color="#4caf50"
                />
              </View>
              <ThemedText style={[styles.successTitle, { color: textColor }]}>
                {t("report.successTitle", "Report Submitted Successfully")}
              </ThemedText>
              <ThemedText style={[styles.successMessage, { color: textColor }]}>
                {t("report.successMessage", "Your emergency report has been received. Emergency responders have been notified and are being dispatched to your location. Please stay safe and wait for further instructions.")}
              </ThemedText>
              <View style={styles.successActions}>
                <Pressable
                  style={[
                    styles.successPrimaryButton,
                    { backgroundColor: TealColors.primary },
                  ]}
                  onPress={() => {
                    setSuccessModalVisible(false);
                    setSubmissionPhase("idle");
                    setConfirmation("");
                    setSummary("");
                    setDetails("");
                    setSeverity("Medium");
                    router.push("/(tabs)" as never);
                  }}
                >
                  <Text style={styles.successPrimaryButtonText}>
                    {t("report.returnToDashboard", "Return to Dashboard")}
                  </Text>
                </Pressable>
                {lastIncidentChat && (
                  <Pressable
                    style={[
                      styles.successSecondaryButton,
                      { borderColor },
                    ]}
                    onPress={() => {
                      setSuccessModalVisible(false);
                      setSubmissionPhase("idle");
                      router.push({
                        pathname: "/chat/[id]",
                        params: lastIncidentChat,
                      } as never);
                    }}
                  >
                    <Text style={[styles.successSecondaryButtonText, { color: textColor }]}>
                      {t("report.viewReportChat", "View Report Chat")}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      
      <Pressable
        style={[
          styles.floatingButton,
          {
            backgroundColor: "#e53935",
            // Keep the CTA clearly above the bottom tab bar + safe area.
            bottom: tabBarHeight + -30,
          },
        ]}
        onPress={handleSubmit}
        disabled={!summary.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={20}
            color="#fff"
          />
        )}
        <Text style={styles.floatingText}>
          {isSubmitting
            ? t("report.sending")
            : summary.trim()
              ? t("report.submit")
              : t("report.addSummary")}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 140, // overridden dynamically to account for tab bar + safe area
  },
  queueBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  queueBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  queueBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  queueBannerText: {
    fontSize: 12,
    marginTop: 2,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    marginTop: 12,
  },
  heroText: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    gap: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.25)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: "700",
    color: TealColors.primary,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  historyButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  typeSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  typeSelectLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typeIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  typeSelectLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: "#7a7a7a",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  refreshChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 999,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
  },
  severityRow: {
    flexDirection: "row",
    gap: 12,
  },
  severityPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  severityText: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    borderColor: "#d0d4db",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailsInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  attachText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noteText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: {
    fontWeight: "700",
    color: "#fff",
    fontSize: 16,
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  quickText: {
    fontSize: 13,
    fontWeight: "600",
  },
  locationWarning: {
    color: "#f44336",
    fontSize: 12,
    marginTop: 8,
  },
  lockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  lockText: {
    fontSize: 12,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: "#8a8a8a",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    padding: 14,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  modalItem: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalItemLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  successModalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 20,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  successModalContent: {
    alignItems: "center",
    gap: 16,
  },
  successIconContainer: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    color: "#666",
  },
  successActions: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  successPrimaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  successPrimaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  successSecondaryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  successSecondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 12,
  },
  checkmarkContainer: {
    alignItems: "center",
    gap: 12,
  },
  checkmarkText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4caf50",
  },
  mapPreview: {
    height: 190,
    borderRadius: 16,
    marginTop: 12,
    overflow: "hidden",
  },
  mediaPreviewContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  mediaPreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  videoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  videoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  mediaSizeText: {
    fontSize: 14,
    color: "#666",
  },
  uploadProgressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadProgressText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  removeMediaButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
  },
  floatingButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    elevation: 10,
  },
  floatingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  confirmationCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  confirmationText: {
    fontSize: 13,
    color: "#2f9d63",
  },
  confirmationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  confirmationButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  resumeChip: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  resumeText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
