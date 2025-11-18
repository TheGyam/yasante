import React from 'react';
import { ScrollView, View } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { TopBar } from '@/components/composed/TopBar';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const SettingsCard = styled(Card)`
  padding: 0;
`;

const SettingRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

const SettingRowContent = styled.View`
  flex: 1;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const SettingRowTitle = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const SettingRowDescription = styled(Text)`
  font-size: 13px;
`;

export default function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(true);
  const [personalizationEnabled, setPersonalizationEnabled] = React.useState(true);
  const [dataSharingEnabled, setDataSharingEnabled] = React.useState(false);

  return (
    <Container testID="privacy-settings-screen">
      <TopBar title="Privacy Settings" />
      <Content>
        <SettingsCard>
          <Text variant="h3" weight="semibold" style={{ padding: theme.spacing[4], paddingBottom: theme.spacing[3] }}>
            Privacy Preferences
          </Text>

          <SettingRow>
            <SettingRowContent>
              <SettingRowTitle variant="body" weight="medium">
                Analytics
              </SettingRowTitle>
              <SettingRowDescription color={theme.colors.text.medium}>
                Help us improve the app by sharing anonymous usage data
              </SettingRowDescription>
            </SettingRowContent>
            <Switch
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
            />
          </SettingRow>

          <SettingRow>
            <SettingRowContent>
              <SettingRowTitle variant="body" weight="medium">
                Personalization
              </SettingRowTitle>
              <SettingRowDescription color={theme.colors.text.medium}>
                Allow us to personalize content based on your preferences
              </SettingRowDescription>
            </SettingRowContent>
            <Switch
              value={personalizationEnabled}
              onValueChange={setPersonalizationEnabled}
            />
          </SettingRow>

          <SettingRow style={{ borderBottomWidth: 0 }}>
            <SettingRowContent>
              <SettingRowTitle variant="body" weight="medium">
                Data Sharing
              </SettingRowTitle>
              <SettingRowDescription color={theme.colors.text.medium}>
                Share anonymized data with research partners
              </SettingRowDescription>
            </SettingRowContent>
            <Switch
              value={dataSharingEnabled}
              onValueChange={setDataSharingEnabled}
            />
          </SettingRow>
        </SettingsCard>

        <Card style={{ marginTop: theme.spacing[4], padding: theme.spacing[4] }}>
          <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>
            Data Management
          </Text>
          <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[4] }}>
            You can request to download or delete your data at any time. This action cannot be undone.
          </Text>
          {/* TODO: Add download and delete data buttons */}
        </Card>
      </Content>
    </Container>
  );
}

