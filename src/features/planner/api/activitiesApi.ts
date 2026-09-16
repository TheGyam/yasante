import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/types/api';
import { Activity } from '@/features/planner';

/**
 * Activities API Service
 * 
 * Based on Swagger spec
 * Endpoints:
 * - GET /api/goals/activities/ - List activities (paginated)
 * - POST /api/goals/activities/ - Create activity
 * - GET /api/goals/activities/{id}/ - Get activity by ID
 * - PUT /api/goals/activities/{id}/ - Update activity
 * - PATCH /api/goals/activities/{id}/ - Partial update activity
 * - DELETE /api/goals/activities/{id}/ - Delete activity
 */

export interface ActivityCreate {
  goal_id: string;
  type: 'trim' | 'color' | 'treatment' | 'wash' | 'style' | 'other';
  date: string;
  notes?: string;
}

export const activitiesApi = {
  /**
   * Get all activities
   * GET /api/goals/activities/
   */
  getAll: async (goalId?: string): Promise<ApiResponse<Activity[]>> => {
    const params = new URLSearchParams();
    if (goalId) params.append('goal_id', goalId);
    
    const url = `/api/goals/activities/${params.toString() ? `?${params.toString()}` : ''}`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, goalId });
    }
    
    try {
      // Django REST Framework returns { count, next, previous, results: [...] }
      const response = await apiClient.get<{ results: Activity[]; count?: number } | Activity[]>(url);
      
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
   * Get activity by ID
   * GET /api/goals/activities/{id}/
   */
  getById: async (activityId: string): Promise<ApiResponse<Activity>> => {
    const url = `/api/goals/activities/${activityId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, activityId });
    }
    
    try {
      const response = await apiClient.get<Activity>(url);
      
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
   * Create activity
   * POST /api/goals/activities/
   */
  create: async (activity: ActivityCreate): Promise<ApiResponse<Activity>> => {
    const url = '/api/goals/activities/';
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, activityType: activity.type });
    }
    
    try {
      const response = await apiClient.post<Activity>(url, activity);
      
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
   * Update activity
   * PATCH /api/goals/activities/{id}/
   */
  update: async (activityId: string, updates: Partial<ActivityCreate>): Promise<ApiResponse<Activity>> => {
    const url = `/api/goals/activities/${activityId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, activityId });
    }
    
    try {
      const response = await apiClient.patch<Activity>(url, updates);
      
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
   * Delete activity
   * DELETE /api/goals/activities/{id}/
   */
  delete: async (activityId: string): Promise<void> => {
    const url = `/api/goals/activities/${activityId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'DELETE', url, activityId });
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

