/**
 * WebView-based Jitsi Meet Service
 * Uses react-native-webview to load Jitsi Meet iframe for audio-only calls
 * Compatible with Expo 54 and current React Native version
 */

import { voipService, type VoIPRoomData } from '@/services/api/voip-service';

class WebViewJitsiService {
  private currentRoom: string | null = null;
  private currentHotlineId: string | null = null;
  private currentRoomId: number | null = null;

  /**
   * Generate Jitsi Meet URL for audio-only call
   * @param roomName - Unique room identifier
   * @param displayName - User's display name
   * @param userInfo - Additional user information
   * @returns Jitsi Meet URL with configured parameters
   */
  generateJitsiUrl(roomName: string, displayName: string, userInfo?: any): string {
    const baseUrl = 'https://meet.jit.si';
    
    // Use URL fragment for config to bypass pre-join screen and deep linking
    const configFragment = '#config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithVideoMuted=true&config.startWithAudioMuted=false&config.startSilent=false';

    return `${baseUrl}/${roomName}${configFragment}`;
  }

  /**
   * Generate HTML content for Jitsi Meet iframe
   * @param roomName - Unique room identifier
   * @param displayName - User's display name
   * @param userInfo - Additional user information
   * @returns HTML string for WebView
   */
  generateJitsiHtml(roomName: string, displayName: string, userInfo?: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Emergency Call</title>
        <script src="https://meet.jit.si/external_api.js"></script>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #000;
          }
          #jitsi-meet {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div id="jitsi-meet"></div>
        <script>
          const options = {
            roomName: '${roomName}',
            width: '100%',
            height: '100%',
            parentNode: document.querySelector('#jitsi-meet'),
            userInfo: {
              displayName: '${displayName}',
            },
            configOverwrite: {
              prejoinPageEnabled: false,
              startWithAudioMuted: false,
              startWithVideoMuted: true,
              startSilent: false,
              disableDeepLinking: true,
              enableClosePage: false,
              hideConferenceSubject: true,
            },
            interfaceConfigOverwrite: {
              TOOLBAR_BUTTONS: [
                'microphone', 'closedcaptions', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security'
              ],
            },
          };
          
          const api = new JitsiMeetExternalAPI('meet.jit.si', options);
          
          api.addEventListener('videoConferenceJoined', function(event) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ eventName: 'videoConferenceJoined' }));
            }
          });
          
          api.addEventListener('videoConferenceLeft', function(event) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ eventName: 'videoConferenceLeft' }));
            }
          });
          
          api.addEventListener('audioMuteStatusChanged', function(event) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ eventName: 'audioMuteStatusChanged', muted: event.muted }));
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Get current room name
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  /**
   * Set current room name
   */
  setCurrentRoom(roomName: string): void {
    this.currentRoom = roomName;
  }

  /**
   * Set current hotline ID
   */
  setCurrentHotlineId(hotlineId: string): void {
    this.currentHotlineId = hotlineId;
  }

  /**
   * Set current room ID (from backend)
   */
  setCurrentRoomId(roomId: number): void {
    this.currentRoomId = roomId;
  }

  /**
   * Get current room ID
   */
  getCurrentRoomId(): number | null {
    return this.currentRoomId;
  }

  /**
   * Get current hotline ID
   */
  getCurrentHotlineId(): string | null {
    return this.currentHotlineId;
  }

  /**
   * Clear current room name
   */
  clearCurrentRoom(): void {
    this.currentRoom = null;
    this.currentHotlineId = null;
    this.currentRoomId = null;
  }

  /**
   * Register VoIP room with backend for responder notification
   */
  async registerRoomWithBackend(data: VoIPRoomData): Promise<void> {
    try {
      const response = await voipService.registerRoom(data);
      this.setCurrentRoomId(response.id);
      console.log('VoIP room registered with backend:', response);
    } catch (error) {
      console.error('Failed to register VoIP room with backend:', error);
      // Continue with call even if registration fails
    }
  }

  /**
   * Notify backend that call has ended
   */
  async notifyCallEnded(): Promise<void> {
    const roomId = this.getCurrentRoomId();
    if (roomId) {
      try {
        await voipService.updateRoomStatus(roomId, 'ended');
        console.log('VoIP call ended, notified backend');
      } catch (error) {
        console.error('Failed to notify backend of call end:', error);
      }
    }
  }

  /**
   * Generate a unique room name for emergency calls
   */
  generateEmergencyRoomName(hotline: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `alertara-emergency-${hotline}-${timestamp}-${random}`;
  }
}

export const webViewJitsiService = new WebViewJitsiService();
