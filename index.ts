// First: the start-up checkpoints, so even a launch that stops early is seen.
import { checkpoint } from './src/boot';

// The app, loaded in a way that lets a failure while loading be reported by name.
try {
  require('expo-router/entry');
  checkpoint('entry loaded');
} catch (error) {
  const e = error instanceof Error ? error : new Error(String(error));
  checkpoint(
    `entry threw: ${e.message} @ ${(e.stack ?? '').split('\n').slice(0, 6).join(' | ')}`.slice(
      0,
      480
    )
  );
  throw error;
}
