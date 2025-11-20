import axios, { AxiosInstance, AxiosError } from 'axios';
import * as mockApi from './mock/server';
import { useAuthStore } from '@/state/stores/authStore';

// In a real app, this would point to your backend API
const API_BASE_URL = __DEV__ ? 'http://localhost:3000/api' : 'https://api.kalon.app';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const state = useAuthStore.getState();
    if (state.tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${state.tokens.accessToken}`;
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
          // Try to refresh token
          const response = await mockApi.authApi.refreshToken(state.tokens.refreshToken);
          const { accessToken, expiresAt } = response.data;

          // Update tokens in store
          useAuthStore.getState().setTokens({
            accessToken,
            refreshToken: state.tokens.refreshToken,
            expiresAt,
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
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// For MVP, we'll use the mock API directly
// In production, replace these with actual API calls
export const api = {
  auth: mockApi.authApi,
  user: mockApi.userApi,
  goals: mockApi.goalsApi,
  photos: mockApi.photosApi,
  activities: mockApi.activitiesApi,
  routines: mockApi.routinesApi,
  content: mockApi.contentApi,
  favorites: mockApi.favoritesApi,
  products: mockApi.productsApi,
  monthlyHairstyles: mockApi.monthlyHairstylesApi,
  moodBoard: mockApi.moodBoardApi,
  treatments: mockApi.treatmentsApi,
};

export default apiClient;

