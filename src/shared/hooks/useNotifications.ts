import { useEffect, useRef } from 'react';

// Conditionally import expo-notifications
let Notifications: any;
let requestNotificationPermissions: any;

try {
  Notifications = require('expo-notifications');
  const notificationService = require('@/shared/lib/notificationService');
  requestNotificationPermissions = notificationService.requestNotificationPermissions;
} catch (e) {
  // Notifications not available
  Notifications = null;
  requestNotificationPermissions = async () => false;
}

export function useNotifications() {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!Notifications) {
      // Notifications not available (requires dev build)
      return;
    }

    // Request permissions on mount
    requestNotificationPermissions().catch(() => {
      // Permissions not available
    });

    try {
      // Handle notifications received while app is foregrounded
      notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('Notification received:', notification);
      });

      // Handle user tapping on notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log('Notification response:', response);
        // Handle navigation based on notification data
        const data = response.notification.request.content.data;
        // Navigate based on data.type, data.id, etc.
      });
    } catch (e) {
      // Notifications not available
    }

    return () => {
      if (Notifications && notificationListener.current) {
        try {
          Notifications.removeNotificationSubscription(notificationListener.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (Notifications && responseListener.current) {
        try {
          Notifications.removeNotificationSubscription(responseListener.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    // Expose any notification-related functions if needed
  };
}

