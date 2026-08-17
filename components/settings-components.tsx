import {
    DARK_BORDER,
    DARK_CARD_BG,
    LIGHT_BORDER,
    LIGHT_CARD_BG,
    TealColors
} from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import React from "react";
import {
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    View
} from "react-native";
import { ThemedText } from "./themed-text";
import { IconSymbol } from "./ui/icon-symbol";

// Section wrapper
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { isDarkMode } = useTheme();

  return (
    <View style={styles.sectionContainer}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View
        style={[
          styles.sectionContent,
          {
            backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
            borderColor: isDarkMode ? DARK_BORDER : LIGHT_BORDER,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// Menu item for navigation or actions
export function SettingsMenuItem({
  label,
  value,
  onPress,
  showChevron = true,
  icon,
  danger = false,
  expanded = false,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
  icon?: string;
  danger?: boolean;
  expanded?: boolean;
}) {
  const { isDarkMode } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed
            ? isDarkMode
              ? "#333"
              : "#f5f5f5"
            : "transparent",
        },
      ]}
    >
      <View style={styles.menuItemLeft}>
        {icon && (
          <IconSymbol
            size={20}
            name={icon as any}
            color={danger ? "#E74C3C" : isDarkMode ? "#999" : "#666"}
          />
        )}
        <View style={styles.menuItemTextContainer}>
          <ThemedText
            style={[styles.menuItemLabel, danger && { color: "#E74C3C" }]}
          >
            {label}
          </ThemedText>
          {value && (
            <ThemedText style={styles.menuItemValue}>{value}</ThemedText>
          )}
        </View>
      </View>
      {showChevron && (
        <IconSymbol
          size={20}
          name={expanded ? "chevron.down" : "chevron.right"}
          color={expanded ? TealColors.primary : isDarkMode ? "#666" : "#999"}
        />
      )}
    </Pressable>
  );
}

// Toggle switch
export function SettingsToggle({
  label,
  description,
  value,
  onValueChange,
  icon,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: string;
}) {
  const { isDarkMode } = useTheme();

  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleLeft}>
        {icon && (
          <IconSymbol
            size={20}
            name={icon as any}
            color={isDarkMode ? "#999" : "#666"}
          />
        )}
        <View style={styles.toggleTextContainer}>
          <ThemedText style={styles.toggleLabel}>{label}</ThemedText>
          {description && (
            <ThemedText style={styles.toggleDescription}>
              {description}
            </ThemedText>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: isDarkMode ? "#555" : "#ddd",
          true: TealColors.primary + "80",
        }}
        thumbColor={value ? TealColors.primary : "#999"}
      />
    </View>
  );
}

// Divider
export function SettingsDivider() {
  const { isDarkMode } = useTheme();
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: isDarkMode ? "#333" : "#e0e0e0" },
      ]}
    />
  );
}

// Select/Picker
export function SettingsSelect({
  label,
  description,
  value,
  options,
  onSelect,
  icon,
}: {
  label: string;
  description?: string;
  value: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  icon?: string;
}) {
  const { isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.selectContainer,
          {
            backgroundColor: pressed
              ? isDarkMode
                ? "#333"
                : "#f5f5f5"
              : "transparent",
          },
        ]}
      >
        <View style={styles.selectLeft}>
          {icon && (
            <IconSymbol
              size={20}
              name={icon as any}
              color={isDarkMode ? "#999" : "#666"}
            />
          )}
          <View style={styles.selectTextContainer}>
            <ThemedText style={styles.selectLabel}>{label}</ThemedText>
            {description && (
              <ThemedText style={styles.selectDescription}>
                {description}
              </ThemedText>
            )}
          </View>
        </View>
        <View style={styles.selectValue}>
          <ThemedText style={styles.selectValueText}>
            {selectedOption?.label}
          </ThemedText>
          <IconSymbol
            size={16}
            name="chevron.down"
            color={isDarkMode ? "#666" : "#999"}
          />
        </View>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode ? DARK_CARD_BG : LIGHT_CARD_BG,
              },
            ]}
          >
            <ThemedText style={styles.modalTitle}>{label}</ThemedText>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                  style={styles.optionItem}
                >
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      value === item.value && {
                        color: TealColors.primary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                  {value === item.value && (
                    <IconSymbol
                      size={20}
                      name="checkmark"
                      color={TealColors.primary}
                    />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    marginLeft: 4,
    opacity: 0.7,
  },
  sectionContent: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemValue: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  toggleDescription: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  selectLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  selectTextContainer: {
    flex: 1,
  },
  selectLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectDescription: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  selectValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectValueText: {
    fontSize: 14,
    fontWeight: "500",
    color: TealColors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  optionLabel: {
    fontSize: 16,
  },
});
