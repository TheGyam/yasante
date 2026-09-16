import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { Text } from '@/shared/legacy/ui/Text';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { CollectionCard } from '@/features/planner';
import type { MoodBoardEntry } from '@/features/planner';

interface SavedBoardsTabProps {
  entries: MoodBoardEntry[];
  isLoading: boolean;
}

export function SavedBoardsTab({ entries, isLoading }: SavedBoardsTabProps) {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <View
          style={{
            width: 80,
            height: 80,
            backgroundColor: theme.colors.accent,
            borderWidth: 4,
            borderColor: theme.colors.text.high,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            transform: [{ rotate: '10deg' }],
          }}
        >
          <Bookmark size={40} color={theme.colors.surface} strokeWidth={2} />
        </View>
        <Text
          variant="h3"
          weight="bold"
          color={theme.colors.text.high}
          style={{
            textAlign: 'center',
            marginBottom: 4,
            textTransform: 'uppercase',
            fontStyle: 'italic',
            fontSize: 22,
          }}
        >
          NO SAVED BOARDS
        </Text>
        <Text
          variant="caption"
          color={theme.colors.primary}
          style={{
            textAlign: 'center',
            marginBottom: 24,
            fontWeight: '700',
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontSize: 10,
          }}
        >
          EXPLORE AND SAVE BOARDS FROM THE GALLERY
        </Text>
      </View>
    );
  }

  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
      }}
    >
      {sortedEntries.map((entry, index) => (
        <CollectionCard key={entry.id} entry={entry} index={index} />
      ))}
    </View>
  );
}
