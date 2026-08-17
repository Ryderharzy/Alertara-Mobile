import { apiClient } from "./api-config";

export interface DeviceData {
  user_id?: number;
  device_id: string;
  device_type?: string;
  device_name?: string;
  fcm_token?: string;
  push_token?: string;
  token_type?: 'expo' | 'fcm';
  notification_permission?: 'granted' | 'denied' | 'undetermined';
  notification_channel?: string;
  notification_sound?: string;
}

export interface DeviceResponse {
  device_id: string;
  action: 'registered' | 'updated' | 'deactivated';
}

export interface DeviceInfo {
  id: number;
  device_id: string;
  device_type: string;
  device_name: string | null;
  fcm_token: string | null;
  is_active: number;
  last_active: string;
  created_at: string;
}

export const deviceService = {
  /**
   * Register or update a device for the user
   */
  registerDevice: async (deviceData: DeviceData): Promise<DeviceResponse> => {
    try {
      const response = await apiClient.post('/auth/register_device.php', deviceData);
      return response.data;
    } catch (error) {
      console.error('Device registration failed:', error);
      throw error;
    }
  },

  /**
   * Get all devices for a user
   */
  getUserDevices: async (userId: number): Promise<DeviceInfo[]> => {
    try {
      const response = await apiClient.get('/auth/register_device.php', {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user devices:', error);
      throw error;
    }
  },

  /**
   * Deactivate a device
   */
  deactivateDevice: async (userId: number, deviceId: string): Promise<DeviceResponse> => {
    try {
      const response = await apiClient.delete('/auth/register_device.php', {
        data: { user_id: userId, device_id: deviceId }
      });
      return response.data;
    } catch (error) {
      console.warn('Device deactivation failed:', error);
      throw error;
    }
  }
};

