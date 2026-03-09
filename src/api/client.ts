import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/state/stores/authStore';
import { apiConfig, validateApiConfig } from '@/config/api';
import { offlineQueue } from './utils/offlineQueue';

// Validate API configuration on module load
validateApiConfig();

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  // Axios will automatically serialize objects to JSON when Content-Type is application/json
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const state = useAuthStore.getState();
    if (state.tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${state.tokens.accessToken}`;
    }
    
    // Ensure Content-Type is set for POST/PUT/PATCH requests with data
    if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }
    
    // Log request in development
    if (__DEV__ && apiConfig.enableLogging) {
      const fullUrl = `${config.baseURL}${config.url}`;
      console.log('📤 API Request:', {
        method: config.method?.toUpperCase(),
        url: fullUrl,
        data: config.data,
        headers: {
          ...config.headers,
          Authorization: config.headers.Authorization ? 'Bearer ***' : undefined,
        },
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const state = useAuthStore.getState();
      if (state.tokens?.refreshToken) {
        try {
          // Lazy import to avoid circular dependency
          const { authApi } = await import('./services');
          // Try to refresh token using real API
          const response = await authApi.refreshToken(state.tokens.refreshToken);
          const { accessToken, expiresAt } = response.data;

          // Update tokens in store
          // Convert expiresAt string to timestamp if needed
          const expiresAtTimestamp = typeof expiresAt === 'string' 
            ? new Date(expiresAt).getTime() 
            : expiresAt;

          useAuthStore.getState().setTokens({
            accessToken,
            refreshToken: state.tokens.refreshToken,
            expiresAt: expiresAtTimestamp,
          });

          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          processQueue(null, accessToken);
          isRefreshing = false;

          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          // Logout on refresh failure
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    // Handle other errors globally
    if (error.response) {
      // Server responded with error
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
    } else if (error.request) {
      // Request made but no response - network error (offline)
      // Queue mutation if it's a POST/PUT/PATCH/DELETE request
      const method = originalRequest?.method?.toLowerCase();
      if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
        // Extract mutation type from URL
        const url = originalRequest?.url || '';
        let mutationType = 'unknown';
        let params: any = {};

        // Map common endpoints to mutation types
        if (url.includes('/favorites/toggle')) {
          mutationType = 'toggleFavorite';
          params = {
            userId: useAuthStore.getState().user?.id,
            contentId: originalRequest?.data?.contentId || originalRequest?.params?.contentId,
          };
        } else if (url.includes('/goals/')) {
          if (method === 'post') {
            mutationType = 'createGoal';
            params = {
              userId: useAuthStore.getState().user?.id,
              data: originalRequest?.data,
            };
          } else if (method === 'patch') {
            mutationType = 'updateGoal';
            const goalId = url.match(/\/goals\/([^/]+)/)?.[1];
            params = {
              userId: useAuthStore.getState().user?.id,
              goalId,
              data: originalRequest?.data,
            };
          } else if (method === 'delete') {
            mutationType = 'deleteGoal';
            const goalId = url.match(/\/goals\/([^/]+)/)?.[1];
            params = {
              userId: useAuthStore.getState().user?.id,
              goalId,
            };
          }
        }

        // Queue the mutation if we identified the type
        if (mutationType !== 'unknown' && params.userId) {
          offlineQueue.enqueue(mutationType, params).catch((queueError) => {
            if (__DEV__) {
              console.error('Failed to queue mutation:', queueError);
            }
          });
        }
      }

      if (__DEV__) {
        console.error('Network Error (offline):', {
          message: 'No response received from server',
          url: error.config?.url,
          baseURL: error.config?.baseURL,
        });
      }
    } else {
      // Something else happened
      if (__DEV__) {
        console.error('Error:', error.message);
      }
    }
    return Promise.reject(error);
  }
);

// API exports are now in ./index.ts to avoid circular dependency
// Import from './index' instead of './client' for the api object

export default apiClient;

