import { useAuth } from '@/context/auth-context';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  mediaDevices,
  MediaStream,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { io, Socket } from 'socket.io-client';

const SIGNALING_URL = (process.env.EXPO_PUBLIC_SOCKET_URL || 'https://emergency-comm.alertaraqc.com').replace(/\/$/, '');
const INTEGRATED_API_KEY = 'EMERGENCY-SYSTEM-INTEGRATED-KEY-2026';
const TRANSFER_API_URL = `${SIGNALING_URL}/api/transfer-call.php?api_key=${encodeURIComponent(INTEGRATED_API_KEY)}`;
const WEBRTC_CONFIG_URL = SIGNALING_URL + '/api/webrtc-config.php';
const STUN_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];
const TURN_URL = (process.env.EXPO_PUBLIC_TURN_URL || '').trim();
const TURN_USERNAME = (process.env.EXPO_PUBLIC_TURN_USERNAME || '').trim();
const TURN_CREDENTIAL = (process.env.EXPO_PUBLIC_TURN_CREDENTIAL || '').trim();
const HAS_VALID_TURN_CONFIG = /^turns?:/i.test(TURN_URL)
  && TURN_USERNAME.length > 0
  && TURN_CREDENTIAL.length > 0;
const ICE_SERVERS = [
  ...STUN_ICE_SERVERS,
  ...(HAS_VALID_TURN_CONFIG
    ? [{
        urls: TURN_URL,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      }]
    : []),
];
let runtimeIceServers: any[] = ICE_SERVERS;
let runtimeTurnAvailable = HAS_VALID_TURN_CONFIG;
let iceServerRequest: Promise<any[]> | null = null;
let iceServersLoadedAt = 0;

function loadRuntimeIceServers() {
  if (iceServerRequest) return iceServerRequest;
  if (runtimeTurnAvailable && Date.now() - iceServersLoadedAt < 5 * 60 * 1000) {
    return Promise.resolve(runtimeIceServers);
  }

  const request = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${WEBRTC_CONFIG_URL}?_=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const body = await response.json();
      const servers = Array.isArray(body?.data?.iceServers) ? body.data.iceServers : [];
      const validServers = servers.filter((server: any) => {
        const urls = server?.urls;
        return typeof urls === 'string'
          ? /^(stun|turns?):/i.test(urls)
          : Array.isArray(urls) && urls.some((url) => /^(stun|turns?):/i.test(String(url)));
      });
      if (validServers.length) {
        const liveTurnAvailable = validServers.some((server: any) => {
          const urls = Array.isArray(server?.urls) ? server.urls : [server?.urls];
          return urls.some((url: any) => /^turns?:/i.test(String(url || '')));
        });
        // A stale STUN-only endpoint must not erase valid TURN credentials
        // bundled into the development or production mobile build.
        if (liveTurnAvailable || !runtimeTurnAvailable) {
          runtimeIceServers = validServers;
          runtimeTurnAvailable = liveTurnAvailable;
        }
      }
    } catch (error) {
      console.warn('Using bundled ICE configuration because the live WebRTC config is unavailable.', error);
    } finally {
      clearTimeout(timer);
    }
    return runtimeIceServers;
  })();
  iceServerRequest = request;
  void request.finally(() => {
    iceServersLoadedAt = Date.now();
    if (iceServerRequest === request) iceServerRequest = null;
  });
  return request;
}

type CallState = 'requesting' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'failed';
type ChatItem = { id: string; text: string; sender: 'user' | 'admin'; timestamp: number };
type EmergencyWebRTCCallProps = { onClose?: () => void; onMinimize?: () => void };

