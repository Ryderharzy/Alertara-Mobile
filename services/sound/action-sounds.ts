import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

export type AlertaraActionSound = 'callStart' | 'callEnd' | 'reportSend';

const ACTION_SOUND_SOURCES: Record<AlertaraActionSound, number> = {
  callStart: require('../../assets/sounds/call-start.wav'),
  callEnd: require('../../assets/sounds/call-end.wav'),
  reportSend: require('../../assets/sounds/report-send.wav'),
};

const players = new Map<AlertaraActionSound, ReturnType<typeof createAudioPlayer>>();
let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
    allowsRecording: false,
    interruptionMode: 'mixWithOthers',
    interruptionModeAndroid: 'duckOthers',
  });
  audioModeReady = true;
}

function getPlayer(sound: AlertaraActionSound) {
  const existing = players.get(sound);
  if (existing) return existing;
  const player = createAudioPlayer(ACTION_SOUND_SOURCES[sound], { downloadFirst: true });
  player.volume = sound === 'reportSend' ? 0.7 : 0.85;
  players.set(sound, player);
  return player;
}

export async function playAlertaraActionSound(sound: AlertaraActionSound) {
  try {
    await ensureAudioMode();
    const player = getPlayer(sound);
    try {
      await player.seekTo(0);
    } catch {
      player.replace(ACTION_SOUND_SOURCES[sound]);
    }
    player.play();
  } catch (error) {
    // Sound is supportive UI feedback. Haptics keeps the action noticeable if audio fails.
    void Haptics.notificationAsync(
      sound === 'callEnd'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success,
    );
  }
}
