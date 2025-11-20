import React, { useState, useEffect } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { useUser, useUpdateUser } from '@/api/hooks/useUser';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/composed/TopBar';
import { Input } from '@/components/ui/Input';
import { TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { MediaPicker } from '@/components/composed/MediaPicker';
import { isRequired, isValidEmail } from '@/utils/validation';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const FormCard = styled(Card)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const AvatarSection = styled.View`
  align-items: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const AvatarContainer = styled.View`
  position: relative;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const ChangeAvatarButton = styled.TouchableOpacity`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const TextLink = styled.TouchableOpacity`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const userId = authUser?.id || '';
  const { data: user } = useUser(userId, { enabled: !!userId });
  const updateUser = useUpdateUser(userId);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string>('');
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatarUri(user.avatarUri || '');
    }
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isRequired(name)) {
      newErrors.name = 'Name is required';
    }

    if (email && !isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelected = (uri: string) => {
    setAvatarUri(uri);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await updateUser.mutateAsync({
        name,
        email: email || undefined,
        avatarUri: avatarUri || undefined,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  return (
    <Container testID="edit-profile-screen">
      <TopBar title="Edit Profile" />
      <Content>
        <FormCard>
          <AvatarSection>
            <AvatarContainer>
              <Avatar
                source={avatarUri ? { uri: avatarUri } : undefined}
                name={name || user?.name}
                size={100}
              />
            </AvatarContainer>
            <ChangeAvatarButton
              onPress={() => setIsMediaPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text variant="body" weight="medium" color={theme.colors.primary}>
                Change Photo
              </Text>
            </ChangeAvatarButton>
          </AvatarSection>

          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            error={errors.name}
            testID="name-input"
            style={{ marginBottom: theme.spacing[3] }}
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            testID="email-input"
          />
        </FormCard>

        <TextLink
          onPress={handleSubmit}
          activeOpacity={0.6}
          disabled={updateUser.isPending}
          testID="save-profile-button"
        >
          <Text variant="body" weight="medium" color={theme.colors.primary}>
            {updateUser.isPending ? 'Saving...' : 'Save Changes'}
          </Text>
        </TextLink>
      </Content>

      <MediaPicker
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onImageSelected={handleImageSelected}
        testID="avatar-media-picker"
      />
    </Container>
  );
}

