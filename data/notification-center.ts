import AsyncStorage from "@react-native-async-storage/async-storage";

export const NOTIFICATION_ACK_STORAGE_KEY = "alertara-notification-acknowledged";
export const NOTIFICATION_UNREAD_COUNT_STORAGE_KEY =
  "alertara-notification-unread-count";

export const NOTIFICATION_IDS = [
  "general-1",
  "general-2",
  "earthquake",
  "weather",
  "fire-alert",
  "crash-alert",
  "announcement-1",
  "reminder-1",
  "emergency-1",
] as const;
type NotificationUnreadListener = (count: number) => void;
type NotificationCenterChangeListener = () => void;

const unreadListeners = new Set<NotificationUnreadListener>();
const centerChangeListeners = new Set<NotificationCenterChangeListener>();

function normalizeUnreadCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function notifyUnreadListeners(count: number) {
  unreadListeners.forEach((listener) => listener(count));
}

export async function getNotificationUnreadCount() {
  const saved = await AsyncStorage.getItem(NOTIFICATION_UNREAD_COUNT_STORAGE_KEY);
  return normalizeUnreadCount(saved);
}

export async function setNotificationUnreadCount(count: number) {
  const next = normalizeUnreadCount(count);
  await AsyncStorage.setItem(NOTIFICATION_UNREAD_COUNT_STORAGE_KEY, String(next));
  notifyUnreadListeners(next);
  return next;
}

export async function incrementNotificationUnreadCount(amount = 1) {
  const current = await getNotificationUnreadCount();
  return setNotificationUnreadCount(current + amount);
}

export function subscribeNotificationUnreadCount(listener: NotificationUnreadListener) {
  unreadListeners.add(listener);
  void getNotificationUnreadCount().then(listener).catch(() => listener(0));
  return () => {
    unreadListeners.delete(listener);
  };
}


export function notifyNotificationCenterChanged() {
  centerChangeListeners.forEach((listener) => listener());
}

export function subscribeNotificationCenterChanges(listener: NotificationCenterChangeListener) {
  centerChangeListeners.add(listener);
  return () => {
    centerChangeListeners.delete(listener);
  };
}