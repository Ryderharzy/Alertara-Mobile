import axios from 'axios';

// Temporarily hardcoded for testing - remove after confirming it works
const API_URL = 'https://emergency-comm.alertaraqc.com/PHP/api';
const API_KEY = 'EMERGENCY-SYSTEM-INTEGRATED-KEY-2026';

// const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
// const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';

console.log('🔧 Dialogflow Service Config:');
console.log('API_URL:', API_URL);
console.log('API_KEY:', API_KEY ? '***' : 'NOT SET');

export interface DialogflowResponse {
  success: boolean;
  replyText: string;
  intent: string;
  confidence: number;
  shouldEscalate: boolean;
  sessionId: string;
}

export interface DialogflowRequest {
  message: string;
  context?: {
    notificationTitle?: string;
    notificationCategory?: string;
    notificationSeverity?: string;
    notificationDescription?: string;
  };
}

export async function detectIntent(request: DialogflowRequest): Promise<DialogflowResponse> {
  try {
    const url = `${API_URL}/dialogflow.php${API_KEY ? `?api_key=${API_KEY}` : ''}`;
    console.log('🔧 API_URL from env:', API_URL);
    console.log('🌐 Full URL being called:', url);
    console.log('📤 Request payload:', request);
    
    const response = await axios.post(url, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('📥 Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Dialogflow API error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    throw new Error('Failed to communicate with Dialogflow service');
  }
}

export async function sendNotificationQuery(
  text: string,
  notificationTitle: string,
  notificationCategory: string,
  notificationSeverity: string,
  notificationDescription: string
): Promise<DialogflowResponse> {
  return detectIntent({
    message: text,
    context: {
      notificationTitle,
      notificationCategory,
      notificationSeverity,
      notificationDescription,
    },
  });
}
