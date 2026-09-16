import React, { useState, useEffect, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { ImageWithPlaceholder } from '@/shared/ui/ImageWithPlaceholder';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { Theme } from '@/shared/theme/ThemeProvider';

const CardContainer = styled.View`
  width: 100%;
  aspect-ratio: 0.75;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.large}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  overflow: hidden;
  elevation: 4;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
`;

const CardContent = styled.View`
  flex: 1;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  justify-content: space-between;
`;

const StepNumber = styled.View`
  align-self: flex-start;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const ImageContainer = styled.View`
  width: 100%;
  height: 200px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const StepIndicator = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const Dot = styled.View<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme, active }: { theme: Theme; active: boolean }) =>
    active ? theme.colors.primary : theme.colors.border};
`;

export interface FlashcardStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  imageUri?: string;
}

export interface SwipeableFlashcardProps {
  steps: FlashcardStep[];
  onStepChange?: (stepIndex: number) => void;
  parentScrollRef?: React.RefObject<any>;
}

export function SwipeableFlashcard({
  steps,
  onStepChange,
  parentScrollRef,
}: SwipeableFlashcardProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  // Safety: ensure steps array exists and has items
  const safeSteps = steps || [];
  const maxIndex = Math.max(0, safeSteps.length - 1);

  // Clamp initial index
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = currentStepIndex;

  // Track if component is mounted to prevent state updates after unmount
  const mounted = useRef(true);
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const currentIndex = useSharedValue(0); // UI-thread authoritative index

  // Keep React state and shared value in sync
  useEffect(() => {
    currentIndex.value = currentStepIndex;
  }, [currentStepIndex]);

  // Safe index getter (for rendering)
  const safeIndex = Math.max(0, Math.min(currentStepIndex, maxIndex));
  const currentStep = safeSteps[safeIndex];

  // Helper to set React state from UI thread
  const setIndexOnJS = (newIndex: number) => {
    if (!mounted.current) return;
    const safe = Math.max(0, Math.min(newIndex, maxIndex));
    setCurrentStepIndex(safe);
    onStepChange?.(safe);
  };

  // Function to animate card transition (called from JS thread)
  const animateTransition = (direction: 'next' | 'prev', newIndex: number) => {
    if (!mounted.current) return;

    // Update shared value immediately
    currentIndex.value = newIndex;

    // Update React state
    setIndexOnJS(newIndex);

    // Start new card from opposite side and animate in quickly
    const fastSpring = { stiffness: 500, damping: 65 };
    if (direction === 'next') {
      translateX.value = width;
    } else {
      translateX.value = -width;
    }
    opacity.value = 0.95; // Less dramatic fade

    // Animate new card in quickly
    translateX.value = withSpring(0, fastSpring);
    opacity.value = withSpring(1, { duration: 100 });
  };

  // Gesture handler - all clamp logic inlined using Math.min/Math.max
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      // Minimal scale effect
      cardScale.value = withSpring(0.99, { stiffness: 400, damping: 60 });
    })
    .onUpdate(event => {
      translateX.value = event.translationX;
      // Very subtle opacity change - no glaring fade
      opacity.value = Math.max(0.85, 1 - Math.abs(event.translationX) / (width * 1.5));
    })
    .onEnd(event => {
      const threshold = 60; // Lower threshold for quicker response
      const velocity = event.velocityX;

      // Reset scale quickly
      cardScale.value = withSpring(1, { stiffness: 500, damping: 65 });

      // Faster spring config with higher damping to reduce bounce
      const fastSpring = { stiffness: 500, damping: 65 };

      // Check velocity first for quick swipes
      if (Math.abs(velocity) > 600) {
        if (velocity < -600) {
          // Swipe left -> next step
          const candidate = currentIndex.value + 1;
          const next = Math.min(candidate, maxIndex);
          if (next !== currentIndex.value) {
            // Update index immediately for instant transition
            currentIndex.value = next;
            runOnJS(setIndexOnJS)(next);
            // Start new card from right and slide in
            translateX.value = width;
            translateX.value = withSpring(0, fastSpring);
            opacity.value = 1; // Keep full opacity
          } else {
            // Already at last step, snap back quickly
            translateX.value = withSpring(0, fastSpring);
            opacity.value = 1;
          }
          return;
        } else if (velocity > 600) {
          // Swipe right -> previous step
          const candidate = currentIndex.value - 1;
          const prev = Math.max(candidate, 0);
          if (prev !== currentIndex.value) {
            // Update index immediately for instant transition
            currentIndex.value = prev;
            runOnJS(setIndexOnJS)(prev);
            // Start new card from left and slide in
            translateX.value = -width;
            translateX.value = withSpring(0, fastSpring);
            opacity.value = 1; // Keep full opacity
          } else {
            // Already at first step, snap back quickly
            translateX.value = withSpring(0, fastSpring);
            opacity.value = 1;
          }
          return;
        }
      }

      // Check translation distance
      if (event.translationX < -threshold) {
        // Swipe left -> next step
        const candidate = currentIndex.value + 1;
        const next = Math.min(candidate, maxIndex);
        if (next !== currentIndex.value) {
          // Update index immediately for instant transition
          currentIndex.value = next;
          runOnJS(setIndexOnJS)(next);
          // Start new card from right and slide in
          translateX.value = width;
          translateX.value = withSpring(0, fastSpring);
          opacity.value = 1; // Keep full opacity
        } else {
          // Already at last step, snap back quickly
          translateX.value = withSpring(0, fastSpring);
          opacity.value = 1;
        }
      } else if (event.translationX > threshold) {
        // Swipe right -> previous step
        const candidate = currentIndex.value - 1;
        const prev = Math.max(candidate, 0);
        if (prev !== currentIndex.value) {
          // Update index immediately for instant transition
          currentIndex.value = prev;
          runOnJS(setIndexOnJS)(prev);
          // Start new card from left and slide in
          translateX.value = -width;
          translateX.value = withSpring(0, fastSpring);
          opacity.value = 1; // Keep full opacity
        } else {
          // Already at first step, snap back quickly
          translateX.value = withSpring(0, fastSpring);
          opacity.value = 1;
        }
      } else {
        // Not enough movement -> snap back quickly
        translateX.value = withSpring(0, fastSpring);
        opacity.value = 1;
      }
    });

  // Safety: clamp displayed index if content changes
  useEffect(() => {
    const safe = Math.max(0, Math.min(currentStepIndex, maxIndex));
    if (safe !== currentStepIndex && mounted.current) {
      setCurrentStepIndex(safe);
      currentIndex.value = safe;
    }
  }, [safeSteps.length, currentStepIndex, maxIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: cardScale.value }],
    opacity: opacity.value,
  }));

  // Safe fallback if no step available
  if (!currentStep || safeSteps.length === 0) {
    return (
      <CardContainer>
        <CardContent>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="body" color={theme.colors.text.medium}>
              No steps available.
            </Text>
          </View>
        </CardContent>
      </CardContainer>
    );
  }

  return (
    <View style={{ width: '100%' }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ width: '100%' }, animatedStyle]}>
          <CardContainer>
            <CardContent>
              <View>
                <StepNumber>
                  <Text variant="caption" weight="semibold" color="#fff">
                    Step {currentStep.stepNumber} of {safeSteps.length}
                  </Text>
                </StepNumber>
                <Text
                  variant="h3"
                  weight="bold"
                  color={theme.colors.text.high}
                  style={{ marginBottom: theme.spacing[2] }}
                >
                  {currentStep.title}
                </Text>
                {currentStep.imageUri && (
                  <ImageContainer>
                    <ImageWithPlaceholder
                      source={{ uri: currentStep.imageUri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </ImageContainer>
                )}
                <Text variant="body" color={theme.colors.text.high}>
                  {currentStep.description}
                </Text>
              </View>
              <StepIndicator>
                {safeSteps.map((_, index) => (
                  <Dot key={index} active={index === safeIndex} />
                ))}
              </StepIndicator>
            </CardContent>
          </CardContainer>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
