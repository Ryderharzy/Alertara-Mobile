import { EMERGENCY_ALERT_CHANNEL_ID, LEGACY_EMERGENCY_ALERT_CHANNEL_IDS, NOTIFICATION_CHANNELS, notificationChannelForSound } from '@/constants/notification-channels';
import { useAuth } from '@/context/auth-context';
import { deviceService } from '@/services/api/device-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const NOTIFICATION_PREF_SOUND_CHOICE = 'alertara.notification.soundChoice';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

async function ensureEmergencyNotificationChannels() {
  if (Platform.OS !== 'android') return;

  const channelConfig = {
    name: 'Emergency Alerts',
    description: 'Critical Alertara alerts with banner, sound, vibration, and lock-screen visibility.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 650, 180, 650, 180, 900],
    sound: 'alertara_emergency.wav',
    enableVibrate: true,
    enableLights: true,
    lightColor: '#023c69',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    bypassDnd: false,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: { enforceAudibility: false, requestHardwareAudioVideoSynchronization: false },
    },
  };

  await Notifications.setNotificationChannelAsync(EMERGENCY_ALERT_CHANNEL_ID, channelConfig);
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.silent, {
    ...channelConfig,
    name: 'Emergency Alerts - Silent',
    description: 'Alertara emergency alerts without sound. Banners and vibration still follow phone settings.',
    sound: null,
  });

  for (const channelId of LEGACY_EMERGENCY_ALERT_CHANNEL_IDS) {
    await Notifications.setNotificationChannelAsync(channelId, {
      ...channelConfig,
      name: channelId === 'alertara_critical_alerts_v2'
        ? 'Critical emergency alerts'
        : 'Emergency Alerts - Urgent',
      description: 'Legacy Alertara emergency alert channel.',
    });
  }
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
      await ensureEmergencyNotificationChannels();

      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) throw new Error('EAS project ID is unavailable.');
      const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      const fcmToken = typeof nativeToken.data === 'string'
        ? nativeToken.data
        : JSON.stringify(nativeToken.data);
      console.log('[Alertara][FCM] Expo push token:', pushToken);
      console.log('[Alertara][FCM] Native FCM token:', fcmToken);
      const deviceId = await getStableDeviceId();
      const soundChoice = await AsyncStorage.getItem(NOTIFICATION_PREF_SOUND_CHOICE);
      const notificationChannel = notificationChannelForSound(soundChoice);
      await AsyncStorage.setItem('alertara-fcm-token', fcmToken);
      await AsyncStorage.setItem('alertara-expo-push-token', pushToken);
      const registrationKey = `${userProfile?.id || 'guest'}:${pushToken}:${fcmToken}`;
      if (registeredKeyRef.current === registrationKey) return;

      await deviceService.registerDevice({
        user_id: userProfile?.id,
        device_id: deviceId,
        device_type: Platform.OS,
        device_name: Device.deviceName || `${Platform.OS} device`,
        push_token: pushToken,
        fcm_token: fcmToken,
        token_type: 'expo',
        notification_permission: 'granted',
        notification_channel: notificationChannel,
        notification_sound: soundChoice === 'silent' ? 'silent' : 'emergency',
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






