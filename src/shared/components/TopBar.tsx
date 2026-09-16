import React from 'react';
import { TouchableOpacity, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { ArrowLeft } from 'lucide-react-native';
import type { Theme } from '@/shared/theme/ThemeProvider';

const Container = styled.View<{ topInset: number }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: ${({ topInset, theme }: { topInset: number; theme: Theme }) => topInset + theme.spacing[4]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const LeftSection = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
`;

const BackButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: #ffffff;
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: ${Platform.OS === 'android' ? 3 : 0};
  border-width: 1px;
  border-color: rgba(0, 0, 0, 0.05);
`;

const TitleSection = styled.View`
  flex: 1;
`;

const RightSection = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ActionButton = styled(TouchableOpacity)`
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

export interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  testID?: string;
}

export function TopBar({ title, showBack = true, onBack, rightActions, testID }: TopBarProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <Container testID={testID} topInset={insets.top}>
      <LeftSection>
        {showBack && (
          <BackButton
            onPress={handleBack}
            testID={testID ? `${testID}-back` : undefined}
            accessible={true}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
          </BackButton>
        )}
        {title && (
          <TitleSection>
            <Text variant="h3" weight="semibold">
              {title}
            </Text>
          </TitleSection>
        )}
      </LeftSection>
      {rightActions && <RightSection>{rightActions}</RightSection>}
    </Container>
  );
}

