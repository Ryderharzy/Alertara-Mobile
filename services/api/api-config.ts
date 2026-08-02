/**
 * API Configuration
 */

import axios, { AxiosError, AxiosInstance } from "axios";

export const API_BASE_URL = "https://emergency-comm.alertaraqc.com/PHP/api";

/**
 * Create and configure Axios instance with default settings
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  params: {
    api_key: "EMERGENCY-SYSTEM-INTEGRATED-KEY-2026",
  },
});

/**
 * Request interceptor for logging
 */
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for global error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle timeout
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timeout. Please try again."));
    }

    // Handle no internet
    if (!error.response) {
      return Promise.reject(
        new Error("Network error. Please check your connection."),
      );
    }

    // Handle API errors
    const apiMessage = (() => {
      const data = error.response?.data as
        | { message?: string }
        | string
        | undefined;
      if (typeof data === "string") {
        return data;
      }
      return data?.message;
    })();

    if (error.response.status >= 500) {
      return Promise.reject(
        new Error(apiMessage ?? "Server error. Please try again later."),
      );
    }

    if (error.response.status === 404) {
      return Promise.reject(new Error(apiMessage ?? "Resource not found."));
    }

    if (error.response.status === 403 || error.response.status === 401) {
      return Promise.reject(new Error(apiMessage ?? "Access denied."));
    }

    return Promise.reject(error);
  },
);
