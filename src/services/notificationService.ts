import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5e1d31',
    });
  }

  return true;
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  content: NotificationContent,
  trigger: Date | number
): Promise<string> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    throw new Error('Notification permission not granted');
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: content.data,
      sound: true,
    },
    trigger: typeof trigger === 'number' ? trigger : trigger,
  });

  return notificationId;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Schedule a routine reminder
 */
export async function scheduleRoutineReminder(
  routineName: string,
  scheduledDate: Date,
  reminderMinutes: number = 30
): Promise<string> {
  const reminderDate = new Date(scheduledDate.getTime() - reminderMinutes * 60 * 1000);
  
  return await scheduleNotification(
    {
      title: 'Routine Reminder',
      body: `${routineName} is scheduled in ${reminderMinutes} minutes`,
      data: { type: 'routine', date: scheduledDate.toISOString() },
    },
    reminderDate
  );
}

