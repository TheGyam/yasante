import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api';
import { makeStyles, space } from '@/shared/theme';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';

interface Category {
  id: string;
  label: string;
  on: boolean;
}

const KEY = ['notification-preferences'];
const URL = '/api/notifications/preferences/';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

/** Which kinds of notification she gets. Account messages can't be turned off. */
export default function NotificationSettingsScreen() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { data, isError } = useQuery({
    queryKey: KEY,
    queryFn: async () => (await apiClient.get<{ categories: Category[] }>(URL)).data.categories,
  });

  const save = useMutation({
    mutationFn: async (categories: Category[]) =>
      (await apiClient.put<{ categories: Category[] }>(URL, { categories })).data.categories,
    // The switch moves at once; a failed save puts it back.
    onMutate: async categories => {
      const before = queryClient.getQueryData<Category[]>(KEY);
      queryClient.setQueryData(KEY, categories);
      return { before };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(KEY, context?.before),
    onSuccess: categories => queryClient.setQueryData(KEY, categories),
  });

  const toggle = (id: string, on: boolean) =>
    data && save.mutate(data.map(c => (c.id === id ? { ...c, on } : c)));

  return (
    <Screen title="Notifications" back testID="notification-settings-screen">
      <View style={styles.body}>
        {isError && !data ? (
          <Text tone="secondary">Couldn’t load your settings. Check your connection.</Text>
        ) : (
          <Section footer="Messages about your account and badges always come through.">
            {(data ?? []).map(category => (
              <ListRow
                key={category.id}
                title={category.label}
                trailing={
                  <Toggle
                    value={category.on}
                    disabled={category.id === 'account'}
                    onValueChange={on => toggle(category.id, on)}
                    accessibilityLabel={category.label}
                  />
                }
              />
            ))}
          </Section>
        )}
      </View>
    </Screen>
  );
}
