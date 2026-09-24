import { useEffect, useRef } from 'react';
import { askPermission } from '@/shared/lib/push';

// expo-notifications needs a development build; in Expo Go it's absent.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

/** What the server puts in a notification's data, so a tap can open the right place. */
export interface NotificationTarget {
  /** Which side of the app it belongs to: a booking request opens stylist mode. */
  mode?: 'client' | 'stylist';
  /** The route to open, e.g. `/requests`. */
  url?: string;
  /** The booking it's about, for notifications with answer buttons. */
  bookingId?: string;
  /** Which button was pressed, when the notification has buttons and one was. */
  action?: string;
}

/** Buttons a notification can carry, registered under a category the server names. */
export interface NotificationCategory {
  id: string;
  actions: { id: string; title: string }[];
}

/**
 * Asks for permission, registers the answer buttons notifications can carry, and
 * hands every tapped notification's target to `onOpen` — including the one that
 * launched the app, and which button was pressed.
 */
export function useNotifications(
  onOpen: (target: NotificationTarget) => void,
  categories: NotificationCategory[] = []
) {
  const handler = useRef(onOpen);
  handler.current = onOpen;
  const registered = useRef(categories);

  useEffect(() => {
    if (!Notifications) return;
    const api = Notifications;
    askPermission();

    for (const category of registered.current) {
      api
        .setNotificationCategoryAsync(
          category.id,
          // Every answer opens the app, so it's handled by code that's running and signed in.
          category.actions.map(action => ({
            identifier: action.id,
            buttonTitle: action.title,
            options: { opensAppToForeground: true },
          }))
        )
        .catch(() => {});
    }

    const open = (response: {
      actionIdentifier: string;
      notification: { request: { content: { data: unknown } } };
    }) => {
      const data = (response.notification.request.content.data ?? {}) as NotificationTarget;
      const pressed =
        response.actionIdentifier === api.DEFAULT_ACTION_IDENTIFIER
          ? undefined
          : response.actionIdentifier;
      handler.current({ ...data, action: pressed });
    };

    api
      .getLastNotificationResponseAsync()
      .then(response => response && open(response))
      .catch(() => {});
    const subscription = api.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
