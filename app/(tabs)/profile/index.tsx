import React, { useMemo } from 'react';
import { ScrollView, View, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { useUser } from '@/api/hooks/useUser';
import { useGoals } from '@/api/hooks/useGoals';
import { useRoutines } from '@/api/hooks/useRoutines';
import { useFavorites, useContent } from '@/api/hooks/useContent';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/composed/TopBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { GoalCard } from '@/components/composed/GoalCard';
import { HorizontalContentCard } from '@/components/composed/HorizontalContentCard';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { useTheme as useThemeHook } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatRelativeTime } from '@/utils/date';
import { ChevronRight, Edit2, User } from 'lucide-react-native';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6] + 56 + 32}px;
`;

const ProfileHeader = styled.View`
  align-items: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
`;

const AvatarContainer = styled.View`
  position: relative;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const EditAvatarButton = styled(TouchableOpacity)`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  border-width: 3px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const EditProfileButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const HairProfileBadges = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const Section = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const TextLink = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  margin: -${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const StatsContainer = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const StatCard = styled(Card)`
  flex: 1;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  align-items: center;
`;

const StatValue = styled(Text)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const LastPhotoContainer = styled.View`
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const GoalList = styled.View`
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const FavoritesScroll = styled.ScrollView.attrs({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
})``;

const SettingsCard = styled(Card)`
  padding: 0;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const SettingRow = styled(TouchableOpacity)`
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

const CTARow = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

// Placeholder URLs - to be updated later
const TERMS_OF_USE_URL = 'https://example.com/terms';
const PRIVACY_POLICY_URL = 'https://example.com/privacy';

const openWebsite = async (url: string, title: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', `Cannot open ${title}. URL not supported.`);
    }
  } catch (error) {
    Alert.alert('Error', `Failed to open ${title}. Please try again later.`);
  }
};

export default function ProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: authUser, isAuthenticated } = useAuth();
  const { data: user } = useUser(authUser?.id || '', { enabled: !!authUser?.id });
  const { data: goals } = useGoals(authUser?.id || '', { enabled: !!authUser?.id });
  const { data: routines } = useRoutines(authUser?.id || '', { enabled: !!authUser?.id });
  const { data: favorites } = useFavorites(authUser?.id || '', { enabled: !!authUser?.id });
  const { data: allContent } = useContent();
  const { colorScheme, setColorScheme } = useThemeHook();

  // Calculate stats
  const stats = useMemo(() => {
    const activeGoals = goals?.filter((g) => g.status === 'active') || [];
    
    let growthInches = '—';
    if (activeGoals.length > 0) {
      const goalWithPhotos = activeGoals.find((g) => g.photos && g.photos.length > 1);
      if (goalWithPhotos && goalWithPhotos.photos) {
        growthInches = '2.5"';
      }
    }

    let lastPhoto: { uri: string; date: string } | null = null;
    activeGoals.forEach((goal) => {
      if (goal.photos && goal.photos.length > 0) {
        const latest = goal.photos[goal.photos.length - 1];
        if (!lastPhoto || new Date(latest.takenAt) > new Date(lastPhoto.date)) {
          lastPhoto = { uri: latest.uri, date: latest.takenAt };
        }
      }
    });

    const nextRoutine = routines?.[0];

    return {
      growth: growthInches,
      activeGoalsCount: activeGoals.length,
      lastPhoto,
      nextRoutine,
    };
  }, [goals, routines]);

  const hairProfile = user?.hairProfile;
  const activeGoals = goals?.filter((g) => g.status === 'active') || [];
  
  // Resolve favorites to actual content objects
  const favoritesList = useMemo(() => {
    if (!favorites || !allContent?.data) return [];
    const contentArray = Array.isArray(allContent.data) ? allContent.data : [];
    return favorites
      .map((fav) => contentArray.find((c) => c.id === fav.contentId))
      .filter((content): content is NonNullable<typeof content> => content !== undefined);
  }, [favorites, allContent]);

  // Get hair profile tagline
  const getHairTagline = () => {
    if (!hairProfile) return 'Complete your hair profile';
    const parts: string[] = [];
    if (hairProfile.texture) parts.push(hairProfile.texture);
    if (hairProfile.porosity) parts.push(hairProfile.porosity + ' porosity');
    return parts.join(', ') || 'Hair profile complete';
  };

  if (!isAuthenticated) {
    return (
      <Container
        testID="profile-screen"
        contentContainerStyle={{ 
          flexGrow: 1,
          justifyContent: 'center',
          paddingBottom: insets.bottom + 100 
        }}
      >
        <TopBar title="" showBack={false} />
        <Content>
          <ProfileHeader>
            <AvatarContainer>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: theme.colors.surfaceVariant,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <User size={40} color={theme.colors.primary} strokeWidth={2} />
              </View>
            </AvatarContainer>
            <Text variant="h2" weight="semibold">
              Sign In to Access Profile
            </Text>
            <Text variant="body" color={theme.colors.text.medium} style={{ marginTop: theme.spacing[2], marginBottom: theme.spacing[3], textAlign: 'center', paddingHorizontal: theme.spacing[4] }}>
              Sign up to access your personal profile, track your progress, and save your favorites.
            </Text>
            <TextLink
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.7}
              style={{ alignItems: 'center' }}
            >
              <Text variant="body" weight="semibold" color={theme.colors.primary}>
                Sign In
              </Text>
            </TextLink>
          </ProfileHeader>
        </Content>
      </Container>
    );
  }

  return (
    <Container
      testID="profile-screen"
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <TopBar title="" showBack={false} />
      <Content>
        <ProfileHeader>
          <AvatarContainer>
            <Avatar
              source={user?.avatarUri ? { uri: user.avatarUri } : undefined}
              name={user?.name}
              size={80}
            />
            <EditAvatarButton
              onPress={() => {
                router.push('/(tabs)/profile/edit' as any);
              }}
              accessible={true}
              accessibilityLabel="Edit profile photo"
            >
              <Text variant="caption" color="#ffffff" style={{ fontSize: 14 }}>
                📷
              </Text>
            </EditAvatarButton>
          </AvatarContainer>
          <Text variant="h2" weight="semibold">
            {user?.name || 'User'}
          </Text>
          {user?.email && (
            <Text variant="body" color={theme.colors.text.medium}>
              {user.email}
            </Text>
          )}
          <Text variant="caption" color={theme.colors.text.low} style={{ marginTop: theme.spacing[1] }}>
            {getHairTagline()}
          </Text>
          {hairProfile && (
            <HairProfileBadges>
              {hairProfile.texture && (
                <Badge variant="default">{hairProfile.texture}</Badge>
              )}
              {hairProfile.porosity && (
                <Badge variant="default">{hairProfile.porosity} porosity</Badge>
              )}
              {hairProfile.density && (
                <Badge variant="default">{hairProfile.density} density</Badge>
              )}
            </HairProfileBadges>
          )}
          <EditProfileButton
            onPress={() => router.push('/(tabs)/profile/edit' as any)}
            activeOpacity={0.7}
          >
            <Edit2 size={16} color={theme.colors.primary} strokeWidth={2.5} />
            <Text variant="body" weight="medium" color={theme.colors.primary} style={{ marginLeft: theme.spacing[1] }}>
              Edit Profile
            </Text>
          </EditProfileButton>
        </ProfileHeader>

        {/* Quick Stats */}
        <Section>
          <Text variant="h3" weight="semibold">
            Quick Stats
          </Text>
          <StatsContainer>
            <StatCard>
              <Text variant="caption" color={theme.colors.text.low}>
                Growth
              </Text>
              <StatValue variant="h2" weight="bold" color={theme.colors.primary}>
                {stats.growth}
              </StatValue>
            </StatCard>
            <StatCard>
              <Text variant="caption" color={theme.colors.text.low}>
                Active Goals
              </Text>
              <StatValue variant="h2" weight="bold" color={theme.colors.primary}>
                {stats.activeGoalsCount}
              </StatValue>
            </StatCard>
            {stats.lastPhoto && (
              <StatCard>
                <Text variant="caption" color={theme.colors.text.low}>
                  Last Photo
                </Text>
                <LastPhotoContainer>
                  <ImageWithPlaceholder
                    source={{ uri: stats.lastPhoto.uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </LastPhotoContainer>
                <Text variant="caption" color={theme.colors.text.low} style={{ marginTop: theme.spacing[1], fontSize: 11 }}>
                  {formatRelativeTime(stats.lastPhoto.date)}
                </Text>
              </StatCard>
            )}
          </StatsContainer>
        </Section>

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <Section>
            <SectionHeader>
              <Text variant="h3" weight="semibold">
                Active Goals
              </Text>
              <TextLink
                onPress={() => router.push('/(tabs)/planner' as any)}
                activeOpacity={0.6}
              >
                <Text variant="body" weight="medium" color={theme.colors.primary}>
                  View All
                </Text>
              </TextLink>
            </SectionHeader>
            <GoalList>
              {activeGoals.slice(0, 3).map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPress={() => router.push(`/(tabs)/planner/goal/${goal.id}` as any)}
                />
              ))}
            </GoalList>
          </Section>
        )}

        {/* Favorites */}
        {favoritesList.length > 0 && (
          <Section>
            <SectionHeader>
              <Text variant="h3" weight="semibold">
                Favorites
              </Text>
              <TextLink
                onPress={() => router.push('/(tabs)/profile/favorites' as any)}
                activeOpacity={0.6}
              >
                <Text variant="body" weight="medium" color={theme.colors.primary}>
                  View All
                </Text>
              </TextLink>
            </SectionHeader>
            <FavoritesScroll>
              {favoritesList.slice(0, 10).map((item) => (
                <HorizontalContentCard
                  key={item.id}
                  content={item}
                  onPress={() => router.push(`/(tabs)/education/${item.id}` as any)}
                />
              ))}
            </FavoritesScroll>
          </Section>
        )}

        {/* Settings */}
        <Section>
          <SettingsCard>
            <Text variant="h3" weight="semibold" style={{ padding: theme.spacing[4], paddingBottom: theme.spacing[3] }}>
              Settings
            </Text>

            <SettingRow
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <SettingRowContent>
                <SettingRowTitle variant="body" weight="medium">
                  Dark Mode
                </SettingRowTitle>
                <SettingRowDescription color={theme.colors.text.medium}>
                  {colorScheme === 'system' ? 'System' : colorScheme === 'dark' ? 'On' : 'Off'}
                </SettingRowDescription>
              </SettingRowContent>
              <Switch
                value={colorScheme === 'dark'}
                onValueChange={(value) => setColorScheme(value ? 'dark' : 'light')}
              />
            </SettingRow>

            <SettingRow
              onPress={() => router.push('/(tabs)/profile/edit' as any)}
              activeOpacity={0.7}
            >
              <SettingRowContent>
                <SettingRowTitle variant="body" weight="medium">
                  Edit Profile
                </SettingRowTitle>
                <SettingRowDescription color={theme.colors.text.medium}>
                  Update your name, email, and profile photo
                </SettingRowDescription>
              </SettingRowContent>
              <ChevronRight size={20} color={theme.colors.text.low} />
            </SettingRow>

            <SettingRow
              onPress={() => router.push('/(tabs)/profile/hair-profile' as any)}
              activeOpacity={0.7}
            >
              <SettingRowContent>
                <SettingRowTitle variant="body" weight="medium">
                  Hair Profile
                </SettingRowTitle>
                <SettingRowDescription color={theme.colors.text.medium}>
                  View and edit your hair profile
                </SettingRowDescription>
              </SettingRowContent>
              <ChevronRight size={20} color={theme.colors.text.low} />
            </SettingRow>

            <SettingRow
              onPress={() => router.push('/(tabs)/profile/report' as any)}
              activeOpacity={0.7}
            >
              <SettingRowContent>
                <SettingRowTitle variant="body" weight="medium">
                  Report a Problem
                </SettingRowTitle>
                <SettingRowDescription color={theme.colors.text.medium}>
                  Let us know if you're experiencing issues
                </SettingRowDescription>
              </SettingRowContent>
              <ChevronRight size={20} color={theme.colors.text.low} />
            </SettingRow>

            <SettingRow
              onPress={() => router.push('/(tabs)/profile/faqs' as any)}
              activeOpacity={0.7}
            >
              <SettingRowContent>
                <SettingRowTitle variant="body" weight="medium">
                  FAQs
                </SettingRowTitle>
                <SettingRowDescription color={theme.colors.text.medium}>
                  Frequently asked questions
                </SettingRowDescription>
              </SettingRowContent>
              <ChevronRight size={20} color={theme.colors.text.low} />
            </SettingRow>

            <SettingRow
              onPress={() => router.push('/(tabs)/profile/privacy' as any)}
              activeOpacity={0.7}
            >
              <SettingRowContent>
                <SettingRowTitle variant="body" weight="medium">
                  Privacy Settings
                </SettingRowTitle>
                <SettingRowDescription color={theme.colors.text.medium}>
                  Manage your privacy preferences
                </SettingRowDescription>
              </SettingRowContent>
              <ChevronRight size={20} color={theme.colors.text.low} />
            </SettingRow>

            <SettingRow
              onPress={() => openWebsite(TERMS_OF_USE_URL, 'Terms of Use')}
              activeOpacity={0.7}
            >
              <SettingRowContent>
                <SettingRowTitle variant="body" weight="medium">
                  Terms of Use
                </SettingRowTitle>
                <SettingRowDescription color={theme.colors.text.medium}>
                  Read our terms and conditions
                </SettingRowDescription>
              </SettingRowContent>
              <ChevronRight size={20} color={theme.colors.text.low} />
            </SettingRow>

            <SettingRow
              onPress={() => openWebsite(PRIVACY_POLICY_URL, 'Privacy Policy')}
              activeOpacity={0.7}
              style={{ borderBottomWidth: 0 }}
            >
              <SettingRowContent>
                <SettingRowTitle variant="body" weight="medium">
                  Privacy Policy
                </SettingRowTitle>
                <SettingRowDescription color={theme.colors.text.medium}>
                  Read our privacy policy
                </SettingRowDescription>
              </SettingRowContent>
              <ChevronRight size={20} color={theme.colors.text.low} />
            </SettingRow>
          </SettingsCard>
        </Section>

        {/* CTA Row */}
        <Section>
          <TextLink
            onPress={() => router.push('/onboarding/quiz' as any)}
            activeOpacity={0.6}
            style={{ marginBottom: theme.spacing[4] }}
          >
            <Text variant="body" weight="medium" color={theme.colors.primary} style={{ textAlign: 'center' }}>
              Retake Hair Profile Quiz
            </Text>
          </TextLink>
          <CTARow>
            <TextLink
              onPress={() => {
                // TODO: Share progress
              }}
              activeOpacity={0.6}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <Text variant="body" weight="medium" color={theme.colors.primary}>
                Share Progress
              </Text>
            </TextLink>
            <TextLink
              onPress={() => {
                // TODO: Export data
              }}
              activeOpacity={0.6}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <Text variant="body" weight="medium" color={theme.colors.primary}>
                Export Data
              </Text>
            </TextLink>
          </CTARow>
        </Section>
      </Content>
    </Container>
  );
}
