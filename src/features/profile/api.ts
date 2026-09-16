import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/types/api';
import { User, HairProfile } from '@/features/profile';

/**
 * User API Service
 * 
 * Based on actual backend implementation (Django URL patterns)
 * Endpoints:
 * - GET /api/users/ - List users (returns array, get first for current user)
 * - GET /api/users/{userId}/ - Get user by ID
 * - PATCH /api/users/{userId}/ - Update user
 * - PATCH /api/users/{userId}/hair-profile/ - Update hair profile
 */

export interface UserUpdate {
  name: string;
  email: string;
  avatar_uri?: string;
}

export const userApi = {
  /**
   * Get current user
   * GET /api/users/ (returns array, get first)
   */
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const url = '/api/users/';
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url });
    }
    
    try {
      // API docs show array response: { data: [User] }
      const response = await apiClient.get<ApiResponse<User[]>>(url);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      // Handle wrapped response format - get first user from array
      let users: User[] = [];
      if (Array.isArray(response.data)) {
        users = response.data;
      } else if ((response.data as any).data && Array.isArray((response.data as any).data)) {
        users = (response.data as any).data;
      }
      
      if (users.length === 0) {
        throw new Error('No user found');
      }
      
      return { data: users[0] };
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ API Error:', { 
          url, 
          error: error.message, 
          status: error.response?.status,
          data: error.response?.data 
        });
      }
      throw error;
    }
  },

  /**
   * Get user profile by ID
   * GET /api/users/{userId}/
   */
  getProfile: async (userId: string): Promise<ApiResponse<User>> => {
    const url = `/api/users/${userId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, userId });
    }
    
    try {
      const response = await apiClient.get<User>(url);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      return { data: response.data };
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ API Error:', { 
          url, 
          error: error.message, 
          status: error.response?.status,
          data: error.response?.data 
        });
      }
      throw error;
    }
  },

  /**
   * Update user profile
   * PATCH /api/users/{userId}/
   */
  updateProfile: async (userId: string, updates: UserUpdate): Promise<ApiResponse<User>> => {
    const url = `/api/users/${userId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, userId });
    }
    
    try {
      const response = await apiClient.patch<User>(url, updates);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      return { data: response.data };
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ API Error:', { 
          url, 
          error: error.message, 
          status: error.response?.status,
          data: error.response?.data 
        });
      }
      throw error;
    }
  },

  /**
   * Request a copy of everything we hold on this user.
   * POST /api/users/{userId}/export/
   *
   * Backend: assemble asynchronously and email a download link — the response here
   * only acknowledges the request.
   */
  requestDataExport: async (userId: string): Promise<ApiResponse<{ requestedAt: string }>> => {
    const url = `/api/users/${userId}/export/`;

    try {
      const response = await apiClient.post<any>(url);
      return { data: response.data?.data ?? response.data };
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ API Error:', { url, error: error.message, status: error.response?.status });
      }
      throw error;
    }
  },

  /**
   * Delete this account and its data.
   * DELETE /api/users/{userId}/
   *
   * Backend: hard-delete profile, media and posts; anonymise booking records the
   * stylist needs for her own accounts; complete within 30 days.
   */
  deleteAccount: async (userId: string): Promise<void> => {
    const url = `/api/users/${userId}/`;

    try {
      await apiClient.delete(url);
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ API Error:', { url, error: error.message, status: error.response?.status });
      }
      throw error;
    }
  },

  /**
   * Update hair profile
   * PATCH /api/users/{userId}/hair-profile/
   */
  updateHairProfile: async (userId: string, hairProfile: Partial<HairProfile>): Promise<ApiResponse<HairProfile>> => {
    const url = `/api/users/${userId}/hair-profile/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, userId });
    }
    
    try {
      // API docs show HairProfile response: { data: HairProfile }
      const response = await apiClient.patch<any>(url, hairProfile);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      // Handle wrapped response format
      let data: HairProfile;
      if ((response.data as any).data) {
        data = (response.data as any).data;
      } else {
        data = response.data as HairProfile;
      }
      return { data };
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ API Error:', { 
          url, 
          error: error.message, 
          status: error.response?.status,
          data: error.response?.data 
        });
      }
      throw error;
    }
  },
};

