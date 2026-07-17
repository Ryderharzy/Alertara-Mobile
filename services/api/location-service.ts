import { apiClient } from "./api-config";

export interface LocationData {
  user_id: number;
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  source?: string;
  is_current?: number;
}

export interface LocationResponse {
  location_id: number;
  action: 'created' | 'updated' | 'deleted';
}

export interface LocationInfo {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  address: string | null;
  accuracy: number | null;
  source: string;
  is_current: number;
  created_at: string;
}

export const locationService = {
  /**
   * Create or update a location for the user
   */
  saveLocation: async (locationData: LocationData): Promise<LocationResponse> => {
    try {
      const response = await apiClient.post('/auth/manage_locations.php', locationData);
      return response.data;
    } catch (error) {
      console.error('Location save failed:', error);
      throw error;
    }
  },

  /**
   * Get all locations for a user
   */
  getUserLocations: async (userId: number, currentOnly = false): Promise<LocationInfo[]> => {
    try {
      const response = await apiClient.get('/auth/manage_locations.php', {
        params: { 
          user_id: userId,
          current_only: currentOnly ? '1' : '0'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user locations:', error);
      throw error;
    }
  },

  /**
   * Delete a location
   */
  deleteLocation: async (userId: number, locationId: number): Promise<LocationResponse> => {
    try {
      const response = await apiClient.delete('/auth/manage_locations.php', {
        data: { user_id: userId, location_id: locationId }
      });
      return response.data;
    } catch (error) {
      console.error('Location deletion failed:', error);
      throw error;
    }
  }
};
