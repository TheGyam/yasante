import { useEffect, useRef } from 'react';

// expo-notifications needs a development build; in Expo Go it's absent.
let Notifications: typeof import('expo-notifications') | null = null;
let requestPermissions: () => Promise<boolean> = async () => false;
try {
  Notifications = require('expo-notifications');
  requestPermissions = require('@/shared/lib/notificationService').requestNotificationPermissions;
} catch {
  Notifications = null;
}

/** What the server puts in a notification's data, so a tap can open the right place. */
export interface NotificationTarget {
  /** Which side of the app it belongs to: a booking request opens stylist mode. */
  mode?: 'client' | 'stylist';
  /** The route to open, e.g. `/requests`. */
  url?: string;
}

/**
 * Asks for permission and hands every tapped notification's target to `onOpen`,
 * including the one that launched the app.
 */
export function useNotifications(onOpen: (target: NotificationTarget) => void) {
  const handler = useRef(onOpen);
  handler.current = onOpen;

  useEffect(() => {
    if (!Notifications) return;
    requestPermissions().catch(() => {});

    const open = (response: { notification: { request: { content: { data: unknown } } } }) =>
      handler.current((response.notification.request.content.data ?? {}) as NotificationTarget);

    Notifications.getLastNotificationResponseAsync()
      .then(response => response && open(response))
      .catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
