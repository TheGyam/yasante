import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiConfig, validateApiConfig } from '@/shared/config/api';
import { offlineQueue } from './offlineQueue';

/**
 * The client needs tokens, but shared/ must not depend on the auth feature.
 * So auth registers itself here at startup instead (see features/auth/AuthContext).
 * This also removes the circular dependency the old lazy require worked around.
 */
export interface AuthBridge {
  /** Settles once saved tokens are back in memory; requests wait for it. */
  ready: () => Promise<void>;
  getAccessToken: () => string | undefined;
  getRefreshToken: () => string | undefined;
  getUserId: () => string | undefined;
  /** When the access token runs out, in ms; unknown for sessions saved before it was kept. */
  getExpiresAt?: () => number | undefined;
  setTokens: (tokens: { accessToken: string; refreshToken?: string; expiresAt: number }) => void;
  refresh: (
    refreshToken: string
  ) => Promise<{ accessToken: string; refreshToken?: string; expiresAt: number | string }>;
  logout: () => void;
}

let authBridge: AuthBridge | null = null;

export const setAuthBridge = (bridge: AuthBridge) => {
  authBridge = bridge;
};

// Validate API configuration on module load
validateApiConfig();

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  // Axios will automatically serialize objects to JSON when Content-Type is application/json
});

// Request interceptor
apiClient.interceptors.request.use(
  async config => {
    // Screens fetch on mount, which can beat reading the saved sign-in back.
    await authBridge?.ready();
    // Back after a while, the access token has run out: renew it once before sending,
    // rather than let every request on the screen be refused first.
    const expiresAt = authBridge?.getExpiresAt?.();
    if (expiresAt && Date.now() > expiresAt - 5000 && authBridge?.getRefreshToken()) {
      await renew().catch(() => {});
    }
    // Add auth token if available
    const accessToken = authBridge?.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Ensure Content-Type is set for POST/PUT/PATCH requests with data
    if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

/** A new access token from the refresh token; concurrent callers share one request. */
async function renew() {
  const bridge = authBridge!;
  const { accessToken, refreshToken, expiresAt } = await bridge.refresh(bridge.getRefreshToken()!);
  bridge.setTokens({
    accessToken,
    refreshToken,
    expiresAt: typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt,
  });
  return accessToken;
}

// Response interceptor
let isRefreshing = false;
let failedQueue: {
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Sent with a token that has since been renewed: just send it again.
    const current = authBridge?.getAccessToken();
    const sentWith = String(originalRequest?.headers?.Authorization ?? '').replace('Bearer ', '');
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      current &&
      sentWith &&
      sentWith !== current
    ) {
      originalRequest._retry = true;
      originalRequest.headers.Authorization = `Bearer ${current}`;
      return apiClient(originalRequest);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = authBridge?.getRefreshToken();
      if (refreshToken) {
        try {
          const {
            accessToken,
            refreshToken: rotated,
            expiresAt,
          } = await authBridge!.refresh(refreshToken);

          // Convert expiresAt string to timestamp if needed
          const expiresAtTimestamp =
            typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;

          authBridge!.setTokens({
            accessToken,
            refreshToken: rotated,
            expiresAt: expiresAtTimestamp,
          });

          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          processQueue(null, accessToken);
          isRefreshing = false;

          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          // Only a refusal ends the session; no answer (offline) keeps her signed in.
          if ((refreshError as AxiosError)?.response) authBridge?.logout();
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token: sign out, and settle everything queued behind this
        // request. Leaving the flag set would park every later 401 forever, and
        // anything awaiting those requests would never finish.
        processQueue(error, null);
        isRefreshing = false;
        authBridge?.logout();
        return Promise.reject(error);
      }
    }

    // Handle other errors globally
    if (error.response) {
      // Server responded with error
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
    } else if (error.request) {
      // Request made but no response - network error (offline)
      // Queue mutation if it's a POST/PUT/PATCH/DELETE request
      const method = originalRequest?.method?.toLowerCase();
      if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
        // Extract mutation type from URL
        const url = originalRequest?.url || '';
        let mutationType = 'unknown';
        let params: any = {};

        // Map common endpoints to mutation types
        if (url.includes('/favorites/toggle')) {
          mutationType = 'toggleFavorite';
          params = {
            userId: authBridge?.getUserId(),
            contentId: originalRequest?.data?.contentId || originalRequest?.params?.contentId,
          };
        } else if (url.includes('/goals/')) {
          if (method === 'post') {
            mutationType = 'createGoal';
            params = {
              userId: authBridge?.getUserId(),
              data: originalRequest?.data,
            };
          } else if (method === 'patch') {
            mutationType = 'updateGoal';
            const goalId = url.match(/\/goals\/([^/]+)/)?.[1];
            params = {
              userId: authBridge?.getUserId(),
              goalId,
              data: originalRequest?.data,
            };
          } else if (method === 'delete') {
            mutationType = 'deleteGoal';
            const goalId = url.match(/\/goals\/([^/]+)/)?.[1];
            params = {
              userId: authBridge?.getUserId(),
              goalId,
            };
          }
        }

        // Queue the mutation if we identified the type
        if (mutationType !== 'unknown' && params.userId) {
          offlineQueue.enqueue(mutationType, params).catch(queueError => {
            if (__DEV__) {
              console.error('Failed to queue mutation:', queueError);
            }
          });
        }
      }

      if (__DEV__) {
        console.error('Network Error (offline):', {
          message: 'No response received from server',
          url: error.config?.url,
          baseURL: error.config?.baseURL,
        });
      }
    } else {
      // Something else happened
      if (__DEV__) {
        console.error('Error:', error.message);
      }
    }
    return Promise.reject(error);
  }
);

// API exports are now in ./index.ts to avoid circular dependency
// Import from './index' instead of './client' for the api object

export default apiClient;
