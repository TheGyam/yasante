import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { ProgressPhoto } from '@/types/planner';

/**
 * Photos API Service
 * 
 * Based on Swagger spec
 * Endpoints:
 * - GET /api/goals/photos/ - List photos (paginated)
 * - POST /api/goals/photos/ - Create photo
 * - GET /api/goals/photos/{id}/ - Get photo by ID
 * - PUT /api/goals/photos/{id}/ - Update photo
 * - PATCH /api/goals/photos/{id}/ - Partial update photo
 * - DELETE /api/goals/photos/{id}/ - Delete photo
 */

export interface ProgressPhotoCreate {
  goal_id: string;
  uri: string;
  thumbnail_uri?: string;
  date: string;
  caption?: string;
  location?: string;
}

export const photosApi = {
  /**
   * Get all photos
   * GET /api/goals/photos/
   */
  getAll: async (goalId?: string): Promise<ApiResponse<ProgressPhoto[]>> => {
    const params = new URLSearchParams();
    if (goalId) params.append('goal_id', goalId);
    
    const url = `/api/goals/photos/${params.toString() ? `?${params.toString()}` : ''}`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, goalId });
    }
    
    try {
      // Django REST Framework returns { count, next, previous, results: [...] }
      const response = await apiClient.get<{ results: ProgressPhoto[]; count?: number } | ProgressPhoto[]>(url);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      // Handle both Django paginated format and direct array
      const data = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).results || [];
      
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

  /**
   * Get photo by ID
   * GET /api/goals/photos/{id}/
   */
  getById: async (photoId: string): Promise<ApiResponse<ProgressPhoto>> => {
    const url = `/api/goals/photos/${photoId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, photoId });
    }
    
    try {
      const response = await apiClient.get<ProgressPhoto>(url);
      
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
   * Create photo
   * POST /api/goals/photos/
   */
  create: async (photo: ProgressPhotoCreate): Promise<ApiResponse<ProgressPhoto>> => {
    const url = '/api/goals/photos/';
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, goalId: photo.goal_id });
    }
    
    try {
      const response = await apiClient.post<ProgressPhoto>(url, photo);
      
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
   * Update photo
   * PATCH /api/goals/photos/{id}/
   */
  update: async (photoId: string, updates: Partial<ProgressPhotoCreate>): Promise<ApiResponse<ProgressPhoto>> => {
    const url = `/api/goals/photos/${photoId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, photoId });
    }
    
    try {
      const response = await apiClient.patch<ProgressPhoto>(url, updates);
      
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
   * Delete photo
   * DELETE /api/goals/photos/{id}/
   */
  delete: async (photoId: string): Promise<void> => {
    const url = `/api/goals/photos/${photoId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'DELETE', url, photoId });
    }
    
    try {
      await apiClient.delete(url);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: 204 });
      }
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

