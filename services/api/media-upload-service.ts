/**
 * Media Upload Service
 * Handles file uploads for chat attachments and reports
 */

import { API_BASE_URL } from './api-config';
export interface MediaUploadData {
  file: {
    uri: string;
    type: string;
    name: string;
    size?: number;
  };
  conversation_id?: number;
  report_id?: number;
  imageOnly?: boolean;
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
   * Upload media file to server using native fetch
   */
  async uploadMedia(
    data: MediaUploadData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<MediaUploadResponse> {
    try {
      console.log('📤 Uploading file:', {
        uri: data.file.uri,
        type: data.file.type,
        name: data.file.name,
        size: data.file.size,
      });

      // Build URL with query parameters
      const url = new URL(`${API_BASE_URL}/reports/upload_media.php`);
      url.searchParams.append('api_key', 'EMERGENCY-SYSTEM-INTEGRATED-KEY-2026');
      
      if (data.conversation_id) {
        url.searchParams.append('conversation_id', data.conversation_id.toString());
      }
      if (data.report_id) {
        url.searchParams.append('report_id', data.report_id.toString());
      }
      if (data.imageOnly) {
        url.searchParams.append('image_only', '1');
      }

      console.log('🚀 Starting upload to:', url.toString());

      // Create FormData
      const formData = new FormData();
      formData.append('file', {
        uri: data.file.uri,
        type: data.file.type,
        name: data.file.name,
      } as any);

      // Upload using native fetch with XMLHttpRequest for progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', url.toString());
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.upload.onprogress = (event) => {
          if (onProgress && event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage,
            });
          }
        };
        
        xhr.onload = () => {
          console.log('📡 XHR status:', xhr.status);
          console.log('📡 XHR response:', xhr.responseText);
          
          if (xhr.status === 200) {
            try {
              const body = JSON.parse(xhr.responseText);
              console.log('✅ Upload response:', body);
              assertSuccess(body, 'Failed to upload media.');
              
              resolve({
                success: body.success ?? true,
                message: body.message ?? 'File uploaded successfully',
                file_url: body.file_url ?? '',
                file_path: body.file_path ?? '',
                file_size: body.file_size ?? 0,
                file_type: body.file_type ?? '',
              });
            } catch (e) {
              console.error('❌ JSON parse error:', e);
              reject(new Error('Invalid response from server'));
            }
          } else {
            console.error('❌ Upload failed with status:', xhr.status);
            console.error('❌ Response body:', xhr.responseText);
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        
        xhr.onerror = () => {
          console.error('❌ XHR error');
          reject(new Error('Network error during upload'));
        };
        
        xhr.send(formData);
      });
    } catch (error) {
      console.error('❌ Upload error details:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
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
