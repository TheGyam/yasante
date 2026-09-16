import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function DIYStoryScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { returnTo } = params;
  const router = useRouter();

  // DIYs not yet implemented in backend
  // Navigate back since we don't have DIY data
  useEffect(() => {
    if (returnTo === 'search') {
      router.replace('/(tabs)/home/search' as any);
    } else {
      router.back();
    }
  }, [returnTo, router]);

  return null;
}
