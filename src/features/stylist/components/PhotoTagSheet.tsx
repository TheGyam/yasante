import { View } from 'react-native';
import { Check, Scissors, Tag, Trash2 } from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { ListRow } from '@/shared/ui/ListRow';
import { Section } from '@/shared/ui/Section';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';
import { formatPrice } from '../format';
import { useMyCurrency } from '../hooks';
import type { MenuItem } from '../types';

export interface PhotoTagSheetProps {
  visible: boolean;
  onClose: () => void;
  services: MenuItem[];
  /** The service tagged on the photo, if any. */
  value?: string;
  onChange: (serviceId?: string) => void;
  /** Offered only where a photo can actually be taken down. */
  onRemove?: () => void;
  title?: string;
}

const useStyles = makeStyles(() => ({
  body: { gap: space.lg, paddingBottom: space.lg },
}));

/**
 * Which service a photo shows. It's the tag that earns its keep: it puts a price
 * beside the picture a client is looking at.
 */
export function PhotoTagSheet({
  visible,
  onClose,
  services,
  value,
  onChange,
  onRemove,
  title = 'What is this?',
}: PhotoTagSheetProps) {
  const styles = useStyles();
  const currency = useMyCurrency();
  const theme = useTheme();

  const tick = (selected: boolean) =>
    selected ? <Check size={18} color={theme.colors.accent} strokeWidth={2.4} /> : null;

  const choose = (serviceId?: string) => {
    onChange(serviceId);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text variant="title3">{title}</Text>
        {services.length ? (
          <Section footer="Tagged photos show the price beside them on your page.">
            {services.map(service => (
              <ListRow
                key={service.id}
                title={service.name}
                value={formatPrice(service, currency)}
                icon={Scissors}
                trailing={tick(service.id === value)}
                onPress={() => choose(service.id)}
              />
            ))}
          </Section>
        ) : (
          <Text variant="body" tone="secondary">
            Add services to your menu and you can say which one each photo shows.
          </Text>
        )}
        <Section>
          <ListRow
            title="No service"
            icon={Tag}
            iconTone="neutral"
            trailing={tick(!value)}
            onPress={() => choose(undefined)}
          />
          {onRemove && (
            <ListRow
              title="Remove this photo"
              icon={Trash2}
              destructive
              onPress={() => {
                onClose();
                onRemove();
              }}
            />
          )}
        </Section>
      </View>
    </Sheet>
  );
}
