import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  View,
} from "react-native";
import {
  NOTIFICATION_ACK_STORAGE_KEY,
  NOTIFICATION_UNREAD_COUNT_STORAGE_KEY,
} from "@/data/notification-center";
import { apiClient } from "@/services/api/api-config";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NotificationItem = {
  id: string;
  icon: IconSymbolName;
  category: string;
  title: string;
  type: string;
  alertType: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  timestamp: string;
  description: string;
  actions: string[];
  source: string;
};

type CitizenStatus = "safe" | "need-help" | "evacuated" | "not-affected";

type GNewsArticle = {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  publishedAt?: string;
  source?: {
    name?: string;
  };
};

type AlertApiRow = {
  id: number;
  category_id: number | null;
  title: string;
  message: string | null;
  category: string | null;
  area: string | null;
  content: string | null;
  source: string | null;
  status: string | null;
  severity: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  is_viewed: boolean | number | null;
  incident_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const severityColors: Record<string, string> = {
  HIGH: "#df4338",
  MEDIUM: "#f0a43f",
  LOW: "#2f9d63",
};

const severityMap: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

const categoryIconMap: Record<string, IconSymbolName> = {
  weather: "cloud.sun",
  earthquake: "flame",
  fire: "flame",
  emergency: "shield",
  alert: "exclamationmark.triangle",
  warning: "exclamationmark.triangle",
  advisory: "info.circle",
  general: "info.circle",
  news: "newspaper",
  flood: "drop",
  traffic: "car.side",
  reminder: "clock",
  announcement: "megaphone",
};

function mapAlertToNotificationItem(alert: AlertApiRow): NotificationItem {
  const normalizedCategory = (alert.category ?? "").toLowerCase();
  const normalizedTitle = alert.title.toLowerCase();
  const normalizedSource = (alert.source ?? "").toLowerCase();
  const icon =
    Object.entries(categoryIconMap).find(([key]) =>
      normalizedCategory.includes(key) ||
      normalizedTitle.includes(key) ||
      normalizedSource.includes(key)
    )?.[1] ?? "bell";

  const severityKey = (alert.severity ?? "low").toLowerCase();
  const severity = severityMap[severityKey] ?? "LOW";
  const body = alert.content?.trim() || alert.message?.trim() || "No details available.";
  const area = alert.area?.trim();

  return {
    id: String(alert.id),
    icon,
    category: alert.category?.trim() || "General",
    title: alert.title.trim(),
    type: alert.category?.trim() || "Alert",
    alertType: `${alert.category?.trim() || "Alert"} Notice`,
    severity,
    timestamp: alert.created_at
      ? new Date(alert.created_at).toLocaleString()
      : "Recently",
    description: area ? `${body} Area: ${area}` : body,
    actions: alert.message?.trim() ? [alert.message.trim()] : [body],
    source: alert.source?.trim() || "Alertara",
  };
}

const timeFilters = [
  "Now",
  "Yesterday",
  "A Week Ago",
  "A Month Ago",
  "A Year Ago",
];

const searchAliases: Record<string, string[]> = {
  typhoon: ["weather", "storm", "rain", "flood", "wind", "severe weather"],
  hurricane: ["weather", "storm", "rain", "flood", "wind", "severe weather"],
  storm: ["weather", "rain", "wind", "flood", "severe weather"],
  flood: ["flood", "water", "rain", "weather", "evacuation"],
  earthquake: ["earthquake", "quake", "seismic", "phivolcs"],
  quake: ["earthquake", "quake", "seismic", "phivolcs"],
  fire: ["fire", "smoke", "bfp", "burning"],
  smoke: ["fire", "smoke", "bfp", "burning"],
  accident: ["crash", "collision", "road", "traffic", "incident"],
  crash: ["crash", "collision", "road", "traffic", "incident"],
  collision: ["crash", "collision", "road", "traffic", "incident"],
  alert: ["alert", "warning", "emergency", "broadcast"],
  warning: ["alert", "warning", "emergency", "broadcast"],
  news: ["news", "announcement", "general", "update"],
  reminder: ["reminder", "task", "notice"],
  general: ["general", "announcement", "update"],
};

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildAlertSearchText(alert: NotificationItem) {
  return [
    alert.title,
    alert.category,
    alert.type,
    alert.alertType,
    alert.severity,
    alert.timestamp,
    alert.description,
    alert.source,
    ...alert.actions,
  ]
    .join(" ")
    .toLowerCase();
}

function getCategoryIcon(category: string) {
  const normalized = category.toLowerCase();
  return (
    Object.entries(categoryIconMap).find(([key]) => normalized.includes(key))?.[1] ??
    "bell"
  );
}

function matchesAlertSearch(alert: NotificationItem, query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = buildAlertSearchText(alert);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  const aliasTerms = new Set<string>();

  terms.forEach((term) => {
    aliasTerms.add(term);
    (searchAliases[term] ?? []).forEach((alias) => aliasTerms.add(alias));
  });

  return Array.from(aliasTerms).some((term) => haystack.includes(term));
}

const NotificationCard = ({
  alert,
  cardBackground,
  textColor,
  compactMode,
  isDarkMode,
  highlightColor,
  acknowledged,
  onAcknowledge,
  onOpenDetails,
  responseStatus,
}: {
  alert: NotificationItem;
  cardBackground: string;
  textColor: string;
  compactMode: boolean;
  isDarkMode: boolean;
  highlightColor: string;
  acknowledged: boolean;
  onAcknowledge: (alertId: string) => void;
  onOpenDetails: (alert: NotificationItem) => void;
  responseStatus: CitizenStatus | null;
}) => {
  const router = useRouter();
  const severityColor = severityColors[alert.severity] ?? "#999";

  if (compactMode) {
    return (
      <Pressable
        style={[
          styles.compactCard,
          {
            borderColor: isDarkMode ? "#334155" : severityColor,
            backgroundColor: isDarkMode ? "#1f2933" : cardBackground,
          },
        ]}
        onPress={() =>
          router.push({
            pathname: "/chat/[id]",
            params: {
              id: alert.id,
              title: alert.title,
              category: alert.category,
            },
          } as never)
        }
        accessibilityLabel={`Open chatbot for ${alert.title}`}
      >
        <View style={styles.compactLeft}>
          <View
            style={[
              styles.compactIconWrap,
              { backgroundColor: `${severityColor}1a` },
            ]}
          >
            <IconSymbol name={alert.icon} size={16} color={severityColor} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText
              style={[styles.compactTitle, { color: textColor }]}
              numberOfLines={1}
            >
              {alert.title}
            </ThemedText>
            <ThemedText
              style={[
                styles.compactMeta,
                { color: isDarkMode ? "#cbd5e1" : "#475569" },
              ]}
              numberOfLines={1}
            >
              {alert.category} · {alert.severity} · {alert.timestamp}
            </ThemedText>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={severityColor}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.card, { backgroundColor: cardBackground }]}
      onPress={() => onOpenDetails(alert)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.categoryRow}>
          <IconSymbol name={alert.icon} size={18} color={severityColor} />
          <ThemedText style={[styles.categoryText, { color: textColor }]}>
            {alert.category} · {alert.type}
          </ThemedText>
        </View>
        <View
          style={[
            styles.severityPill,
            {
              borderColor: severityColor,
              backgroundColor: `${severityColor}15`,
            },
          ]}
        >
          <ThemedText style={[styles.severityText, { color: severityColor }]}>
            {alert.severity}
          </ThemedText>
        </View>
      </View>

      <ThemedText
        type="subtitle"
        style={[styles.titleText, { color: textColor }]}
      >
        {alert.title}
      </ThemedText>

      <ThemedText
        style={[styles.description, { color: textColor }]}
        numberOfLines={1}
      >
        {alert.description}
      </ThemedText>

      <View style={[styles.footerRow, { marginTop: 8 }]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.timestamp, { color: textColor }]}>
            Timestamp: {alert.timestamp}
          </ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.smallChatbotButton,
            {
              borderColor: highlightColor,
              backgroundColor: pressed
                ? `${highlightColor}22`
                : isDarkMode
                  ? "rgba(255,255,255,0.06)"
                  : `${highlightColor}15`,
            },
          ]}
          onPress={() =>
            router.push({
              pathname: "/chat/[id]",
              params: {
                id: alert.id,
                title: alert.title,
                category: alert.category,
              },
            } as never)
          }
          accessibilityLabel={`Open chatbot for ${alert.title}`}
        >
          <MaterialCommunityIcons
            name="robot"
            size={16}
            color={highlightColor}
          />
          <ThemedText
            style={[styles.smallChatbotLabel, { color: highlightColor }]}
          >
            Chatbot
          </ThemedText>
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.primaryButton,
          {
            borderColor: acknowledged ? "#16a34a" : severityColor,
            backgroundColor: acknowledged ? "rgba(22,163,74,0.10)" : "transparent",
          },
        ]}
        onPress={() => onAcknowledge(alert.id)}
      >
        <ThemedText
          style={[
            styles.buttonText,
            { color: acknowledged ? "#16a34a" : severityColor },
          ]}
        >
          {acknowledged ? "Acknowledged" : "I received this alert"}
        </ThemedText>
      </Pressable>

      {responseStatus && (
        <View style={styles.responseBadge}>
          <ThemedText style={styles.responseBadgeText}>
            Status:{" "}
            {responseStatus === "need-help"
              ? "Need Help"
              : responseStatus === "not-affected"
                ? "Not Affected"
                : responseStatus === "evacuated"
                  ? "Evacuated"
                  : "Safe"}
          </ThemedText>
        </View>
      )}

    </Pressable>
  );
};

