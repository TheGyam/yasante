import React from 'react';
import { ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { Switch } from '@/shared/ui/Switch';
import { useConsentStore } from '@/shared/config/consentStore';
import { useAuth } from '@/features/auth';
import { api } from '@/api';

export default function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { consents, setConsent } = useConsentStore();
  const { user, logout } = useAuth();
  const [busy, setBusy] = React.useState(false);

  const handleExport = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      await api.user.requestDataExport(user.id);
      Alert.alert('Request sent', 'We will email you a download link when your data is ready.');
    } catch {
      Alert.alert('Could not send request', 'Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!user?.id || busy) return;
    Alert.alert(
      'Delete account',
      'This removes your profile, photos and posts. It cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.user.deleteAccount(user.id);
              await logout();
            } catch {
              Alert.alert('Could not delete account', 'Please check your connection and try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="privacy-settings-screen">
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
            Privacy
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 32 }}>
          <Text variant="caption" weight="bold" color={theme.colors.primary} style={{ textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            Preferences
          </Text>
          
          <View style={{ gap: 16 }}>
            <PrivacyRow
              title="Analytics"
              description="Help us improve the app by sharing anonymous usage data"
              value={consents.analytics.granted}
              onValueChange={(v: boolean) => setConsent('analytics', v)}
              theme={theme}
            />
            <PrivacyRow
              title="Personalization"
              description="Match what you see to your hair profile"
              value={consents.personalisation.granted}
              onValueChange={(v: boolean) => setConsent('personalisation', v)}
              theme={theme}
            />
            <PrivacyRow
              title="Research"
              description="Allow anonymised data to be used in hair research. Off unless you turn it on, and you can withdraw at any time"
              value={consents.research.granted}
              onValueChange={(v: boolean) => setConsent('research', v)}
              theme={theme}
            />
          </View>
        </View>

        <View style={{ 
          marginTop: 20, padding: 20, 
          backgroundColor: theme.colors.surface, borderWidth: 3, borderColor: theme.colors.text.high, borderRadius: 20,
          shadowColor: theme.colors.text.high, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4,
        }}>
          <Text variant="h3" weight="bold" color={theme.colors.text.high} style={{ marginBottom: 12, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Data Management
          </Text>
          <Text variant="body" color={theme.colors.text.high} style={{ lineHeight: 22, marginBottom: 20 }}>
            You can request to download or delete your data at any time. This action cannot be undone.
          </Text>
          
          <View style={{ gap: 12 }}>
            <AdminAction label="Download My Data" onPress={handleExport} theme={theme} />
            <AdminAction label="Delete Account" onPress={handleDelete} theme={theme} isDestructive />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PrivacyRow({ title, description, value, onValueChange, theme }: any) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, backgroundColor: theme.colors.surface,
      borderWidth: 3, borderColor: theme.colors.text.high, borderRadius: 16,
    }}>
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text variant="body" weight="bold" color={theme.colors.text.high} style={{ textTransform: 'uppercase', fontSize: 14 }}>
          {title}
        </Text>
        <Text variant="caption" color={theme.colors.text.medium} style={{ marginTop: 4 }}>
          {description}
        </Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.background, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

function AdminAction({ label, onPress, theme, isDestructive }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{
      paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
      backgroundColor: isDestructive ? theme.colors.accentSecondary + '20' : theme.colors.background,
      borderWidth: 2, borderColor: isDestructive ? theme.colors.accentSecondary : theme.colors.text.high,
      borderRadius: 12,
    }}>
      <Text variant="caption" weight="bold" color={isDestructive ? theme.colors.accentSecondary : theme.colors.text.high} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
