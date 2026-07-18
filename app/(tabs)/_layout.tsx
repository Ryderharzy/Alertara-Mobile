import { Tabs } from "expo-router";
import React from "react";

import { BottomNav } from "@/components/bottom-nav";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";

export default function TabLayout() {
  const { isDarkMode } = useTheme();

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
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="map" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="bubble.left.and.bubble.right"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="call"
        options={{
          title: "Call",
          tabBarButton: () => null,
        }}
      />

      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="exclamationmark.triangle" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="me"
        options={{
          title: "Profile",
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
