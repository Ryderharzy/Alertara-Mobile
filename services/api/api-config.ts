/**
 * API Configuration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export const API_BASE_URL = 'http://192.168.1.7:8000/api';

/**
 * Create and configure Axios instance with default settings
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Response interceptor for global error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }

    // Handle no internet
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(
        new Error('Network error. Please check your connection.')
      );
    }

    // Handle API errors
    const apiMessage = (() => {
      const data = error.response?.data as { message?: string } | string | undefined;
      if (typeof data === 'string') {
        return data;
      }
      return data?.message;
    })();

    if (error.response.status >= 500) {
      console.error('Server error:', error.response.status);
      return Promise.reject(
        new Error(apiMessage ?? 'Server error. Please try again later.')
      );
    }

    if (error.response.status === 404) {
      console.error('Resource not found');
      return Promise.reject(new Error(apiMessage ?? 'Resource not found.'));
    }

    if (error.response.status === 403 || error.response.status === 401) {
      console.error('Access denied');
      return Promise.reject(new Error(apiMessage ?? 'Access denied.'));
    }

    return Promise.reject(error);
  }
);
