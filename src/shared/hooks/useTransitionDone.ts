import { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * False while the screen is still sliding in, then true. Heavy content (a photo
 * grid, a long list) can wait for it, so the slide carries only the header and
 * stays smooth. Falls back to true shortly after, in case no transition runs.
 */
export function useTransitionDone(fallbackMs = 450) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [done, setDone] = useState(false);
  useEffect(() => {
    const unsubscribe = navigation.addListener('transitionEnd', event => {
      if (!event.data?.closing) setDone(true);
    });
    const fallback = setTimeout(() => setDone(true), fallbackMs);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigation, fallbackMs]);
  return done;
}
