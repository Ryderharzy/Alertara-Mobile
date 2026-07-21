import { Tabs } from "expo-router";
import React from "react";

import { BottomNav } from "@/components/bottom-nav";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";
import { useTranslate } from "@/hooks/useTranslate";

export default function TabLayout() {
  const { isDarkMode } = useTheme();
  const { t } = useTranslate();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[isDarkMode ? "dark" : "light"].tint,
        tabBarInactiveTintColor: Colors[isDarkMode ? "dark" : "light"].icon,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderTopColor: "transparent",
        },
        headerShown: false,
      }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: t("nav.map"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="map" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: t("nav.messages"),
          tabBarButton: () => null,
        }}
      />

      <Tabs.Screen
        name="call"
        options={{
          title: t("nav.call"),
          tabBarButton: () => null,
        }}
      />

      <Tabs.Screen
        name="report"
        options={{
          title: t("nav.report"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="exclamationmark.triangle" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="me"
        options={{
          title: t("nav.profile"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="about"
        options={{
          tabBarButton: () => null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
