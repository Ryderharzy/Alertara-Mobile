/**
 * Chat Service
 * Handles real-time messaging between users and operators
 */

import { apiClient } from './api-config';

export interface CreateConversationData {
  user_id?: string | number;
  user_name: string;
  user_email?: string;
  user_phone?: string;
  user_location?: string;
  user_concern?: string;
  is_guest?: number;
  message: string;
  incident_priority_score?: number;
  incident_priority_level?: string;
  incident_priority_color?: string;
  incident_priority_breakdown?: string;
  incident_priority_manual?: number;
}

export interface CreateConversationResponse {
  conversation_id: number;
  status: string;
  message: string;
}

export interface ChatMessage {
  message_id: number;
  conversation_id: number;
  sender_id: string;
  sender_name: string;
  sender_type: 'user' | 'admin';
  message_text: string;
  attachment_url?: string;
  attachment_mime?: string;
  attachment_size?: number;
  is_read: number;
  created_at: string;
}

export interface SendMessageData {
  conversation_id: number;
  sender_id?: string | number;
  sender_name: string;
  sender_type: 'user' | 'admin';
  message_text: string;
  attachment_url?: string;
  attachment_mime?: string;
  attachment_size?: number;
}

export interface SendMessageResponse {
  message_id: number;
  conversation_id: number;
  status: string;
}

export interface GetMessagesResponse {
  messages: ChatMessage[];
}

type ApiBody = {
  success?: boolean;
  message?: string;
  data?: CreateConversationResponse | GetMessagesResponse | SendMessageResponse;
  conversation_id?: number;
  status?: string;
  message_id?: number;
  messages?: ChatMessage[];
};

function assertSuccess(body: ApiBody, fallbackMessage: string): void {
  if (body.success === false) {
    throw new Error(body.message ?? fallbackMessage);
  }
}

export const chatService = {
  /**
   * Create a new conversation and queue for operator assignment
   */
  async createConversation(data: CreateConversationData): Promise<CreateConversationResponse> {
    try {
      const response = await apiClient.post<ApiBody>(
        '/chat/chat.php',
        data,
      );
      const body = response.data;
      assertSuccess(body, 'Failed to create conversation.');
      
      return {
        conversation_id: Number(body.conversation_id),
        status: body.status ?? 'pending',
        message: body.message ?? 'Conversation created',
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: number, userId?: string | number): Promise<ChatMessage[]> {
    try {
      const params = userId ? { conversation_id: conversationId, user_id: userId } : { conversation_id: conversationId };
      const response = await apiClient.get<ApiBody>(
        '/chat/chat.php',
        { params },
      );
      const body = response.data;
      assertSuccess(body, 'Failed to retrieve messages.');
      
      if (Array.isArray(body.messages)) {
        return body.messages;
      }
      if (body.data && typeof body.data === 'object' && 'messages' in body.data) {
        return (body.data as GetMessagesResponse).messages;
      }
      return [];
    } catch (error) {
      throw error;
    }
  },

  /**
   * Send a message to an existing conversation
   */
  async sendMessage(data: SendMessageData): Promise<SendMessageResponse> {
    try {
      const response = await apiClient.put<ApiBody>(
        '/chat/chat.php',
        data,
      );
      const body = response.data;
      assertSuccess(body, 'Failed to send message.');
      
      return {
        message_id: Number(body.message_id),
        conversation_id: Number(body.conversation_id),
        status: body.status ?? 'sent',
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Close a conversation
   */
  async closeConversation(conversationId: number, userId?: string | number): Promise<{ status: string }> {
    try {
      const params = userId ? { conversation_id: conversationId, user_id: userId } : { conversation_id: conversationId };
      const response = await apiClient.delete<ApiBody>(
        '/chat/chat.php',
        { params },
      );
      const body = response.data;
      assertSuccess(body, 'Failed to close conversation.');
      
      return { status: body.status ?? 'closed' };
    } catch (error) {
      throw error;
    }
  },
};
