/**
 * Alert Acknowledgment Service
 * Handles alert acknowledgment and citizen response tracking
 */

import { apiClient } from './api-config';

export interface AlertAcknowledgmentData {
  alert_id: number;
  user_id: number;
  status?: 'received' | 'safe' | 'need-help' | 'evacuated' | 'not-affected';
  latitude?: number;
  longitude?: number;
}

export interface AlertAcknowledgmentResponse {
  alert_id: number;
  user_id: number;
  status: string;
  acknowledged_at: string;
}

export const alertAcknowledgmentService = {
  /**
   * Acknowledge an alert with optional response status
   */
  async acknowledgeAlert(data: AlertAcknowledgmentData): Promise<{
    success: boolean;
    message: string;
    data: AlertAcknowledgmentResponse;
  }> {
    try {
      const response = await apiClient.post('/acknowledge_alert.php', data);
      return response.data;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw error;
    }
  },

  /**
   * Get alert acknowledgments (optionally filtered by user_id or alert_id)
   */
  async getAcknowledgments(userId?: number, alertId?: number): Promise<{
    success: boolean;
    message: string;
    data: AlertAcknowledgmentResponse[];
  }> {
    try {
      const params: Record<string, number> = {};
      if (userId) params.user_id = userId;
      if (alertId) params.alert_id = alertId;

      const response = await apiClient.get('/acknowledge_alert.php', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch alert acknowledgments:', error);
      throw error;
    }
  },
};
