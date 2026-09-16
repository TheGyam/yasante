import { AccessibilityInfo } from 'react-native';
import { useState, useEffect } from 'react';

/**
 * Fallback hook for useReducedMotion
 * React Native 0.81.5 doesn't have useReducedMotion, so we check AccessibilityInfo instead
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check if reduce motion is enabled
    AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        setReduceMotion(isEnabled);
      })
      .catch(() => {
        // If not available, default to false
        setReduceMotion(false);
      });

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
      setReduceMotion(isEnabled);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}

