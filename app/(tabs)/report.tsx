import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import { useTranslate } from "@/hooks/useTranslate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LatLng = {
  latitude: number;
  longitude: number;
};

const INCIDENT_INDEX_KEY = "incident-chat-index";
const STATUS_PENDING = "Pending";

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [locationNote, setLocationNote] = useState("Detecting location...");
  const [showDetails, setShowDetails] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [locationCoords, setLocationCoords] = useState<LatLng>({
    latitude: 14.654459,
    longitude: 121.072997,
  });
  const [manualLock, setManualLock] = useState(false);
  const [locationWarning, setLocationWarning] = useState("");
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastIncidentChat, setLastIncidentChat] = useState<{
    id: string;
    title: string;
  } | null>(null);

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

  const handleSubmit = async () => {
    if (!summary.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setConfirmation("");
    try {
      const incidentId = `incident-${Date.now()}`;
      const payload = {
        id: incidentId,
        summary: summary.trim(),
        details: details.trim(),
        severity,
        type: selectedType,
        location: locationCoords,
        submittedAt: new Date().toISOString(),
        status: STATUS_PENDING,
        icon:
          incidentTypes.find((t) => t.id === selectedType)?.icon ??
          "exclamationmark.triangle",
      };
      // Simulated send; replace with API call later
      await new Promise((resolve) => setTimeout(resolve, 500));
      setConfirmation(t("report.confirmationOk"));
      setShowDetails(false);
      const chatParams = {
        id: payload.id,
        title: encodeURIComponent(payload.summary || "Incident Report"),
        category: "Alert",
        icon: payload.icon,
        status: payload.status,
      };
      // maintain local history index (most recent first, max 20)
      try {
        const rawIndex = await AsyncStorage.getItem(INCIDENT_INDEX_KEY);
        const parsed: {
          id: string;
          title: string;
          category: string;
          updatedAt: string;
          icon?: string;
          status?: string;
        }[] = rawIndex ? JSON.parse(rawIndex) : [];
        const filtered = parsed.filter((item) => item.id !== payload.id);
        const next = [
          { ...chatParams, updatedAt: payload.submittedAt },
          ...filtered,
        ].slice(0, 20);
        await AsyncStorage.setItem(INCIDENT_INDEX_KEY, JSON.stringify(next));
      } catch {
        // ignore index write errors
      }
      await AsyncStorage.setItem(
        "last-incident-chat",
        JSON.stringify(chatParams),
      );
      setLastIncidentChat(chatParams);
      router.push({
        pathname: "/chat/[id]",
        params: chatParams,
      } as never);
    } catch {
      setConfirmation(t("report.confirmationFail"));
    } finally {
      setIsSubmitting(false);
    }
  };

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
            onPress={() => router.push("/report-history" as never)}
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
          <Pressable
            style={[styles.attachButton, { borderColor }]}
            onPress={() => setShowDetails((prev) => !prev)}
          >
            <IconSymbol
              name="camera"
              size={18}
              color={isDarkMode ? "#fff" : "#111"}
            />
            <Text style={styles.attachText}>
              {showDetails ? t("report.hideMedia") : t("report.attach")}
            </Text>
          </Pressable>
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
  mapPreview: {
    height: 190,
    borderRadius: 16,
    marginTop: 12,
    overflow: "hidden",
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
