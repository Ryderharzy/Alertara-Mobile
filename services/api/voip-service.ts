/**
 * VoIP Service
 * Handles VoIP call room registration and responder notification
 */

import { apiClient } from './api-config';

export interface VoIPRoomData {
  room_name: string;
  hotline_id: string;
  user_id?: number;
  user_name?: string;
  latitude?: number;
  longitude?: number;
}

export interface VoIPRoomResponse {
  id: number;
  room_name: string;
  hotline_id: string;
  user_id: number;
  user_name: string;
  latitude?: number;
  longitude?: number;
  status: 'active' | 'ended';
  created_at: string;
  responder_notified: boolean;
}

type ApiBody = {
  success?: boolean;
  message?: string;
  data?: VoIPRoomResponse;
  room?: VoIPRoomResponse;
  id?: number;
  room_name?: string;
  hotline_id?: string;
  user_id?: number;
  user_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  created_at?: string;
  responder_notified?: boolean;
};

function parseVoIPRoomRecord(
  body: ApiBody,
  fallback?: Partial<VoIPRoomData>,
): VoIPRoomResponse {
  const source = body.data ?? body.room ?? body;

  return {
    id: Number(source.id),
    room_name: String(source.room_name ?? fallback?.room_name ?? ''),
    hotline_id: String(source.hotline_id ?? fallback?.hotline_id ?? ''),
    user_id: Number(source.user_id ?? fallback?.user_id ?? 0),
    user_name: String(source.user_name ?? fallback?.user_name ?? ''),
    latitude:
      source.latitude != null && String(source.latitude) !== ''
        ? Number(source.latitude)
        : fallback?.latitude,
    longitude:
      source.longitude != null && String(source.longitude) !== ''
        ? Number(source.longitude)
        : fallback?.longitude,
    status: (source.status ?? 'active') as 'active' | 'ended',
    created_at: String(source.created_at ?? new Date().toISOString()),
    responder_notified: Boolean(source.responder_notified ?? false),
  };
}

function assertSuccess(body: ApiBody, fallbackMessage: string): void {
  if (body.success === false) {
    throw new Error(body.message ?? fallbackMessage);
  }
}

export const voipService = {
  /**
   * Register a new VoIP call room
   */
  async registerRoom(data: VoIPRoomData): Promise<VoIPRoomResponse> {
    try {
      const response = await apiClient.post<ApiBody>(
        '/voip/register_room',
        data,
      );
      const body = response.data;
      assertSuccess(body, 'Failed to register VoIP room.');
      return parseVoIPRoomRecord(body, data);
    } catch (error) {
      console.error('Failed to register VoIP room:', error);
      throw error;
    }
  },

  /**
   * Update room status (e.g., when call ends)
   */
  async updateRoomStatus(
    roomId: number,
    status: 'active' | 'ended',
  ): Promise<VoIPRoomResponse> {
    try {
      const response = await apiClient.put<ApiBody>(
        '/voip/update_room',
        { room_id: roomId, status },
      );
      const body = response.data;
      assertSuccess(body, 'Failed to update VoIP room status.');
      return parseVoIPRoomRecord(body);
    } catch (error) {
      console.error('Failed to update VoIP room status:', error);
      throw error;
    }
  },

  /**
   * Get active VoIP room for a user
   */
  async getActiveRoom(userId: number): Promise<VoIPRoomResponse | null> {
    try {
      const response = await apiClient.get<ApiBody>(
        '/voip/get_active_room',
        { params: { user_id: userId } },
      );
      const body = response.data;
      if (!body.data && !body.room) {
        return null;
      }
      assertSuccess(body, 'Failed to fetch active VoIP room.');
      return parseVoIPRoomRecord(body);
    } catch (error) {
      console.error('Failed to fetch active VoIP room:', error);
      return null;
    }
  },
};
