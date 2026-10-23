import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse } from '@/shared/types/api';
import { Favorite } from '@/features/education';

/**
 * Favorites API Service
 *
 * Based on backend API documentation
 * Endpoints:
 * - GET /api/favorites/favorites/ - List favorites
 * - POST /api/favorites/favorites/toggle/ - Toggle favorite status
 * - GET /api/favorites/favorites/check/ - Check if content is favorited
 */

export interface FavoriteToggleRequest {
  contentId: string; // camelCase as per API docs
}

export const favoritesApi = {
  /**
   * Get all favorites
   * GET /api/favorites/favorites/
   */
  getAll: async (_userId?: string): Promise<ApiResponse<Favorite[]>> => {
    const url = '/api/favorites/favorites/';

    try {
      // API docs show { data: [...] } format
      const response = await apiClient.get<ApiResponse<Favorite[]>>(url);

      // Handle wrapped response format
      let data: Favorite[] = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if ((response.data as any).data && Array.isArray((response.data as any).data)) {
        data = (response.data as any).data;
      }
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
   * Check if content is favorited
   * GET /api/favorites/favorites/check/?userId={userId}&contentId={contentId}
   */
  isFavorite: async (userId: string, contentId: string): Promise<ApiResponse<boolean>> => {
    const params = new URLSearchParams();
    params.append('userId', userId); // Backend requires userId
    params.append('contentId', contentId); // camelCase as per API docs

    const url = `/api/favorites/favorites/check/?${params.toString()}`;

    try {
      // API docs show { data: { isFavorite: boolean, favoriteId?: string } }
      const response = await apiClient.get<any>(url);

      // Handle wrapped response format
      let result: { isFavorite: boolean; favoriteId?: string };
      if ((response.data as any).data) {
        result = (response.data as any).data;
      } else {
        result = response.data as { isFavorite: boolean; favoriteId?: string };
      }
      return { data: result.isFavorite || false };
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
   * Toggle favorite status
   * POST /api/favorites/favorites/toggle/
   */
  toggle: async (
    userId: string,
    contentId: string
  ): Promise<ApiResponse<{ isFavorite: boolean; favorite?: Favorite }>> => {
    const url = '/api/favorites/favorites/toggle/';

    try {
      // API docs show { data: { isFavorite: boolean, favorite?: Favorite } }
      const response = await apiClient.post<any>(url, {
        contentId, // camelCase as per API docs
      });

      // Handle wrapped response format
      let data: { isFavorite: boolean; favorite?: Favorite };
      if ((response.data as any).data) {
        data = (response.data as any).data;
      } else {
        data = response.data as { isFavorite: boolean; favorite?: Favorite };
      }
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
};
