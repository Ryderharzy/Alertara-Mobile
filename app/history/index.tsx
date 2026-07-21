import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, TealColors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { userHistoryService, type UserHistoryData } from "@/services/api/user-history-service";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

type TabType = "reports" | "calls";

export default function HistoryScreen() {
  const { isDarkMode } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("reports");
  const [userHistory, setUserHistory] = useState<UserHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    if (!userProfile?.id) return;
    
    try {
      setIsLoading(true);
      const history = await userHistoryService.getUserHistory(userProfile.id);
      setUserHistory(history);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [userProfile?.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderReports = () => {
    if (!userHistory?.reports.recent || userHistory.reports.recent.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol size={48} name="doc.text" color={Colors.dark.tabIconDefault} />
          <ThemedText style={styles.emptyText}>No reports yet</ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>{userHistory.reports.total}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: '#000' }]}>Total</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: TealColors.primary }]}>
              {userHistory.reports.pending}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: '#000' }]}>Pending</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: "#10B981" }]}>
              {userHistory.reports.resolved}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: '#000' }]}>Resolved</ThemedText>
          </View>
        </View>

        <View style={styles.itemsContainer}>
          {userHistory.reports.recent.map((report) => (
            <View key={report.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTypeBadge}>
                  <IconSymbol size={16} name="exclamationmark.triangle" color={TealColors.primary} />
                  <ThemedText style={styles.itemTypeText}>{report.report_type}</ThemedText>
                </View>
                <View style={styles.itemStatusBadge}>
                  <ThemedText style={[
                    styles.itemStatusText,
                    { color: report.status === "resolved" ? "#10B981" : TealColors.primary }
                  ]}>
                    {report.status}
                  </ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.itemDescription} numberOfLines={3}>
                {report.description}
              </ThemedText>
              
              <View style={styles.itemFooter}>
                <View style={styles.itemDateTime}>
                  <IconSymbol size={14} name="calendar" color={Colors.dark.tabIconDefault} />
                  <ThemedText style={styles.itemDateTimeText}>{formatDate(report.created_at)}</ThemedText>
                </View>
                <View style={styles.itemDateTime}>
                  <IconSymbol size={14} name="clock" color={Colors.dark.tabIconDefault} />
                  <ThemedText style={styles.itemDateTimeText}>{formatTime(report.created_at)}</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCalls = () => {
    if (!userHistory?.calls.recent || userHistory.calls.recent.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol size={48} name="phone" color={Colors.dark.tabIconDefault} />
          <ThemedText style={styles.emptyText}>No calls yet</ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statValue}>{userHistory.calls.total}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: '#000' }]}>Total Calls</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: "#EF4444" }]}>
              {userHistory.calls.emergency}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: '#000' }]}>Emergency</ThemedText>
          </View>
        </View>

        <View style={styles.itemsContainer}>
          {userHistory.calls.recent.map((activity) => (
            <View key={activity.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTypeBadge}>
                  <IconSymbol size={16} name="phone" color={TealColors.primary} />
                  <ThemedText style={styles.itemTypeText}>{activity.activity_type}</ThemedText>
                </View>
                <View style={styles.itemStatusBadge}>
                  <ThemedText style={styles.itemStatusText}>{activity.status}</ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.itemDescription} numberOfLines={3}>
                {activity.description}
              </ThemedText>
              
              <View style={styles.itemFooter}>
                <View style={styles.itemDateTime}>
                  <IconSymbol size={14} name="calendar" color={Colors.dark.tabIconDefault} />
                  <ThemedText style={styles.itemDateTimeText}>{formatDate(activity.created_at)}</ThemedText>
                </View>
                <View style={styles.itemDateTime}>
                  <IconSymbol size={14} name="clock" color={Colors.dark.tabIconDefault} />
                  <ThemedText style={styles.itemDateTimeText}>{formatTime(activity.created_at)}</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol size={28} name="arrow.left" color={TealColors.primary} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: '#000' }]}>History</ThemedText>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.tabsContainer}>
        <Pressable
          style={[
            styles.tab,
            activeTab === "reports" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("reports")}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "reports" && styles.activeTabText,
            ]}
          >
            Reports
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === "calls" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("calls")}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "calls" && styles.activeTabText,
            ]}
          >
            Calls
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={TealColors.primary} />
            <ThemedText style={styles.loadingText}>Loading history...</ThemedText>
          </View>
        ) : activeTab === "reports" ? (
          renderReports()
        ) : (
          renderCalls()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 8,
    color: Colors.dark.text,
  },
  headerSpacer: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: TealColors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  activeTabText: {
    color: TealColors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.dark.text,
  },
  statsContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(58, 118, 117, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: TealColors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.text,
    marginTop: 4,
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    padding: 16,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(58, 118, 117, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  itemTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: TealColors.primary,
  },
  itemStatusBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  itemStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  itemDescription: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
    lineHeight: 20,
  },
  itemFooter: {
    flexDirection: "row",
    gap: 16,
  },
  itemDateTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemDateTimeText: {
    fontSize: 12,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.dark.text,
  },
});
