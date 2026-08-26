/**
 * User Preference Service
 * Handles user preferences synchronization with backend
 */

import { apiClient } from './api-config';

export interface UserPreferenceData {
  user_id?: number;
  language_preference?: 'en' | 'fil';
  preferred_language?: 'en' | 'tl' | 'fil';
  notification_language?: 'en' | 'tl' | 'fil' | 'both';
  sms_notifications?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  alert_categories?: string;
}

export interface UserPreferenceResponse {
  user_id: number;
  preferred_language: string;
  language_preference?: string;
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
   * Save language preference (en / fil) to backend
   */
  async saveLanguagePreference(language: 'en' | 'fil', userId?: number): Promise<boolean> {
    try {
      const payload = {
        language_preference: language,
        language: language,
        preferred_language: language,
        user_id: userId,
      };

      // 1. Post to USERS user-language API
      try {
        await apiClient.post('/../../USERS/api/user-language.php?action=set', payload);
      } catch (err) {
        // Fallback to primary API endpoint
        await apiClient.post('/preferences/user_preferences.php', payload);
      }
      return true;
    } catch (error) {
      console.warn('Failed to sync language preference with backend:', error);
      return false;
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
