import { Header } from "@/components/header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  Colors,
  DARK_CARD_BG,
  DARK_BORDER,
  LIGHT_CARD_BG,
  LIGHT_BORDER,
  TealColors,
} from "@/constants/theme";
import { systemRegistry } from "@/data/central-command-systems";
import { useTheme } from "@/context/theme-context";
import { useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  getSampleRecords,
  SampleRecord,
} from "@/data/central-command-samples";

const STATUS_COLORS: Record<SampleRecord["status"], string> = {
  Live: "#16a085",
  Draft: "#f39c12",
  Monitoring: "#2980b9",
  Scheduled: "#8e44ad",
};

const getStatusColor = (status: SampleRecord["status"]) =>
  STATUS_COLORS[status] ?? "#bbb";

export default function SystemDetail() {
  const { system } = useLocalSearchParams();
  const { isDarkMode } = useTheme();
  const definition = system
    ? systemRegistry[system as keyof typeof systemRegistry]
    : undefined;
  const sampleRecords: SampleRecord[] = definition
    ? getSampleRecords(definition.id)
    : [];

  if (!definition) {
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
        <View style={styles.messageContainer}>
          <ThemedText style={styles.notFoundText}>
            System not found.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

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
        contentContainerStyle={[
          styles.content,
          {
            backgroundColor: isDarkMode
              ? DARK_CARD_BG
              : LIGHT_CARD_BG,
            borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailHeader}>
          <View
            style={[
              styles.detailIcon,
              { backgroundColor: definition.accent },
            ]}
          >
            <IconSymbol size={28} name={definition.icon} color="#fff" />
          </View>
          <View style={styles.detailHeaderText}>
            <ThemedText style={styles.detailTitle}>
              {definition.title}
            </ThemedText>
            <ThemedText style={styles.detailDescription}>
              {definition.description}
            </ThemedText>
          </View>
        </View>

        <View style={styles.moduleSection}>
          <ThemedText style={styles.sectionLabel}>Modules</ThemedText>
          <View style={styles.moduleList}>
            {definition.modules.map((module) => (
              <View key={module} style={styles.moduleRow}>
                <View
                  style={[
                    styles.moduleDot,
                    { backgroundColor: definition.accent },
                  ]}
                />
                <ThemedText style={styles.moduleText}>{module}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {sampleRecords.length > 0 && (
          <View style={styles.sampleSection}>
            <ThemedText style={styles.sectionLabel}>Sample Data</ThemedText>
            <View style={styles.sampleList}>
              {sampleRecords.map((record) => (
                <View
                  key={record.id}
                  style={[
                    styles.sampleCard,
                    {
                      backgroundColor: isDarkMode
                        ? DARK_CARD_BG
                        : LIGHT_CARD_BG,
                      borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
                    },
                  ]}
                >
                  <View style={styles.sampleHeader}>
                    <ThemedText style={styles.sampleTitle}>
                      {record.title}
                    </ThemedText>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: getStatusColor(record.status) },
                      ]}
                    >
                      <ThemedText style={styles.statusText}>
                        {record.status}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.sampleSummary}>
                    {record.summary}
                  </ThemedText>
                  <ThemedText style={styles.sampleReference}>
                    {record.reference}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "600",
    color: TealColors.primary,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  detailIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  detailHeaderText: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  detailDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  moduleSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  moduleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "47%",
    minWidth: 0,
  },
  moduleDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
  },
  moduleText: {
    fontSize: 13,
  },
  sampleSection: {
    gap: 12,
  },
  sampleList: {
    gap: 12,
  },
  sampleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  sampleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  sampleTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  sampleSummary: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  sampleReference: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
});
