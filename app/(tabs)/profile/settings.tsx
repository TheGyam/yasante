import React from 'react';
import { View, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Moon, Sun, LogOut, FileText, Shield, AlertTriangle, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from '@/components/ui/Text';
import { Switch } from '@/components/ui/Switch';

export default function SettingsScreen() {
  const { theme, colorScheme, setColorScheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const handleLogout = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logout();
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="settings-screen">
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
            Settings
          </Text>
        </View>
      </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: 24 }}>
            <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
            <Text variant="caption" weight="bold" color={theme.colors.primary} style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
              App Settings
            </Text>
          </View>

          <MenuRow icon={<Shield size={20} color={theme.colors.text.high} strokeWidth={2.5} />} label="Privacy Settings" onPress={() => router.push('/profile/privacy')} theme={theme} />
          <MenuRow icon={<FileText size={20} color={theme.colors.text.high} strokeWidth={2.5} />} label="Terms & FAQs" onPress={() => router.push('/profile/faqs')} theme={theme} />
          <MenuRow icon={<AlertTriangle size={20} color={theme.colors.text.high} strokeWidth={2.5} />} label="Report an Issue" onPress={() => router.push('/profile/report')} theme={theme} />
          
          {/* Dark Mode Toggle */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 2, borderBottomColor: theme.colors.text.medium + '40',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {colorScheme === 'dark' ? <Moon size={20} color={theme.colors.text.high} strokeWidth={2.5} /> : <Sun size={20} color={theme.colors.text.high} strokeWidth={2.5} />}
              <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ fontSize: 16, textTransform: 'uppercase' }}>
                Dark Mode
              </Text>
            </View>
            <Switch value={colorScheme === 'dark'} onValueChange={(val) => setColorScheme(val ? 'dark' : 'light')}
              trackColor={{ false: theme.colors.surface, true: theme.colors.primary }} thumbColor={theme.colors.surface} />
          </View>
        </View>

        {/* Reduced Logout Button */}
        <TouchableOpacity 
          onPress={handleLogout} 
          activeOpacity={0.7} 
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start',
            marginHorizontal: 24, marginTop: 40, paddingVertical: 12, paddingHorizontal: 16,
            borderWidth: 2, borderColor: theme.colors.accentSecondary, borderRadius: 12,
          }}
        >
          <LogOut size={18} color={theme.colors.accentSecondary} strokeWidth={2.5} />
          <Text variant="caption" weight="bold" color={theme.colors.accentSecondary} style={{ fontSize: 13, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MenuRow({ icon, label, onPress, theme }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 18, paddingHorizontal: 24,
      borderBottomWidth: 2, borderBottomColor: theme.colors.text.medium + '40',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 32 }}>{icon}</View>
        <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ fontSize: 16, textTransform: 'uppercase' }}>
          {label}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.colors.text.medium} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}
