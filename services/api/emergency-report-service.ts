/**
 * Emergency Report Service
 * Handles emergency report submission and retrieval
 */

import { apiClient } from './api-config';

export interface EmergencyReportData {
  type: 'crime' | 'fire' | 'medical' | 'traffic' | 'natural_disaster' | 'other';
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  contact_phone?: string;
  user_id?: number;
}

export interface EmergencyReportResponse {
  id: number;
  type: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  created_at: string;
}

export const emergencyReportService = {
  /**
   * Submit a new emergency report
   */
  async submitReport(data: EmergencyReportData): Promise<{
    success: boolean;
    message: string;
    data: EmergencyReportResponse;
  }> {
    try {
      const response = await apiClient.post('/emergency_reports.php', data);
      return response.data;
    } catch (error) {
      console.error('Failed to submit emergency report:', error);
      throw error;
    }
  },

  /**
   * Get emergency reports (optionally filtered by user_id)
   */
  async getReports(userId?: number): Promise<{
    success: boolean;
    message: string;
    data: EmergencyReportResponse[];
  }> {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await apiClient.get('/emergency_reports.php', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch emergency reports:', error);
      throw error;
    }
  },
};
