import axios, { AxiosInstance, AxiosError } from 'axios';
import * as mockApi from './mock/server';

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
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle errors globally
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
  user: mockApi.userApi,
  goals: mockApi.goalsApi,
  photos: mockApi.photosApi,
  activities: mockApi.activitiesApi,
  routines: mockApi.routinesApi,
  content: mockApi.contentApi,
  favorites: mockApi.favoritesApi,
  products: mockApi.productsApi,
  monthlyHairstyles: mockApi.monthlyHairstylesApi,
};

export default apiClient;

