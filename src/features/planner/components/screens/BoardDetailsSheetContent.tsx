import React from 'react';
import { View } from 'react-native';
import { Lock, Globe, MapPin, Calendar, FileText } from 'lucide-react-native';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Text } from '@/shared/ui/Text';
import { useTheme } from '@/shared/hooks/useTheme';
import { MoodBoardEntry } from '@/features/planner';

interface BoardDetailsSheetContentProps {
  entry: MoodBoardEntry;
  appointmentDate: string;
}

export function BoardDetailsSheetContent({
  entry,
  appointmentDate,
}: BoardDetailsSheetContentProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetScrollView
      contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
    >
      {/* Board Title */}
      <Text
        variant="h2"
        weight="bold"
        color={theme.colors.text.high}
        style={{
          marginBottom: 4,
          textTransform: 'uppercase',
          fontStyle: 'italic',
          letterSpacing: -1,
        }}
      >
        {entry.name}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        {entry.isSecret ? (
          <Lock size={14} color={theme.colors.primary} strokeWidth={2} />
        ) : (
          <Globe size={14} color={theme.colors.primary} strokeWidth={2} />
        )}
        <Text
          variant="caption"
          weight="bold"
          color={theme.colors.primary}
          style={{ letterSpacing: 2, textTransform: 'uppercase', fontSize: 10 }}
        >
          {entry.isSecret ? 'SECRET BOARD' : 'PUBLIC BOARD'}
        </Text>
      </View>

      {/* Appointment Section */}
      {appointmentDate && (
        <View style={{ position: 'relative', marginBottom: 16 }}>
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              right: -4,
              bottom: -4,
              backgroundColor: theme.colors.primary,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
            }}
          />
          <View
            style={{
              padding: 16,
              backgroundColor: theme.colors.surface,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
            }}
          >
            <Text
              variant="caption"
              weight="bold"
              color={theme.colors.accent}
              style={{
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 12,
                fontSize: 10,
              }}
            >
              SALON APPOINTMENT
            </Text>
            <DetailRow
              icon={<Calendar size={18} color={theme.colors.primary} strokeWidth={2} />}
              label={appointmentDate}
              theme={theme}
            />
            {entry.stylistLocation && (
              <DetailRow
                icon={<MapPin size={18} color={theme.colors.primary} strokeWidth={2} />}
                label={entry.stylistLocation}
                theme={theme}
              />
            )}
            {(entry as any).stylistName && (
              <DetailRow
                icon={<FileText size={18} color={theme.colors.primary} strokeWidth={2} />}
                label={`Stylist: ${(entry as any).stylistName}`}
                theme={theme}
              />
            )}
          </View>
        </View>
      )}

      {/* Pricing */}
      {((entry.stylistPrice ?? 0) > 0 || (entry.hairPrice ?? 0) > 0) && (
        <View style={{ position: 'relative', marginBottom: 16 }}>
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              right: -4,
              bottom: -4,
              backgroundColor: theme.colors.accentSecondary,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
            }}
          />
          <View
            style={{
              padding: 16,
              backgroundColor: theme.colors.surface,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
            }}
          >
            <Text
              variant="caption"
              weight="bold"
              color={theme.colors.accent}
              style={{
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 12,
                fontSize: 10,
              }}
            >
              PRICING
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text
                  variant="h3"
                  weight="bold"
                  color={theme.colors.text.high}
                  style={{ fontSize: 22 }}
                >
                  ${entry.stylistPrice ?? 0}
                </Text>
                <Text
                  variant="caption"
                  weight="bold"
                  color={theme.colors.primary}
                  style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}
                >
                  STYLIST
                </Text>
              </View>
              <View
                style={{ width: 2, backgroundColor: theme.colors.text.high, marginHorizontal: 16 }}
              />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text
                  variant="h3"
                  weight="bold"
                  color={theme.colors.text.high}
                  style={{ fontSize: 22 }}
                >
                  ${entry.hairPrice ?? 0}
                </Text>
                <Text
                  variant="caption"
                  weight="bold"
                  color={theme.colors.primary}
                  style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}
                >
                  HAIR
                </Text>
              </View>
              <View
                style={{ width: 2, backgroundColor: theme.colors.text.high, marginHorizontal: 16 }}
              />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text
                  variant="h3"
                  weight="bold"
                  color={theme.colors.accent}
                  style={{ fontSize: 22 }}
                >
                  ${Number(entry.stylistPrice || 0) + Number(entry.hairPrice || 0)}
                </Text>
                <Text
                  variant="caption"
                  weight="bold"
                  color={theme.colors.primary}
                  style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}
                >
                  TOTAL
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Notes */}
      {entry.notes && (
        <View style={{ position: 'relative', marginBottom: 16 }}>
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              right: -4,
              bottom: -4,
              backgroundColor: theme.colors.primary,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
            }}
          />
          <View
            style={{
              padding: 16,
              backgroundColor: theme.colors.surface,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
            }}
          >
            <Text
              variant="caption"
              weight="bold"
              color={theme.colors.accent}
              style={{
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 8,
                fontSize: 10,
              }}
            >
              NOTES
            </Text>
            <Text variant="body" color={theme.colors.text.high} style={{ lineHeight: 22 }}>
              {entry.notes}
            </Text>
          </View>
        </View>
      )}

      {/* Timestamps */}
      <View style={{ marginTop: 8 }}>
        {entry.createdAt && (
          <Text
            variant="caption"
            weight="bold"
            color={theme.colors.primary}
            style={{ marginBottom: 4, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}
          >
            Created {format(new Date(entry.createdAt), 'MMM d, yyyy')}
          </Text>
        )}
        {entry.updatedAt && (
          <Text
            variant="caption"
            weight="bold"
            color={theme.colors.primary}
            style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}
          >
            Updated {format(new Date(entry.updatedAt), 'MMM d, yyyy')}
          </Text>
        )}
      </View>
    </BottomSheetScrollView>
  );
}

function DetailRow({ icon, label, theme }: { icon: React.ReactNode; label: string; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      {icon}
      <Text
        variant="body"
        weight="semibold"
        color={theme.colors.text.high}
        style={{ flex: 1, fontSize: 14 }}
      >
        {label}
      </Text>
    </View>
  );
}
