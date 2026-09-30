import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/shared/lib/api';
import { reportError } from '@/shared/lib/crashReport';

// expo-notifications needs a development build; in Expo Go it's absent.
let Notifications: typeof import('expo-notifications') | null = null;
let requestPermissions: () => Promise<boolean> = async () => false;
try {
  Notifications = require('expo-notifications');
  requestPermissions = require('@/shared/lib/notificationService').requestNotificationPermissions;
} catch {
  Notifications = null;
}

/** Asks once per launch; everyone who needs the answer waits on the same prompt. */
let asked: Promise<boolean> | undefined;
export const askPermission = () => (asked ??= requestPermissions().catch(() => false));

// The server's id for this phone's token, so signing out can remove it.
const DEVICE_KEY = 'yasante.push.device';

/**
 * Tell the server where to send this account's notifications. Quietly does nothing
 * without permission, in Expo Go, or when push isn't set up for the build.
 */
export async function registerPush(): Promise<void> {
  if (!Notifications || Platform.OS === 'web') return;
  try {
    if (!(await askPermission())) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { data } = await apiClient.post<{ id: string }>('/api/devices/', {
      token,
      platform: Platform.OS,
    });
    await AsyncStorage.setItem(DEVICE_KEY, data.id);
  } catch (error) {
    if (__DEV__) console.warn('Push registration skipped:', error);
    // A phone that can't register never gets a notification, and nobody would know:
    // tell the server, so it shows on the staff Errors page.
    else
      reportError(error, {
        context: {
          where: 'push registration',
          projectId: !!Constants.expoConfig?.extra?.eas?.projectId,
        },
      });
  }
}

/** Stop notifications to this phone. Call while still signed in. */
export async function unregisterPush(): Promise<void> {
  const id = await AsyncStorage.getItem(DEVICE_KEY).catch(() => null);
  if (!id) return;
  await AsyncStorage.removeItem(DEVICE_KEY).catch(() => {});
  await apiClient.delete(`/api/devices/${id}/`).catch(() => {});
}
