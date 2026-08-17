import { incrementNotificationUnreadCount, notifyNotificationCenterChanged } from '@/data/notification-center';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export const LATEST_PUSH_ALERT_KEY = 'alertara-latest-push-alert';

type VisibleAlert = {
  title: string;
  body: string;
  severity: string;
  category: string;
  alertId: string;
  moreInfoUrl: string;
};

function iconForCategory(category?: string) {
  const value = String(category || '').toLowerCase();
  if (/earthquake|seismic|phivolcs|aftershock|tsunami/.test(value)) return 'house-damage';
  if (/weather|pagasa|rain|flood|typhoon|storm|wind|landslide/.test(value)) return 'cloud-showers-heavy';
  if (/fire|smoke|burn/.test(value)) return 'fire';
  if (/medical|health|hospital|injur/.test(value)) return 'heartbeat';
  if (/traffic|vehicle|road/.test(value)) return 'car-crash';
  return 'exclamation-triangle';
}

function notificationToAlert(notification: Notifications.Notification): VisibleAlert {
  const content = notification.request.content;
  const data = content.data || {};
  return {
    title: String(content.title || data.title || 'Emergency Alert'),
    body: String(content.body || data.body || 'Open Alertara for safety information.'),
    severity: String(data.severity || 'high').toUpperCase(),
    category: String(data.category || 'Emergency Alert'),
    alertId: String(data.alert_id || ''),
    moreInfoUrl: String(data.moreInfoUrl || data.more_info_url || ''),
  };
}

export function EmergencyNotificationOverlay() {
  const router = useRouter();
  const [alert, setAlert] = useState<VisibleAlert | null>(null);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  const hideAlert = useCallback(() => {
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setAlert(null));
  }, [bannerAnim]);

  const openAlert = useCallback(() => {
    hideAlert();
    router.push('/notification');
  }, [hideAlert, router]);

  useEffect(() => {
    if (!alert) return;

    bannerAnim.setValue(0);
    Animated.spring(bannerAnim, {
      toValue: 1,
      damping: 18,
      stiffness: 170,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(hideAlert, 9000);
    return () => clearTimeout(timer);
  }, [alert, bannerAnim, hideAlert]);

  useEffect(() => {
    const saveAndShow = async (notification: Notifications.Notification, show: boolean) => {
      const next = notificationToAlert(notification);
      await AsyncStorage.setItem(LATEST_PUSH_ALERT_KEY, JSON.stringify(next)).catch(() => {});
      notifyNotificationCenterChanged();
      if (show) {
        await incrementNotificationUnreadCount(1).catch(() => {});
        setAlert(next);
      }
    };

    const received = Notifications.addNotificationReceivedListener((notification) => {
      void saveAndShow(notification, true);
    });
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      void saveAndShow(response.notification, false);
      setAlert(null);
      router.push('/notification');
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void saveAndShow(response.notification, false);
    });
    return () => {
      received.remove();
      responded.remove();
    };
  }, [router]);

  if (!alert) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={hideAlert}>
      <View pointerEvents="box-none" style={styles.overlayRoot}>
        <Animated.View
          style={[
            styles.banner,
            {
              opacity: bannerAnim,
              transform: [
                {
                  translateY: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-28, 0],
                  }),
                },
                {
                  scale: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.alertStripe} />
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name={iconForCategory(alert.category)} size={20} color="#fff" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>{alert.category} - {alert.severity}</Text>
              <Text style={styles.title} numberOfLines={2}>{alert.title}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={hideAlert} accessibilityLabel="Dismiss alert banner">
              <FontAwesome5 name="times" size={14} color="#dbe7e3" />
            </Pressable>
          </View>
          <Text style={styles.body} numberOfLines={3}>{alert.body}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.dismissButton} onPress={hideAlert}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
            <Pressable style={styles.viewButton} onPress={openAlert}>
              <FontAwesome5 name="bell" size={14} color="#fff" />
              <Text style={styles.viewText}>View Alert</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 46,
  },
  banner: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.7)',
    backgroundColor: '#111a1b',
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 24,
  },
  alertStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#dc2626',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dc2626' },
  headerText: { flex: 1 },
  kicker: { color: '#fb7185', fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 18, lineHeight: 23, fontWeight: '900', marginTop: 2 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  body: { color: '#d8e2df', fontSize: 14, lineHeight: 20, marginTop: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  dismissButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#4b5653' },
  dismissText: { color: '#cad5d2', fontWeight: '800' },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#dc2626' },
  viewText: { color: '#fff', fontWeight: '900' },
});
