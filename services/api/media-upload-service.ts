/**
 * Media Upload Service
 * Handles file uploads for chat attachments and reports
 */

import { apiClient } from './api-config';

export interface MediaUploadData {
  file: {
    uri: string;
    type: string;
    name: string;
    size?: number;
  };
  conversation_id?: number;
  report_id?: number;
}

export interface MediaUploadResponse {
  success: boolean;
  message: string;
  file_url: string;
  file_path: string;
  file_size: number;
  file_type: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

type ApiBody = {
  success?: boolean;
  message?: string;
  data?: MediaUploadResponse;
  file_url?: string;
  file_path?: string;
  file_size?: number;
  file_type?: string;
};

function assertSuccess(body: ApiBody, fallbackMessage: string): void {
  if (body.success === false) {
    throw new Error(body.message ?? fallbackMessage);
  }
}

export const mediaUploadService = {
  /**
   * Upload media file to server
   */
  async uploadMedia(
    data: MediaUploadData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<MediaUploadResponse> {
    try {
      const formData = new FormData();
      
      // Append file
      formData.append('file', {
        uri: data.file.uri,
        type: data.file.type,
        name: data.file.name,
      } as any);
      
      // Append optional identifiers
      if (data.conversation_id) {
        formData.append('conversation_id', data.conversation_id.toString());
      }
      if (data.report_id) {
        formData.append('report_id', data.report_id.toString());
      }
      
      const response = await apiClient.post<ApiBody>(
        '/reports/upload_media.php',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentage = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress({
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percentage,
              });
            }
          },
        }
      );
      
      const body = response.data;
      assertSuccess(body, 'Failed to upload media.');
      
      return {
        success: body.success ?? true,
        message: body.message ?? 'File uploaded successfully',
        file_url: body.file_url ?? '',
        file_path: body.file_path ?? '',
        file_size: body.file_size ?? 0,
        file_type: body.file_type ?? '',
      };
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw error;
    }
  },

  /**
   * Get file type from URI
   */
  getFileType(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase() || '';
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoTypes = ['mp4', 'mov', 'avi', 'mkv'];
    const documentTypes = ['pdf', 'doc', 'docx', 'txt'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (videoTypes.includes(extension)) return 'video';
    if (documentTypes.includes(extension)) return 'document';
    return 'file';
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Validate file size (max 10MB)
   */
  validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size <= maxSize;
  },

  /**
   * Validate file type
   */
  validateFileType(type: string, allowedTypes: string[] = ['image/*', 'video/*']): boolean {
    return allowedTypes.some(allowed => type.match(allowed.replace('*', '.*')));
  },
};
