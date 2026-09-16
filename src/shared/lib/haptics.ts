import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Semantic haptics. One per user action, fired at the moment it commits, and never
 * the only feedback — many devices have haptics off or can't produce them.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const ignore = () => {};

export const haptics = {
  /** A value ticked past a step: tab, segment, chip, picker detent. */
  selection: () => {
    if (supported) Haptics.selectionAsync().catch(ignore);
  },
  /** Something snapped into place, or a primary action committed. */
  light: () => {
    if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
  },
  /** A destructive or weighty action. */
  medium: () => {
    if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore);
  },
  success: () => {
    if (supported)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
  },
  error: () => {
    if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(ignore);
  },
} as const;

export type HapticKind = keyof typeof haptics;
