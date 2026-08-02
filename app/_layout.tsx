import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/context/auth-context";
import { NotificationRegistration } from "@/components/notification-registration";
import { EmergencyNotificationOverlay } from "@/components/emergency-notification-overlay";
import { PreferencesProvider } from "@/context/preferences-context";
import { ThemeProvider as CustomThemeProvider } from "@/context/theme-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [networkChecked, setNetworkChecked] = useState(false);
  const [online, setOnline] = useState(false);

  const applyNetworkState = useCallback((state: Network.NetworkState) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    setNetworkChecked(true);
  }, []);

  const checkNetwork = useCallback(async () => {
    setNetworkChecked(false);
    try {
      applyNetworkState(await Network.getNetworkStateAsync());
    } catch {
      setOnline(false);
      setNetworkChecked(true);
    }
  }, [applyNetworkState]);

  useEffect(() => {
    void checkNetwork();
    const subscription = Network.addNetworkStateListener(applyNetworkState);
    return () => subscription.remove();
  }, [applyNetworkState, checkNetwork]);

  return (
    <ThemeProvider value={(colorScheme as "light" | "dark" | null) === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "default",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen name="safety-map" options={{ presentation: "card" }} />
        <Stack.Screen name="submit-tip" options={{ presentation: "card" }} />
        <Stack.Screen name="notification" options={{ presentation: "card" }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: "card" }} />
      </Stack>
      <StatusBar style="auto" />
      {(!networkChecked || !online) && (
        <View style={styles.connectionScreen}>
          {!networkChecked ? (
            <>
              <ActivityIndicator size="large" color="#4c9b93" />
              <Text style={styles.connectionTitle}>Checking connection...</Text>
            </>
          ) : (
            <>
              <Text style={styles.connectionIcon}>!</Text>
              <Text style={styles.connectionTitle}>Internet connection required</Text>
              <Text style={styles.connectionMessage}>Connect to Wi-Fi or turn on mobile data to use Alertara and place emergency calls.</Text>
              <Pressable style={styles.retryButton} onPress={() => void checkNetwork()}>
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  connectionScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#071816",
  },
  connectionIcon: { color: "#65b7b0", fontSize: 64, fontWeight: "800" },
  connectionTitle: { color: "#ffffff", fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 16 },
  connectionMessage: { color: "#a6c1bd", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 10, maxWidth: 340 },
  retryButton: { marginTop: 22, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: "#248f84" },
  retryText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CustomThemeProvider>
        <AuthProvider>
          <NotificationRegistration />
          <EmergencyNotificationOverlay />
          <PreferencesProvider>
            <RootLayoutNav />
          </PreferencesProvider>
        </AuthProvider>
      </CustomThemeProvider>
    </SafeAreaProvider>
  );
}
