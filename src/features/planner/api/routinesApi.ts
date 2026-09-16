import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/types/api';
import { Routine } from '@/features/planner';

/**
 * Routines API Service
 *
 * Based on Swagger spec
 * Endpoints:
 * - GET /api/routines/routines/ - List routines (paginated)
 * - POST /api/routines/routines/ - Create routine
 * - GET /api/routines/routines/{id}/ - Get routine by ID
 * - PUT /api/routines/routines/{id}/ - Update routine
 * - PATCH /api/routines/routines/{id}/ - Partial update routine
 * - DELETE /api/routines/routines/{id}/ - Delete routine
 */

export interface RoutineCreate {
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  scheduled_time?: string;
  days_of_week?: object; // JSON object
  reminder_enabled?: boolean;
  reminder_time?: number;
  steps: Array<{
    name: string;
    duration: number;
    order: number;
  }>;
}

export const routinesApi = {
  /**
   * Get all routines
   * GET /api/routines/routines/
   */
  getAll: async (userId?: string): Promise<ApiResponse<Routine[]>> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);

    const url = `/api/routines/routines/${params.toString() ? `?${params.toString()}` : ''}`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, userId });
    }

    try {
      // Django REST Framework returns { count, next, previous, results: [...] }
      const response = await apiClient.get<{ results: Routine[]; count?: number } | Routine[]>(url);

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
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * Get routine by ID
   * GET /api/routines/routines/{id}/
   */
  getById: async (routineId: string): Promise<ApiResponse<Routine>> => {
    const url = `/api/routines/routines/${routineId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, routineId });
    }

    try {
      const response = await apiClient.get<Routine>(url);

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
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * Create routine
   * POST /api/routines/routines/
   */
  create: async (routine: RoutineCreate): Promise<ApiResponse<Routine>> => {
    const url = '/api/routines/routines/';

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, routineName: routine.name });
    }

    try {
      const response = await apiClient.post<Routine>(url, routine);

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
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * Update routine
   * PATCH /api/routines/routines/{id}/
   */
  update: async (
    routineId: string,
    updates: Partial<RoutineCreate>
  ): Promise<ApiResponse<Routine>> => {
    const url = `/api/routines/routines/${routineId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, routineId });
    }

    try {
      const response = await apiClient.patch<Routine>(url, updates);

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
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * Delete routine
   * DELETE /api/routines/routines/{id}/
   */
  delete: async (routineId: string): Promise<void> => {
    const url = `/api/routines/routines/${routineId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'DELETE', url, routineId });
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
          data: error.response?.data,
        });
      }
      throw error;
    }
  },
};
