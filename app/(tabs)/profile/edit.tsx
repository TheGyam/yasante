import React, { useState, useEffect } from 'react';
import { ScrollView, View, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useUser, useUpdateUser } from '@/api/hooks/useUser';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { MediaPicker } from '@/components/composed/MediaPicker';
import { BrutalistInput } from '@/components/moodboard/ui/BrutalistInput';
import { isRequired, isValidEmail } from '@/utils/validation';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const userId = authUser?.id || '';
  const { data: user, isLoading } = useUser(userId, { enabled: !!userId });
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
    if (!isRequired(name)) newErrors.name = 'Name is required';
    if (email && !isValidEmail(email)) newErrors.email = 'Please enter a valid email address';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelected = (uri: string) => setAvatarUri(uri);

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

  if (isLoading || !user) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="body" weight="bold" color={theme.colors.primary} style={{ textTransform: 'uppercase', letterSpacing: 2 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="edit-profile-screen">
      {/* Header */}
      <View style={{ 
        paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.colors.background, borderBottomWidth: 4, borderBottomColor: theme.colors.border,
        zIndex: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <ArrowLeft size={20} color={theme.colors.text.high} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text variant="h3" weight="bold" color={theme.colors.text.high} style={{ fontSize: 20, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Edit Profile
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={{ alignItems: 'center', marginBottom: 40, marginTop: 20 }}>
            <TouchableOpacity 
              onPress={() => setIsMediaPickerVisible(true)} 
              activeOpacity={0.8}
              style={{ position: 'relative' }}
            >
              <View style={{ 
                position: 'absolute', top: 4, left: 4, right: -4, bottom: -4, 
                backgroundColor: theme.colors.primary, borderRadius: 60, borderWidth: 2, borderColor: theme.colors.text.high 
              }} />
              <Avatar 
                source={avatarUri ? { uri: avatarUri } : undefined} 
                name={name || user?.name} 
                size={120} 
                style={{ borderWidth: 4, borderColor: theme.colors.text.high }}
              />
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.text.high,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Camera size={18} color={theme.colors.text.high} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setIsMediaPickerVisible(true)} 
              activeOpacity={0.7} 
              style={{ marginTop: 16 }}
            >
              <Text variant="caption" weight="bold" color={theme.colors.primary} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Change Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={{ gap: 20 }}>
            <View>
              <Text variant="caption" weight="bold" color={theme.colors.text.high} style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Name
              </Text>
              <BrutalistInput 
                value={name} 
                onChangeText={setName} 
                placeholder="Your name" 
              />
              {errors.name && <Text variant="caption" color={theme.colors.accentSecondary} style={{ marginTop: 4 }}>{errors.name}</Text>}
            </View>

            <View>
              <Text variant="caption" weight="bold" color={theme.colors.text.high} style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Email
              </Text>
              <BrutalistInput 
                value={email} 
                onChangeText={setEmail} 
                placeholder="your@email.com" 
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text variant="caption" color={theme.colors.accentSecondary} style={{ marginTop: 4 }}>{errors.email}</Text>}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={{ 
        position: 'absolute', bottom: insets.bottom + 20, left: 20, right: 20,
        zIndex: 10,
      }}>
        <TouchableOpacity 
          onPress={handleSubmit} 
          activeOpacity={0.85} 
          disabled={updateUser.isPending}
          style={{
            backgroundColor: theme.colors.primary, borderWidth: 4, borderColor: theme.colors.text.high,
            borderRadius: 16, paddingVertical: 16, alignItems: 'center',
            opacity: updateUser.isPending ? 0.6 : 1,
            shadowColor: theme.colors.text.high, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8,
          }}
        >
          <Text variant="body" weight="bold" color={theme.colors.surface} style={{ fontSize: 16, textTransform: 'uppercase', fontStyle: 'italic' }}>
            {updateUser.isPending ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      <MediaPicker
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onImageSelected={handleImageSelected}
        testID="avatar-media-picker"
      />
    </View>
  );
}
