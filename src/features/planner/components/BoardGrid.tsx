import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import type { MoodBoardEntry } from '../types';
import { BoardCard } from './BoardCard';

const useStyles = makeStyles(() => ({
  grid: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  filler: { flex: 1 },
}));

/** Boards two to a row. Opening one goes to its detail in the planner. */
export function BoardGrid({ entries }: { entries: readonly MoodBoardEntry[] }) {
  const styles = useStyles();
  const router = useRouter();
  const open = (entry: MoodBoardEntry) => router.push(`/board/${entry.id}`);

  const rows: MoodBoardEntry[][] = [];
  for (let i = 0; i < entries.length; i += 2) rows.push(entries.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map(row => (
        <View key={row[0].id} style={styles.row}>
          {row.map(entry => (
            <BoardCard key={entry.id} entry={entry} onPress={open} />
          ))}
          {row.length === 1 && <View style={styles.filler} />}
        </View>
      ))}
    </View>
  );
}
