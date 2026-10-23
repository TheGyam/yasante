import { apiClient } from '@/shared/lib/api/client';
import { Content } from '@/features/education';
import { ApiResponse, PaginatedResponse, CursorPaginatedResponse } from '@/shared/types/api';

export interface ContentFilters {
  hairType?: string;
  topic?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  cursor?: string;
  excludeId?: string;
}

/**
 * Content API Service
 *
 * Based on Swagger spec from: https://yasante.com/swagger/
 * Base path: /api
 * Endpoints:
 * - GET /api/content/content/ - List content (returns array)
 * - GET /api/content/content/search/ - Search content
 * - GET /api/content/content/{id}/ - Get content by ID
 */
export const contentApi = {
  /**
   * Get all content with optional filters and pagination
   *
   * According to Swagger, the endpoint returns a direct array, not paginated.
   * However, the API description mentions cursor-based pagination support.
   * We'll handle both formats for compatibility.
   */
  getAll: async (
    filters?: ContentFilters
  ): Promise<PaginatedResponse<Content> | CursorPaginatedResponse<Content>> => {
    const params = new URLSearchParams();

    // Build query parameters according to Swagger spec
    if (filters?.topic) params.append('topic', filters.topic);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);

    // Cursor-based pagination parameters (if supported by backend)
    if (filters?.cursor) params.append('cursor', filters.cursor);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    // Note: Swagger shows endpoint as /content/content/ with basePath /api
    const url = `/api/content/content/${params.toString() ? `?${params.toString()}` : ''}`;

    try {
      // Swagger shows response as array, but we'll handle both formats
      const response = await apiClient.get<Content[] | CursorPaginatedResponse<Content>>(url);

      // Handle direct array response (as per Swagger spec)
      if (Array.isArray(response.data)) {
        const data = filters?.excludeId
          ? response.data.filter(item => item.id !== filters.excludeId)
          : response.data;

        // Convert to cursor-based pagination format for frontend compatibility
        const limit = filters?.limit || 20;
        const cursor = filters?.cursor;

        // Sort by publishedAt DESC (newest first) if not already sorted
        const sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.publishedAt).getTime();
          const dateB = new Date(b.publishedAt).getTime();
          return dateB - dateA;
        });

        // Apply cursor filter if provided
        let filtered = sorted;
        if (cursor) {
          const cursorDate = new Date(cursor).getTime();
          filtered = sorted.filter(item => {
            const itemDate = new Date(item.publishedAt).getTime();
            return itemDate < cursorDate;
          });
        }

        // Paginate
        const pageData = filtered.slice(0, limit);
        const lastItem = pageData[pageData.length - 1];
        const hasMore = filtered.length > limit;

        return {
          data: pageData,
          pagination: {
            cursor: cursor || undefined,
            nextCursor: hasMore && lastItem ? lastItem.publishedAt : undefined,
            hasMore,
            limit,
          },
        } as CursorPaginatedResponse<Content>;
      }

      // Handle paginated response format (if backend returns it)
      return response.data as CursorPaginatedResponse<Content>;
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
   * Get content by ID
   * Endpoint: GET /api/content/content/{id}/
   */
  getById: async (contentId: string): Promise<ApiResponse<Content>> => {
    const url = `/api/content/content/${contentId}/`;

    try {
      // Swagger shows direct Content object response
      const response = await apiClient.get<Content>(url);

      // Wrap in ApiResponse format for consistency
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
   * Search content
   * Endpoint: GET /api/content/content/search/
   */
  search: async (
    query: string,
    filters?: { topic?: string; type?: string; cursor?: string; limit?: number }
  ): Promise<CursorPaginatedResponse<Content>> => {
    const params = new URLSearchParams();
    params.append('q', query); // API docs use 'q' parameter

    if (filters?.topic) params.append('topic', filters.topic);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.cursor) params.append('cursor', filters.cursor);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const url = `/api/content/content/search/?${params.toString()}`;

    try {
      // API docs show paginated response format
      const response = await apiClient.get<CursorPaginatedResponse<Content>>(url);

      // Return paginated response
      return response.data;
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
   * Get content products
   * GET /api/content/content/{contentId}/products/
   */
  getProducts: async (contentId: string): Promise<ApiResponse<any[]>> => {
    const url = `/api/content/content/${contentId}/products/`;

    try {
      const response = await apiClient.get<any[]>(url);

      // Handle wrapped response format
      const data = Array.isArray(response.data) ? response.data : (response.data as any).data || [];

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
