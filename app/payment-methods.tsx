import { useState } from 'react';
import { View } from 'react-native';
import { Plus, Wallet, X } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  PaymentMethodForm,
  useMyStylistProfile,
  useUpdateStylistProfile,
  type PaymentMethod,
  type PaymentMethodDraft,
} from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const MAX = 5;
const EMPTY: PaymentMethodDraft = { label: 'Bank transfer', details: '' };

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  adding: { gap: space.lg },
}));

/**
 * The ways she's paid a deposit, typed once. Accepting a request is then a tap
 * on one of them instead of retyping her bank details every time.
 */
export default function PaymentMethodsScreen() {
  const styles = useStyles();
  const { data: profile, isLoading } = useMyStylistProfile();
  const update = useUpdateStylistProfile();
  const saved = profile?.paymentMethods ?? [];
  const [draft, setDraft] = useState<PaymentMethodDraft>();

  const save = async (paymentMethods: PaymentMethod[], title: string) => {
    try {
      await update.mutateAsync({ paymentMethods });
      haptics.success();
      return true;
    } catch (error) {
      haptics.error();
      await notify({ title, message: errorMessage(error, 'Check your connection and try again.') });
      return false;
    }
  };

  const add = async () => {
    if (!draft) return;
    const method = { id: `pay_${Date.now()}`, ...draft };
    if (await save([...saved, method], 'Couldn’t save that')) setDraft(undefined);
  };

  const remove = async (method: PaymentMethod) => {
    const yes = await confirm({
      title: `Remove ${method.label}?`,
      message: 'Clients you’ve already sent it to keep what they were sent.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (yes) {
      await save(
        saved.filter(m => m.id !== method.id),
        'Couldn’t remove it'
      );
    }
  };

  const ready = !!draft?.label.trim() && !!draft.details.trim();

  return (
    <Screen title="Getting paid" modal keyboard testID="payment-methods">
      <View style={styles.body}>
        <Text variant="subhead" tone="secondary">
          Save how clients pay your deposits. When you accept a request you just pick one.
        </Text>

        {isLoading ? (
          <Skeleton height={120} />
        ) : (
          saved.length > 0 && (
            <Section>
              {saved.map(method => (
                <ListRow
                  key={method.id}
                  title={method.label}
                  subtitle={method.details}
                  icon={Wallet}
                  trailing={
                    <IconButton
                      icon={X}
                      variant="plain"
                      size={32}
                      accessibilityLabel={`Remove ${method.label}`}
                      onPress={() => remove(method)}
                    />
                  }
                />
              ))}
            </Section>
          )
        )}

        {draft ? (
          <View style={styles.adding}>
            <PaymentMethodForm value={draft} onChange={setDraft} />
            <Button
              label="Save"
              onPress={add}
              disabled={!ready}
              loading={update.isPending}
              fullWidth
              testID="payment-save"
            />
            <Button label="Cancel" variant="ghost" onPress={() => setDraft(undefined)} fullWidth />
          </View>
        ) : (
          saved.length < MAX && (
            <Button
              label={saved.length ? 'Add another' : 'Add a way to be paid'}
              icon={Plus}
              variant={saved.length ? 'secondary' : 'primary'}
              onPress={() => setDraft(EMPTY)}
              fullWidth
              testID="payment-add"
            />
          )
        )}
      </View>
    </Screen>
  );
}
