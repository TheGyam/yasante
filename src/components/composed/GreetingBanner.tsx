import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '../ui/Text';
import { getNextGreeting } from '@/utils/greetings';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  Easing 
} from 'react-native-reanimated';
import type { Theme } from '@/theme/ThemeProvider';

const BannerContainer = styled.View`
  justify-content: flex-start;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  padding-top: 0;
`;

const GreetingWrapper = styled.View`
  position: relative;
`;

const GreetingText = styled(Text)`
  font-size: 32px;
  line-height: 40px;
  letter-spacing: -0.5px;
`;

const MainGreeting = styled(Text)`
  font-size: 36px;
  line-height: 44px;
  letter-spacing: -0.5px;
`;

const SubGreeting = styled(Text)`
  font-size: 18px;
  line-height: 24px;
  letter-spacing: 0.2px;
  opacity: 0.8;
`;

const UnderlineContainer = styled.View`
  height: 3px;
  border-radius: 2px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  background-color: rgba(94, 29, 49, 0.2);
  overflow: hidden;
`;

const Underline = styled.View`
  height: 100%;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  border-radius: 2px;
`;

const AnimatedUnderline = Animated.createAnimatedComponent(Underline);

export interface GreetingBannerProps {
  topInset: number;
  firstName?: string;
}

export function GreetingBanner({ topInset, firstName }: GreetingBannerProps) {
  const { theme } = useTheme();
  const [greeting, setGreeting] = useState<string>('');
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const underlineWidth = useSharedValue(0);

  useEffect(() => {
    // Get pop culture greeting
    getNextGreeting().then((text) => {
      setGreeting(text);
    });

    // Animate entrance
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    
    // Animate underline with delay
    setTimeout(() => {
      underlineWidth.value = withSpring(1, { damping: 12, stiffness: 80 });
    }, 200);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    width: `${underlineWidth.value * 100}%`,
  }));

  return (
    <BannerContainer style={{ paddingTop: Math.max(topInset + 16, 28), marginBottom: 0 }}>
      <Animated.View style={animatedStyle}>
        <GreetingWrapper>
          <MainGreeting variant="h1" weight="bold" color={theme.colors.text.high}>
            Hey {firstName || 'there'}
          </MainGreeting>
          <SubGreeting 
            variant="body" 
            weight="regular" 
            color={theme.colors.text.medium}
            style={{ marginTop: 4 }}
          >
            {greeting || 'Looking fabulous today — same vibes!'}
          </SubGreeting>
          <UnderlineContainer>
            <AnimatedUnderline style={underlineStyle} />
          </UnderlineContainer>
        </GreetingWrapper>
      </Animated.View>
    </BannerContainer>
  );
}