export default function NotificationScreen() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const gnewsApiKey = process.env.EXPO_PUBLIC_GNEWS_API_KEY;
  const screenBackground = isDarkMode ? "#0f1c1f" : "#f2efe8";
  const cardBackground = isDarkMode ? "#18252a" : "#ffffff";
  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const highlightColor = isDarkMode ? Colors.dark.tint : Colors.light.tint;
  const [selectedCategory, setSelectedCategory] = useState("All Alerts");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState(timeFilters[0]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [compactMode, setCompactMode] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [backendAlerts, setBackendAlerts] = useState<NotificationItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [localNewsItems, setLocalNewsItems] = useState<NotificationItem[]>([]);
  const [localNewsLoading, setLocalNewsLoading] = useState(false);
  const [localNewsError, setLocalNewsError] = useState("");
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<NotificationItem | null>(
    null
  );
  const [citizenResponses, setCitizenResponses] = useState<
    Record<string, CitizenStatus>
  >({});
  const [draftStatus, setDraftStatus] = useState<CitizenStatus>("safe");
  const [responseDraft, setResponseDraft] = useState("");
  const searchAnim = useRef(new Animated.Value(0)).current;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [260, 0],
  });
  const overlayTextColor = Colors.light.text;
  const searchTranslateY = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });
  const allNotifications = useMemo(
    () => [...backendAlerts, ...localNewsItems],
    [backendAlerts, localNewsItems]
  );
  const categoryTabs = useMemo(() => {
    const categories = new Map<string, IconSymbolName>();
    backendAlerts.forEach((alert) => {
      const category = alert.category || "General";
      if (!categories.has(category)) {
        categories.set(category, getCategoryIcon(category));
      }
    });

    return [
      { key: "All Alerts", icon: "bell" as IconSymbolName },
      ...Array.from(categories.entries()).map(([key, icon]) => ({ key, icon })),
      { key: "Local News", icon: "newspaper" as IconSymbolName },
    ];
  }, [backendAlerts]);
  const selectedCategoryItems = useMemo(() => {
    if (selectedCategory === "All Alerts") {
      return allNotifications;
    }

    if (selectedCategory === "Local News") {
      return localNewsItems;
    }

    return backendAlerts.filter(
      (alert) => (alert.category || "General") === selectedCategory
    );
  }, [allNotifications, backendAlerts, localNewsItems, selectedCategory]);

  const visibleNotifications = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchQuery);

    if (!normalizedSearch) {
      return selectedCategoryItems;
    }

    return selectedCategoryItems.filter((alert) =>
      matchesAlertSearch(alert, normalizedSearch)
    );
  }, [searchQuery, selectedCategoryItems]);

  const categoryUnreadCounts = useMemo(() => {
    return categoryTabs.reduce<Record<string, number>>((counts, category) => {
      const categoryItems =
        category.key === "All Alerts"
          ? allNotifications
          : category.key === "Local News"
            ? localNewsItems
            : backendAlerts.filter(
                (alert) => (alert.category || "General") === category.key
              );
      counts[category.key] = categoryItems.filter(
        (alert) => !acknowledgedIds.includes(alert.id)
      ).length;
      return counts;
    }, {});
  }, [acknowledgedIds, allNotifications, backendAlerts, categoryTabs, localNewsItems]);

  useEffect(() => {
    if (filterVisible) {
      setMenuMounted(true);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMenuMounted(false));
    }
  }, [filterVisible, slideAnim]);

  useEffect(() => {
    if (searchVisible) {
      setSearchMounted(true);
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(searchAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setSearchMounted(false));
    }
  }, [searchVisible, searchAnim]);

  useEffect(() => {
    let active = true;

    const loadBackendAlerts = async () => {
      setAlertsLoading(true);
      setAlertsError("");

      try {
        const response = await apiClient.get("/alerts");
        const rows = Array.isArray(response.data)
          ? (response.data as AlertApiRow[])
          : Array.isArray(response.data?.data)
            ? (response.data.data as AlertApiRow[])
            : [];

        if (!active) {
          return;
        }

        setBackendAlerts(rows.map(mapAlertToNotificationItem));
      } catch (error) {
        if (active) {
          setAlertsError(
            error instanceof Error ? error.message : "Failed to load alerts."
          );
        }
      } finally {
        if (active) {
          setAlertsLoading(false);
        }
      }
    };

    loadBackendAlerts();

    const loadLocalNews = async () => {
      if (!gnewsApiKey) {
        setLocalNewsError("Missing GNews API key.");
        return;
      }

      setLocalNewsLoading(true);
      setLocalNewsError("");

      try {
        const params = new URLSearchParams({
          q: '"Quezon City" OR "Metro Manila" OR Philippines',
          lang: "en",
          max: "6",
          sortby: "publishedAt",
          nullable: "description,content",
          apikey: gnewsApiKey,
        });
        const url = `https://gnews.io/api/v4/search?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            errorText || `GNews request failed (${response.status})`
          );
        }

        const data = (await response.json()) as { articles?: GNewsArticle[] };
        const articles = Array.isArray(data.articles) ? data.articles : [];

        if (!active) {
          return;
        }

        setLocalNewsItems(
          articles.map((article, index) => ({
            id: `local-news-${index}-${article.url ?? article.title ?? "article"}`,
            category: "Local News",
            icon: "newspaper",
            title: article.title?.trim() || "Local News Update",
            type: "GNews Story",
            alertType: "Type: Local News",
            severity: "LOW",
            timestamp: article.publishedAt
              ? new Date(article.publishedAt).toLocaleString()
              : "Recently",
            description:
              article.description?.trim() ||
              article.content?.trim() ||
              "Tap to read the full story.",
            actions: [
              article.source?.name
                ? `Source: ${article.source.name}`
                : "Source: GNews",
            ],
            source: article.source?.name || "GNews",
          }))
        );
      } catch (error) {
        if (active) {
          setLocalNewsError(
            error instanceof Error ? error.message : "Failed to load local news."
          );
        }
      } finally {
        if (active) {
          setLocalNewsLoading(false);
        }
      }
    };

    loadLocalNews();

    return () => {
      active = false;
    };
  }, [gnewsApiKey]);

  const handleGeneralChat = () =>
    router.push({
      pathname: "/chat/[id]",
      params: { id: "general", title: "General Support", category: "General" },
    } as never);

  const handleAcknowledge = (alertId: string) => {
    setAcknowledgedIds((current) =>
      current.includes(alertId)
        ? current
        : [...current, alertId]
    );
  };

  const handleSetResponseStatus = (
    alertId: string,
    status: CitizenStatus
  ) => {
    setCitizenResponses((current) => ({
      ...current,
      [alertId]: status,
    }));
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const saved = await AsyncStorage.getItem(NOTIFICATION_ACK_STORAGE_KEY);
        if (!active || !saved) {
          return;
        }

        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAcknowledgedIds(parsed.filter((item) => typeof item === "string"));
        }
      } catch {
        // ignore load errors
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(
      NOTIFICATION_ACK_STORAGE_KEY,
      JSON.stringify(acknowledgedIds)
    );
  }, [acknowledgedIds]);

  useEffect(() => {
    const unreadCount = allNotifications.filter(
      (alert) => !acknowledgedIds.includes(alert.id)
    ).length;

    void AsyncStorage.setItem(
      NOTIFICATION_UNREAD_COUNT_STORAGE_KEY,
      String(unreadCount)
    );
  }, [acknowledgedIds, allNotifications]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: screenBackground }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: screenBackground, paddingTop: 4 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerStack}>
          <View
            style={[
              styles.headerBar,
              { backgroundColor: isDarkMode ? "#132428" : "#e8f1ec" },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
              <Pressable
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    backgroundColor: pressed
                      ? "#d9e5e1"
                      : isDarkMode
                        ? "#1f2d31"
                        : "#ffffff",
                  },
                ]}
                onPress={() => router.back()}
              >
                <IconSymbol
                  name="arrow.left"
                  size={18}
                  color={highlightColor}
                />
              </Pressable>
              <ThemedText
                type="title"
                style={[styles.headerTitle, { color: textColor }]}
              >
                Notifications
              </ThemedText>
            </View>
              <View style={styles.headerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: pressed
                      ? "#d9e5e1"
                      : isDarkMode
                        ? "#1f2d31"
                        : "#ffffff",
                  },
                ]}
                onPress={() => {
                  setFilterVisible(false);
                  setSearchVisible((prev) => !prev);
                }}
              >
                <IconSymbol name="search" size={20} color={highlightColor} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  styles.iconSpacing,
                  {
                    backgroundColor: pressed
                      ? "#d9e5e1"
                      : isDarkMode
                        ? "#1f2d31"
                        : "#ffffff",
                  },
                ]}
                onPress={() => {
                  setSearchVisible(false);
                  setFilterVisible((prev) => !prev);
                }}
              >
                <FontAwesome name="filter" size={20} color={highlightColor} />
              </Pressable>
              </View>
            </View>
          </View>

          {searchMounted && (
            <Animated.View
              style={[
                styles.searchPanel,
                {
                  transform: [{ translateY: searchTranslateY }],
                  opacity: searchAnim,
                },
              ]}
            >
              <View style={styles.searchInput}>
                <IconSymbol name="search" size={16} color="#6b6b6b" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search notifications"
                  placeholderTextColor="#7a7a7a"
                  style={styles.searchText}
                />
                <Pressable
                  style={styles.searchClose}
                  onPress={() => setSearchVisible(false)}
                >
                  <IconSymbol name="xmark" size={14} color="#6b6b6b" />
                </Pressable>
              </View>
            </Animated.View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabs}
          >
            {categoryTabs.map((category) => (
              <Pressable
                key={category.key}
                style={[
                  styles.filterTab,
                  {
                    borderColor: isDarkMode ? "#2f3b42" : "#c1c5cc",
                    backgroundColor:
                      selectedCategory === category.key
                        ? `${highlightColor}20`
                        : cardBackground,
                  },
                  selectedCategory === category.key && {
                    borderColor: highlightColor,
                  },
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <View style={styles.filterTabContent}>
                  <IconSymbol
                    name={category.icon}
                    size={12}
                    color={
                      selectedCategory === category.key
                        ? highlightColor
                        : "#6b6b6b"
                    }
                  />
                  <ThemedText
                    style={[
                      styles.filterTabText,
                      { color: textColor },
                      selectedCategory === category.key && {
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {category.key}
                  </ThemedText>
                  {categoryUnreadCounts[category.key] > 0 && (
                    <View style={styles.tabBadge}>
                      <ThemedText style={styles.tabBadgeText}>
                        {categoryUnreadCounts[category.key]}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {(alertsLoading || localNewsLoading) && (
            <View style={styles.statusCard}>
              <ThemedText style={[styles.statusText, { color: textColor }]}>
                Loading alerts...
              </ThemedText>
            </View>
          )}

          {alertsError ? (
            <View style={styles.statusCard}>
              <ThemedText style={[styles.statusText, { color: textColor }]}>
                {alertsError}
              </ThemedText>
            </View>
          ) : null}

          {menuMounted && (
            <Animated.View
              style={[
                styles.filterMenu,
                {
                  backgroundColor: "#ffffff",
                  borderColor: "#dfe3e8",
                  transform: [{ translateX }],
                  opacity: slideAnim,
                },
              ]}
            >
              {timeFilters.map((option) => (
                <Pressable
                  key={`menu-${option}`}
                  style={[
                    styles.filterOption,
                    {
                      borderColor: isDarkMode ? "#2f3b42" : "#c1c5cc",
                    },
                    selectedTimeFilter === option && {
                      borderColor: highlightColor,
                      backgroundColor: `${highlightColor}20`,
                    },
                  ]}
                  onPress={() => {
                    setSelectedTimeFilter(option);
                    setFilterVisible(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.filterOptionText,
                      { color: overlayTextColor },
                      selectedTimeFilter === option && { fontWeight: "700" },
                    ]}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              ))}
              <View style={styles.filterToggleRow}>
                <ThemedText
                  style={[styles.filterOptionText, { color: overlayTextColor }]}
                >
                  Compact list mode
                </ThemedText>
                <Pressable
                  style={({ pressed }) => [
                    styles.compactToggle,
                    {
                      backgroundColor: compactMode
                        ? `${highlightColor}30`
                        : isDarkMode
                          ? "#1f2d31"
                          : "#f2f4f7",
                      borderColor: compactMode ? highlightColor : "#cbd5e1",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => setCompactMode((prev) => !prev)}
                >
                  <MaterialCommunityIcons
                    name={compactMode ? "view-agenda" : "view-list"}
                    size={18}
                    color={compactMode ? highlightColor : "#475569"}
                  />
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>

        {visibleNotifications.map((alert) => (
          <NotificationCard
            key={alert.id}
            alert={alert}
            cardBackground={cardBackground}
            textColor={textColor}
            compactMode={compactMode}
            isDarkMode={isDarkMode}
            highlightColor={highlightColor}
            acknowledged={acknowledgedIds.includes(alert.id)}
            onAcknowledge={handleAcknowledge}
            onOpenDetails={setSelectedAlert}
            responseStatus={citizenResponses[alert.id] ?? null}
          />
        ))}
        {!alertsLoading && !localNewsLoading && visibleNotifications.length === 0 && (
          <View style={styles.statusCard}>
            <ThemedText style={[styles.statusText, { color: textColor }]}>
              No notifications found.
            </ThemedText>
          </View>
        )}
        {selectedCategory === "Local News" && localNewsLoading && (
          <View style={styles.statusCard}>
            <ThemedText style={[styles.statusText, { color: textColor }]}>
              Loading local news...
            </ThemedText>
          </View>
        )}
        {selectedCategory === "Local News" && localNewsError ? (
          <View style={styles.statusCard}>
            <ThemedText style={[styles.statusText, { color: textColor }]}>
              {localNewsError}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        style={styles.messageButton}
        onPress={handleGeneralChat}
        accessibilityLabel="Open general support chat"
      >
        <IconSymbol size={24} name="bubble.right" color="#fff" />
      </Pressable>

      {selectedAlert && (
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedAlert(null)}
          />
          <View
            style={[
              styles.detailModal,
              {
                backgroundColor: cardBackground,
                borderColor: isDarkMode ? "#334155" : "#d9e2ec",
              },
            ]}
          >
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderText}>
                <ThemedText style={[styles.detailCategory, { color: textColor }]}>
                  {selectedAlert.category}
                </ThemedText>
                <ThemedText
                  type="subtitle"
                  style={[styles.detailTitle, { color: textColor }]}
                >
                  {selectedAlert.title}
                </ThemedText>
              </View>
              <Pressable onPress={() => setSelectedAlert(null)}>
                <IconSymbol name="xmark" size={18} color={highlightColor} />
              </Pressable>
            </View>

            <View style={styles.detailMetaRow}>
              <View
                style={[
                  styles.detailSeverity,
                  {
                    borderColor: severityColors[selectedAlert.severity],
                    backgroundColor: `${severityColors[selectedAlert.severity]}15`,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.detailSeverityText,
                    { color: severityColors[selectedAlert.severity] },
                  ]}
                >
                  {selectedAlert.severity}
                </ThemedText>
              </View>
              <ThemedText style={[styles.detailMetaText, { color: textColor }]}>
                {selectedAlert.timestamp}
              </ThemedText>
            </View>

            <ThemedText style={[styles.detailType, { color: textColor }]}>
              {selectedAlert.alertType}
            </ThemedText>

            <ThemedText style={[styles.detailDescription, { color: textColor }]}>
              {selectedAlert.description}
            </ThemedText>

            <View style={styles.detailSection}>
              <ThemedText style={[styles.detailSectionTitle, { color: textColor }]}>
                Action steps
              </ThemedText>
              {selectedAlert.actions.map((action) => (
                <View key={action} style={styles.detailActionRow}>
                  <View
                    style={[styles.detailBullet, { backgroundColor: highlightColor }]}
                  />
                  <ThemedText
                    style={[styles.detailActionText, { color: textColor }]}
                  >
                    {action}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.detailFooter}>
              <ThemedText style={[styles.detailSource, { color: textColor }]}>
                Source: {selectedAlert.source}
              </ThemedText>
              <Pressable
                style={[styles.detailChatButton, { borderColor: highlightColor }]}
                onPress={() => {
                  const alert = selectedAlert;
                  setSelectedAlert(null);
                  router.push({
                    pathname: "/chat/[id]",
                    params: {
                      id: alert.id,
                      title: alert.title,
                      category: alert.category,
                    },
                  } as never);
                }}
              >
                <ThemedText
                  style={[styles.detailChatButtonText, { color: highlightColor }]}
                >
                  Open chat
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.responseSection}>
              <ThemedText style={[styles.detailSectionTitle, { color: textColor }]}>
                Share your status
              </ThemedText>
              <View style={styles.responseChips}>
                {[
                  { key: "safe", label: "Safe" },
                  { key: "need-help", label: "Need Help" },
                  { key: "evacuated", label: "Evacuated" },
                  { key: "not-affected", label: "Not Affected" },
                ].map((item) => {
                  const isActive =
                    citizenResponses[selectedAlert.id] === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      style={({ pressed }) => [
                        styles.responseChip,
                        {
                          borderColor: isActive
                            ? highlightColor
                            : isDarkMode
                              ? "#334155"
                              : "#cbd5e1",
                          backgroundColor: isActive
                            ? `${highlightColor}18`
                            : pressed
                              ? isDarkMode
                                ? "#1f2933"
                                : "#f1f5f9"
                              : "transparent",
                        },
                      ]}
                      onPress={() => setDraftStatus(item.key as CitizenStatus)}
                    >
                      <ThemedText
                        style={[
                          styles.responseChipText,
                          { color: isActive ? highlightColor : textColor },
                        ]}
                      >
                        {item.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={responseDraft}
                onChangeText={setResponseDraft}
                placeholder="Optional message to authorities"
                placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
                multiline
                style={[
                  styles.responseInput,
                  {
                    backgroundColor: isDarkMode ? "#1f2933" : "#f8fafc",
                    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
                    color: textColor,
                  },
                ]}
              />

              <Pressable
                style={[styles.responseSendButton, { backgroundColor: highlightColor }]}
                onPress={() => {
                  if (!responseDraft.trim()) {
                    return;
                  }
                  handleSetResponseStatus(selectedAlert.id, draftStatus);
                  setResponseDraft("");
                }}
              >
                <ThemedText style={styles.responseSendButtonText}>
                  Send status
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerStack: {
    position: "relative",
    paddingBottom: 12,
  },
  headerBar: {
    marginHorizontal: -16,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.6)",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dfe3e8",
  },
  iconSpacing: {
    marginLeft: 10,
  },
  filterTabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    paddingTop: 6,
  },
  filterTab: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  filterTabText: {
    fontSize: 13,
  },
  filterTabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
  searchPanel: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    borderRadius: 30,
    padding: 10,
    backgroundColor: "#ffffff",
    zIndex: 30,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    padding: 0,
  },
  searchClose: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#ececec",
    alignItems: "center",
    justifyContent: "center",
  },
  filterMenu: {
    position: "absolute",
    top: 80,
    right: 0,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 6,
    width: 240,
    zIndex: 20,
    elevation: 10,
  },
  filterOption: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  filterOptionText: {
    fontSize: 13,
  },
  filterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  compactToggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusCard: {
    paddingVertical: 12,
    alignItems: "center",
  },
  statusText: {
    fontSize: 13,
    color: "#64748b",
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryText: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  severityPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "700",
  },
  titleText: {
    textTransform: "uppercase",
    marginBottom: 4,
  },
  description: {
    lineHeight: 18,
    marginBottom: 8,
    fontSize: 13,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 2,
  },
  source: {
    fontSize: 12,
    fontWeight: "500",
  },
  responseBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(22,163,74,0.12)",
  },
  responseBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },
  primaryButton: {
    borderRadius: 22,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  smallChatbotButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smallChatbotLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  detailModal: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  detailHeaderText: {
    flex: 1,
    gap: 4,
  },
  detailCategory: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailSeverity: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailSeverityText: {
    fontSize: 11,
    fontWeight: "800",
  },
  detailMetaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailType: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailSection: {
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  detailActionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  detailBullet: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 6,
  },
  detailActionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  detailFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  detailSource: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  detailChatButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  detailChatButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  responseSection: {
    gap: 10,
  },
  responseChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  responseChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  responseChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  responseInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 84,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    textAlignVertical: "top",
  },
  responseSendButton: {
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  responseSendButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  compactLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  compactIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  compactMeta: {
    fontSize: 11,
    color: "#6b7280",
  },
  expandedContent: {
    marginTop: 8,
  },
  expandIconContainer: {
    alignItems: "center",
    marginTop: 12,
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
