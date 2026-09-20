import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { CircleHelp, Scissors } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  formatDuration,
  formatPrice,
  parsePriceList,
  useImportMenu,
  type MenuItemDraft,
} from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Rise } from '@/shared/ui/Rise';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

const PLACEHOLDER = `Knotless braids – from £120 (5 hrs)
Cornrows £45
Take down and wash £30`;

/**
 * She already wrote her prices somewhere. This reads them, shows her what we
 * understood, and only then saves — nothing is guessed at behind her back.
 */
export default function PastePriceListScreen() {
  const styles = useStyles();
  const router = useRouter();
  const [text, setText] = useState('');
  const importMenu = useImportMenu();

  const parsed = useMemo(() => parsePriceList(text), [text]);
  const readable = parsed.filter(service => service.price !== undefined);
  const unreadable = parsed.filter(service => service.price === undefined);

  const save = async () => {
    const drafts: MenuItemDraft[] = readable.map(service => ({
      name: service.name,
      price: service.price!,
      fromPrice: service.fromPrice,
      durationMinutes: service.durationMinutes,
    }));
    try {
      await importMenu.mutateAsync(drafts);
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t add those',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title="Paste a price list" modal keyboard testID="menu-paste-screen">
      <View style={styles.body}>
        <Text variant="subhead" tone="secondary">
          Copy it from your notes, your bio or a WhatsApp broadcast. One service per line.
        </Text>

        <Input
          label="Your price list"
          value={text}
          onChangeText={setText}
          placeholder={PLACEHOLDER}
          multiline
          autoCapitalize="none"
          style={{ minHeight: 160 }}
          testID="paste-field"
        />

        {readable.length > 0 && (
          <Section
            title={`${readable.length} ${readable.length === 1 ? 'service' : 'services'} found`}
            footer="Check these read right — you can edit any of them afterwards."
          >
            {readable.map((service, index) => (
              // Each line lands a beat after the one above: the list being read.
              <Rise key={`${service.raw}-${index}`} index={index}>
                <ListRow
                  title={service.name}
                  subtitle={
                    service.durationMinutes ? formatDuration(service.durationMinutes) : undefined
                  }
                  value={formatPrice({ price: service.price!, fromPrice: service.fromPrice })}
                  icon={Scissors}
                />
              </Rise>
            ))}
          </Section>
        )}

        {unreadable.length > 0 && (
          <Section
            title="No price on these"
            footer="We won’t add a price we had to guess. Add these yourself if you need them."
          >
            {unreadable.map((service, index) => (
              <ListRow
                key={`${service.raw}-${index}`}
                title={service.name}
                icon={CircleHelp}
                iconTone="neutral"
              />
            ))}
          </Section>
        )}

        <View style={styles.footer}>
          <Button
            label={readable.length ? `Add ${readable.length} to my menu` : 'Add to my menu'}
            onPress={save}
            disabled={!readable.length}
            loading={importMenu.isPending}
            fullWidth
            testID="paste-save"
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
