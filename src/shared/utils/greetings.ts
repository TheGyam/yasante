import AsyncStorage from '@react-native-async-storage/async-storage';

const GREETINGS = [
  'Hey, glow-getter',
  'Looking fabulous today — same vibes!',
  'Hair goals loading...',
  'Top of the hair, top of the world.',
  'Ready to slay today?',
  'Crown check — looking iconic.',
];

const STORAGE_KEY = '@yasante:lastGreetingIndex';

/**
 * Gets the next greeting in rotation, persisting the index
 */
export async function getNextGreeting(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lastIndex = raw ? parseInt(raw, 10) : -1;
    const nextIndex = (lastIndex + 1) % GREETINGS.length;

    await AsyncStorage.setItem(STORAGE_KEY, String(nextIndex));
    return GREETINGS[nextIndex];
  } catch (error) {
    // Fallback to first greeting if storage fails
    console.warn('Failed to get next greeting:', error);
    return GREETINGS[0];
  }
}

/**
 * Gets a time-of-day appropriate greeting prefix
 */
export function getTimeOfDayPrefix(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning, ';
  } else if (hour < 17) {
    return 'Afternoon, ';
  } else {
    return 'Evening, ';
  }
}
