import { ThemedText } from "@/components/themed-text";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

const notificationsByCategory: Record<string, NotificationItem[]> = {
  General: [
    {
      id: "general-1",
      category: "General",
      icon: "info.circle",
      title: "LGU Community Support Briefing",
      type: "Advisory Bulletin",
      alertType: "Type: Information Update",
      severity: "LOW",
      timestamp: "2026-03-09 08:15:00",
      description:
        "Barangay and city support hotlines remain open; refer neighbors to the community safety center at City Hall.",
      actions: [
        "Share the hotline number in your block chat.",
        "Tag incoming visitors that they must check in at the safety desk.",
      ],
      source: "City LGU",
    },
    {
      id: "general-2",
      category: "General",
      icon: "info.circle",
      title: "Barangay Evacuation Route Signage",
      type: "Maintenance Notice",
      alertType: "Type: Infrastructure Update",
      severity: "MEDIUM",
      timestamp: "2026-03-08 17:40:00",
      description:
        "New evacuation signposts are being installed along national roads; expect brief lane adjustments this weekend.",
      actions: [
        "Plan slight detours if you travel through Zone 3",
        "Report missing signage via the LGU portal",
      ],
      source: "Public Works",
    },
  ],
  Alert: [
    {
      id: "earthquake",
      category: "Alert",
      icon: "flame",
      title: "[MOCK] CRITICAL EARTHQUAKE ALERT",
      type: "Emergency Bulletin",
      alertType: "Type: Earthquake Emergency",
      severity: "HIGH",
      timestamp: "2026-02-25 03:47:51",
      description:
        "Critical earthquake activity detected. This is an emergency safety broadcast to all citizens.",
      actions: [
        "DROP, COVER, and HOLD.",
        "Move away from glass, shelves, and power lines.",
        "Evacuate damaged structures after shaking stops.",
        "Wait for LGU and rescue advisories.",
      ],
      source: "phivolcs",
    },
    {
      id: "weather",
      category: "Weather",
      icon: "cloud.sun",
      title: "[MOCK] CRITICAL WEATHER ALERT",
      type: "Emergency Bulletin",
      alertType: "Type: Severe Weather Emergency",
      severity: "HIGH",
      timestamp: "2026-02-25 03:43:02",
      description:
        "Heavy rainfall and gale-force winds are expected within the next hour.",
      actions: [
        "Move away from windows and electrical panels.",
        "Secure loose items outside and park vehicles indoors.",
        "Monitor official advisories for flash flood notices.",
      ],
      source: "dost-ph",
    },
    {
      id: "fire-alert",
      category: "Fire",
      icon: "flame",
      title: "Building Fire Watch",
      type: "Emergency Bulletin",
      alertType: "Type: Fire Alert",
      severity: "HIGH",
      timestamp: "2026-03-09 01:20:00",
      description:
        "Fire crews are responding to a blaze near the wet market; citizens are asked to avoid smoke-affected areas.",
      actions: [
        "Stay indoors with windows closed",
        "Do not park near narrow alleys to allow firefighting access",
      ],
      source: "BFP",
    },
    {
      id: "crash-alert",
      category: "Alert",
      icon: "car.side",
      title: "Bridge Collision Incident",
      type: "Immediate Alert",
      alertType: "Type: Transport Accident",
      severity: "MEDIUM",
      timestamp: "2026-03-09 11:30:00",
      description:
        "A delivery truck collided with guardrails on Osmena Bridge; expect traffic rerouting for next two hours.",
      actions: [
        "Use alternative northbound routes via Mabini Avenue",
        "Follow traffic assist officers pulling aside for emergency vehicles",
      ],
      source: "Traffic Management",
    },
  ],
  Announcement: [
    {
      id: "announcement-1",
      category: "Announcement",
      icon: "megaphone",
      title: "City-wide Resilience Drill",
      type: "Public Announcement",
      alertType: "Type: Preparedness Activity",
      severity: "MEDIUM",
      timestamp: "2026-03-07 11:00:00",
      description:
        "LGU invites communities to join the monthly resilience drill this Sunday in Barangay 12.",
      actions: [
        "Bring your mask and ID",
        "Follow the marshals during partial evacuations",
      ],
      source: "Office of Civil Defense",
    },
  ],
  Reminder: [
    {
      id: "reminder-1",
      category: "Reminder",
      icon: "clock",
      title: "Update Emergency Contact Cards",
      type: "Community Reminder",
      alertType: "Type: Citizen Task",
      severity: "LOW",
      timestamp: "2026-03-06 09:00:00",
      description:
        "Submit your updated contact card at the barangay hall before the 15th of the month.",
      actions: [
        "Bring a copy of proof of residence",
        "Ask for a receipt and keep it safe",
      ],
      source: "Barangay 12 Secretariat",
    },
  ],
  "Emergency Broadcast": [
    {
      id: "emergency-1",
      category: "Emergency Broadcast",
      icon: "shield",
      title: "Critical Flood Alert Level 2",
      type: "Emergency Broadcast",
      alertType: "Type: Flood Warning",
      severity: "HIGH",
      timestamp: "2026-03-05 21:10:00",
      description:
        "Rivers are rising rapidly due to continuous rainfall; relocation sites are being activated.",
      actions: [
        "Move belongings to higher ground.",
        "Head to the nearest evacuation center if prompted.",
        "Turn off gas and electricity before leaving.",
      ],
      source: "NDRRMC",
    },
  ],
};

