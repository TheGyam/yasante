import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, useWindowDimensions, StatusBar } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageWithPlaceholder } from '../ui/ImageWithPlaceholder';
import { Text } from '../ui/Text';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { Theme } from '@/theme/ThemeProvider';
import type { FlashcardStep } from './SwipeableFlashcard';

const Container = styled(Animated.View)`
  flex: 1;
  background-color: transparent;
`;

const ImageContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const AnimatedImageContainer = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const ProgressContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  flex-direction: row;
  gap: 4px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding-top: ${({ topInset }: { topInset: number }) => topInset + 8}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  z-index: 10;
`;

const ProgressBar = styled.View<{ active: boolean }>`
  flex: 1;
  height: 3px;
  background-color: ${({ active, theme }: { active: boolean; theme: Theme }) =>
    active ? '#fff' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 2px;
`;

const TextOverlay = styled(Animated.View)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ bottomInset }: { bottomInset: number }) => bottomInset + 16}px;
  z-index: 15;
`;

const StepTitle = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const StepDescription = styled(Text)`
  line-height: 22px;
`;

const TapZone = styled(TouchableOpacity)`
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 25;
`;

export interface DIYStoryViewProps {
  steps: FlashcardStep[];
  onClose: () => void;
  initialStepIndex?: number;
}

export function DIYStoryView({ steps, onClose, initialStepIndex = 0 }: DIYStoryViewProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentStepIndex, setCurrentStepIndex] = useState(
    Math.max(0, Math.min(initialStepIndex, steps.length - 1))
  );

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const previousOpacity = useSharedValue(1);
  const previousStepIndex = useRef(currentStepIndex);
  
  // Swipe down to close
  const translateY = useSharedValue(0);

  const currentStep = steps[currentStepIndex];
  const previousStep = steps[previousStepIndex.current];

  // Animate step change with smooth cross-fade
  useEffect(() => {
    // Only animate if step actually changed and we're not closing
    if (previousStepIndex.current !== currentStepIndex && !isClosing.value) {
      // Reset swipe down position if user was swiping
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
  
      // Fade out previous image
      previousOpacity.value = withTiming(0, { duration: 200 });
      
      // Start new image slightly visible and fade in smoothly (no blink)
      opacity.value = 0.4;
      scale.value = 0.99;
      
      // Smooth cross-fade - new image fades in while old fades out
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withTiming(1, { duration: 300 });
      
      // Reset previous opacity after transition completes
      const timer = setTimeout(() => {
        previousOpacity.value = 1;
      }, 300);
      
      previousStepIndex.current = currentStepIndex;
      
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex]);

  // Track if we're closing to prevent image flicker
  const isClosing = useSharedValue(false);

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: isClosing.value ? 0 : opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedPreviousImageStyle = useAnimatedStyle(() => ({
    opacity: isClosing.value ? 0 : previousOpacity.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: isClosing.value ? 0 : opacity.value,
  }));

  // Swipe down gesture handler - only activates on significant downward movement
  // Make it fail on quick taps to allow tap gestures to work
  const panGesture = Gesture.Pan()
    .activeOffsetY([30, Infinity]) // Higher threshold - only activate on clear downward swipes
    .failOffsetX([-40, 40]) // Fail if any significant horizontal movement (allows taps to work)
    .minDistance(20) // Minimum distance before gesture activates
    .maxPointers(1) // Only allow single finger
    .onStart(() => {
      // Reset closing flag when starting a new gesture
      isClosing.value = false;
    })
    .onUpdate((event) => {
      // Only allow downward swipes
      if (event.translationY > 0) {
        // Only mark as closing when there's significant downward movement (prevents interference with taps)
        if (event.translationY > 30) {
          isClosing.value = true;
        }
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const threshold = 100; // Minimum swipe distance to close
      const velocity = event.velocityY;
      const shouldClose = event.translationY > threshold || velocity > 800;

      if (shouldClose) {
        // Keep isClosing true to prevent step changes
        isClosing.value = true;
        
        // Close the modal - smooth animation to bottom
        translateY.value = withTiming(height, { 
          duration: 300,
        }, () => {
          runOnJS(onClose)();
        });
      } else {
        // Snap back smoothly - reset isClosing flag
        isClosing.value = false;
        translateY.value = withSpring(0, { 
          damping: 25, 
          stiffness: 300,
          mass: 0.8
        });
      }
    });

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));


  // Define navigation functions with useCallback for stable references in runOnJS
  const goToNextStep = useCallback(() => {
    // Don't navigate if we're closing
    if (isClosing.value) {
      return;
    }
    setCurrentStepIndex((prev) => {
      if (prev < steps.length - 1) {
        return prev + 1;
      } else {
        // On last step, just close without triggering navigation
        onClose();
        return prev;
      }
    });
  }, [steps.length, onClose]);

  const goToPreviousStep = useCallback(() => {
    // Don't navigate if we're closing
    if (isClosing.value) {
      return;
    }
    setCurrentStepIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      } else {
        // On first step, just close without triggering navigation
        onClose();
        return prev;
      }
    });
  }, [onClose]);

  // Tap gesture that checks position to determine left vs right
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((event) => {
      // Don't handle taps if we're closing
      if (isClosing.value) {
        return;
      }
      // Check tap position to determine navigation direction
      const tapX = event.x;
      if (tapX < width * 0.4) {
        // Left 40% - previous step
        runOnJS(goToPreviousStep)();
      } else {
        // Right 60% - next step
        runOnJS(goToNextStep)();
      }
    });


  if (!currentStep) {
    return null;
  }

  // Compose gestures - use Simultaneous but pan will fail on taps due to thresholds
  // Tap gesture handles quick taps, pan only activates on clear downward swipes
  const composedGesture = Gesture.Simultaneous(
    tapGesture,
    panGesture
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <Container style={containerAnimatedStyle}>
        <StatusBar barStyle="light-content" />
      <ImageContainer>
        {/* Previous image - fades out */}
        {previousStep?.imageUri && previousStepIndex.current !== currentStepIndex && (
          <AnimatedImageContainer style={animatedPreviousImageStyle}>
            <ImageWithPlaceholder
              source={{ uri: previousStep.imageUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </AnimatedImageContainer>
        )}
        {/* Current image - fades in */}
        {currentStep.imageUri && (
          <AnimatedImageContainer style={animatedImageStyle}>
            <ImageWithPlaceholder
              source={{ uri: currentStep.imageUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </AnimatedImageContainer>
        )}
      </ImageContainer>

      {/* Progress Indicators */}
      <ProgressContainer topInset={insets.top}>
        {steps.map((_, index) => (
          <ProgressBar key={index} active={index === currentStepIndex} />
        ))}
      </ProgressContainer>

      {/* Text Overlay */}
      <TextOverlay bottomInset={insets.bottom} style={animatedTextStyle}>
        <View
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: theme.spacing[4],
            borderRadius: theme.radii.medium,
          }}
        >
          <StepTitle variant="h2" weight="bold" color="#fff">
            {currentStep.title}
          </StepTitle>
          <StepDescription variant="body" color="#fff">
            {currentStep.description}
          </StepDescription>
        </View>
      </TextOverlay>

      </Container>
    </GestureDetector>
  );
}

