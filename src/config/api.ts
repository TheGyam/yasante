/**
 * API Configuration
 * 
 * This module provides centralized API configuration management.
 * It supports environment variables, Expo Constants, and fallback values.
 * 
 * Priority order:
 * 1. Environment variable (EXPO_PUBLIC_API_BASE_URL)
 * 2. Expo Constants extra.apiBaseUrl
 * 3. Hardcoded fallback based on __DEV__
 * 
 * @example
 * // Set in .env file:
 * EXPO_PUBLIC_API_BASE_URL=https://your-api.com
 * 
 * // Or configure in app.json:
 * {
 *   "expo": {
 *     "extra": {
 *       "apiBaseUrl": "https://your-api.com"
 *     }
 *   }
 * }
 */

import Constants from 'expo-constants';

/**
 * API Configuration Interface
 */
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  enableLogging: boolean;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Get API base URL from environment or configuration
 */
const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (for development/testing)
  // Set EXPO_PUBLIC_API_BASE_URL in your .env file or environment
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Priority 2: Expo Constants extra field (configured in app.json)
  try {
    const extra = Constants.expoConfig?.extra;
    if (extra && typeof extra === 'object' && 'apiBaseUrl' in extra) {
      const apiBaseUrl = extra.apiBaseUrl;
      if (typeof apiBaseUrl === 'string' && apiBaseUrl.trim()) {
        return apiBaseUrl.trim();
      }
    }
  } catch (error) {
    // Constants might not be available in all environments
    if (__DEV__) {
      console.warn('Could not read Expo Constants:', error);
    }
  }

  // Priority 3: Fallback based on environment
  // Development: Use ngrok URL or localhost
  // Production: Use production API URL
  // Note: basePath is /api according to Swagger, so base URL should NOT include /api
  if (__DEV__) {
    // Default development URL - can be overridden via environment variable
    return 'https://af4b3b4f74ab.ngrok-free.app';
  }

  // Production fallback
  return 'https://api.kalon.app';
};

/**
 * API Configuration
 */
export const apiConfig: ApiConfig = {
  baseURL: getApiBaseUrl(),
  timeout: 10000, // 10 seconds
  enableLogging: __DEV__, // Enable logging in development
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Validate API configuration
 * Throws an error if configuration is invalid
 */
export const validateApiConfig = (): void => {
  if (!apiConfig.baseURL) {
    throw new Error('API base URL is not configured');
  }

  try {
    new URL(apiConfig.baseURL);
  } catch (error) {
    throw new Error(`Invalid API base URL: ${apiConfig.baseURL}`);
  }

  if (apiConfig.timeout <= 0) {
    throw new Error('API timeout must be greater than 0');
  }
};

/**
 * Check if the API is using ngrok
 * @returns true if baseURL contains 'ngrok'
 */
export const isUsingNgrok = (): boolean => {
  return apiConfig.baseURL.includes('ngrok');
};

/**
 * Get full API URL for a given endpoint
 * @param endpoint - API endpoint (e.g., '/api/auth/login')
 * @returns Full URL
 */
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Ensure baseURL doesn't end with a slash
  const cleanBaseUrl = apiConfig.baseURL.endsWith('/') 
    ? apiConfig.baseURL.slice(0, -1) 
    : apiConfig.baseURL;
  
  return `${cleanBaseUrl}/${cleanEndpoint}`;
};

// Validate configuration on module load
if (__DEV__) {
  try {
    validateApiConfig();
    console.log('✅ API Configuration loaded:', {
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      environment: __DEV__ ? 'development' : 'production',
    });
  } catch (error) {
    console.error('❌ API Configuration error:', error);
  }
}

