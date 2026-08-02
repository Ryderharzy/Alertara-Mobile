import { useAuth } from '@/context/auth-context';
import { deviceService } from '@/services/api/device-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function getStableDeviceId() {
  const existing = await AsyncStorage.getItem('deviceId');
  if (existing) return existing;
  const created = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  await AsyncStorage.setItem('deviceId', created);
  return created;
}

export function NotificationRegistration() {
  const { userProfile } = useAuth();
  const registeringRef = useRef(false);
  const registeredKeyRef = useRef('');

  const register = useCallback(async () => {
    if (!Device.isDevice || registeringRef.current) return;
    const network = await Network.getNetworkStateAsync();
    if (!network.isConnected || network.isInternetReachable === false) return;

    registeringRef.current = true;
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alertara_emergency_alerts_v2', {
          name: 'Emergency alerts',
          description: 'Alertara public safety and emergency notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 180, 300],
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          lightColor: '#ef4444',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
            flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
          },
        });
        await Notifications.setNotificationChannelAsync('alertara_critical_alerts_v2', {
          name: 'Critical emergency alerts',
          description: 'Urgent Alertara warnings requiring immediate attention',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 650, 180, 650, 180, 900],
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          lightColor: '#dc2626',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
          bypassDnd: true,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
            flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
          },
        });
      }

      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) throw new Error('EAS project ID is unavailable.');
      const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      const deviceId = await getStableDeviceId();
      const registrationKey = `${userProfile?.id || 'guest'}:${pushToken}`;
      if (registeredKeyRef.current === registrationKey) return;

      await deviceService.registerDevice({
        user_id: userProfile?.id,
        device_id: deviceId,
        device_type: Platform.OS,
        device_name: Device.deviceName || `${Platform.OS} device`,
        push_token: pushToken,
        token_type: 'expo',
        notification_permission: 'granted',
      });
      registeredKeyRef.current = registrationKey;
    } catch (error) {
      console.warn('Notification registration unavailable:', error);
    } finally {
      registeringRef.current = false;
    }
  }, [userProfile?.id]);

  useEffect(() => {
    void register();
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void register();
    });
    return () => subscription.remove();
  }, [register]);

  return null;
}
