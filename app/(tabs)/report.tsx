import { LeafletMap } from "@/components/leaflet-map";
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
import { playAlertaraActionSound } from "@/services/sound/action-sounds";
import {
  getQCBoundaryCoordinates,
  isCoordinateInsideQCBoundary,
} from "@/utils/qc-boundary";
import {
  ConversationThread,
  deleteCompletedReportConversation,
  formatRelativeTime,
  getSystemAccent,
  isReportCompleted,
  loadConversationInbox,
  resolveStatusColor,
  threadToChatParams,
  upsertConversationThread,
} from "@/utils/conversation-inbox";
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
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LatLng = {
  latitude: number;
  longitude: number;
};

type LocationSuggestion = LatLng & {
  id: string;
  label: string;
};

const QUEZON_CITY_BOUNDARY = getQCBoundaryCoordinates();
const isInsideQuezonCity = isCoordinateInsideQCBoundary;


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
  const [reportStep, setReportStep] = useState<1 | 2 | 3>(1);
  const [otherReportType, setOtherReportType] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [locationNote, setLocationNote] = useState("Detecting location...");
  const [showDetails, setShowDetails] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reportOutcome, setReportOutcome] = useState<
    "none" | "connected" | "queued" | "error"
  >("none");
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<"idle" | "sending" | "success" | "modal">("idle");
  const [locationCoords, setLocationCoords] = useState<LatLng>({
    latitude: 14.654459,
    longitude: 121.072997,
  });
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationSearchMessage, setLocationSearchMessage] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const locationSearchRequestRef = useRef(0);
  const locationResolveRequestRef = useRef(0);
  const skipLocationSearchRef = useRef(false);
  const locationSearchCacheRef = useRef(new Map<string, LocationSuggestion[]>());
  const [locationWarning, setLocationWarning] = useState("");
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
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
  const [showReportForm, setShowReportForm] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [reportThreads, setReportThreads] = useState<ConversationThread[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxRefreshing, setInboxRefreshing] = useState(false);

  const background = isDarkMode
    ? Colors.dark.background
    : Colors.light.background;
  const cardBackground = isDarkMode ? "#152126" : "#ffffff";
  const borderColor = isDarkMode ? "#1f2b32" : "#e6e6e6";
  const accent = TealColors.primary;
  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const tabBarHeight = (Platform.OS === "ios" ? 80 : 60) + insets.bottom;
  const chatConnectionLabel = isSubmitting
    ? "Submitting report..."
    : reportOutcome === "connected"
      ? "Connected to response thread"
      : reportOutcome === "queued"
        ? "Saved locally"
        : reportOutcome === "error"
          ? "Not connected"
          : "Ready to send";

  const loadReportThreads = useCallback(async (silent = false) => {
    if (!silent) setInboxLoading(true);
    try {
      const threads = await loadConversationInbox({ userId: userProfile?.id });
      setReportThreads(threads);
    } finally {
      if (!silent) setInboxLoading(false);
    }
  }, [userProfile?.id]);

  const openReportThread = (thread: ConversationThread) => {
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
    setShowReportForm(true);
  };

  const confirmDeleteReport = (thread: ConversationThread) => {
    if (!isReportCompleted(thread.status)) return;
    Alert.alert(
      "Delete completed report?",
      "This removes the conversation from your report list. The completed emergency record remains in the audit trail.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void (async () => {
            try {
              await deleteCompletedReportConversation(thread, userProfile?.id);
              await loadReportThreads(true);
            } catch (error) {
              Alert.alert(
                "Unable to delete report",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          })(),
        },
      ],
    );
  };

  const refreshAddress = useCallback(async (coords: LatLng) => {
    try {
      const addresses = await Location.reverseGeocodeAsync(coords);
      if (addresses.length) {
        const address = formatAddress(addresses[0]);
        if (address) {
          return address;
        }
      }
    } catch {
      // Coordinates remain usable when the device geocoder is unavailable.
    }

    return formatCoordsDescription(coords);
  }, []);

  const applyManualCoords = async (coords: LatLng, knownAddress?: string) => {
    const requestId = ++locationResolveRequestRef.current;
    setLocationCoords(coords);
    const address = knownAddress || (await refreshAddress(coords));
    if (requestId !== locationResolveRequestRef.current) return;

    setLocationNote(address);
    skipLocationSearchRef.current = true;
    setLocationSearch(address);
    setLocationSuggestions([]);
    setLocationSearchMessage("");
    setLocationWarning(
      isInsideQuezonCity(coords) ? "" : "Choose a location inside Quezon City.",
    );
  };

  const incidentTypes = [
    {
      id: "medical",
      label: "Medical Needs",
      icon: "bandage",
      color: "#8f44fd",
    },
    { id: "fire", label: "Fire Hazards", icon: "flame", color: "#f0543c" },
    {
      id: "chemical",
      label: "Chemical / Hazardous Materials",
      icon: "biohazard",
      color: "#eab308",
    },
    {
      id: "accident",
      label: "Traffic & Vehicular Incidents",
      icon: "car-sport",
      color: "#2d98da",
    },
    { id: "flood", label: "Floods & Natural Hazards", icon: "drop", color: "#3a86ff" },
    { id: "crime", label: "Crime & Public Safety", icon: "shield", color: "#e77a3e" },
    {
      id: "utility",
      label: "Utility & Infrastructure",
      icon: "bolt.fill",
      color: "#f59e0b",
    },
    {
      id: "animal",
      label: "Animal Rescue / Animal Concern",
      icon: "pawprint",
      color: "#16a34a",
    },
    {
      id: "other",
      label: "Other Report",
      icon: "megaphone",
      color: "#64748b",
    },
  ];
  const [selectedType, setSelectedType] = useState(incidentTypes[0].id);
  const selectedTypeMeta =
    incidentTypes.find((t) => t.id === selectedType) ?? incidentTypes[0];
  const resolvedIncidentTypeLabel =
    selectedType === "other" && otherReportType.trim()
      ? `Other Report: ${otherReportType.trim()}`
      : selectedTypeMeta.label;
  const quickPresets = [
    { label: t("report.quickFire"), type: "fire", severity: "High" },
    { label: t("report.quickMedical"), type: "medical", severity: "High" },
  ];

  const handlePreset = (preset: (typeof quickPresets)[number]) => {
    setSelectedType(preset.type);
    setSeverity(preset.severity as "Low" | "Medium" | "High");
    setSummary(`${preset.label} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ ${t("status.pending")}`);
    setDetails(t("report.quickNote"));
  };

  const handleRefreshLocation = async () => {
    setIsRefreshingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationWarning("Location permission denied");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      const requestId = ++locationResolveRequestRef.current;
      setLocationCoords(coords);
      const address = await refreshAddress(coords);
      if (requestId !== locationResolveRequestRef.current) return;
      setLocationNote(address);
      skipLocationSearchRef.current = true;
      setLocationSearch(address);
      setLocationSuggestions([]);
      setLocationSearchMessage("");
      setLocationWarning(
        isInsideQuezonCity(coords)
          ? ""
          : "Reports are currently accepted only for locations inside Quezon City.",
      );
    } catch {
      setLocationWarning("Couldn't refresh location");
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  useEffect(() => {
    const query = locationSearch.trim();
    if (!showReportForm || reportStep !== 2) return;

    if (skipLocationSearchRef.current) {
      skipLocationSearchRef.current = false;
      locationSearchRequestRef.current += 1;
      setIsSearchingLocation(false);
      return;
    }

    const requestId = ++locationSearchRequestRef.current;
    if (query.length < 3) {
      setLocationSuggestions([]);
      setLocationSearchMessage("");
      setIsSearchingLocation(false);
      return;
    }

    const cached = locationSearchCacheRef.current.get(query.toLowerCase());
    if (cached) {
      setLocationSuggestions(cached);
      setLocationSearchMessage(
        cached.length ? "" : "No matching places found inside Quezon City.",
      );
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        setIsSearchingLocation(true);
        setLocationSearchMessage("");
        try {
          let permission = await Location.getForegroundPermissionsAsync();
          if (permission.status !== "granted" && permission.canAskAgain) {
            permission = await Location.requestForegroundPermissionsAsync();
          }
          if (permission.status !== "granted") {
            throw new Error("Allow location access to search for an address.");
          }

          const geocoded = await Location.geocodeAsync(
            `${query}, Quezon City, Metro Manila, Philippines`,
          );
          const unique = new Map<string, LatLng>();
          geocoded.forEach((result) => {
            const coords = {
              latitude: result.latitude,
              longitude: result.longitude,
            };
            if (!isInsideQuezonCity(coords)) return;
            unique.set(`${coords.latitude.toFixed(6)}:${coords.longitude.toFixed(6)}`, coords);
          });

          const suggestions = await Promise.all(
            Array.from(unique.values()).slice(0, 5).map(async (coords, index) => {
              let label = query;
              try {
                const addresses = await Location.reverseGeocodeAsync(coords);
                if (addresses.length) label = formatAddress(addresses[0]) || query;
              } catch {
                // Keep the typed place name when reverse geocoding is unavailable.
              }
              return {
                ...coords,
                id: `${coords.latitude}-${coords.longitude}-${index}`,
                label,
              };
            }),
          );

          if (requestId !== locationSearchRequestRef.current) return;
          locationSearchCacheRef.current.set(query.toLowerCase(), suggestions);
          setLocationSuggestions(suggestions);
          setLocationSearchMessage(
            suggestions.length ? "" : "No matching places found inside Quezon City.",
          );
        } catch (error) {
          if (requestId !== locationSearchRequestRef.current) return;
          setLocationSuggestions([]);
          setLocationSearchMessage(
            error instanceof Error ? error.message : "Address search is unavailable right now.",
          );
        } finally {
          if (requestId === locationSearchRequestRef.current) {
            setIsSearchingLocation(false);
          }
        }
      })();
    }, 700);

    return () => clearTimeout(timer);
  }, [locationSearch, reportStep, showReportForm]);

  const selectLocationSuggestion = (suggestion: LocationSuggestion) => {
    skipLocationSearchRef.current = true;
    setLocationSearch(suggestion.label);
    setLocationSuggestions([]);
    setLocationSearchMessage("");
    void applyManualCoords(suggestion, suggestion.label);
  };

  const handleMediaPicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library permission to attach a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isImage = asset.type === 'image' || asset.mimeType?.startsWith('image/');
        if (!isImage) {
          Alert.alert('Pictures only', 'Incident evidence must be an image, not a video.');
          return;
        }
        const maxSize = 10 * 1024 * 1024;
        if (asset.fileSize && !mediaUploadService.validateFileSize(asset.fileSize, maxSize)) {
          Alert.alert('File too large', 'Please select a picture smaller than 10MB.');
          return;
        }
        setSelectedMedia(asset);
        setUploadedMediaUrl(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick a picture. Please try again.');
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

    const successMessage = "Incident Report Submitted successfully! We have opened a live response thread. You can chat here in real time.";
    setConfirmation(successMessage);
    setReportOutcome("connected");
    setShowDetails(false);

    try {
      await upsertConversationThread({
        id: input.threadId,
        title: summary.trim() || "Incident Report",
        category: "Alert",
        status: input.statusLabel,
        icon: input.icon,
        lastMessage: successMessage,
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
    await loadReportThreads(true);

    setSubmissionPhase("idle");
    setSuccessModalVisible(false);
    router.push({
      pathname: "/chat/[id]",
      params: chatParams,
    } as never);
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
    setReportOutcome("queued");
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
    if (!isInsideQuezonCity(locationCoords)) {
      setLocationWarning("Move the pin to an incident location inside Quezon City.");
      setReportStep(2);
      return;
    }

    setIsSubmitting(true);
    setConfirmation("");
    setReportOutcome("none");
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
          imageOnly: true,
        };
        const response = await mediaUploadService.uploadMedia(uploadData, (progress: any) => {
          setUploadProgress(progress.percentage);
        });
        mediaUrl = response.file_url;
        setUploadedMediaUrl(mediaUrl);
      } catch {
        setSubmissionPhase("idle");
        setIsUploadingMedia(false);
        Alert.alert('Upload failed', 'Failed to upload the picture. Please try again or remove it.');
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
          incidentTypeLabel: resolvedIncidentTypeLabel,
        }),
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
        user_id: userProfile?.id,
        media_url: mediaUrl || undefined,
        user_name: userProfile?.name || "Guest User",
        user_email: userProfile?.email || undefined,
        user_phone: userProfile?.phone || undefined,
        user_location: locationNote,
        severity: severity.toLowerCase() as "low" | "medium" | "high",
      });

      if (!report.conversation_id) {
        throw new Error("The report was saved but no response conversation was created.");
      }

      const reportThreadId = buildReportThreadId(report.id);
      await AsyncStorage.setItem(
        `conversation-${reportThreadId}`,
        String(report.conversation_id),
      );

      void playAlertaraActionSound("reportSend");
      await finalizeSuccessfulReport({
        threadId: reportThreadId,
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
          incidentTypeLabel: resolvedIncidentTypeLabel,
          locationNote,
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
          icon,
          userId: userProfile?.id,
          userName: userProfile?.name || "Guest User",
          userEmail: userProfile?.email || undefined,
          userPhone: userProfile?.phone || undefined,
          mediaUrl: mediaUrl || undefined,
          lastError:
            error instanceof Error ? error.message : t("report.confirmationFail"),
        });

        void playAlertaraActionSound("reportSend");
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
        setLastIncidentChat(null);
        setReportOutcome("error");
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

  useFocusEffect(
    useCallback(() => {
      void loadReportThreads();
      const timer = setInterval(() => {
        if (!showReportForm) void loadReportThreads(true);
      }, 5000);
      return () => clearInterval(timer);
    }, [loadReportThreads, showReportForm]),
  );

  useEffect(() => {
    if (!showReportForm) return;
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
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (subscribed) {
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        const requestId = ++locationResolveRequestRef.current;
        setLocationCoords(coords);
        const address = await refreshAddress(coords);
        if (requestId !== locationResolveRequestRef.current) return;
        setLocationNote(address);
        skipLocationSearchRef.current = true;
        setLocationSearch(address);
        if (!isInsideQuezonCity(coords)) {
          setLocationWarning("Your current GPS is outside Quezon City. Move the pin to the incident location.");
        } else {
          setLocationWarning("");
        }
      }
    })();
    return () => {
      subscribed = false;
    };
  }, [refreshAddress, showReportForm]);

  if (!showReportForm) {
    const mutedColor = isDarkMode ? "#94a3b8" : "#64748b";
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
        <View style={[styles.reportsHeader, { paddingTop: insets.top + 12 }]}>
          <View>
            <ThemedText type="title" style={[styles.reportsTitle, { color: textColor }]}>
              Messages
            </ThemedText>
            <ThemedText style={[styles.reportsSubtitle, { color: mutedColor }]}>
              Follow reports, messages, and response-team updates
            </ThemedText>
          </View>
        </View>

        {inboxLoading ? (
          <ActivityIndicator style={styles.reportsLoader} color={accent} />
        ) : (
          <FlatList
            data={reportThreads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.reportList,
              reportThreads.length === 0 && styles.reportListEmpty,
              { paddingBottom: tabBarHeight + 90 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={inboxRefreshing}
                onRefresh={() => void (async () => {
                  setInboxRefreshing(true);
                  await loadReportThreads(true);
                  setInboxRefreshing(false);
                })()}
                tintColor={accent}
                colors={[accent]}
              />
            }
            ListEmptyComponent={
              <View style={styles.reportEmpty}>
                <View style={[styles.reportEmptyIcon, { backgroundColor: `${accent}18` }]}>
                  <IconSymbol name="bubble.left.and.bubble.right" size={34} color={accent} />
                </View>
                <ThemedText style={[styles.reportEmptyTitle, { color: textColor }]}>
                  No messages yet
                </ThemedText>
                <ThemedText style={[styles.reportEmptyText, { color: mutedColor }]}>
                  Reports, inquiries, and response-team updates will appear here.
                </ThemedText>
              </View>
            }
            ItemSeparatorComponent={() => (
              <View style={[styles.reportSeparator, { backgroundColor: borderColor }]} />
            )}
            renderItem={({ item }) => {
              const statusColor = resolveStatusColor(item.status);
              const systemAccent = getSystemAccent(item.systemId);
              const completed = isReportCompleted(item.status);
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.reportRow,
                    {
                      backgroundColor: pressed
                        ? (isDarkMode ? "#1d2a30" : "#f3f7f8")
                        : cardBackground,
                    },
                  ]}
                  onPress={() => openReportThread(item)}
                >
                  <View style={[styles.reportAvatar, { borderColor: systemAccent, backgroundColor: `${systemAccent}18` }]}>
                    <IconSymbol name={item.icon ?? "exclamationmark.triangle"} size={22} color={systemAccent} />
                  </View>
                  <View style={styles.reportRowBody}>
                    <View style={styles.reportRowTop}>
                      <ThemedText numberOfLines={1} style={[styles.reportRowTitle, { color: textColor }]}>
                        {item.title}
                      </ThemedText>
                      <Text style={[styles.reportRowTime, { color: mutedColor }]}>
                        {formatRelativeTime(item.updatedAt)}
                      </Text>
                    </View>
                    <View style={styles.reportMeta}>
                      <View style={[styles.reportStatus, { borderColor: statusColor, backgroundColor: `${statusColor}18` }]}>
                        <Text style={[styles.reportStatusText, { color: statusColor }]}>
                          {formatReportStatusLabel(item.status ?? "in_queue")}
                        </Text>
                      </View>
                      <Text style={[styles.reportSystem, { color: mutedColor }]}>
                        {item.systemLabel}
                      </Text>
                    </View>
                    <ThemedText numberOfLines={2} style={[styles.reportPreview, { color: mutedColor }]}>
                      {item.lastMessage || "Open this report to view the conversation."}
                    </ThemedText>
                  </View>
                  {completed ? (
                    <Pressable
                      style={styles.reportDelete}
                      onPress={() => confirmDeleteReport(item)}
                      accessibilityLabel="Delete completed report"
                    >
                      <IconSymbol name="trash" size={18} color="#ef4444" />
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}


      
        <View style={[styles.newReportFabWrap, { bottom: tabBarHeight + 10 }]}>
          <Pressable
            style={[styles.newReportFab, { backgroundColor: accent }]}
            onPress={() => setNewChatOpen(true)}
            accessibilityLabel="Create message or report"
          >
            <IconSymbol name="plus" size={28} color="#fff" />
          </Pressable>
        </View>

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
                { backgroundColor: cardBackground, borderColor },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedText style={[styles.modalTitle, { color: textColor }]}>New conversation</ThemedText>

              <Pressable
                style={[styles.modalOption, { borderColor }]}
                onPress={openGeneralChat}
              >
                <View style={[styles.modalIcon, { backgroundColor: `${getSystemAccent("general")}20` }]}>
                  <IconSymbol name="robot" size={18} color={getSystemAccent("general")} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.modalOptionTitle, { color: textColor }]}>General inquiry</ThemedText>
                  <ThemedText style={[styles.modalOptionDesc, { color: mutedColor }]}>Ask questions and get safety guidance</ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={[styles.modalOption, { borderColor }]}
                onPress={openNewReport}
              >
                <View style={[styles.modalIcon, { backgroundColor: `${getSystemAccent("ecs")}20` }]}>
                  <IconSymbol name="exclamationmark.triangle" size={18} color={getSystemAccent("ecs")} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.modalOptionTitle, { color: textColor }]}>Report an incident</ThemedText>
                  <ThemedText style={[styles.modalOptionDesc, { color: mutedColor }]}>Submit a report and open a follow-up thread</ThemedText>
                </View>
              </Pressable>

              <Pressable style={styles.modalCancel} onPress={() => setNewChatOpen(false)}>
                <Text style={{ color: TealColors.primary, fontWeight: "800" }}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

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
        scrollEnabled={!isMapInteracting}
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

        <View style={[styles.chatShell, { backgroundColor: cardBackground, borderColor }]}>
          <View style={[styles.chatHeader, { borderBottomColor: borderColor }]}>
            <View style={styles.chatHeaderIdentity}>
              <View style={styles.chatShield}>
                <IconSymbol name="shield.fill" size={25} color="#ffffff" />
                <View style={styles.chatOnlineDot} />
              </View>
              <View style={styles.chatHeaderCopy}>
                <ThemedText style={[styles.chatHeaderTitle, { color: textColor }]}>Send Report</ThemedText>
                <Text style={styles.chatHeaderStatus}>{chatConnectionLabel}</Text>
              </View>
            </View>
            <Pressable
              style={styles.chatCloseButton}
              onPress={() => {
                setShowReportForm(false);
                setReportStep(1);
                setOtherReportType("");
                setConfirmation("");
              }}
              accessibilityLabel="Close report chat"
            >
              <IconSymbol name="xmark" size={21} color={isDarkMode ? "#cbd5e1" : "#475569"} />
            </Pressable>
          </View>
          <View style={styles.chatConversation}>
            <View style={[styles.assistantBubble, { backgroundColor: isDarkMode ? "#18242f" : "#f1f5f9" }]}>
              <ThemedText style={[styles.chatBubbleText, { color: textColor }]}>
                Hello! I am your Emergency Report Assistant. What would you like to report?
              </ThemedText>
            </View>
            {reportStep >= 2 ? (
              <View style={styles.userBubbleRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userBubbleText}>{resolvedIncidentTypeLabel}</Text>
                </View>
              </View>
            ) : null}
            {reportStep >= 2 ? (
              <View style={[styles.assistantBubble, { backgroundColor: isDarkMode ? "#18242f" : "#f1f5f9" }]}>
                <ThemedText style={[styles.chatBubbleText, { color: textColor }]}>
                  Got it. Where did the incident occur? Please enter the location or landmark below:
                </ThemedText>
              </View>
            ) : null}
        <View style={[styles.quickRow, { display: "none" }]}>
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
            {reportStep === 1 ? (
              <View style={[styles.chatOptionsPanel, { backgroundColor: isDarkMode ? "#111b25" : "#f8fafc", borderColor }]}>
                {incidentTypes.map((type) => (
                  <Pressable
                    key={type.id}
                    style={[styles.chatOptionButton, { backgroundColor: isDarkMode ? "#0b1320" : "#ffffff", borderColor }]}
                    onPress={() => {
                      setSelectedType(type.id);
                      setOtherReportType("");
                      setSummary("");
                      setDetails("");
                      setConfirmation("");
                      if (type.id !== "other") setReportStep(2);
                    }}
                  >
                    <IconSymbol name={type.icon} size={23} color={type.color} />
                    <Text style={[styles.chatOptionText, { color: textColor }]}>{type.label}</Text>
                  </Pressable>
                ))}
                {selectedType === "other" ? (
                  <View style={[styles.otherReportPanel, { borderColor }]}>
                    <Text style={[styles.otherReportLabel, { color: textColor }]}>Identify the report</Text>
                    <TextInput
                      value={otherReportType}
                      onChangeText={setOtherReportType}
                      placeholder="Identify the report"
                      placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                      maxLength={120}
                      returnKeyType="next"
                      style={[
                        styles.otherReportInput,
                        {
                          color: textColor,
                          borderColor,
                          backgroundColor: isDarkMode ? "#0b1320" : "#ffffff",
                        },
                      ]}
                      onSubmitEditing={() => {
                        if (otherReportType.trim()) setReportStep(2);
                      }}
                    />
                    <Pressable
                      disabled={!otherReportType.trim()}
                      style={[
                        styles.otherReportContinue,
                        { backgroundColor: TealColors.primary },
                        !otherReportType.trim() && styles.disabledButton,
                      ]}
                      onPress={() => setReportStep(2)}
                    >
                      <Text style={styles.stepButtonText}>Continue</Text>
                      <IconSymbol name="chevron.right" size={18} color="#ffffff" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

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
            { display: reportStep === 2 ? "flex" : "none" },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>Exact Incident Location</ThemedText>
          <Text style={[styles.locationIntro, { color: isDarkMode ? "#9aa9af" : "#66767d" }]}>
            Search for an address, use your current location, or move the map pin.
          </Text>

          <View
            style={[
              styles.locationSearchBox,
              {
                borderColor,
                backgroundColor: isDarkMode ? "#101a1f" : "#f7fafb",
              },
            ]}
          >
            <IconSymbol name="search" size={18} color={accent} />
            <TextInput
              style={[styles.locationSearchInput, { color: textColor }]}
              value={locationSearch}
              onChangeText={(value) => {
                setLocationSearch(value);
                setLocationSearchMessage("");
              }}
              placeholder="Search street, barangay, or landmark in Quezon City"
              placeholderTextColor={isDarkMode ? "#718087" : "#7b858a"}
              autoCorrect={false}
              returnKeyType="search"
            />
            {isSearchingLocation ? (
              <ActivityIndicator size="small" color={accent} />
            ) : locationSearch ? (
              <Pressable
                accessibilityLabel="Clear location search"
                hitSlop={10}
                onPress={() => {
                  locationSearchRequestRef.current += 1;
                  setLocationSearch("");
                  setLocationSuggestions([]);
                  setLocationSearchMessage("");
                }}
              >
                <IconSymbol name="xmark" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              </Pressable>
            ) : null}
          </View>

          {locationSuggestions.length ? (
            <View style={[styles.locationSuggestions, { borderColor }]}>
              {locationSuggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.id}
                  style={[styles.locationSuggestion, { borderColor }]}
                  onPress={() => selectLocationSuggestion(suggestion)}
                >
                  <IconSymbol name="location" size={17} color={accent} />
                  <Text
                    numberOfLines={2}
                    style={[styles.locationSuggestionText, { color: textColor }]}
                  >
                    {suggestion.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {locationSearchMessage ? (
            <Text style={[styles.locationSearchMessage, { color: isDarkMode ? "#f0b4b4" : "#b42318" }]}>
              {locationSearchMessage}
            </Text>
          ) : null}

          <View style={styles.locationRow}>
            <View style={styles.locationAddress}>
              <ThemedText style={styles.locationLabel}>Selected location</ThemedText>
              <ThemedText style={styles.locationValue}>{locationNote}</ThemedText>
            </View>
            <Pressable
              style={[styles.refreshChip, { borderColor: accent }]}
              onPress={handleRefreshLocation}
              disabled={isRefreshingLocation}
            >
              {isRefreshingLocation ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <IconSymbol name="location" size={16} color={accent} />
              )}
              <Text style={[styles.refreshText, { color: accent }]}>Use Current</Text>
            </Pressable>
          </View>

          <View style={styles.mapPreview}>
            <LeafletMap
              coordinates={QUEZON_CITY_BOUNDARY}
              borderColor={accent}
              selectedLocation={locationCoords}
              editable
              fitBoundary={false}
              onInteractionStart={() => setIsMapInteracting(true)}
              onInteractionEnd={() => setIsMapInteracting(false)}
              onLocationChange={(coords) => void applyManualCoords(coords)}
            />
          </View>
          <Text style={[styles.locationMapHint, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
            The outlined area follows Quezon City&apos;s actual border. Tap the map or drag the pin to refine the location.
          </Text>
          {locationWarning ? (
            <Text style={styles.locationWarning}>{locationWarning}</Text>
          ) : null}
          <View style={styles.stepActions}>
            <Pressable
              style={[styles.stepBackButton, { borderColor }]}
              onPress={() => setReportStep(1)}
            >
              <Text style={[styles.stepBackText, { color: textColor }]}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.stepButton, styles.stepButtonInline, { backgroundColor: TealColors.primary }]}
              onPress={() => {
                if (!isInsideQuezonCity(locationCoords)) {
                  setLocationWarning("Move the pin to an incident location inside Quezon City.");
                  return;
                }
                setReportStep(3);
              }}
            >
              <Text style={styles.stepButtonText}>Confirm Location</Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBackground, borderColor },
            { display: "none" },
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
            { display: reportStep === 3 ? "flex" : "none" },
          ]}
        >
          <View style={styles.userBubbleRow}>
            <View style={styles.userBubble}>
              <Text style={styles.userBubbleText}>
                Location: {locationNote}{"\n"}({locationCoords.latitude.toFixed(6)}, {locationCoords.longitude.toFixed(6)})
              </Text>
            </View>
          </View>
          <View style={[styles.assistantBubble, { backgroundColor: isDarkMode ? "#18242f" : "#f1f5f9" }]}>
            <ThemedText style={[styles.chatBubbleText, { color: textColor }]}>
              Understood. Finally, please describe the incident in detail below. You can also attach a photo before sending.
            </ThemedText>
          </View>
          <TextInput
            style={[styles.input, styles.detailsInput, { color: isDarkMode ? "#fff" : "#111" }]}
            value={summary}
            onChangeText={setSummary}
            placeholder="Describe the emergency incident..."
            placeholderTextColor={isDarkMode ? "#6c6c70" : "#999"}
            maxLength={1000}
            multiline
          />
          <TextInput
            style={[
              styles.input,
              styles.detailsInput,
              { display: "none" },
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
              {selectedMedia ? "Change Photo" : "Add Photo"}
            </Text>
          </Pressable>
          
          {selectedMedia && (
            <View style={styles.mediaPreviewContainer}>
              <Image
                source={{ uri: selectedMedia.uri }}
                style={styles.mediaPreview}
                resizeMode="cover"
              />
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
          <View style={styles.chatComposerActions}>
            <Pressable
              style={[styles.stepBackButton, styles.chatBackButton, { borderColor }]}
              onPress={() => setReportStep(2)}
            >
              <IconSymbol name="chevron.left" size={17} color={textColor} />
            </Pressable>
            <Pressable
              style={[styles.chatSendButton, { backgroundColor: summary.trim() ? "#8e3cac" : "#64748b" }]}
              onPress={handleSubmit}
              disabled={!summary.trim() || isSubmitting}
              accessibilityLabel="Submit incident report"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <IconSymbol name="paperplane.fill" size={21} color="#ffffff" />
              )}
            </Pressable>
          </View>
        </View>

        {isSubmitting ? (
          <View style={[styles.assistantBubble, { backgroundColor: isDarkMode ? "#18242f" : "#f1f5f9" }]}>
            <ThemedText style={[styles.chatBubbleText, { color: textColor }]}>Submitting your incident report. Please wait...</ThemedText>
          </View>
        ) : null}

        {confirmation ? (
          <View style={styles.chatOutcomeBlock}>
            <View style={styles.userBubbleRow}>
              <View style={styles.userBubble}>
                <Text style={styles.userBubbleText}>{summary}</Text>
              </View>
            </View>
            <View style={[styles.assistantBubble, { backgroundColor: isDarkMode ? "#18242f" : "#f1f5f9" }]}>
              <ThemedText style={[styles.chatBubbleText, { color: textColor }]}>{confirmation}</ThemedText>
            </View>
            {lastIncidentChat && reportOutcome !== "error" ? (
              <>
                <View style={styles.connectedThreadBadge}>
                  <Text style={styles.connectedThreadText}>
                    {reportOutcome === "queued"
                      ? "REPORT SAVED - WAITING TO SYNC"
                      : "CONNECTED TO RESPONSE THREAD"}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.confirmationButton,
                    { backgroundColor: TealColors.primary },
                  ]}
                  onPress={() => {
                    router.push({
                      pathname: "/chat/[id]",
                      params: lastIncidentChat,
                    } as never);
                  }}
                >
                  <IconSymbol name="bubble.right" size={16} color="#fff" />
                  <Text style={styles.confirmationButtonText}>
                    View Messages
                  </Text>
                </Pressable>
              </>
            ) : null}
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
          </View>
        </View>
      </ScrollView>
      
      {/* Loading Animation Overlay */}
      {false && (submissionPhase === "sending" || submissionPhase === "success") && (
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
                Your incident report is now in Emergency Communication. A live
                response thread has been opened so an admin can review the
                details and reply. If you are in immediate danger, use
                Emergency Call.
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
                    setOtherReportType("");
                    setSeverity("Medium");
                    setReportStep(1);
                    setShowReportForm(false);
                    void loadReportThreads(true);
                  }}
                >
                  <Text style={styles.successPrimaryButtonText}>
                    Back to Messages
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
      
      {false && <Pressable
        style={[
          styles.floatingButton,
          {
            backgroundColor: "#e53935",
            // Keep the CTA clearly above the bottom tab bar + safe area.
            bottom: tabBarHeight + -30,
            display: reportStep === 3 ? "flex" : "none",
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
      </Pressable>}
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
  chatShell: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 18,
  },
  chatHeader: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatHeaderIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chatShield: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  chatOnlineDot: {
    position: "absolute",
    right: 0,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  chatHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  chatHeaderStatus: {
    marginTop: 2,
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "700",
  },
  chatCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  chatConversation: {
    padding: 14,
    gap: 14,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  chatBubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userBubbleRow: {
    width: "100%",
    alignItems: "flex-end",
  },
  userBubble: {
    maxWidth: "88%",
    borderRadius: 8,
    backgroundColor: "#8e3cac",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userBubbleText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 21,
  },
  chatOptionsPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  chatOptionButton: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  chatOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  otherReportPanel: {
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 12,
    gap: 8,
  },
  otherReportLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  otherReportInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  otherReportContinue: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledButton: {
    opacity: 0.45,
  },
  chatComposerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  chatBackButton: {
    width: 48,
    paddingHorizontal: 0,
    marginTop: 0,
  },
  chatSendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  chatOutcomeBlock: {
    gap: 14,
  },
  connectedThreadBadge: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  connectedThreadText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "800",
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
  reportsHeader: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  reportsTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  reportsSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  reportsLoader: {
    marginTop: 44,
  },
  reportList: {
    paddingHorizontal: 14,
  },
  reportListEmpty: {
    flexGrow: 1,
  },
  reportEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 10,
  },
  reportEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  reportEmptyTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  reportEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  reportSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
  reportRow: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
  },
  reportAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  reportRowBody: {
    flex: 1,
    gap: 5,
  },
  reportRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reportRowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  reportRowTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  reportMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  reportStatus: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reportStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  reportSystem: {
    fontSize: 11,
    fontWeight: "600",
  },
  reportPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  reportDelete: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  newReportFabWrap: {
    position: "absolute",
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  newReportFabLabel: {
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: "800",
    elevation: 2,
  },
  newReportFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
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
    fontWeight: "800",
  },
  modalOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCancel: {
    alignItems: "center",
    paddingVertical: 12,
  },
  stepButton: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stepButtonInline: {
    flex: 1,
    marginTop: 0,
  },
  stepButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  stepActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  stepBackButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  stepBackText: {
    fontSize: 14,
    fontWeight: "700",
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
  locationIntro: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  locationSearchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  locationSearchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 14,
  },
  locationSuggestions: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
    overflow: "hidden",
  },
  locationSuggestion: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationSuggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  locationSearchMessage: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
  },
  locationAddress: {
    flex: 1,
    minWidth: 0,
  },
  locationLabel: {
    fontSize: 12,
    color: "#7a7a7a",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  refreshChip: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 8,
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
    height: 210,
    borderRadius: 8,
    marginTop: 12,
    overflow: "hidden",
  },
  locationMapHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
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


