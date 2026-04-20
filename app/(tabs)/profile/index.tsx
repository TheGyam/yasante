import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, User as UserIcon, Edit2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/api/hooks/useUser';
import { useMoodBoardEntries, useSavedMoodBoardEntries } from '@/api/hooks/useMoodBoard';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { CreatedBoardsTab } from '@/components/profile/ui/CreatedBoardsTab';
import { SavedBoardsTab } from '@/components/profile/ui/SavedBoardsTab';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: authUser, isAuthenticated } = useAuth();
  const userId = authUser?.id || '';
  
  const { data: user } = useUser(userId, { enabled: isAuthenticated && !!userId });
  const { data: createdEntries = [], isLoading: isLoadingCreated } = useMoodBoardEntries(userId, undefined, { enabled: isAuthenticated && !!userId });
  const { data: savedEntries = [], isLoading: isLoadingSaved } = useSavedMoodBoardEntries(userId, undefined, { enabled: isAuthenticated && !!userId });

  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('created');

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.surface, borderWidth: 4, borderColor: theme.colors.text.high, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <UserIcon size={50} color={theme.colors.text.high} strokeWidth={2} />
        </View>
        <Text variant="h2" weight="bold" color={theme.colors.text.high} style={{ textAlign: 'center', textTransform: 'uppercase', fontStyle: 'italic' }}>
          Sign In Required
        </Text>
        <Text variant="body" color={theme.colors.text.high} style={{ textAlign: 'center', marginTop: 12, marginBottom: 24 }}>
          Sign in to access your mood boards, profile, and settings.
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/auth/login')}
          style={{ 
            paddingHorizontal: 32, paddingVertical: 14, backgroundColor: theme.colors.primary, 
            borderWidth: 4, borderColor: theme.colors.text.high, borderRadius: 16,
            shadowColor: theme.colors.text.high, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8
          }}
        >
          <Text variant="body" weight="bold" color={theme.colors.surface} style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="profile-screen">
      {/* Top Header with Hamburger */}
      <View style={{ 
        paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.colors.background, borderBottomWidth: 4, borderBottomColor: theme.colors.border
      }}>
        <Text variant="h2" weight="bold" color={theme.colors.text.high} style={{ fontSize: 24, textTransform: 'uppercase', fontStyle: 'italic' }}>
          Profile
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/profile/settings' as any)}
          style={{ 
            width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.surface, 
            borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' 
          }}
        >
          <Menu size={24} color={theme.colors.text.high} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <View style={{ position: 'relative', marginBottom: 16 }}>
            <View style={{ 
              position: 'absolute', top: 4, left: 4, right: -2, bottom: -2, 
              backgroundColor: theme.colors.primary, borderRadius: 60, borderWidth: 2, borderColor: theme.colors.text.high 
            }} />
            <Avatar 
              source={user?.avatarUri ? { uri: user.avatarUri } : undefined} 
              name={user?.name} 
              size={110} 
              style={{ borderWidth: 2, borderColor: theme.colors.text.high }}
            />
            <TouchableOpacity 
              onPress={() => router.push('/profile/edit')}
              activeOpacity={0.8}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.text.high,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: theme.colors.text.high, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4
              }}
            >
              <Edit2 size={16} color={theme.colors.text.high} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <Text variant="h1" weight="bold" color={theme.colors.text.high} style={{ fontSize: 32, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: -1 }}>
            {user?.name || 'User'}
          </Text>
          {user?.email && (
            <View style={{ 
              marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, 
              backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.text.high, borderRadius: 8 
            }}>
              <Text variant="caption" weight="bold" color={theme.colors.text.high}>
                {user.email}
              </Text>
            </View>
          )}
        </View>

        {/* Tab Switcher */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 24, gap: 12 }}>
          <TabButton 
            label="Created" 
            isActive={activeTab === 'created'} 
            onPress={() => setActiveTab('created')} 
            theme={theme} 
          />
          <TabButton 
            label="Saved" 
            isActive={activeTab === 'saved'} 
            onPress={() => setActiveTab('saved')} 
            theme={theme} 
          />
        </View>

        {/* Tab Content */}
        {activeTab === 'created' ? (
          <CreatedBoardsTab entries={createdEntries} isLoading={isLoadingCreated} />
        ) : (
          <SavedBoardsTab entries={savedEntries} isLoading={isLoadingSaved} />
        )}
      </ScrollView>
    </View>
  );
}

function TabButton({ label, isActive, onPress, theme }: any) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.8}
      style={{ 
        flex: 1, paddingVertical: 12, alignItems: 'center',
        backgroundColor: isActive ? theme.colors.accent : theme.colors.surface,
        borderWidth: 3, borderColor: theme.colors.text.high, borderRadius: 12,
        shadowColor: theme.colors.text.high,
        shadowOffset: isActive ? { width: 0, height: 0 } : { width: 4, height: 4 },
        shadowOpacity: isActive ? 0 : 1,
        shadowRadius: 0,
        elevation: isActive ? 0 : 4,
        transform: isActive ? [{ translateX: 2 }, { translateY: 2 }] : []
      }}
    >
      <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
