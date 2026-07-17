import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  DARK_BACKGROUND,
  DARK_BORDER,
  DARK_CARD_BG,
  DARK_ICON,
  LIGHT_BACKGROUND,
  LIGHT_BORDER,
  LIGHT_CARD_BG,
  LIGHT_ICON,
  TealColors,
} from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import {
  NOTIFICATION_UNREAD_COUNT_STORAGE_KEY
} from "@/data/notification-center";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const SEARCH_PANEL_HEIGHT = 102;

const searchTargets = [
  {
    label: "Dashboard",
    keywords: ["home", "dashboard", "overview"],
    href: "/(tabs)",
  },
  {
    label: "Map",
    keywords: ["map", "safety map", "crime map", "location"],
    href: "/(tabs)/map",
  },
  {
    label: "Report",
    keywords: ["report", "incident", "submit", "file report"],
    href: "/(tabs)/report",
  },
  {
    label: "Alerts",
    keywords: [
      "alerts",
      "notification",
      "news",
      "typhoon",
      "fire",
      "earthquake",
      "warning",
    ],
    href: "/notification",
  },
  {
    label: "Profile",
    keywords: ["profile", "account", "me", "settings"],
    href: "/(tabs)/me",
  },
  {
    label: "Emergency Call",
    keywords: ["call", "emergency", "help", "911"],
    href: "/(tabs)/call",
  },
  {
    label: "Submit Tip",
    keywords: ["tip", "submit tip", "feedback"],
    href: "/submit-tip",
  },
  {
    label: "Settings",
    keywords: ["settings", "preferences", "language"],
    href: "/(tabs)/settings",
  },
];

export function Header() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const searchInputRef = useRef<TextInput>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const ICON_COLOR = isDarkMode ? DARK_ICON : LIGHT_ICON;
  const BORDER_COLOR = isDarkMode ? DARK_BORDER : LIGHT_BORDER;
  const BG_COLOR = isDarkMode ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const INPUT_BG = isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG;

  const toggleSearch = useCallback(() => {
    const next = !isSearchOpen;
    setIsSearchOpen(next);
    if (!next) {
      setSearchQuery("");
    }
    Animated.timing(slideAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      if (next) {
        searchInputRef.current?.focus();
      }
    });
  }, [isSearchOpen, slideAnim]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredTargets = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return searchTargets.filter((target) =>
      [target.label, ...target.keywords].some((value) => {
        const normalizedValue = value.toLowerCase();
        return (
          normalizedValue.startsWith(normalizedQuery) ||
          normalizedValue.includes(normalizedQuery) ||
          normalizedQuery.includes(normalizedValue)
        );
      }),
    );
  }, [normalizedQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  }, []);

  const goToTarget = useCallback(
    (href: string) => {
      clearSearch();
      router.push(href as never);
    },
    [clearSearch, router],
  );

  const handleSubmit = useCallback(() => {
    const match = filteredTargets[0];
    if (match) {
      goToTarget(match.href);
    }
  }, [filteredTargets, goToTarget]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(
        NOTIFICATION_UNREAD_COUNT_STORAGE_KEY,
      );
      const parsed = saved ? Number(saved) : 0;
      setUnreadCount(Number.isFinite(parsed) ? Math.max(parsed, 0) : 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  return (
    <View
      style={[
        styles.headerContainer,
        { backgroundColor: BG_COLOR, borderBottomColor: BORDER_COLOR },
      ]}
    >
      <View style={styles.headerMain}>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/alertara.png")}
            style={styles.logo}
          />
          <ThemedText style={styles.logoText}>Alertara QC</ThemedText>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.circleButton, { backgroundColor: INPUT_BG }]}
            onPress={toggleSearch}
          >
            <IconSymbol size={20} name="search" color={ICON_COLOR} />
          </Pressable>

          <Pressable
            style={[styles.circleButton, { backgroundColor: INPUT_BG }]}
            onPress={() => router.push("/notification")}
          >
            <IconSymbol size={24} name="bell" color={ICON_COLOR} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </ThemedText>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <Animated.View
        pointerEvents={isSearchOpen ? "auto" : "none"}
        style={[
          styles.searchPanel,
          {
            backgroundColor: INPUT_BG,
            borderColor: BORDER_COLOR,
            height: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, SEARCH_PANEL_HEIGHT],
            }),
            opacity: slideAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-SEARCH_PANEL_HEIGHT, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.searchContent}>
          <IconSymbol size={18} name="magnifyingglass" color={ICON_COLOR} />
          <TextInput
            ref={searchInputRef}
            placeholder="Search services..."
            placeholderTextColor={isDarkMode ? "#b0b0b0" : "#7f7f7f"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoCorrect={false}
            autoCapitalize="none"
            style={[
              styles.searchInput,
              { color: isDarkMode ? "#fff" : "#111" },
            ]}
          />
          <Pressable onPress={clearSearch} style={styles.closeButton}>
            <IconSymbol size={18} name="xmark" color={ICON_COLOR} />
          </Pressable>
        </View>

        <View
          style={[
            styles.suggestionsPanel,
            {
              backgroundColor: INPUT_BG,
              borderColor: BORDER_COLOR,
            },
          ]}
        >
          {normalizedQuery.length === 0 ? (
            <ThemedText style={styles.suggestionsHint}>
              Type to see matching results
            </ThemedText>
          ) : filteredTargets.length > 0 ? (
            <View style={styles.suggestionList}>
              {filteredTargets.map((target) => {
                const labelMatch = target.label
                  .toLowerCase()
                  .startsWith(normalizedQuery);
                const typedLength = searchQuery.trim().length;
                const highlight = labelMatch
                  ? target.label.slice(0, typedLength)
                  : target.label;
                const remainder = labelMatch
                  ? target.label.slice(typedLength)
                  : "";

                return (
                  <Pressable
                    key={target.href}
                    onPress={() => goToTarget(target.href)}
                    style={({ pressed }) => [
                      styles.suggestionRow,
                      {
                        backgroundColor: pressed
                          ? isDarkMode
                            ? "#1f2d31"
                            : "#eef2f7"
                          : "transparent",
                      },
                    ]}
                  >
                    <IconSymbol
                      size={16}
                      name="magnifyingglass"
                      color={ICON_COLOR}
                    />
                    <ThemedText style={styles.suggestionText}>
                      <Text style={styles.suggestionMatch}>{highlight}</Text>
                      {remainder}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ThemedText style={styles.suggestionsHint}>
              No match found
            </ThemedText>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: "relative",
    overflow: "visible",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 35,
    borderBottomWidth: 1,
  },
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 40,
    height: 40,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    color: TealColors.primary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
  searchPanel: {
    position: "absolute",
    left: 14,
    right: 14,
    top: "100%",
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 28,
    zIndex: 10,
    overflow: "hidden",
  },
  suggestionsPanel: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 6,
    gap: 4,
    maxHeight: 160,
  },
  suggestionList: {
    gap: 6,
  },
  suggestionsHint: {
    fontSize: 13,
    color: "#7f7f7f",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  suggestionMatch: {
    fontSize: 14,
    fontWeight: "600",
    color: TealColors.primary,
  },
  searchContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
  },
});
