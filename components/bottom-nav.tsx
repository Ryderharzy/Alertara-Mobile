import { Colors, TealColors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import { useTranslate } from "@/hooks/useTranslate";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmergencyCallButton } from "./emergency-call-button";
import { IconSymbol } from "./ui/icon-symbol";

export function BottomNav({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { t } = useTranslate();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const callIndex = state.routes.findIndex((r) => r.name === "call");
  const adjacentSpacing = 40; // spacing reserved on either side of call button
  const baseHeight = Platform.OS === "ios" ? 80 : 60;

  return (
    <View
      style={[
        styles.container,
        {
          // Keep the app tab bar visually separated from the OS navigation bar /
          // gesture area (Android + iPhone home indicator).
          height: baseHeight + insets.bottom,
          paddingBottom: insets.bottom,
          // Avoid the OS nav bar visually "blending" into the app's bottom nav.
          backgroundColor: Colors[isDarkMode ? "dark" : "light"].background,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        // we only show icons for visible tabs
        const label =
          route.name === "index"
            ? t("nav.home", "Home")
            : route.name === "map"
              ? t("nav.map", "Map")
              : route.name === "messages"
                ? t("nav.messages", "Messages")
                : route.name === "report"
                  ? t("nav.report", "Report")
                  : route.name === "me"
                    ? t("nav.profile", "Profile")
                    : route.name === "call"
                      ? t("nav.call", "Call")
                      : options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // custom call button center - render first before checking if hidden
        if (route.name === "call") {
          return (
            <View
              key={route.key}
              style={[
                styles.callButtonContainer,
                {
                  // Lift the floating call button above the safe-area/gesture
                  // inset so it doesn't sit on top of the OS nav bar.
                  bottom:
                    (Platform.OS === "ios" ? 15 : 5) +
                    Math.max(insets.bottom, 0),
                },
              ]}
            >
              <EmergencyCallButton onPress={onPress} />
            </View>
          );
        }

        // hide tabs that have custom tabBarButton function (not already handled like call)
        if (typeof options.tabBarButton === "function") {
          return null;
        }

        const iconName =
          route.name === "index"
            ? isFocused
              ? "house.fill"
              : "house"
            : route.name === "report"
              ? isFocused
                ? "exclamationmark.triangle.fill"
                : "exclamationmark.triangle"
              : route.name === "map"
                ? isFocused
                  ? "map.fill"
                  : "map"
                : route.name === "messages"
                  ? isFocused
                    ? "bubble.left.and.bubble.right.fill"
                    : "bubble.left.and.bubble.right"
                  : route.name === "me"
                    ? isFocused
                      ? "person.fill"
                      : "person"
                    : "circle";

        // add extra inner padding to tabs adjacent to the call button so they don't
        // overlap with the central floating call circle — use padding instead of
        // margin so the icon stays centered within its tab
        const extraStyle = {} as any;
        if (callIndex >= 0) {
          if (index === callIndex - 1) {
            extraStyle.paddingRight = adjacentSpacing;
          } else if (index === callIndex + 1) {
            extraStyle.paddingLeft = adjacentSpacing;
          }
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={[styles.tab, extraStyle]}
          >
            <View style={styles.tabContent}>
              <View style={styles.iconWrapper}>
                <IconSymbol
                  size={24}
                  name={iconName as any}
                  color={isFocused ? TealColors.primary : "#888"}
                />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[
                  styles.label,
                  isFocused && { color: TealColors.primary },
                ]}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: Platform.OS === "ios" ? 80 : 60,
    borderTopWidth: 0,
    borderTopColor: "transparent",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    // explicitly stack icon above text
    flexDirection: "column",
  },
  iconWrapper: {
    position: "relative",
  },
  label: {
    fontSize: 12,
    marginTop: 2,
    color: "#888",
    // ensure multi-line labels are centered beneath the icon
    textAlign: "center",
  },
  callButtonContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 15 : 5,
    alignSelf: "center",
    zIndex: 10,
    marginHorizontal: 20,
  },
  // styling for the legacy teal button is no longer used; handled inside EmergencyCallButton
});