const severityColors: Record<string, string> = {
  HIGH: "#df4338",
  MEDIUM: "#f0a43f",
  LOW: "#2f9d63",
};

const categoryTabs = [
  { key: "General", icon: "info.circle" },
  { key: "Alert", icon: "exclamationmark" },
  { key: "Announcement", icon: "megaphone" },
  { key: "Reminder", icon: "clock" },
  { key: "Emergency Broadcast", icon: "shield" },
];
const timeFilters = [
  "Now",
  "Yesterday",
  "A Week Ago",
  "A Month Ago",
  "A Year Ago",
];

const NotificationCard = ({
  alert,
  cardBackground,
  textColor,
  compactMode,
  isDarkMode,
  highlightColor,
}: {
  alert: NotificationItem;
  cardBackground: string;
  textColor: string;
  compactMode: boolean;
  isDarkMode: boolean;
  highlightColor: string;
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const severityColor = severityColors[alert.severity] ?? "#999";

  const toggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    Animated.timing(expandAnim, {
      toValue: nextState ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const heightStyle = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const opacityStyle = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

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
      onPress={toggleExpand}
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

      <ThemedText style={[styles.typeLabel, { color: textColor }]}>
        {alert.alertType}
      </ThemedText>

      <ThemedText
        style={[styles.description, { color: textColor }]}
        numberOfLines={isExpanded ? undefined : 2}
      >
        {alert.description}
      </ThemedText>

      <View
        style={{ position: "absolute", opacity: 0, width: "100%", zIndex: -1 }}
        pointerEvents="none"
      >
        <View
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
          style={styles.expandedContent}
        >
          <View style={styles.actionsContainer}>
            <ThemedText style={[styles.actionsLabel, { color: textColor }]}>
              Action steps:
            </ThemedText>
            {alert.actions.map((action) => (
              <View key={action} style={styles.actionRow}>
                <View
                  style={[styles.bullet, { backgroundColor: severityColor }]}
                />
                <ThemedText style={[styles.actionText, { color: textColor }]}>
                  {action}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Animated.View
        style={{
          height: contentHeight > 0 ? heightStyle : 0,
          opacity: opacityStyle,
          overflow: "hidden",
        }}
      >
        <View style={styles.expandedContent}>
          <View style={styles.actionsContainer}>
            <ThemedText style={[styles.actionsLabel, { color: textColor }]}>
              Action steps:
            </ThemedText>
            {alert.actions.map((action) => (
              <View key={action} style={styles.actionRow}>
                <View
                  style={[styles.bullet, { backgroundColor: severityColor }]}
                />
                <ThemedText style={[styles.actionText, { color: textColor }]}>
                  {action}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      <View style={[styles.footerRow, { marginTop: 12 }]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.timestamp, { color: textColor }]}>
            Timestamp: {alert.timestamp}
          </ThemedText>
          <ThemedText style={[styles.source, { color: textColor }]}>
            Source: {alert.source}
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

      <Pressable style={[styles.primaryButton, { borderColor: severityColor }]}>
        <ThemedText style={[styles.buttonText, { color: severityColor }]}>
          I received this alert
        </ThemedText>
      </Pressable>

      <View style={styles.expandIconContainer}>
        <ThemedText style={[{ color: "#999", fontSize: 12 }]}>
          {isExpanded ? "Show less" : "Show more"}
        </ThemedText>
      </View>
    </Pressable>
  );
};

export default function NotificationScreen() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const screenBackground = isDarkMode ? "#0f1c1f" : "#f2efe8";
  const cardBackground = isDarkMode ? "#18252a" : "#ffffff";
  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const highlightColor = isDarkMode ? Colors.dark.tint : Colors.light.tint;
  const [selectedCategory, setSelectedCategory] = useState(categoryTabs[0].key);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState(timeFilters[0]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [compactMode, setCompactMode] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  const currentNotifications = notificationsByCategory[selectedCategory] ?? [];

  const handleGeneralChat = () =>
    router.push({
      pathname: "/chat/[id]",
      params: { id: "general", title: "General Support", category: "General" },
    } as never);

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
                </View>
              </Pressable>
            ))}
          </ScrollView>

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

        {currentNotifications.map((alert) => (
          <NotificationCard
            key={alert.id}
            alert={alert}
            cardBackground={cardBackground}
            textColor={textColor}
            compactMode={compactMode}
            isDarkMode={isDarkMode}
            highlightColor={highlightColor}
          />
        ))}
      </ScrollView>

      <Pressable
        style={styles.messageButton}
        onPress={handleGeneralChat}
        accessibilityLabel="Open general support chat"
      >
        <IconSymbol size={24} name="bubble.right" color="#fff" />
      </Pressable>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 20,
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
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  description: {
    lineHeight: 20,
    marginBottom: 12,
    fontSize: 14,
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
    marginBottom: 12,
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
  primaryButton: {
    borderRadius: 28,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  smallChatbotButton: {
    paddingVertical: 6,
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
