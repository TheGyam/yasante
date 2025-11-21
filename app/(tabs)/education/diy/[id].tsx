import React, { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { DIYStoryView } from '@/components/composed/DIYStoryView';
import { mockDIYs } from '@/api/mock/data';

export default function DIYStoryScreen() {
  const params = useLocalSearchParams<{ id: string; returnTo?: string; query?: string }>();
  const { id, returnTo, query } = params;
  const router = useRouter();
  const navigation = useNavigation();

  const diy = mockDIYs.find((d) => d.id === id);

  if (!diy) {
    // If we came from search, navigate back to search screen
    if (returnTo === 'search') {
      router.replace('/(tabs)/home/search' as any);
    } else {
      router.back();
    }
    return null;
  }

  const isNavigatingRef = useRef(false);

  const handleClose = () => {
    // If we came from search, navigate back to search screen with preserved query
    // Use replace to avoid stack buildup - replaces current screen with search
    if (returnTo === 'search') {
      isNavigatingRef.current = true;
      const queryParam = query ? `?query=${encodeURIComponent(query)}` : '';
      router.replace(`/(tabs)/home/search${queryParam}` as any);
    } else {
      router.back();
    }
  };

  // Intercept gesture navigation (swipe back) and swipe down to ensure proper navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only intercept if we came from search and we're not already navigating
      if (returnTo === 'search' && !isNavigatingRef.current) {
        // Only intercept actual back actions (POP, not our own navigation)
        if (e.data.action.type === 'POP' || e.data.action.type === 'GO_BACK') {
          // Prevent default behavior
          e.preventDefault();
          // Set flag to prevent re-entry
          isNavigatingRef.current = true;
          // Navigate to search with preserved query
          const queryParam = query ? `?query=${encodeURIComponent(query)}` : '';
          router.replace(`/(tabs)/home/search${queryParam}` as any);
        }
      }
    });

    return unsubscribe;
  }, [navigation, returnTo, router, query]);

  return <DIYStoryView steps={diy.steps} onClose={handleClose} initialStepIndex={0} />;
}

