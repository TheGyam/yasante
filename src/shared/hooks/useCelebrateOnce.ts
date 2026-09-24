import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'yasante.celebrated';
let seen: Promise<Set<string>> | undefined;
const load = () =>
  (seen ??= AsyncStorage.getItem(KEY)
    .then(raw => new Set<string>(raw ? JSON.parse(raw) : []))
    .catch(() => new Set<string>()));

/**
 * True once, the first time `id` reaches `when` on this phone: a celebration that
 * happens at the moment it's earned and never again on the same thing.
 */
export function useCelebrateOnce(id: string | undefined, when: boolean) {
  const [fire, setFire] = useState(false);
  useEffect(() => {
    if (!id || !when) return;
    let live = true;
    load().then(set => {
      if (!live || set.has(id)) return;
      set.add(id);
      // Only the most recent hundred: it's a courtesy, not a record.
      AsyncStorage.setItem(KEY, JSON.stringify([...set].slice(-100))).catch(() => {});
      setFire(true);
    });
    return () => {
      live = false;
    };
  }, [id, when]);
  return fire;
}
