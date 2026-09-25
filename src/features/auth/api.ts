import { apiClient } from '@/shared/lib/api/client';
import { ApiResponse } from '@/shared/types/api';
import { User } from '@/features/profile';
import axios from 'axios';
import { apiConfig } from '@/shared/config/api';

/**
 * Authentication API Service
 *
 * Based on Swagger spec
 * Endpoints:
 * - POST /api/auth/login/ - Authenticate user
 * - POST /api/auth/signup/ - Register new user
 * - POST /api/auth/refresh-token/ - Refresh access token
 * - POST /api/auth/forgot-password/ - Request password reset
 * - POST /api/auth/reset-password/ - Reset password
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  name: string;
  password: string;
  password_confirm: string;
  /** Asked up front; an invite link pre-selects stylist. */
  role: 'client' | 'stylist';
  invite_code?: string;
  /** 18+ confirmed at signup and stored. */
  age_confirmed: true;
  /** The terms and privacy version accepted. */
  policy_version: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  uid: string;
  token: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  user: User;
}

type RefreshedTokens = { accessToken: string; refreshToken?: string; expiresAt: number };

let inFlightRefresh: { token: string; promise: Promise<ApiResponse<RefreshedTokens>> } | undefined;

async function sendRefresh(refreshToken: string): Promise<ApiResponse<RefreshedTokens>> {
  const url = '/api/auth/refresh-token/';
  if (__DEV__) console.log('📡 Refresh Token Request:', { method: 'POST', url });

  try {
    // Its own client: the refresh call must not pass through the 401 interceptor.
    const refreshClient = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await refreshClient.post<any>(url, { refreshToken });
    // A server that rotates refresh tokens sends the new one back; the old is revoked.
    const data: RefreshedTokens = response.data?.data ?? response.data;
    if (!data?.accessToken) throw new Error('Refresh token response missing accessToken');
    if (__DEV__) console.log('✅ Refresh Token Success');
    return { data };
  } catch (error: any) {
    if (__DEV__) {
      // Refused means the session is over (expired, revoked, or from another server):
      // she signs in again. That's routine, not an error worth a red screen.
      if (error.response?.status === 401) {
        console.log('🔒 Session ended, sign in again:', error.response?.data?.message);
      } else {
        console.error('❌ Refresh Token Error:', {
          url,
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
    }
    throw error;
  }
}

export const authApi = {
  /**
   * Login - Authenticate user and return JWT tokens
   * POST /api/auth/login/
   */
  login: async (credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const url = '/api/auth/login/';

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, email: credentials.email });
    }

    try {
      // Backend returns AuthResponse format: { user, accessToken, refreshToken, expiresAt }
      const response = await apiClient.post<any>(url, credentials);

      if (__DEV__) {
        console.log('✅ API Response (raw):', {
          url,
          status: response.status,
          responseData: response.data,
          responseDataType: typeof response.data,
          hasUser: !!response.data?.user,
          hasAccessToken: !!response.data?.accessToken,
          hasRefreshToken: !!response.data?.refreshToken,
          keys: response.data ? Object.keys(response.data) : [],
        });
      }

      // Handle different response formats
      let authData: AuthResponse;

      // If response.data is already the AuthResponse format
      if (response.data?.user && response.data?.accessToken) {
        authData = response.data;
      }
      // If response.data is wrapped in a 'data' field
      else if (response.data?.data?.user && response.data?.data?.accessToken) {
        authData = response.data.data;
      }
      // If response.data is just a User (backend might return user only)
      else if (response.data?.id && response.data?.email && !response.data?.accessToken) {
        // Backend might return only user - this shouldn't happen but handle gracefully
        throw new Error(
          'Backend returned user without tokens. Please check backend implementation.'
        );
      } else {
        throw new Error(`Invalid login response format: ${JSON.stringify(response.data)}`);
      }

      if (!authData.user || !authData.accessToken || !authData.refreshToken) {
        throw new Error('Invalid login response: missing required fields');
      }

      return { data: authData };
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
   * Signup - Register new user and return JWT tokens
   * POST /api/auth/signup/
   */
  signup: async (userData: SignupRequest): Promise<ApiResponse<AuthResponse>> => {
    const url = '/api/auth/signup/';

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, role: userData.role });
    }

    try {
      // Backend returns AuthResponse format: { user, accessToken, refreshToken, expiresAt }
      const response = await apiClient.post<any>(url, userData);

      if (__DEV__) {
        console.log('✅ API Response (raw):', {
          url,
          status: response.status,
          responseData: response.data,
          responseDataType: typeof response.data,
          hasUser: !!response.data?.user,
          hasAccessToken: !!response.data?.accessToken,
          hasRefreshToken: !!response.data?.refreshToken,
          keys: response.data ? Object.keys(response.data) : [],
        });
      }

      // Handle different response formats
      let authData: AuthResponse;

      // If response.data is already the AuthResponse format
      if (response.data?.user && response.data?.accessToken) {
        authData = response.data;
      }
      // If response.data is wrapped in a 'data' field
      else if (response.data?.data?.user && response.data?.data?.accessToken) {
        authData = response.data.data;
      }
      // If response.data is just a User (backend might return user only)
      else if (response.data?.id && response.data?.email && !response.data?.accessToken) {
        // Backend might return only user - this shouldn't happen but handle gracefully
        throw new Error(
          'Backend returned user without tokens. Please check backend implementation.'
        );
      } else {
        throw new Error(`Invalid signup response format: ${JSON.stringify(response.data)}`);
      }

      if (!authData.user || !authData.accessToken || !authData.refreshToken) {
        throw new Error('Invalid signup response: missing required fields');
      }

      return { data: authData };
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ API Error:', {
          url,
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
          requestPayload: userData,
        });
      }
      throw error;
    }
  },

  /**
   * Refresh Token - Get new access token using refresh token
   * POST /api/auth/refresh-token/
   */
  refreshToken: (refreshToken: string): Promise<ApiResponse<RefreshedTokens>> => {
    // One refresh per token. The server accepts a refresh token once and revokes it,
    // so a second caller sending the same one (start-up's check and a 401 retry, say)
    // would be refused and sign her out. It waits for the first answer instead.
    if (inFlightRefresh?.token !== refreshToken) {
      const promise = sendRefresh(refreshToken).finally(() => {
        if (inFlightRefresh?.promise === promise) inFlightRefresh = undefined;
      });
      inFlightRefresh = { token: refreshToken, promise };
    }
    return inFlightRefresh.promise;
  },

  /**
   * Forgot Password - Request password reset email
   * POST /api/auth/forgot-password/
   */
  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    const url = '/api/auth/forgot-password/';

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url, email });
    }

    try {
      const response = await apiClient.post<{ message: string }>(url, { email });

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
   * Reset Password - Reset password using token
   * POST /api/auth/reset-password/
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> => {
    const url = '/api/auth/reset-password/';

    if (__DEV__) {
      console.log('📡 API Request:', { method: 'POST', url });
    }

    try {
      const response = await apiClient.post<{ message: string }>(url, data);

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
};
