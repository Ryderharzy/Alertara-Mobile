import { Header } from "@/components/header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
    Colors,
    DARK_BORDER,
    DARK_CARD_BG,
    DARK_ICON,
    LIGHT_BORDER,
    LIGHT_CARD_BG,
    LIGHT_ICON,
    TealColors,
} from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { systemClusters, systemRegistry } from "@/data/central-command-systems";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { userProfile } = useAuth();

  const [activeClusterId, setActiveClusterId] = useState(systemClusters[0].id);

  const [scrollMetrics, setScrollMetrics] = useState({
    contentHeight: 1,
    visibleHeight: 1,
    scrollY: 0,
  });

  // NEW: actual rendered indicator track height
  const [trackHeight, setTrackHeight] = useState(0);

  const activeCluster =
    systemClusters.find((cluster) => cluster.id === activeClusterId) ??
    systemClusters[0];

  const activeSystems = activeCluster.systems
    .map((id) => systemRegistry[id])
    .filter(Boolean);
  const isLoggedIn = Boolean(userProfile?.id);
  const greetingName = userProfile?.name?.split(" ")[0] ?? "there";
  const activeAlertCount = 2;
  const recentSystemSummary = activeSystems.slice(0, 3);

  const handleSystemPress = (systemId: string) => {
    router.push(`/central-command/${systemId}`);
  };

  const handleQuickAction = (target: string) => {
    router.push(target as never);
  };

  // Scroll progress based on actual scrollable range
  const maxScrollDistance = Math.max(
    scrollMetrics.contentHeight - scrollMetrics.visibleHeight,
    1,
  );

  const scrollProgress = Math.max(
    0,
    Math.min(scrollMetrics.scrollY / maxScrollDistance, 1),
  );

  // Use the REAL rendered track height, not an estimated one
  const safeContentHeight = Math.max(scrollMetrics.contentHeight, 1);
  const safeVisibleHeight = Math.max(scrollMetrics.visibleHeight, 1);

  // Thumb height proportional to visible content, clamped
  const rawThumbHeight =
    trackHeight > 0 ? (safeVisibleHeight / safeContentHeight) * trackHeight : 0;

  const indicatorFillHeight =
    trackHeight > 0 ? Math.max(44, Math.min(rawThumbHeight, trackHeight)) : 0;

  const indicatorTravelDistance = Math.max(
    trackHeight - indicatorFillHeight,
    0,
  );

  const indicatorTranslateY = scrollProgress * indicatorTravelDistance;

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
    >
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        style={[
          styles.content,
          {
            backgroundColor: isDarkMode
              ? Colors.dark.background
              : Colors.light.background,
          },
        ]}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent;

          setScrollMetrics({
            scrollY: contentOffset.y,
            contentHeight: contentSize.height,
            visibleHeight: layoutMeasurement.height,
          });
        }}
      >
        {/* Welcome Section */}
        <View
          style={[
            styles.welcomeSection,
            {
              backgroundColor: isDarkMode ? DARK_CARD_BG : "#e8f5f2",
              borderColor: isDarkMode
                ? DARK_BORDER
                : "rgba(52, 211, 153, 0.25)",
            },
          ]}
        >
          <View style={styles.welcomeTitleRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.welcomeEyebrow}>
                {isLoggedIn ? "Signed in" : "Guest mode"}
              </ThemedText>
              <ThemedText style={styles.welcomeText}>
                Welcome back, {greetingName}!
              </ThemedText>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: activeAlertCount > 0 ? "#fef2f2" : "#ecfdf5",
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.statusPillText,
                  { color: activeAlertCount > 0 ? "#dc2626" : "#059669" },
                ]}
              >
                {activeAlertCount > 0
                  ? `${activeAlertCount} alerts`
                  : "All clear"}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.subText}>
            {isLoggedIn
              ? "Your live safety controls, alerts, and services are ready."
              : "You can use the app without signing in, or save your profile anytime."}
          </ThemedText>
        </View>

        {/* Live Status */}
        <View style={styles.glanceSection}>
          <Pressable
            style={[
              styles.glanceCard,
              {
                backgroundColor: isDarkMode ? "#251f1f" : "#fff7ed",
                borderColor: isDarkMode ? "#61452f" : "#fed7aa",
              },
            ]}
            onPress={() => router.push("/notification")}
          >
            <IconSymbol
              name="bell.badge"
              size={20}
              color={activeAlertCount > 0 ? "#e53935" : "#059669"}
            />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.glanceTitle}>
                {activeAlertCount > 0
                  ? `${activeAlertCount} active alerts`
                  : "No active alerts"}
              </ThemedText>
              <ThemedText style={styles.glanceSubtitle}>
                {activeAlertCount > 0
                  ? "Tap for live updates and guidance"
                  : "You’re currently in monitoring mode"}
              </ThemedText>
            </View>
            <IconSymbol
              name="chevron.right"
              size={18}
              color={isDarkMode ? DARK_ICON : LIGHT_ICON}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.sectionSeparator,
            {
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(17,24,39,0.08)",
            },
          ]}
        />

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <View style={styles.sectionTitleContainer}>
            <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
          </View>
          <View style={styles.quickActionsGrid}>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("/report")}
            >
              <IconSymbol
                name="exclamationmark.triangle"
                size={22}
                color="#fff"
              />
              <ThemedText style={styles.quickActionText}>Report</ThemedText>
            </Pressable>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("/map")}
            >
              <IconSymbol name="location" size={22} color="#fff" />
              <ThemedText style={styles.quickActionText}>Map</ThemedText>
            </Pressable>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("/notification")}
            >
              <IconSymbol name="bell" size={22} color="#fff" />
              <ThemedText style={styles.quickActionText}>Alerts</ThemedText>
            </Pressable>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("/submit-tip")}
            >
              <IconSymbol name="paperplane.fill" size={22} color="#fff" />
              <ThemedText style={styles.quickActionText}>Tip</ThemedText>
            </Pressable>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("/me")}
            >
              <IconSymbol name="person" size={22} color="#fff" />
              <ThemedText style={styles.quickActionText}>Profile</ThemedText>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.sectionSeparator,
            {
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(17,24,39,0.08)",
            },
          ]}
        />

        {/* Account / System Snapshot */}
        <View style={styles.snapshotSection}>
          <View
            style={[
              styles.snapshotCard,
              {
                backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
              },
            ]}
          >
            <View style={styles.snapshotHeader}>
              <ThemedText style={styles.snapshotTitle}>
                {isLoggedIn ? "My Account" : "Guest Session"}
              </ThemedText>
              <View style={styles.snapshotBadge}>
                <ThemedText style={styles.snapshotBadgeText}>
                  {isLoggedIn ? "Saved" : "Optional"}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.snapshotText}>
              {isLoggedIn
                ? "Your preferences and alerts are synced to your profile."
                : "You can sign in anytime to sync your profile and preferences."}
            </ThemedText>
          </View>

          <View style={styles.systemSummaryGrid}>
            {recentSystemSummary.map((system) => (
              <Pressable
                key={system.id}
                style={[
                  styles.systemSummaryCard,
                  {
                    backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
                    borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
                  },
                ]}
                onPress={() => handleSystemPress(system.id)}
              >
                <View
                  style={[
                    styles.systemSummaryIcon,
                    { backgroundColor: system.accent },
                  ]}
                >
                  <IconSymbol size={18} name={system.icon} color="#fff" />
                </View>
                <ThemedText style={styles.systemSummaryTitle}>
                  {system.title}
                </ThemedText>
                <ThemedText style={styles.systemSummaryText} numberOfLines={2}>
                  {system.description}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.sectionSeparator,
            {
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.06)"
                : "rgba(17,24,39,0.08)",
            },
          ]}
        />

        {/* Central Command Section */}
        <View style={styles.centralCommandSection}>
          <View style={styles.sectionTitleContainer}>
            <ThemedText style={styles.sectionTitle}>Central Command</ThemedText>
            <IconSymbol
              size={20}
              name="shield"
              color={isDarkMode ? DARK_ICON : LIGHT_ICON}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clusterScroll}
          >
            {systemClusters.map((cluster) => {
              const isActive = cluster.id === activeClusterId;
              return (
                <Pressable
                  key={cluster.id}
                  onPress={() => setActiveClusterId(cluster.id)}
                  style={[
                    styles.clusterPill,
                    isActive && styles.activeClusterPill,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.clusterPillText,
                      isActive && styles.activeClusterPillText,
                    ]}
                  >
                    {cluster.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.systemCardGrid}>
            {activeSystems.map((system) => (
              <Pressable
                key={system.id}
                style={[
                  styles.systemCard,
                  {
                    backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
                    borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
                  },
                ]}
                onPress={() => handleSystemPress(system.id)}
              >
                <View style={styles.systemCardHeader}>
                  <View
                    style={[
                      styles.systemIcon,
                      { backgroundColor: system.accent },
                    ]}
                  >
                    <IconSymbol size={20} name={system.icon} color="#fff" />
                  </View>
                  <View style={styles.systemHeaderText}>
                    <ThemedText style={styles.systemCardTitle}>
                      {system.title}
                    </ThemedText>
                    <ThemedText style={styles.systemDescription}>
                      {system.description}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.moduleList}>
                  {system.modules.map((module) => (
                    <View key={module} style={styles.moduleRow}>
                      <View
                        style={[
                          styles.moduleDot,
                          { backgroundColor: system.accent },
                        ]}
                      />
                      <ThemedText style={styles.moduleText}>
                        {module}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Announcements Section */}
        <View style={styles.announcementSection}>
          <View style={styles.sectionTitleContainer}>
            <ThemedText style={styles.sectionTitle}>
              Latest Announcements
            </ThemedText>
            <IconSymbol
              size={20}
              name="chevron.right"
              color={isDarkMode ? DARK_ICON : LIGHT_ICON}
            />
          </View>
          <View
            style={[
              styles.announcementCard,
              {
                backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
                borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
              },
            ]}
          >
            <View style={styles.announcementImageContainer}>
              <Image
                source={require("@/assets/images/partial-react-logo.png")}
                style={styles.announcementImage}
              />
            </View>
            <View style={styles.announcementContent}>
              <ThemedText style={styles.announcementTitle}>
                New Safety Features
              </ThemedText>
              <ThemedText style={styles.announcementDescription}>
                Check out our latest updates to keep you safer
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Featured Services Section */}
        <View style={styles.featuredSection}>
          <ThemedText style={styles.sectionTitle}>Featured</ThemedText>

          <Pressable
            style={[
              styles.featuredCard,
              { backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG },
            ]}
          >
            <View
              style={[
                styles.featuredIcon,
                { backgroundColor: isDarkMode ? DARK_CARD_BG : "#fff" },
              ]}
            >
              <IconSymbol size={24} name="bell" color={TealColors.primary} />
            </View>
            <View style={styles.featuredContent}>
              <ThemedText type="subtitle" style={styles.featuredTitle}>
                Emergency Alerts
              </ThemedText>
              <ThemedText style={styles.featuredDescription}>
                Real-time emergency notifications
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.featuredCard,
              { backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG },
            ]}
          >
            <View
              style={[
                styles.featuredIcon,
                { backgroundColor: isDarkMode ? DARK_CARD_BG : "#fff" },
              ]}
            >
              <IconSymbol
                size={24}
                name="line.3.horizontal"
                color={TealColors.primary}
              />
            </View>
            <View style={styles.featuredContent}>
              <ThemedText type="subtitle" style={styles.featuredTitle}>
                Service Updates
              </ThemedText>
              <ThemedText style={styles.featuredDescription}>
                Latest updates and announcements
              </ThemedText>
            </View>
          </Pressable>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* FIXED INDICATOR */}
      <View
        pointerEvents="none"
        style={styles.scrollIndicatorTrack}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          setTrackHeight(height);
        }}
      >
        {trackHeight > 0 && (
          <View
            style={[
              styles.scrollIndicatorThumb,
              {
                height: indicatorFillHeight,
                transform: [{ translateY: indicatorTranslateY }],
              },
            ]}
          />
        )}
      </View>

      {/* Message Button */}
      <Pressable
        style={styles.messageButton}
        onPress={() =>
          router.push({
            pathname: "/chat/[id]",
            params: {
              id: "general",
              title: "General Support",
              category: "General",
              status: "Active",
              icon: "robot",
            },
          } as never)
        }
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
  content: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },

  // Overlay track — height will be measured via onLayout
  scrollIndicatorTrack: {
    position: "absolute",
    right: 6,
    top: 132,
    bottom: 32,
    width: 4,
    borderRadius: 999,
    backgroundColor: "rgba(46, 204, 113, 0.18)",
    overflow: "hidden",
  },
  scrollIndicatorThumb: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#2ECC71",
  },

  welcomeSection: {
    marginBottom: 20,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  welcomeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  welcomeEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: TealColors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  welcomeText: {
    fontSize: 30,
    fontWeight: "800",
    color: TealColors.primary,
  },
  subText: {
    fontSize: 15,
    color: "#777",
    fontWeight: "400",
    lineHeight: 21,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  // SUGGESTION: Styles for the new "At a Glance" section
  glanceSection: {
    marginBottom: 20,
  },
  glanceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  glanceTitle: {
    fontWeight: "800",
    fontSize: 15,
  },
  glanceSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  quickActionsSection: {
    marginBottom: 26,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickActionCard: {
    width: "30.5%",
    minWidth: 92,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TealColors.primary,
    gap: 8,
  },
  quickActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionSeparator: {
    height: 1,
    width: "100%",
    marginBottom: 24,
    borderRadius: 999,
  },
  snapshotSection: {
    marginBottom: 28,
    gap: 12,
  },
  snapshotCard: {
    borderRadius: 18,
    padding: 16,
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  snapshotTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  snapshotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(46, 204, 113, 0.16)",
  },
  snapshotBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TealColors.primary,
  },
  snapshotText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#777",
  },
  systemSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  systemSummaryCard: {
    width: "31%",
    minWidth: 108,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  systemSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  systemSummaryTitle: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  systemSummaryText: {
    fontSize: 11,
    color: "#666",
    lineHeight: 15,
  },
  // End of new styles
  centralCommandSection: {
    marginBottom: 28,
  },
  clusterScroll: {
    paddingBottom: 4,
    marginBottom: 12,
  },
  clusterPill: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  activeClusterPill: {
    backgroundColor: TealColors.primary,
    borderColor: TealColors.primary,
  },
  clusterPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  activeClusterPillText: {
    color: "#fff",
  },
  systemCardGrid: {
    gap: 12,
  },
  systemCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  systemCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  systemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  systemHeaderText: {
    flex: 1,
  },
  systemCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  systemDescription: {
    fontSize: 12,
    marginTop: 2,
    color: "#666",
    lineHeight: 16,
  },
  moduleList: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 4,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: "47%",
    minWidth: 0,
  },
  moduleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  moduleText: {
    fontSize: 11,
    color: "#555",
  },
  servicesSection: {
    marginBottom: 28,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  serviceIconOnly: {
    width: "20%",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 4,
  },
  serviceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TealColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceCardText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  announcementSection: {
    marginBottom: 40,
  },
  announcementCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  announcementImageContainer: {
    width: "100%",
    height: 150,
    backgroundColor: "#e0e0e0",
    overflow: "hidden",
  },
  announcementImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  announcementContent: {
    padding: 16,
    gap: 6,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: TealColors.primary,
  },
  announcementDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  featuredSection: {
    marginBottom: 24,
  },
  featuredCard: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  featuredIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: TealColors.primary,
  },
  featuredContent: {
    flex: 1,
    gap: 4,
  },
  featuredTitle: {
    color: TealColors.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  featuredDescription: {
    fontSize: 13,
    color: "#999",
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 20,
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
