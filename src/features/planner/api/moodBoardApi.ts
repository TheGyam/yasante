import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/types/api';
import { MoodBoardEntry } from '@/features/planner';

/**
 * Mood Board API Service
 * 
 * Based on backend API documentation
 * Endpoints:
 * - GET /api/moodboard/moodboard/ - List mood board entries
 * - POST /api/moodboard/moodboard/ - Create mood board entry
 * - GET /api/moodboard/moodboard/{id}/ - Get mood board entry by ID
 * - PATCH /api/moodboard/moodboard/{id}/ - Update mood board entry
 * - DELETE /api/moodboard/moodboard/{id}/ - Delete mood board entry
 */

export interface MoodBoardEntryCreate {
  month: string; // Format: "YYYY-MM"
  name: string;
  mainPhotoUri: string; // camelCase as per API docs
  photos?: string[]; // Array of photo URIs
  stylistPrice: number; // Number as per API docs
  hairPrice: number; // Number as per API docs
  stylistLocation: string; // camelCase as per API docs
  appointmentTime: string; // ISO datetime, camelCase as per API docs
  monthColor?: string; // Hex color, camelCase as per API docs
  notes?: string;
  completed?: boolean;
}

export const moodBoardApi = {
  /**
   * Get all mood board entries
   * GET /api/moodboard/moodboard/
   */
  getAll: async (userId?: string, month?: string): Promise<ApiResponse<MoodBoardEntry[]>> => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    
    const url = `/api/moodboard/moodboard/${params.toString() ? `?${params.toString()}` : ''}`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, userId });
    }
    
    try {
      const response = await apiClient.get<MoodBoardEntry[] | PaginatedResponse<MoodBoardEntry>>(url);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      // Handle both array and paginated response formats
      let data = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).results || [];
      
      // Handle wrapped response format
      if ((response.data as any).data && Array.isArray((response.data as any).data)) {
        data = (response.data as any).data;
      }
      
      // Transform snake_case to camelCase if needed (backend might return snake_case)
      data = data.map((entry: any) => ({
        ...entry,
        // Map snake_case to camelCase
        mainPhotoUri: entry.mainPhotoUri || entry.main_photo_uri,
        stylistPrice: entry.stylistPrice ?? entry.stylist_price,
        hairPrice: entry.hairPrice ?? entry.hair_price,
        stylistLocation: entry.stylistLocation || entry.stylist_location,
        appointmentTime: entry.appointmentTime || entry.appointment_time,
        monthColor: entry.monthColor || entry.month_color,
      }));
      
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
   * Get SAVED mood board entries from other users
   * GET /api/moodboard/moodboard/saved/
   * NOTE: Endpoint pending backend implementation
   */
  getSaved: async (userId?: string, month?: string): Promise<ApiResponse<MoodBoardEntry[]>> => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    
    const url = `/api/moodboard/moodboard/saved/${params.toString() ? `?${params.toString()}` : ''}`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, userId });
    }
    
    try {
      const response = await apiClient.get<MoodBoardEntry[] | PaginatedResponse<MoodBoardEntry>>(url);
      
      let data = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).results || [];
      
      if ((response.data as any).data && Array.isArray((response.data as any).data)) {
        data = (response.data as any).data;
      }
      
      data = data.map((entry: any) => ({
        ...entry,
        mainPhotoUri: entry.mainPhotoUri || entry.main_photo_uri,
        stylistPrice: entry.stylistPrice ?? entry.stylist_price,
        hairPrice: entry.hairPrice ?? entry.hair_price,
        stylistLocation: entry.stylistLocation || entry.stylist_location,
        appointmentTime: entry.appointmentTime || entry.appointment_time,
        monthColor: entry.monthColor || entry.month_color,
      }));
      
      return { data };
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ API Error explicitly caught for missing endpoint:', error.message);
      }
      return { data: [] }; // Fail gracefully while backend builds it
    }
  },

  /**
   * Get mood board entry by ID
   * GET /api/moodboard/moodboard/{id}/
   */
  getById: async (entryId: string): Promise<ApiResponse<MoodBoardEntry>> => {
    const url = `/api/moodboard/moodboard/${entryId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'GET', url, entryId });
    }
    
    try {
      const response = await apiClient.get<any>(url);
      
      if (__DEV__) {
        console.log('✅ API Response:', { url, status: response.status });
      }
      
      // Handle wrapped response format
      let entry = (response.data as any).data || response.data;
      
      // Transform snake_case to camelCase if needed
      entry = {
        ...entry,
        mainPhotoUri: entry.mainPhotoUri || entry.main_photo_uri,
        stylistPrice: entry.stylistPrice ?? entry.stylist_price,
        hairPrice: entry.hairPrice ?? entry.hair_price,
        stylistLocation: entry.stylistLocation || entry.stylist_location,
        appointmentTime: entry.appointmentTime || entry.appointment_time,
        monthColor: entry.monthColor || entry.month_color,
      };
      
      return { data: entry };
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
   * Create mood board entry
   * POST /api/moodboard/moodboard/
   */
  create: async (entry: MoodBoardEntryCreate): Promise<ApiResponse<MoodBoardEntry>> => {
    const url = '/api/moodboard/moodboard/';
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, entryName: entry.name });
    }
    
    try {
      // Clean the entry: ensure photos is always an array and remove undefined values
      // Handle both camelCase (from interface) and snake_case (from mutation hook transform)
      const cleanEntry: any = {};
      
      // TODO: Replace with real image upload. For now, use placeholder URLs for local file URIs.
      const toValidUrl = (uri: string): string => {
        if (uri && uri.startsWith('file://')) {
          const seed = Math.random().toString(36).substring(2, 8);
          return `https://picsum.photos/seed/${seed}/800/1000`;
        }
        return uri;
      };
      
      // Required fields — accept both camelCase and snake_case keys
      cleanEntry.month = entry.month;
      cleanEntry.name = entry.name;
      const mainPhoto = (entry as any).main_photo_uri || entry.mainPhotoUri;
      cleanEntry.main_photo_uri = toValidUrl(mainPhoto);
      cleanEntry.stylist_price = (entry as any).stylist_price ?? entry.stylistPrice;
      cleanEntry.hair_price = (entry as any).hair_price ?? entry.hairPrice;
      cleanEntry.stylist_location = (entry as any).stylist_location || entry.stylistLocation;
      cleanEntry.appointment_time = (entry as any).appointment_time || entry.appointmentTime;
      
      // Photos must always be an array (even if empty) — convert local URIs to placeholder URLs
      const rawPhotos = Array.isArray(entry.photos) ? entry.photos : [];
      cleanEntry.photos = rawPhotos.map((p: string) => toValidUrl(p));
      
      // Optional fields (only include if they have values)
      const monthColor = (entry as any).month_color || entry.monthColor;
      if (monthColor !== undefined && monthColor !== null) {
        cleanEntry.month_color = monthColor;
      }
      if (entry.notes !== undefined && entry.notes !== null && entry.notes !== '') {
        cleanEntry.notes = entry.notes;
      }
      if (entry.completed !== undefined && entry.completed !== null) {
        cleanEntry.completed = entry.completed;
      }
      
      if (__DEV__) {
        console.log('📤 Sending moodboard entry (cleaned):', {
          original: entry,
          cleaned: cleanEntry,
          photosType: typeof cleanEntry.photos,
          photosIsArray: Array.isArray(cleanEntry.photos),
          photosLength: cleanEntry.photos.length
        });
      }
      
      const response = await apiClient.post<MoodBoardEntry>(url, cleanEntry);
      
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
   * Update mood board entry
   * PATCH /api/moodboard/moodboard/{id}/
   */
  update: async (entryId: string, updates: Partial<MoodBoardEntryCreate>): Promise<ApiResponse<MoodBoardEntry>> => {
    const url = `/api/moodboard/moodboard/${entryId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'PATCH', url, entryId });
    }
    
    try {
      const response = await apiClient.patch<MoodBoardEntry>(url, updates);
      
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
   * Delete mood board entry
   * DELETE /api/moodboard/moodboard/{id}/
   */
  delete: async (entryId: string): Promise<void> => {
    const url = `/api/moodboard/moodboard/${entryId}/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'DELETE', url, entryId });
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
   * Add photo to mood board entry
   * POST /api/hairstyles/moodboard/{id}/photos/
   */
  // Sent to the API as-is, so the keys are the API's snake_case, not the app's.
  addPhoto: async (
    entryId: string,
    photoData: { main_photo_uri?: string; photos?: string[] }
  ): Promise<ApiResponse<MoodBoardEntry>> => {
    const url = `/api/hairstyles/moodboard/${entryId}/photos/`;
    
    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, entryId });
    }
    
    try {
      const response = await apiClient.post<MoodBoardEntry>(url, photoData);
      
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
};

