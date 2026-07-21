import { useAuth } from '@/context/auth-context';
import { webViewJitsiService } from '@/services/voip/webview-jitsi-service';
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface VoIPCallScreenProps {
  roomName: string;
  displayName: string;
  onCallEnd: () => void;
  hotlineId?: string;
  userLocation?: { latitude: number; longitude: number };
}

export function VoIPCallScreen({ roomName, displayName, onCallEnd, hotlineId, userLocation }: VoIPCallScreenProps) {
  const { userProfile } = useAuth();

  useEffect(() => {
    webViewJitsiService.setCurrentRoom(roomName);
    
    // Register room with backend for responder notification
    if (hotlineId && userProfile?.id) {
      webViewJitsiService.registerRoomWithBackend({
        room_name: roomName,
        hotline_id: hotlineId,
        user_id: userProfile.id,
        user_name: displayName || userProfile.name || 'Emergency User',
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
      });
    }

    return () => {
      webViewJitsiService.notifyCallEnded();
      webViewJitsiService.clearCurrentRoom();
    };
  }, [roomName, hotlineId, displayName, userProfile, userLocation]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Jitsi event:', data);
      
      // Handle Jitsi events
      if (data.eventName === 'videoConferenceLeft') {
        onCallEnd();
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const jitsiHtml = webViewJitsiService.generateJitsiHtml(
    roomName,
    displayName || userProfile?.name || 'Emergency User',
    {
      userId: userProfile?.id?.toString(),
      email: userProfile?.email,
    }
  );

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ html: jitsiHtml }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
 allowsFullscreenVideo={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});
