import { api } from '@/shared/lib/api/client';
import type { AuthResponse, CodeSent, LoginRequest, SignupRequest, User } from './types';

export const authApi = {
  signup: (body: SignupRequest) => api.post<AuthResponse>('/auth/signup/', body),
  login: (body: LoginRequest) => api.post<AuthResponse>('/auth/login/', body),
  /** Emails a six-digit code to her address. */
  startEmail: () => api.post<CodeSent>('/auth/email/start/'),
  /** The account, with the email confirmed. */
  verifyEmail: (code: string) => api.post<User>('/auth/email/verify/', { code }),
  /** Emails a reset link if the address has an account. The same answer either way. */
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password/', { email }),
  /** The one-time token from the emailed link. Every session on the account ends. */
  resetPassword: (body: { uid: string; token: string; password: string }) =>
    api.post<{ message: string }>('/auth/reset-password/', body),
  /** Ends this session on the server too, so the tokens can't be reused. */
  logout: (refreshToken: string) => api.post<void>('/auth/logout/', { refreshToken }),
};
