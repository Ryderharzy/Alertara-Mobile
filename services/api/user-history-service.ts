import { apiClient } from './api-config';

export interface UserHistoryData {
  reports: {
    total: number;
    pending: number;
    resolved: number;
    recent: Array<{
      id: number;
      report_type: string;
      description: string;
      status: string;
      created_at: string;
    }>;
  };
  calls: {
    total: number;
    emergency: number;
    recent: Array<{
      id: number;
      activity_type: string;
      description: string;
      status: string;
      created_at: string;
    }>;
  };
}

export interface IncidentHistory {
  calls: number;
  reports: number;
}

export const userHistoryService = {
  async getUserHistory(userId: number): Promise<UserHistoryData> {
    try {
      const response = await apiClient.get(`/user/get_user_history.php?user_id=${userId}`);
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch user history:", error);
      throw error;
    }
  },

  async getIncidentHistory(userId: number): Promise<IncidentHistory> {
    try {
      const history = await this.getUserHistory(userId);
      return {
        calls: history.calls.total,
        reports: history.reports.total,
      };
    } catch (error) {
      console.error("Failed to fetch incident history:", error);
      // Return default values on error
      return {
        calls: 0,
        reports: 0,
      };
    }
  },
};
