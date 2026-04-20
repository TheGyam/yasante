import React from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Switch } from '@/components/ui/Switch';

export default function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(true);
  const [personalizationEnabled, setPersonalizationEnabled] = React.useState(true);
  const [dataSharingEnabled, setDataSharingEnabled] = React.useState(false);

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
              value={analyticsEnabled} 
              onValueChange={setAnalyticsEnabled} 
              theme={theme} 
            />
            <PrivacyRow 
              title="Personalization" 
              description="Allow us to personalize content based on your preferences" 
              value={personalizationEnabled} 
              onValueChange={setPersonalizationEnabled} 
              theme={theme} 
            />
            <PrivacyRow 
              title="Data Sharing" 
              description="Share anonymized data with research partners for hair science" 
              value={dataSharingEnabled} 
              onValueChange={setDataSharingEnabled} 
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
            <AdminAction label="Download My Data" onPress={() => {}} theme={theme} />
            <AdminAction label="Delete Account" onPress={() => {}} theme={theme} isDestructive />
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
