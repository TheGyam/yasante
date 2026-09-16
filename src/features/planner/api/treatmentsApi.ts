import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/types/api';
import { Treatment } from '@/features/planner';

/**
 * Treatments API Service
 *
 * Based on Swagger spec
 * Endpoints:
 * - GET /api/treatments/treatments/ - List treatments (paginated)
 * - POST /api/treatments/treatments/ - Create treatment
 * - GET /api/treatments/treatments/{id}/ - Get treatment by ID
 * - PUT /api/treatments/treatments/{id}/ - Update treatment
 * - PATCH /api/treatments/treatments/{id}/ - Partial update treatment
 * - DELETE /api/treatments/treatments/{id}/ - Delete treatment
 */

export interface TreatmentCreate {
  name: string;
  frequency: 'daily' | 'every-2-days' | 'weekly' | 'specific-days' | 'custom';
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  start_date: string; // ISO date
  end_date?: string; // ISO date
  number_of_sessions?: number;
  duration?: number; // Minutes
  specific_days?: object; // JSON object
  custom_frequency?: string;
  reminder_enabled?: boolean;
  reminder_time?: number; // Minutes
  notes?: string;
}

export const treatmentsApi = {
  /**
   * Get all treatments
   * GET /api/treatments/treatments/
   */
  getAll: async (userId?: string): Promise<ApiResponse<Treatment[]>> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);

    const url = `/api/treatments/treatments/${params.toString() ? `?${params.toString()}` : ''}`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, userId });
    }

    try {
      const response = await apiClient.get<Treatment[] | PaginatedResponse<Treatment>>(url);

      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }

      // Handle both array and paginated response formats
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
   * Get treatment by ID
   * GET /api/treatments/treatments/{id}/
   */
  getById: async (treatmentId: string): Promise<ApiResponse<Treatment>> => {
    const url = `/api/treatments/treatments/${treatmentId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, treatmentId });
    }

    try {
      const response = await apiClient.get<Treatment>(url);

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
   * Create treatment
   * POST /api/treatments/treatments/
   */
  create: async (treatment: TreatmentCreate): Promise<ApiResponse<Treatment>> => {
    const url = '/api/treatments/treatments/';

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, treatmentName: treatment.name });
    }

    try {
      const response = await apiClient.post<Treatment>(url, treatment);

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
   * Update treatment
   * PATCH /api/treatments/treatments/{id}/
   */
  update: async (
    treatmentId: string,
    updates: Partial<TreatmentCreate>
  ): Promise<ApiResponse<Treatment>> => {
    const url = `/api/treatments/treatments/${treatmentId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, treatmentId });
    }

    try {
      const response = await apiClient.patch<Treatment>(url, updates);

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
   * Delete treatment
   * DELETE /api/treatments/treatments/{id}/
   */
  delete: async (treatmentId: string): Promise<void> => {
    const url = `/api/treatments/treatments/${treatmentId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'DELETE', url, treatmentId });
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
