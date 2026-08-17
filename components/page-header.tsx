import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/context/theme-context";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface PageHeaderProps {
  title: string;
  onBackPress?: () => void;
}

export function PageHeader({ title, onBackPress }: PageHeaderProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <View style={styles.header}>
      <Pressable onPress={handleBack} style={styles.backButton}>
        <IconSymbol
          name="arrow.left"
          size={24}
          color={isDarkMode ? "#60A5FA" : "#3B82F6"}
        />
      </Pressable>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={styles.backButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
});
