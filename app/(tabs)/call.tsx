import { Header } from "@/components/header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
    Colors,
    DARK_BORDER,
    DARK_CARD_BG,
    LIGHT_BORDER,
    LIGHT_CARD_BG,
    TealColors,
} from "@/constants/theme";
import { usePreferences } from "@/context/preferences-context";
import { useTheme } from "@/context/theme-context";
import { getTranslation } from "@/data/emergency-translations";
import React from "react";
import {
    Alert,
    Linking,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

type HotlineCard = {
  id: string;
  title: string;
  description: string;
  phone: string;
  icon: string;
};

const hotlineGroups: { title: string; items: HotlineCard[] }[] = [
  {
    title: "Primary Emergency",
    items: [
      {
        id: "qc-helpline-122",
        title: "QC Helpline 122",
        description:
          "Main 24/7 Quezon City emergency and assistance hotline. Routes police, fire, medical, disaster, and other urgent concerns.",
        phone: "122",
        icon: "phone",
      },
      {
        id: "national-emergency-911",
        title: "National Emergency Hotline",
        description:
          "Nationwide fallback for life-threatening emergencies and urgent response.",
        phone: "911",
        icon: "shield",
      },
    ],
  },
  {
    title: "Quezon City Emergency Operations",
    items: [
      {
        id: "qcdrrmo-main",
        title: "QC Emergency Operations Center / QCDRRMO",
        description: "Emergency operations, disaster response, and coordination.",
        phone: "0977-031-2892",
        icon: "antenna.radiowaves.left.and.right",
      },
      {
        id: "qcdrrmo-smart",
        title: "QCDRRMO / Smart",
        description: "Alternate contact for emergency operations and coordination.",
        phone: "0947-885-9929",
        icon: "flame",
      },
      {
        id: "qcdrrmo-office",
        title: "QCDRRMO Office",
        description: "Direct landline for emergency operations and response support.",
        phone: "(02) 8988-4242 local 7245",
        icon: "bandage",
      },
      {
        id: "ems-smart",
        title: "EMS / Search and Rescue",
        description: "Emergency medical services and search-and-rescue response.",
        phone: "0947-884-7498",
        icon: "bandage",
      },
      {
        id: "ems-landline",
        title: "EMS / Search and Rescue",
        description: "Alternative landline for emergency medical and rescue support.",
        phone: "(02) 8928-4396",
        icon: "shield",
      },
    ],
  },
  {
    title: "Police and Fire",
    items: [
      {
        id: "qcpd-mobile",
        title: "Quezon City Police District (QCPD)",
        description: "Emergency mobile for police assistance and public safety concerns.",
        phone: "0917-840-3925",
        icon: "shield",
      },
      {
        id: "qcpd-office",
        title: "QCPD Office",
        description: "Landline for police district coordination and assistance.",
        phone: "(02) 8925-8326",
        icon: "shield",
      },
      {
        id: "qcfd-bfp",
        title: "Quezon City Fire District / BFP QC",
        description: "Fire and rescue response for Quezon City incidents.",
        phone: "(02) 8924-1922",
        icon: "flame",
      },
    ],
  },
  {
    title: "Support & Protection",
    items: [
      {
        id: "women-children-protection",
        title: "Women & Children Protection",
        description: "Support for abuse, violence, and urgent protection concerns.",
        phone: "911",
        icon: "person.2",
      },
      {
        id: "mental-health-crisis",
        title: "Mental Health / Crisis",
        description: "Immediate help for severe distress or crisis situations.",
        phone: "911",
        icon: "info.circle",
      },
      {
        id: "barangay-local-hotline",
        title: "Barangay / Local Hotline",
        description: "Local coordination for community-level incidents and support.",
        phone: "911",
        icon: "house",
      },
      {
        id: "city-command-center",
        title: "City Command Center",
        description: "Escalation point for city-wide emergency coordination.",
        phone: "911",
        icon: "antenna.radiowaves.left.and.right",
      },
    ],
  },
];

function callNumber(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {
    Alert.alert("Error", "Unable to initiate call.");
  });
}

export default function CallScreen() {
  const { isDarkMode } = useTheme();
  const { language } = usePreferences();

  const handleShareLocation = () => {
    Alert.alert(
      "Share My Location",
      "Connect this action to your location-sharing flow or emergency message."
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background },
      ]}
    >
      <Header />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
              borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <IconSymbol size={28} name="exclamationmark.triangle.fill" color="#fff" />
            </View>
            <View style={styles.heroText}>
              <ThemedText style={styles.title}>Emergency Help</ThemedText>
              <ThemedText style={styles.subtitle}>
                {getTranslation("report_emergency", language)}: Call responders immediately if there is danger to life, injury, fire, crime, or urgent medical need.
              </ThemedText>
            </View>
          </View>

          <Pressable style={styles.primaryButton} onPress={() => callNumber("911")}>
            <IconSymbol size={24} name="phone.fill" color="#fff" />
            <ThemedText style={styles.primaryButtonText}>Call 911</ThemedText>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleShareLocation}>
            <IconSymbol size={18} name="location.fill" color={TealColors.primary} />
            <ThemedText style={styles.secondaryButtonText}>{getTranslation("move_to_higher_ground", language)}</ThemedText>
          </Pressable>
        </View>

        <View
          style={[
            styles.locationCard,
            {
              backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
              borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
            },
          ]}
        >
          <View style={styles.sectionRow}>
            <IconSymbol size={18} name="location.fill" color={TealColors.primary} />
            <ThemedText style={styles.sectionTitle}>Location Status</ThemedText>
          </View>
          <ThemedText style={styles.locationText}>{getTranslation("stay_calm", language)}</ThemedText>
          <ThemedText style={styles.locationText}>
            Nearest response area: Quezon City
          </ThemedText>
        </View>

        {hotlineGroups.map((group) => (
          <View key={group.title} style={styles.groupSection}>
            <ThemedText style={styles.groupTitle}>{group.title}</ThemedText>
            <View style={styles.cardGrid}>
              {group.items.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.hotlineCard,
                    {
                      backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
                      borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
                    },
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardIcon}>
                      <IconSymbol size={18} name={item.icon} color="#fff" />
                    </View>
                    <View style={styles.cardText}>
                      <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
                      <ThemedText style={styles.cardDescription}>{item.description}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.phoneText}>{item.phone}</ThemedText>
                  <Pressable style={styles.callButton} onPress={() => callNumber(item.phone)}>
                    <ThemedText style={styles.callButtonText}>Call Now</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View
          style={[
            styles.prepCard,
            {
              backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
              borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
            },
          ]}
        >
          <ThemedText style={styles.groupTitle}>Before You Call</ThemedText>
          <ThemedText style={styles.prepItem}>State your exact location.</ThemedText>
          <ThemedText style={styles.prepItem}>Describe what happened briefly.</ThemedText>
          <ThemedText style={styles.prepItem}>Say how many people are affected.</ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  heroHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#D93025",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
  },
  primaryButton: {
    backgroundColor: "#D93025",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(58, 118, 117, 0.28)",
  },
  secondaryButtonText: {
    color: TealColors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  locationCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  locationText: {
    fontSize: 13,
    color: "#666",
  },
  groupSection: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  hotlineCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  cardTopRow: {
    gap: 10,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#D93025",
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#666",
  },
  phoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: TealColors.primary,
  },
  callButton: {
    backgroundColor: TealColors.primary,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  callButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  prepCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  prepItem: {
    fontSize: 13,
    color: "#666",
  },
});
