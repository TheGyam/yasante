import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DIYStoryView } from '@/components/composed/DIYStoryView';
import { mockDIYs } from '@/api/mock/data';

export default function DIYStoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const diy = mockDIYs.find((d) => d.id === id);

  if (!diy) {
    router.back();
    return null;
  }

  const handleClose = () => {
    router.back();
  };

  return <DIYStoryView steps={diy.steps} onClose={handleClose} initialStepIndex={0} />;
}

