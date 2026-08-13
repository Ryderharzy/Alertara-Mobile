export const NOTIFICATION_CHANNELS = {
  emergency: 'alertara-emergency-default-v5',
  silent: 'alertara-emergency-silent-v1',
} as const;

export type NotificationSoundChoice = keyof typeof NOTIFICATION_CHANNELS;

export const EMERGENCY_ALERT_CHANNEL_ID = NOTIFICATION_CHANNELS.emergency;
export const LEGACY_EMERGENCY_ALERT_CHANNEL_IDS = [
  'emergency-alerts-v2',
  'alertara_critical_alerts_v2',
  'alertara-emergency-default-v3',
  'alertara-emergency-default-v4',
] as const;

export function notificationChannelForSound(choice?: string | null) {
  return choice === 'silent' ? NOTIFICATION_CHANNELS.silent : NOTIFICATION_CHANNELS.emergency;
}
