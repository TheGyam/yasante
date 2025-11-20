import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPromptModal } from './AuthPromptModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  feature?: 'moodboard' | 'favorites' | 'profile' | 'general';
  redirectTo?: string;
}

export function ProtectedRoute({ children, feature = 'general', redirectTo }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [showPrompt, setShowPrompt] = React.useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (redirectTo) {
        router.replace(redirectTo as any);
      } else {
        setShowPrompt(true);
      }
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return (
      <>
        {children}
        <AuthPromptModal
          visible={showPrompt}
          onClose={() => setShowPrompt(false)}
          feature={feature}
        />
      </>
    );
  }

  return <>{children}</>;
}

