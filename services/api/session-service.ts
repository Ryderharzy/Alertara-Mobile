import { apiClient } from "./api-config";

export interface SessionData {
  user_id: number;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  location?: string;
  expires_at?: string;
}

export interface SessionResponse {
  session_id: number;
  action: 'created' | 'updated' | 'ended';
}

export interface SessionInfo {
  id: number;
  user_id: number;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  location: string | null;
  status: string;
  last_activity: string;
  expires_at: string;
  created_at: string;
}

export const sessionService = {
  /**
   * Create or update a session for the user
   */
  createSession: async (sessionData: SessionData): Promise<SessionResponse> => {
    try {
      const response = await apiClient.post('/auth/manage_sessions.php', sessionData);
      return response.data;
    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    }
  },

  /**
   * Get all sessions for a user
   */
  getUserSessions: async (userId: number): Promise<SessionInfo[]> => {
    try {
      const response = await apiClient.get('/auth/manage_sessions.php', {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user sessions:', error);
      throw error;
    }
  },

  /**
   * End a session
   */
  endSession: async (userId: number, sessionToken: string): Promise<SessionResponse> => {
    try {
      const response = await apiClient.delete('/auth/manage_sessions.php', {
        data: { user_id: userId, session_token: sessionToken }
      });
      return response.data;
    } catch (error) {
      console.error('Session termination failed:', error);
      throw error;
    }
  }
};
