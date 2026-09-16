import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/types/api';
import { Goal, Activity, ProgressPhoto } from '@/features/planner';

/**
 * Goals API Service
 * 
 * Based on Swagger spec
 * Endpoints:
 * - GET /api/goals/ - List goals (paginated)
 * - POST /api/goals/ - Create goal
 * - GET /api/goals/{id}/ - Get goal by ID
 * - PUT /api/goals/{id}/ - Update goal
 * - PATCH /api/goals/{id}/ - Partial update goal
 * - DELETE /api/goals/{id}/ - Delete goal
 * - GET /api/goals/{id}/activities/ - Get activities for goal
 * - GET /api/goals/{id}/photos/ - Get photos for goal
 */

export interface GoalCreate {
  name: string;
  description?: string;
  target_date: string;
  success_metric?: string;
  status?: 'active' | 'completed' | 'archived';
  progress?: number;
}

export const goalsApi = {
  /**
   * Get all goals for user
   * GET /api/goals/
   */
  getAll: async (userId?: string): Promise<ApiResponse<Goal[]>> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    
    const url = `/api/goals/${params.toString() ? `?${params.toString()}` : ''}`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, userId });
    }
    
    try {
      // Django REST Framework returns { count, next, previous, results: [...] }
      const response = await apiClient.get<{ results: Goal[]; count?: number } | Goal[]>(url);
      
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
   * Get goal by ID
   * GET /api/goals/{id}/
   */
  getById: async (goalId: string): Promise<ApiResponse<Goal>> => {
    const url = `/api/goals/${goalId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, goalId });
    }
    
    try {
      const response = await apiClient.get<Goal>(url);
      
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
   * Create goal
   * POST /api/goals/
   */
  create: async (goal: GoalCreate): Promise<ApiResponse<Goal>> => {
    const url = '/api/goals/';
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, goalName: goal.name });
    }
    
    try {
      const response = await apiClient.post<Goal>(url, goal);
      
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
   * Update goal
   * PATCH /api/goals/{id}/
   */
  update: async (goalId: string, updates: Partial<GoalCreate>): Promise<ApiResponse<Goal>> => {
    const url = `/api/goals/${goalId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, goalId });
    }
    
    try {
      const response = await apiClient.patch<Goal>(url, updates);
      
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
   * Delete goal
   * DELETE /api/goals/{id}/
   */
  delete: async (goalId: string): Promise<void> => {
    const url = `/api/goals/${goalId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'DELETE', url, goalId });
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

  /**
   * Get activities for goal
   * GET /api/goals/{id}/activities/
   */
  getActivities: async (goalId: string): Promise<ApiResponse<Activity[]>> => {
    const url = `/api/goals/${goalId}/activities/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, goalId });
    }
    
    try {
      // Swagger shows Goal response with activities array
      const response = await apiClient.get<Goal>(url);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      // Goal response may include nested activities
      const goal = response.data as any;
      const activities = goal.activities || [];
      return { data: activities };
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
   * Get photos for goal
   * GET /api/goals/{id}/photos/
   */
  getPhotos: async (goalId: string): Promise<ApiResponse<ProgressPhoto[]>> => {
    const url = `/api/goals/${goalId}/photos/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, goalId });
    }
    
    try {
      // Swagger shows Goal response with photos array
      const response = await apiClient.get<Goal>(url);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      // Goal response may include nested photos
      const goal = response.data as any;
      const photos = goal.photos || [];
      return { data: photos };
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

