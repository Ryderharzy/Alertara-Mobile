/**
 * User Preference Service
 * Handles user preferences synchronization with backend
 */

import { apiClient } from './api-config';

export interface UserPreferenceData {
  user_id: number;
  language: 'en' | 'tl' | 'ceb' | 'war' | 'hil' | 'es' | 'fr';
  alert_crimes?: boolean;
  alert_emergencies?: boolean;
  alert_community?: boolean;
  notification_email?: boolean;
  notification_sms?: boolean;
}

export interface UserPreferenceResponse {
  user_id: number;
  language: string;
  alert_crimes: boolean;
  alert_emergencies: boolean;
  alert_community: boolean;
  notification_email: boolean;
  notification_sms: boolean;
  updated_at: string;
}

export const userPreferenceService = {
  /**
   * Save user preferences to backend
   */
  async savePreferences(data: UserPreferenceData): Promise<{
    success: boolean;
    message: string;
    data: UserPreferenceResponse;
  }> {
    try {
      const response = await apiClient.post('/user_preferences.php', data);
      return response.data;
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw error;
    }
  },

  /**
   * Get user preferences from backend
   */
  async getPreferences(userId: number): Promise<{
    success: boolean;
    message: string;
    data: UserPreferenceResponse;
  }> {
    try {
      const response = await apiClient.get('/user_preferences.php', {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      throw error;
    }
  },
};
