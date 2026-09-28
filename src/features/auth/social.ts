import { Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';
import { useAuth } from './AuthContext';
import type { User } from '@/features/profile';

export type Provider = 'apple' | 'google';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** Google needs its client ids in the build; Apple needs an iPhone. */
// Not on iPhone for now: its native Google sign-in is left out of iOS builds
// (package.json expo.autolinking.ios.exclude) while an iOS start-up failure is traced.
export const googleReady = Platform.OS === 'android' && !!GOOGLE_WEB_CLIENT_ID;
export const appleReady = Platform.OS === 'ios';

/** Someone closed the sign-in sheet: not an error, nothing to say. */
export class Cancelled extends Error {}

interface Identity {
  idToken: string;
  name?: string;
  /** Apple's one-time code: lets the server undo the link if the account is deleted. */
  authorizationCode?: string;
}

/** The phone's own "Sign in with Apple" sheet. */
async function fromApple(): Promise<Identity> {
  const Apple = await import('expo-apple-authentication');
  try {
    const credential = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error('Apple sent no token');
    // Apple shares the name once, the first time; the server keeps it.
    const name = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ');
    return {
      idToken: credential.identityToken,
      name: name || undefined,
      authorizationCode: credential.authorizationCode ?? undefined,
    };
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new Cancelled();
    throw error;
  }
}

/** Google's account picker. */
async function fromGoogle(): Promise<Identity> {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await import(
    '@react-native-google-signin/google-signin'
  );
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new Cancelled();
    if (!response.data.idToken) throw new Error('Google sent no token');
    return { idToken: response.data.idToken, name: response.data.user.name ?? undefined };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) throw new Cancelled();
    throw error;
  }
}

interface SocialSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  /** A new account was made just now. */
  created: boolean;
}

/**
 * Sign in (or up) with Apple or Google. Continuing means they're 18 or over and agree
 * to the terms, as the screen says beside the buttons; a new account starts with the
 * role asked for.
 */
export function useSocialSignIn() {
  const { login } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      provider,
      role,
      policyVersion,
    }: {
      provider: Provider;
      role?: 'client' | 'stylist';
      policyVersion: string;
    }) => {
      const identity = provider === 'apple' ? await fromApple() : await fromGoogle();
      const { data } = await apiClient.post<SocialSession>('/api/auth/social/', {
        provider,
        idToken: identity.idToken,
        name: identity.name,
        authorizationCode: identity.authorizationCode,
        role,
        ageConfirmed: true,
        policyVersion,
      });
      return data;
    },
    onSuccess: data => {
      login(data.user, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
