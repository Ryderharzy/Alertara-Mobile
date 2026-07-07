import React, { useState } from "react";
import { Header } from "@/components/header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { systemClusters, systemRegistry } from "@/data/central-command-systems";
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
import { useTheme } from "@/context/theme-context";
import { useRouter } from "expo-router";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();

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

  const handleSystemPress = (systemId: string) => {
    router.push(`/central-command/${systemId}`);
  };

  // Scroll progress based on actual scrollable range
  const maxScrollDistance = Math.max(
    scrollMetrics.contentHeight - scrollMetrics.visibleHeight,
    1
  );

  const scrollProgress = Math.max(
    0,
    Math.min(scrollMetrics.scrollY / maxScrollDistance, 1)
  );

  // Use the REAL rendered track height, not an estimated one
  const safeContentHeight = Math.max(scrollMetrics.contentHeight, 1);
  const safeVisibleHeight = Math.max(scrollMetrics.visibleHeight, 1);

  // Thumb height proportional to visible content, clamped
  const rawThumbHeight =
    trackHeight > 0
      ? (safeVisibleHeight / safeContentHeight) * trackHeight
      : 0;

  const indicatorFillHeight =
    trackHeight > 0
      ? Math.max(44, Math.min(rawThumbHeight, trackHeight))
      : 0;

  const indicatorTravelDistance = Math.max(
    trackHeight - indicatorFillHeight,
    0
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
            <ThemedText style={styles.welcomeText}>Welcome back!</ThemedText>
          </View>
          <ThemedText style={styles.subText}>
            Your main services and role-based systems in one place
          </ThemedText>
        </View>

        {/* SUGGESTION: At a Glance / Status Section */}
        <View style={styles.glanceSection}>
          <Pressable
            style={[
              styles.glanceCard,
              {
                backgroundColor: isDarkMode ? "#2a1a1a" : "#fff4f4",
                borderColor: isDarkMode ? "#5c2d2d" : "#f7e4e4",
              },
            ]}
          >
            <IconSymbol name="bell.badge" size={20} color="#e53935" />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.glanceTitle}>
                2 Active High-Priority Alerts
              </ThemedText>
              <ThemedText style={styles.glanceSubtitle}>
                Tap to view details
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Main Services */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionTitleContainer}>
            <ThemedText style={styles.sectionTitle}>Dashboard</ThemedText>
            <IconSymbol
              size={20}
              name="chevron.right"
              color={isDarkMode ? DARK_ICON : LIGHT_ICON}
            />
          </View>

          <View style={styles.servicesGrid}>
            <Pressable
              style={styles.serviceIconOnly}
              onPress={() => router.push("/report")}
            >
              <View
                style={[
                  styles.serviceIconCircle,
                  { backgroundColor: "#F39C12" },
                ]}
              >
                <IconSymbol
                  size={28}
                  name="exclamationmark.triangle"
                  color="#fff"
                />
              </View>
              <ThemedText style={styles.serviceCardText}>Report</ThemedText>
            </Pressable>

            <Pressable
              style={styles.serviceIconOnly}
              onPress={() => router.push("/map")}
            >
              <View
                style={[
                  styles.serviceIconCircle,
                  { backgroundColor: "#E74C3C" },
                ]}
              >
                <IconSymbol size={28} name="location" color="#fff" />
              </View>
              <ThemedText style={styles.serviceCardText}>Map</ThemedText>
            </Pressable>

            <Pressable
              style={styles.serviceIconOnly}
              onPress={() => router.push("/submit-tip")}
            >
              <View
                style={[
                  styles.serviceIconCircle,
                  { backgroundColor: "#3498DB" },
                ]}
              >
                <IconSymbol size={28} name="paperplane.fill" color="#fff" />
              </View>
              <ThemedText style={styles.serviceCardText}>Tip</ThemedText>
            </Pressable>

            <Pressable
              style={styles.serviceIconOnly}
              onPress={() => router.push("/notification")}
            >
              <View
                style={[
                  styles.serviceIconCircle,
                  { backgroundColor: TealColors.primary },
                ]}
              >
                <IconSymbol size={28} name="bell" color="#fff" />
              </View>
              <ThemedText style={styles.serviceCardText}>Alerts</ThemedText>
            </Pressable>

            <Pressable
              style={styles.serviceIconOnly}
              onPress={() => router.push("/me")}
            >
              <View
                style={[
                  styles.serviceIconCircle,
                  { backgroundColor: "#9B59B6" },
                ]}
              >
                <IconSymbol size={28} name="person" color="#fff" />
              </View>
              <ThemedText style={styles.serviceCardText}>Me</ThemedText>
            </Pressable>
          </View>
        </View>

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
                    backgroundColor: isDarkMode
                      ? DARK_CARD_BG
                      : LIGHT_CARD_BG,
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
                      <ThemedText style={styles.moduleText}>{module}</ThemedText>
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
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  welcomeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "700",
    color: TealColors.primary,
  },
  subText: {
    fontSize: 15,
    color: "#999",
    fontWeight: "400",
  },
  // SUGGESTION: Styles for the new "At a Glance" section
  glanceSection: {
    marginBottom: 20,
  },
  glanceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  glanceTitle: {
    fontWeight: "700",
    fontSize: 14,
  },
  glanceSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
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
