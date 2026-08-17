/**
 * User Preference Service
 * Handles user preferences synchronization with backend
 */

import { apiClient } from './api-config';

export interface UserPreferenceData {
  user_id: number;
  preferred_language: 'en' | 'tl';
  notification_language?: 'en' | 'tl' | 'both';
  sms_notifications?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  alert_categories?: string;
}

export interface UserPreferenceResponse {
  user_id: number;
  preferred_language: string;
  notification_language?: string;
  sms_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  alert_categories?: string;
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
      const response = await apiClient.post('/preferences/user_preferences.php', data);
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
      const response = await apiClient.get('/preferences/user_preferences.php', {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      throw error;
    }
  },
};
