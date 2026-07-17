import { apiClient } from "./api-config";

export interface ActivityData {
  user_id: number;
  activity_type: string;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  status?: string;
  metadata?: Record<string, any> | string;
}

export interface ActivityResponse {
  log_id: number;
  action: 'logged';
}

export interface ActivityLog {
  id: number;
  user_id: number;
  activity_type: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export const activityService = {
  /**
   * Log user activity
   */
  logActivity: async (activityData: ActivityData): Promise<ActivityResponse> => {
    try {
      const response = await apiClient.post('/auth/log_activity.php', activityData);
      return response.data;
    } catch (error) {
      console.error('Activity logging failed:', error);
      throw error;
    }
  },

  /**
   * Get user activity logs
   */
  getUserActivities: async (userId: number, limit = 50, offset = 0, activityType?: string): Promise<ActivityLog[]> => {
    try {
      const params: any = { 
        user_id: userId,
        limit: limit.toString(),
        offset: offset.toString()
      };
      
      if (activityType) {
        params.activity_type = activityType;
      }
      
      const response = await apiClient.get('/auth/log_activity.php', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user activities:', error);
      throw error;
    }
  }
};
