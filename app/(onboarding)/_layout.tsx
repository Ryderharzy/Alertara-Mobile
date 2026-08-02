import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="slide2" />
      <Stack.Screen name="slide3" />
      <Stack.Screen name="slide4" />
    </Stack>
  );
}
