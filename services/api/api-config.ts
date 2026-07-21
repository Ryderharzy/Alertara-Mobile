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
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    console.log(`📋 Request Headers:`, config.headers);
    console.log(`📦 Request Data:`, config.data);
    console.log(`🔑 Request Params:`, config.params);
    return config;
  },
  (error) => {
    console.error(`❌ Request Error:`, error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for global error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    console.log(`📊 Status: ${response.status}`, response.statusText);
    console.log(`📄 Response Data:`, response.data);
    return response;
  },
  (error: AxiosError) => {
    console.error(`❌ API Error Details:`);
    console.error(`   URL: ${error.config?.baseURL}${error.config?.url}`);
    console.error(`   Method: ${error.config?.method?.toUpperCase()}`);
    console.error(`   Status: ${error.response?.status}`, error.response?.statusText);
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Response Data:`, error.response?.data);
    console.error(`   Full Error:`, error);

    // Handle timeout
    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request timeout");
      return Promise.reject(new Error("Request timeout. Please try again."));
    }

    // Handle no internet
    if (!error.response) {
      console.error("🌐 Network error:", error.message);
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
      console.error("🔴 Server error:", error.response.status);
      return Promise.reject(
        new Error(apiMessage ?? "Server error. Please try again later."),
      );
    }

    if (error.response.status === 404) {
      console.error("🔍 Resource not found");
      return Promise.reject(new Error(apiMessage ?? "Resource not found."));
    }

    if (error.response.status === 403 || error.response.status === 401) {
      console.error("🔒 Access denied");
      return Promise.reject(new Error(apiMessage ?? "Access denied."));
    }

    return Promise.reject(error);
  },
);
