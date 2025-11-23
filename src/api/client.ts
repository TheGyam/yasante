import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/state/stores/authStore';
import { apiConfig, validateApiConfig, isUsingNgrok } from '@/config/api';

// Validate API configuration on module load
validateApiConfig();

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
    // Add ngrok bypass header if using ngrok
    ...(apiConfig.baseURL.includes('ngrok') && {
      'ngrok-skip-browser-warning': 'true',
    }),
  },
  // Axios will automatically serialize objects to JSON when Content-Type is application/json
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Always add ngrok bypass header if using ngrok (ensures it's on every request)
    // This prevents the ngrok browser warning page from appearing
    if (isUsingNgrok()) {
      config.headers['ngrok-skip-browser-warning'] = 'true';
    }
    
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
      // Request made but no response
      console.error('Network Error:', {
        message: 'No response received from server',
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        request: error.request,
      });
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API exports are now in ./index.ts to avoid circular dependency
// Import from './index' instead of './client' for the api object

export default apiClient;

