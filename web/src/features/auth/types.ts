import type { Schemas } from '@/shared/lib/api/types';

export type AuthResponse = Schemas['AuthResponse'];
export type User = Schemas['UserResponse'];
export type SignupRequest = Schemas['SignupRequest'];
export type LoginRequest = Schemas['LoginRequest'];
export type CodeSent = Schemas['CodeSent'];
export type TokenPair = Schemas['TokenPair'];

/** Who's signed in on this tab, and the tokens that prove it. */
export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}
