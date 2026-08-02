import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export const LATEST_PUSH_ALERT_KEY = 'alertara-latest-push-alert';

type VisibleAlert = {
  title: string;
  body: string;
  severity: string;
  category: string;
  alertId: string;
};

function notificationToAlert(notification: Notifications.Notification): VisibleAlert {
  const content = notification.request.content;
  const data = content.data || {};
  return {
    title: String(content.title || data.title || 'Emergency Alert'),
    body: String(content.body || data.body || 'Open Alertara for safety information.'),
    severity: String(data.severity || 'high').toUpperCase(),
    category: String(data.category || 'Emergency Alert'),
    alertId: String(data.alert_id || ''),
  };
}

export function EmergencyNotificationOverlay() {
  const router = useRouter();
  const [alert, setAlert] = useState<VisibleAlert | null>(null);

  useEffect(() => {
    const saveAndShow = async (notification: Notifications.Notification, show: boolean) => {
      const next = notificationToAlert(notification);
      await AsyncStorage.setItem(LATEST_PUSH_ALERT_KEY, JSON.stringify(next)).catch(() => {});
      if (show) setAlert(next);
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

  return (
    <Modal visible={!!alert} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setAlert(null)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="exclamation-triangle" size={21} color="#fff" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>{alert?.category} · {alert?.severity}</Text>
              <Text style={styles.title}>{alert?.title}</Text>
            </View>
          </View>
          <Text style={styles.body}>{alert?.body}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.dismissButton} onPress={() => setAlert(null)}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
            <Pressable style={styles.viewButton} onPress={() => { setAlert(null); router.push('/notification'); }}>
              <FontAwesome5 name="bell" size={14} color="#fff" />
              <Text style={styles.viewText}>View Alert</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16, paddingTop: 54, backgroundColor: 'rgba(0,0,0,0.42)' },
  card: { borderRadius: 20, borderWidth: 2, borderColor: '#ef4444', backgroundColor: '#151817', padding: 18, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 18, elevation: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dc2626' },
  headerText: { flex: 1 },
  kicker: { color: '#fb7185', fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 19, lineHeight: 24, fontWeight: '900', marginTop: 2 },
  body: { color: '#d8e2df', fontSize: 15, lineHeight: 22, marginTop: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  dismissButton: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#4b5653' },
  dismissText: { color: '#cad5d2', fontWeight: '800' },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: '#dc2626' },
  viewText: { color: '#fff', fontWeight: '900' },
});
