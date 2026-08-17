import { useAuth } from '@/context/auth-context';
import { Redirect } from 'expo-router';

export default function AppEntry() {
  const { isLoading, onboardingCompleted } = useAuth();

  if (isLoading) return null;
  return <Redirect href={onboardingCompleted ? '/(tabs)' : '/(onboarding)'} />;
}