function createCallId() {
  return `mobile_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createCallPeerConnection(forceRelay = false) {
  try {
    return new RTCPeerConnection({
      iceServers: runtimeIceServers,
      ...(forceRelay && runtimeTurnAvailable ? { iceTransportPolicy: 'relay' as const } : {}),
    });
  } catch (error) {
    // A broken deployment-time TURN value must not prevent Socket.IO chat or
    // call end events from working. Audio can still use STUN where possible.
    console.warn('Invalid TURN configuration; continuing with STUN only.', error);
    return new RTCPeerConnection({ iceServers: STUN_ICE_SERVERS });
  }
}

function formatDuration(seconds: number) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

async function requestMicrophonePermission() {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone access required',
    message: 'Alertara needs your microphone so the Emergency Respondent can hear you.',
    buttonPositive: 'Allow microphone',
    buttonNegative: 'Not now',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function EmergencyWebRTCCall({ onClose, onMinimize }: EmergencyWebRTCCallProps = {}) {
  const { userProfile } = useAuth();
  const [callState, setCallState] = useState<CallState>('requesting');
  const [status, setStatus] = useState('Requesting microphone and location access...');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [adminSpeaking, setAdminSpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [messageText, setMessageText] = useState('');
  const [chatStatus, setChatStatus] = useState('Connecting call chat...');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const transferPeerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const roomRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const pendingTransferCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const transferNegotiationIdRef = useRef<string | null>(null);
  const transferNegotiationStartedAtRef = useRef(0);
  const transferRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transferPayloadRef = useRef<any | null>(null);
  const transferOfferPayloadRef = useRef<any | null>(null);
  const ersPeerConnectedRef = useRef(false);
  const pendingOutgoingMessagesRef = useRef<Map<string, any>>(new Map());
  const messageAcksInFlightRef = useRef<Set<string>>(new Set());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const onCloseRef = useRef(onClose);
  const startedRef = useRef(false);
  const endingRef = useRef(false);
  const ersTransferRequestedRef = useRef(false);
  const ersTransferApprovedRef = useRef(false);
  const mountedRef = useRef(true);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef = useRef(false);
  const elapsedRef = useRef(0);
  const callAudioStartedRef = useRef(false);
  const relayRetryUsedRef = useRef(false);

  const payloadMatchesActiveCall = useCallback((payload: any) => {
    const activeCallId = String(callIdRef.current || '');
    const activeRoom = String(roomRef.current || '');
    const payloadRoom = String(payload?.room || '');
    const payloadCallId = String(
      payload?.callId
      || payload?.call_id
      || payload?.transferId
      || payload?.transfer_id
      || '',
    );
    return Boolean(
      (activeRoom && payloadRoom && activeRoom === payloadRoom)
      || (activeCallId && payloadCallId && activeCallId === payloadCallId),
    );
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const startCallAudio = useCallback(() => {
    if (!callAudioStartedRef.current) {
      InCallManager.start({ media: 'audio', auto: true });
      InCallManager.setKeepScreenOn(true);
      callAudioStartedRef.current = true;
    }
    // Emergency calls should be audible without requiring the user to hold
    // the phone to the earpiece. Wired/Bluetooth routes still take priority.
    if (Platform.OS === 'android') {
      InCallManager.setForceSpeakerphoneOn(true);
      InCallManager.setSpeakerphoneOn(true);
    }
  }, []);

  const attachRemoteAudio = useCallback((event: any) => {
    const track = event?.track;
    if (track && track.kind !== 'audio') return;
    if (track) track.enabled = true;
    let stream = event?.streams?.[0] as MediaStream | undefined;
    if (!stream && track) {
      stream = new MediaStream();
      stream.addTrack(track);
    }
    if (stream) {
      startCallAudio();
      setRemoteStream(stream);
    }
  }, [startCallAudio]);

  const appendMessage = useCallback((text: string, sender: 'user' | 'admin', timestamp = Date.now(), messageId?: string) => {
    const id = messageId || `${timestamp}-${Math.random()}`;
    if (seenMessageIdsRef.current.has(id)) return;
    seenMessageIdsRef.current.add(id);
    setMessages((current) => [...current, { id, text, sender, timestamp }]);
  }, []);

  const stopSpeakingMonitor = useCallback(() => {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    statsTimerRef.current = null;
    setUserSpeaking(false);
    setAdminSpeaking(false);
  }, []);

  const startSpeakingMonitor = useCallback(() => {
    stopSpeakingMonitor();
    statsTimerRef.current = setInterval(async () => {
      const peer = peerRef.current;
      if (!peer) return;
      try {
        const stats = await peer.getStats();
        let localLevel = 0;
        let remoteLevel = 0;
        stats.forEach((report: any) => {
          const level = Number(report.audioLevel ?? report.audio_level ?? 0);
          if (report.type === 'outbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) localLevel = Math.max(localLevel, level);
          if (report.type === 'inbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) remoteLevel = Math.max(remoteLevel, level);
        });
        if (mountedRef.current) {
          setUserSpeaking(!mutedRef.current && localLevel > 0.015);
          setAdminSpeaking(remoteLevel > 0.015);
        }
      } catch {}
    }, 400);
  }, [stopSpeakingMonitor]);

  const cleanup = useCallback(() => {
    stopSpeakingMonitor();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    transferPeerRef.current?.close();
    transferPeerRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    pendingCandidatesRef.current = [];
    pendingTransferCandidatesRef.current = [];
    transferNegotiationIdRef.current = null;
    transferNegotiationStartedAtRef.current = 0;
    if (transferRetryTimerRef.current) clearTimeout(transferRetryTimerRef.current);
    transferRetryTimerRef.current = null;
    transferPayloadRef.current = null;
    transferOfferPayloadRef.current = null;
    ersPeerConnectedRef.current = false;
    ersTransferApprovedRef.current = false;
    relayRetryUsedRef.current = false;
    pendingOutgoingMessagesRef.current.clear();
    messageAcksInFlightRef.current.clear();
    setRemoteStream(null);
    if (callAudioStartedRef.current) {
      InCallManager.setMicrophoneMute(false);
      InCallManager.setForceSpeakerphoneOn(false);
      InCallManager.setKeepScreenOn(false);
      InCallManager.stop();
      callAudioStartedRef.current = false;
    }
  }, [stopSpeakingMonitor]);

  const endCall = useCallback(async (notifyAdmin = true) => {
    if (endingRef.current) return;
    endingRef.current = true;
    const callId = callIdRef.current;
    const room = roomRef.current;
    callIdRef.current = null;
    roomRef.current = null;
    if (notifyAdmin && callId && room) {
      socketRef.current?.emit('hangup', {
        callId,
        call_id: callId,
        room,
        reason: 'mobile-user-ended',
        endedAt: new Date().toISOString(),
      }, room);
      // Give Socket.IO a moment to flush the hangup before disconnecting.
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    cleanup();
    setCallState('ended');
    setStatus('Emergency call ended');
    startedRef.current = false;
    endingRef.current = false;
  }, [cleanup]);

  const callerPayload = useCallback(() => {
    const address = userProfile?.address || [
      userProfile?.house_number || userProfile?.house_unit,
      userProfile?.street,
      userProfile?.barangay,
      userProfile?.district,
    ].filter(Boolean).join(', ');

    return {
      id: userProfile?.id || null,
      user_id: userProfile?.id || null,
      name: userProfile?.name || 'Emergency User',
      email: userProfile?.email || null,
      phone: userProfile?.phone || null,
      nationality: userProfile?.nationality || null,
      district: userProfile?.district || null,
      barangay: userProfile?.barangay || null,
      house_number: userProfile?.house_number || userProfile?.house_unit || null,
      street: userProfile?.street || null,
      address: address || null,
      is_registered: Boolean(userProfile?.id),
      isGuest: !userProfile?.id,
      source: 'Alertara Mobile',
    };
  }, [userProfile]);

  const autoTransferToErs = useCallback(async (
    socket: Socket,
    callId: string,
    room: string,
    location: Location.LocationObject | null,
  ) => {
    const caller = callerPayload();
    const conversationId = 'call-' + callId;
    const locationPayload = {
      address: caller.address || 'Location pending from transferred emergency',
      lat: location?.coords.latitude ?? null,
      lng: location?.coords.longitude ?? null,
      latitude: location?.coords.latitude ?? null,
      longitude: location?.coords.longitude ?? null,
      accuracy: location?.coords.accuracy ?? null,
    };
    const transferPayload = {
      action: 'transfer',
      event: 'emergency_call_transfer',
      transfer_type: 'live_call',
      transferType: 'live_call',
      callId,
      call_id: callId,
      call_id_external: callId,
      transferId: callId,
      transfer_id: callId,
      conversationId,
      conversation_id: conversationId,
      emergencyComConversationId: conversationId,
      emergency_com_conversation_id: conversationId,
      room,
      socketUrl: SIGNALING_URL,
      socketPath: '/socket.io',
      emergencyType: 'emergency_call',
      type: 'emergency_call',
      priority: 'critical',
      incidentPriority: {
        score: 90,
        priority: 'critical',
        level: 'critical',
        label: 'CRITICAL',
        color: 'red',
      },
      description: 'Live emergency call waiting for ERS Emergency Respondent answer.',
      latestMessage: '[CALL_STARTED] Emergency live call forwarded to ERS',
      caller,
      location: locationPayload,
      locationData: locationPayload,
      transferredAt: new Date().toISOString(),
    };
    transferPayloadRef.current = transferPayload;

    const routeLiveRoom = async (payload: any) => new Promise<any>((resolve, reject) => {
      if (!socket.connected) {
        reject(new Error('Emergency-Com call service is reconnecting.'));
        return;
      }
      socket.timeout(8000).emit('route-call-to-ers', payload, (error: Error | null, result: any) => {
        if (error || !result?.ok) {
          reject(error || new Error(result?.reason || 'Emergency-Com could not route the call to ERS.'));
          return;
        }
        resolve(result);
      });
    });

    let routed = false;
    for (let attempt = 1; attempt <= 2 && !routed; attempt += 1) {
      try {
        await routeLiveRoom(transferPayload);
        routed = true;
      } catch (error) {
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400));
        else console.warn('Initial live ERS route is waiting for API fallback.', error);
      }
    }
    if (routed) {
      ersTransferRequestedRef.current = true;
      ersTransferApprovedRef.current = true;
      setStatus('Call sent. Waiting for the Emergency Respondent to answer...');
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(TRANSFER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': INTEGRATED_API_KEY,
          },
          body: JSON.stringify(transferPayload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.success === false) throw new Error('ERS transfer API rejected the call.');

        const persistedPayload = {
          ...transferPayload,
          ...(result?.data || {}),
          callId,
          call_id: callId,
          call_id_external: callId,
          transferId: callId,
          transfer_id: callId,
          conversationId,
          conversation_id: conversationId,
          emergencyComConversationId: conversationId,
          emergency_com_conversation_id: conversationId,
          room,
          socketUrl: SIGNALING_URL,
          socketPath: '/socket.io',
          route: 'emergency-com-call-relay',
        };
        transferPayloadRef.current = persistedPayload;
        if (!routed) {
          await routeLiveRoom(persistedPayload);
          routed = true;
          ersTransferRequestedRef.current = true;
          ersTransferApprovedRef.current = true;
          setStatus('Call sent. Waiting for the Emergency Respondent to answer...');
        }
        return;
      } catch (error) {
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          console.warn('ERS transfer persistence failed.', error);
        }
      }
    }

    if (!routed) {
      setStatus('Emergency-Com could not forward the call to ERS. Please try again.');
    }
  }, [callerPayload]);
  const flushPendingCallMessages = useCallback((activeSocket: Socket | null = socketRef.current) => {
    if (!activeSocket?.connected) {
      if (mountedRef.current) setChatStatus('Reconnecting call chat...');
      return;
    }
    for (const [messageId, payload] of pendingOutgoingMessagesRef.current.entries()) {
      if (messageAcksInFlightRef.current.has(messageId)) continue;
      messageAcksInFlightRef.current.add(messageId);
      activeSocket.timeout(8000).emit(
        'call-message',
        payload,
        payload.room,
        (error: Error | null, response: any) => {
          messageAcksInFlightRef.current.delete(messageId);
          if (!error && response?.ok) {
            pendingOutgoingMessagesRef.current.delete(messageId);
            if (mountedRef.current) {
              setChatStatus(response.recipients > 0 ? 'Delivered to ERS' : 'Queued until ERS answers');
            }
          } else if (mountedRef.current) {
            setChatStatus('Message queued while ERS reconnects');
          }
        },
      );
    }
  }, []);

  const configureSocket = useCallback((socket: Socket) => {
    socket.on('server-ready', (payload: any) => {
      if (mountedRef.current) {
        setChatStatus(payload?.protocolVersion
          ? `Call service ${payload.protocolVersion} connected`
          : 'Call service connected');
      }
    });
    socket.on('connect', () => {
      const callId = callIdRef.current;
      const room = roomRef.current;
      if (!callId || !room) return;
      socket.emit('resume-user-call', {
        callId,
        room,
        accepted: ersPeerConnectedRef.current,
      }, () => {
        socket.emit('join', room, (response: any) => {
          if (!mountedRef.current) return;
          setChatStatus(response?.ok
            ? `Call chat connected (${response.members || 1} participant${response.members === 1 ? '' : 's'})`
            : 'Unable to join call chat');
        });
      });
      // Re-register a completed Emergency-Com route after a network change.
      // The server then re-publishes the same private room to ERS; it never
      // exposes the call to the Emergency-Com admin lobby.
      if (transferPayloadRef.current && ersTransferApprovedRef.current) {
        socket.timeout(8000).emit('route-call-to-ers', transferPayloadRef.current, () => {});
      }
      const transferPeer = transferPeerRef.current;
      if (
        transferOfferPayloadRef.current
        && transferPeer
        && transferPeer.connectionState !== 'connected'
      ) {
        socket.emit('offer', transferOfferPayloadRef.current, room);
      }
      flushPendingCallMessages(socket);
    });
    socket.on('disconnect', () => {
      if (mountedRef.current && callIdRef.current) {
        setChatStatus('Reconnecting call chat...');
      }
    });
    socket.on('room-presence', (payload: any) => {
      if (!payloadMatchesActiveCall(payload)) return;
      const members = Number(payload?.members || 0);
      if (mountedRef.current) {
        setChatStatus(`Call chat connected (${members} participant${members === 1 ? '' : 's'})`);
        if (payload?.responseTeamPresent && !ersPeerConnectedRef.current) {
          setCallState('connecting');
          setStatus('Emergency Respondent answered. Connecting audio...');
          flushPendingCallMessages(socket);
        }
      }
    });
    socket.on('answer', async (payload: any) => {
      const isErsAnswer = payload?.target === 'ers' || payload?.transferred === true;
      if (
        isErsAnswer
        && payload?.negotiationId
        && transferNegotiationIdRef.current
        && String(payload.negotiationId) !== transferNegotiationIdRef.current
      ) return;
      // Lobby/admin and ERS negotiations can overlap. Never apply the answer
      // from one leg to the other peer connection.
      const targetPeer = isErsAnswer
        ? (transferPeerRef.current || (ersTransferRequestedRef.current ? peerRef.current : null))
        : peerRef.current;
      if (!targetPeer || !payloadMatchesActiveCall(payload)) return;
      try {
        const rawDescription = payload?.sdp;
        const description = typeof rawDescription === 'string'
          ? { type: payload?.type || 'answer', sdp: rawDescription }
          : (rawDescription || payload);
        await targetPeer.setRemoteDescription(new RTCSessionDescription(description));
        if (isErsAnswer && mountedRef.current) {
          setCallState('connecting');
          setStatus('Emergency Respondent answered. Securing two-way audio...');
        }
        const queue = isErsAnswer ? pendingTransferCandidatesRef : pendingCandidatesRef;
        for (const candidate of queue.current) await targetPeer.addIceCandidate(candidate).catch(() => {});
        queue.current = [];
      } catch (error) {
        console.warn('Unable to apply Emergency Respondent answer:', error);
      }
    });
    socket.on('candidate', async (payload: any) => {
      if (!payloadMatchesActiveCall(payload) || !payload?.candidate) return;
      const candidate = new RTCIceCandidate(payload.candidate);
      const isErsCandidate = payload?.target === 'ers' || payload?.transferred === true;
      if (
        isErsCandidate
        && payload?.negotiationId
        && transferNegotiationIdRef.current
        && String(payload.negotiationId) !== transferNegotiationIdRef.current
      ) return;
      const targetPeer = isErsCandidate
        ? (transferPeerRef.current || (ersTransferRequestedRef.current ? peerRef.current : null))
        : peerRef.current;
      if (targetPeer?.remoteDescription) await targetPeer.addIceCandidate(candidate).catch(() => {});
      else (isErsCandidate ? pendingTransferCandidatesRef : pendingCandidatesRef).current.push(candidate);
    });
    socket.on('call-message', (payload: any) => {
      if (!payloadMatchesActiveCall(payload) || payload?.sender === 'user') return;
      if (payload?.text) {
        appendMessage(
          String(payload.text),
          'admin',
          Number(payload.timestamp) || Date.now(),
          payload.messageId ? String(payload.messageId) : undefined,
        );
        setChatStatus('Message received from ERS');
      }
    });
    socket.on('call-message-history', (history: any) => {
      if (!Array.isArray(history)) return;
      history.forEach((payload) => {
        if (
          payloadMatchesActiveCall(payload)
          && payload?.sender !== 'user'
          && payload?.text
        ) {
          appendMessage(
            String(payload.text),
            'admin',
            Number(payload.timestamp || payload.serverTimestamp) || Date.now(),
            payload.messageId ? String(payload.messageId) : undefined,
          );
        }
      });
    });
    socket.on('hangup', (payload: any) => {
      if (payloadMatchesActiveCall(payload)) {
        void endCall(false).finally(() => onCloseRef.current?.());
      }
    });
    socket.on('call-transfer', (payload: any) => {
      if (payloadMatchesActiveCall(payload)) setStatus('The Emergency Respondent is transferring your call. Please stay connected.');
    });
    const prepareErsTransferOffer = async (payload: any) => {
      const callId = callIdRef.current;
      const room = String(payload?.room || roomRef.current || '');
      const localStream = localStreamRef.current;
      if (!callId || !room || !localStream || !payloadMatchesActiveCall({ ...payload, room })) return;

      try {
        if (ersPeerConnectedRef.current && peerRef.current?.connectionState === 'connected') return;
        const activeTransferPeer = transferPeerRef.current;
        const negotiationAge = Date.now() - transferNegotiationStartedAtRef.current;
        if (
          activeTransferPeer
          && !['failed', 'closed', 'disconnected'].includes(activeTransferPeer.connectionState)
          && negotiationAge < 10000
        ) {
          // ERS can ask once for a fresh offer when it joins and once again
          // from its safety timer. Keep the first negotiation alive instead
          // of replacing it with a second peer and mixing their SDP/ICE.
          return;
        }
        setStatus('Connecting your call to the Emergency Response System...');
        transferPeerRef.current?.close();
        const previousPeer = peerRef.current;
        const transferPeer = createCallPeerConnection(payload?.forceRelay === true);
        const negotiationId = `ers_${callId}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        transferNegotiationIdRef.current = negotiationId;
        transferNegotiationStartedAtRef.current = Date.now();
        const transferEvents = transferPeer as any;
        transferPeerRef.current = transferPeer;
        pendingTransferCandidatesRef.current = [];

        localStream.getTracks().forEach((track) => transferPeer.addTrack(track, localStream));
        transferEvents.addEventListener('icecandidate', (event: any) => {
          if (event.candidate) socket.emit('candidate', {
            candidate: event.candidate.toJSON?.() || event.candidate,
            callId,
            room,
            transferred: true,
            target: 'ers',
            negotiationId,
          }, room);
        });
        transferEvents.addEventListener('track', attachRemoteAudio);
        const handleTransferConnectionState = () => {
          const peerState = transferPeer.connectionState;
          const iceState = transferPeer.iceConnectionState;
          const connected = peerState === 'connected' || iceState === 'connected' || iceState === 'completed';
          const failed = peerState === 'failed' || iceState === 'failed';
          if (connected) {
            if (ersPeerConnectedRef.current && peerRef.current === transferPeer) return;
            if (previousPeer && previousPeer !== transferPeer) previousPeer.close();
            peerRef.current = transferPeer;
            transferPeerRef.current = null;
            ersPeerConnectedRef.current = true;
            transferNegotiationStartedAtRef.current = 0;
            if (transferRetryTimerRef.current) clearTimeout(transferRetryTimerRef.current);
            transferRetryTimerRef.current = null;
            setCallState('connected');
            setStatus('Connected to the Emergency Response System');
            startSpeakingMonitor();
          } else if (failed && !ersPeerConnectedRef.current) {
            transferPeerRef.current = null;
            transferPeer.close();
            transferNegotiationStartedAtRef.current = 0;
            if (runtimeTurnAvailable && !relayRetryUsedRef.current) {
              relayRetryUsedRef.current = true;
              if (transferRetryTimerRef.current) clearTimeout(transferRetryTimerRef.current);
              transferRetryTimerRef.current = null;
              setCallState('connecting');
              setStatus('Direct audio was blocked. Retrying through the secure relay...');
              setTimeout(() => {
                void prepareErsTransferOffer({ callId, room, forceRelay: true, reason: 'mobile-relay-retry' });
              }, 500);
              return;
            }
            // A media-path failure must not tear down Socket.IO. Keep emergency
            // chat available while the caller decides whether to retry voice.
            setCallState('failed');
            setStatus('Voice connection failed. Call chat is still connected; retry voice when ready.');
          }
        };
        transferEvents.addEventListener('connectionstatechange', handleTransferConnectionState);
        transferEvents.addEventListener('iceconnectionstatechange', handleTransferConnectionState);

        socket.emit('join', room);
        const offer = await transferPeer.createOffer({ iceRestart: true });
        await transferPeer.setLocalDescription(offer);
        const transferOfferPayload = {
          sdp: offer,
          callId,
          room,
          caller: {
            id: userProfile?.id || null,
            name: userProfile?.name || 'Emergency User',
            email: userProfile?.email || null,
            phone: userProfile?.phone || null,
            source: 'Alertara Mobile',
          },
          transferred: true,
          target: 'ers',
          negotiationId,
          transferReason: 'response-team-request',
        };
        transferOfferPayloadRef.current = transferOfferPayload;
        socket.emit('offer', transferOfferPayload, room);
        if (transferRetryTimerRef.current) clearTimeout(transferRetryTimerRef.current);
        transferRetryTimerRef.current = setTimeout(() => {
          if (
            transferNegotiationIdRef.current !== negotiationId
            || ersPeerConnectedRef.current
            || !callIdRef.current
          ) return;
          transferPeerRef.current?.close();
          transferPeerRef.current = null;
          transferNegotiationStartedAtRef.current = 0;
          const forceRelay = runtimeTurnAvailable && !relayRetryUsedRef.current;
          if (forceRelay) relayRetryUsedRef.current = true;
          void prepareErsTransferOffer({ callId, room, forceRelay, reason: 'mobile-negotiation-retry' });
        }, 20000);
      } catch (error) {
        console.error('Unable to prepare ERS transfer offer:', error);
        transferPeerRef.current?.close();
        transferPeerRef.current = null;
        transferNegotiationStartedAtRef.current = 0;
        // Preserve the signaling socket and conversation so text updates are
        // still delivered even if WebRTC negotiation fails.
        setCallState('failed');
        setStatus('Unable to connect voice. Call chat remains available.');
      }
    };
    socket.on('request-transfer-offer', prepareErsTransferOffer);
    ['dispatcher-ready', 'call-accepted', 'accepted'].forEach((eventName) => {
      socket.on(eventName, prepareErsTransferOffer);
    });
    socket.on('request-offer', async (payload: any) => {
      if (!peerRef.current || !payloadMatchesActiveCall(payload)) return;
      const offer = await peerRef.current.createOffer({ iceRestart: true });
      await peerRef.current.setLocalDescription(offer);
      socket.emit('offer', {
        sdp: offer,
        callId: callIdRef.current,
        room: roomRef.current,
        caller: { id: userProfile?.id, name: userProfile?.name, email: userProfile?.email, phone: userProfile?.phone },
        resumed: true,
      }, roomRef.current);
    });
  }, [appendMessage, attachRemoteAudio, endCall, flushPendingCallMessages, payloadMatchesActiveCall, startSpeakingMonitor, userProfile]);

  const startCall = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setCallState('requesting');
    setStatus('Requesting microphone and location access...');
    try {
      const iceServersReady = loadRuntimeIceServers();
      const microphoneGranted = await requestMicrophonePermission();
      if (!microphoneGranted) throw new Error('Microphone permission is required for an emergency call.');

      const locationPermission = await Location.requestForegroundPermissionsAsync();
      let location: Location.LocationObject | null = null;
      if (locationPermission.status === 'granted') {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
      }

      setCallState('connecting');
      setStatus('Connecting to the Emergency Respondent...');
      const localStream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
        video: false,
      });
      if (!mountedRef.current) {
        localStream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = localStream;
      localStream.getAudioTracks().forEach((track) => { track.enabled = true; });
      startCallAudio();
      InCallManager.setMicrophoneMute(false);

      const callId = createCallId();
      const room = `emergency-call-${callId}`;
      callIdRef.current = callId;
      roomRef.current = room;

      // Emergency-Com is the production relay only: do not create a Two-Way
      // Communication record for a live voice call. Its unique private room
      // is forwarded directly to ERS after the caller has joined it.

      const socket = io(SIGNALING_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 8,
        timeout: 10000,
      });
      socketRef.current = socket;
      configureSocket(socket);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Emergency call service timed out.')), 12000);
        socket.once('connect', () => { clearTimeout(timer); resolve(); });
        socket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
      });

      socket.emit('join', room);
      await iceServersReady;
      const peer = createCallPeerConnection();
      const peerEvents = peer as any;
      peerRef.current = peer;
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
      peerEvents.addEventListener('icecandidate', (event: any) => {
        if (!event.candidate) return;
        const serializedCandidate = event.candidate.toJSON?.() || event.candidate;
        socket.emit('candidate', { candidate: serializedCandidate, callId, room }, room);
      });
      peerEvents.addEventListener('track', attachRemoteAudio);
      peerEvents.addEventListener('connectionstatechange', () => {
        const state = peer.connectionState;
        if (state === 'connected') {
          setCallState('connected');
          setStatus('Connected to the Emergency Respondent');
          startSpeakingMonitor();
        } else if (state === 'failed') {
          // The lobby peer is superseded as soon as the call is forwarded to
          // ERS. Its failure must not overwrite the real transferred call.
          if (!ersTransferRequestedRef.current && !transferPeerRef.current) {
            void endCall(true).then(() => {
              setCallState('failed');
              setStatus('Call connection failed. Please try again.');
            });
          }
        }
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const offerPayload = {
        sdp: offer,
        callId,
        userId: userProfile?.id || null,
        userName: userProfile?.name || 'Emergency User',
        caller: callerPayload(),
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        } : null,
      };
      // The caller joins a unique Emergency-Com private room first. The relay
      // then forwards that room to ERS without creating a Two-Way item.
      socket.emit('offer', { ...offerPayload, room }, room);
      setCallState('ringing');
      void autoTransferToErs(socket, callId, room, location);
    } catch (error: any) {
      cleanup();
      startedRef.current = false;
      setCallState('failed');
      setStatus(error?.message || 'Unable to start emergency call.');
    }
  }, [attachRemoteAudio, autoTransferToErs, callerPayload, cleanup, configureSocket, endCall, startCallAudio, startSpeakingMonitor, userProfile?.id, userProfile?.name]);

  const startCallRef = useRef(startCall);
  const cleanupRef = useRef(cleanup);

  useEffect(() => {
    startCallRef.current = startCall;
    cleanupRef.current = cleanup;
  }, [cleanup, startCall]);

  useEffect(() => {
    mountedRef.current = true;
    void startCallRef.current();
    return () => {
      mountedRef.current = false;
      cleanupRef.current();
    };
  }, []);

  useEffect(() => {
    if (callState !== 'connected') return;
    const timer = setInterval(() => setElapsed((value) => {
      const next = value + 1;
      elapsedRef.current = next;
      return next;
    }), 1000);
    return () => clearInterval(timer);
  }, [callState]);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    InCallManager.setMicrophoneMute(next);
    setMuted(next);
    if (next) setUserSpeaking(false);
  };

  const retry = () => {
    cleanup();
    startedRef.current = false;
    endingRef.current = false;
    ersTransferRequestedRef.current = false;
    elapsedRef.current = 0;
    setElapsed(0);
    void startCall();
  };

  const sendMessage = async () => {
    const text = messageText.trim();
    const callId = callIdRef.current;
    const room = roomRef.current;
    if (!text || !callId || !room) return;
    const timestamp = Date.now();
    const messageId = `mobile-${callId}-${timestamp}-${Math.random().toString(16).slice(2)}`;
    const payload = {
      text,
      callId,
      room,
      messageId,
      sender: 'user',
      senderName: userProfile?.name || 'Emergency User',
      timestamp,
    };
    setMessageText('');
    appendMessage(text, 'user', timestamp, messageId);
    pendingOutgoingMessagesRef.current.set(messageId, payload);
    setChatStatus(socketRef.current?.connected ? 'Sending...' : 'Queued while reconnecting...');
    flushPendingCallMessages();
  };

  const endAndExit = async () => {
    await endCall(true);
    onCloseRef.current?.();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={styles.hiddenRemoteAudio} />}
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>ALERTARA QC</Text>
            <Text style={styles.title}>Emergency Call</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable accessibilityLabel="Minimize emergency call" style={styles.minimizeButton} onPress={onMinimize}>
              <FontAwesome5 name="minus" size={20} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.callCard}>
          <View style={styles.phoneCircle}><FontAwesome5 name="phone-alt" size={30} color="#ffffff" /></View>
          <Text style={styles.status}>{status}</Text>
          <Text style={styles.timer}>{formatDuration(elapsed)}</Text>

          <View style={styles.speakersRow}>
            <View style={[styles.speakerCard, userSpeaking && styles.speakerActive]}>
              <FontAwesome5 name={muted ? 'microphone-slash' : 'microphone'} size={22} color={muted ? '#f6ad55' : '#d8ebe8'} />
              <Text style={styles.speakerName}>You</Text>
              <Text style={styles.speakerState}>{muted ? 'Muted' : userSpeaking ? 'Speaking' : 'Listening'}</Text>
            </View>
            <View style={[styles.speakerCard, adminSpeaking && styles.speakerActive]}>
              <FontAwesome5 name="microphone" size={22} color="#d8ebe8" />
              <Text style={styles.speakerName}>Emergency Respondent</Text>
              <Text style={styles.speakerState}>{adminSpeaking ? 'Speaking' : callState === 'connected' ? 'Listening' : 'Waiting'}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable style={[styles.controlButton, muted && styles.controlButtonActive]} onPress={toggleMute} disabled={!localStreamRef.current}>
              <FontAwesome5 name={muted ? 'microphone-slash' : 'microphone'} size={20} color="#ffffff" />
              <Text style={styles.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
            </Pressable>
            <Pressable style={styles.endButton} onPress={() => void endAndExit()}>
              <FontAwesome5 name="phone-slash" size={19} color="#ffffff" />
              <Text style={styles.endLabel}>{callState === 'ringing' ? 'Cancel' : 'End Call'}</Text>
            </Pressable>
          </View>

          {(callState === 'failed' || callState === 'ended') && (
            <Pressable style={styles.retryButton} onPress={retry}>
              <Text style={styles.retryText}>Call Again</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.chatCard}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Call Chat</Text>
            <Text style={styles.chatHint} numberOfLines={1}>{chatStatus}</Text>
          </View>
          <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
            {messages.length === 0 ? (
              <Text style={styles.emptyChat}>Messages from you and the Emergency Respondent will appear here.</Text>
            ) : messages.map((item) => (
              <View key={item.id} style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.adminBubble]}>
                <Text style={styles.messageSender}>{item.sender === 'user' ? 'You' : 'Emergency Respondent'}</Text>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type an emergency detail..."
              placeholderTextColor="#7f9693"
              style={styles.input}
              editable={!!callIdRef.current && callState !== 'ended'}
              onSubmitEditing={() => void sendMessage()}
            />
            <Pressable style={styles.sendButton} onPress={() => void sendMessage()}>
              <FontAwesome5 name="paper-plane" size={17} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#071816' },
  screen: { flex: 1, padding: 18, gap: 14 },
  hiddenRemoteAudio: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { color: '#65b7b0', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#fff', fontSize: 27, fontWeight: '900', marginTop: 2 },
  minimizeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18332f', borderWidth: 1, borderColor: '#315650' },
  callCard: { borderRadius: 24, borderWidth: 1, borderColor: '#1d4641', backgroundColor: '#0d2421', padding: 18, alignItems: 'center' },
  phoneCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', shadowColor: '#dc2626', shadowOpacity: 0.35, shadowRadius: 15 },
  status: { color: '#d8ebe8', marginTop: 14, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  timer: { color: '#fff', fontSize: 31, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 5 },
  speakersRow: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 16 },
  speakerCard: { flex: 1, borderWidth: 1, borderColor: '#244a45', borderRadius: 16, padding: 12, alignItems: 'center', backgroundColor: '#102b27' },
  speakerActive: { borderColor: '#35d39b', backgroundColor: '#123a31' },
  speakerName: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 5 },
  speakerState: { color: '#83a5a0', fontSize: 11, marginTop: 2 },
  controls: { flexDirection: 'row', gap: 12, marginTop: 17 },
  controlButton: { minWidth: 105, borderRadius: 16, backgroundColor: '#173b36', paddingVertical: 11, alignItems: 'center' },
  controlButtonActive: { backgroundColor: '#6b3d13' },
  controlLabel: { color: '#fff', fontWeight: '800', marginTop: 3 },
  endButton: { minWidth: 125, borderRadius: 16, backgroundColor: '#dc2626', paddingVertical: 11, alignItems: 'center' },
  endLabel: { color: '#fff', fontWeight: '900', marginTop: 3 },
  retryButton: { marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#4c9b93', paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#81ddd4', fontWeight: '800' },
  chatCard: { flex: 1, minHeight: 230, borderRadius: 20, borderWidth: 1, borderColor: '#1d4641', backgroundColor: '#0d2421', overflow: 'hidden' },
  chatHeader: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1d4641', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  chatHint: { color: '#789b96', fontSize: 11 },
  messages: { flex: 1 },
  messagesContent: { padding: 12, gap: 8 },
  emptyChat: { color: '#718f8b', textAlign: 'center', marginTop: 28, fontSize: 12 },
  messageBubble: { maxWidth: '84%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#176b61' },
  adminBubble: { alignSelf: 'flex-start', backgroundColor: '#243d56' },
  messageSender: { color: '#b9d7d3', fontSize: 10, fontWeight: '800', marginBottom: 2 },
  messageText: { color: '#fff', fontSize: 14, lineHeight: 19 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#1d4641' },
  input: { flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: '#132f2b', color: '#fff', paddingHorizontal: 13 },
  sendButton: { minWidth: 66, borderRadius: 13, backgroundColor: '#248f84', alignItems: 'center', justifyContent: 'center' },
});
