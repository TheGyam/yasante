import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/types/api';
import { MonthlyHairstyle } from '@/features/planner';

/**
 * Monthly Hairstyles API Service
 *
 * Based on Swagger spec
 * Endpoints:
 * - GET /api/hairstyles/hairstyles/ - List hairstyles (paginated)
 * - POST /api/hairstyles/hairstyles/ - Create hairstyle
 * - GET /api/hairstyles/hairstyles/{id}/ - Get hairstyle by ID
 * - PUT /api/hairstyles/hairstyles/{id}/ - Update hairstyle
 * - PATCH /api/hairstyles/hairstyles/{id}/ - Partial update hairstyle
 * - DELETE /api/hairstyles/hairstyles/{id}/ - Delete hairstyle
 */

export interface MonthlyHairstyleCreate {
  month: string; // Format: "YYYY-MM"
  photo_uri: string;
  thumbnail_uri?: string;
  notes?: string;
}

export const monthlyHairstylesApi = {
  /**
   * Get all monthly hairstyles
   * GET /api/hairstyles/hairstyles/
   */
  getAll: async (userId?: string, month?: string): Promise<ApiResponse<MonthlyHairstyle[]>> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (month) params.append('month', month);

    const url = `/api/hairstyles/hairstyles/${params.toString() ? `?${params.toString()}` : ''}`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, userId, month });
    }

    try {
      // Django REST Framework returns { count, next, previous, results: [...] }
      const response = await apiClient.get<
        { results: MonthlyHairstyle[]; count?: number } | MonthlyHairstyle[]
      >(url);

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
   * Get hairstyle by ID
   * GET /api/hairstyles/hairstyles/{id}/
   */
  getById: async (hairstyleId: string): Promise<ApiResponse<MonthlyHairstyle>> => {
    const url = `/api/hairstyles/hairstyles/${hairstyleId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, hairstyleId });
    }

    try {
      const response = await apiClient.get<MonthlyHairstyle>(url);

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
   * Create monthly hairstyle
   * POST /api/hairstyles/hairstyles/
   */
  create: async (hairstyle: MonthlyHairstyleCreate): Promise<ApiResponse<MonthlyHairstyle>> => {
    const url = '/api/hairstyles/hairstyles/';

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, month: hairstyle.month });
    }

    try {
      const response = await apiClient.post<MonthlyHairstyle>(url, hairstyle);

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
   * Update monthly hairstyle
   * PATCH /api/hairstyles/hairstyles/{id}/
   */
  update: async (
    hairstyleId: string,
    updates: Partial<MonthlyHairstyleCreate>
  ): Promise<ApiResponse<MonthlyHairstyle>> => {
    const url = `/api/hairstyles/hairstyles/${hairstyleId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, hairstyleId });
    }

    try {
      const response = await apiClient.patch<MonthlyHairstyle>(url, updates);

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
   * Delete monthly hairstyle
   * DELETE /api/hairstyles/hairstyles/{id}/
   */
  delete: async (hairstyleId: string): Promise<void> => {
    const url = `/api/hairstyles/hairstyles/${hairstyleId}/`;

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'DELETE', url, hairstyleId });
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
