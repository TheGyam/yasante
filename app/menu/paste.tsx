import { memo, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Check, Lightbulb } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  formatDuration,
  parsePriceList,
  serviceKey,
  useImportMenu,
  useMenu,
  useMyCurrency,
  type MenuItemDraft,
  type ParsedService,
} from '@/features/stylist';
import { currencySymbol, formatMoney, parseMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { fonts, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Glass } from '@/shared/ui/Glass';
import { Input } from '@/shared/ui/Input';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  intro: { gap: space.sm },
  rows: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  off: { opacity: 0.5 },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { borderColor: t.colors.accent, backgroundColor: t.colors.accent },
  tickOff: { borderColor: t.colors.text.tertiary },
  fields: { flex: 1, gap: 2 },
  name: {
    fontFamily: fonts.medium,
    fontSize: 16,
    paddingVertical: 2,
    color: t.colors.text.primary,
  },
  price: {
    width: 88,
    minHeight: 40,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    backgroundColor: t.colors.glass.fill,
    fontFamily: fonts.semibold,
    fontSize: 16,
    textAlign: 'right',
    color: t.colors.text.primary,
  },
  needsPrice: { borderColor: t.colors.accent },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

const EXAMPLE = `BRAIDS
Knotless braids – from £120 (5 hrs)
Box braids £100-£140, 4h30
Cornrows £45
TWISTS
Passion twists 90
Take down and wash`;

/** What she's changed on a row. Anything unset reads from the line as pasted. */
interface RowEdit {
  name?: string;
  price?: string;
  include?: boolean;
}

interface Row {
  key: string;
  service: ParsedService;
  name: string;
  price: string;
  include: boolean;
  onMenu: boolean;
}

/**
 * One line, as read: tick it in or out, fix the name, put a price on one that had
 * none. Every change is hers — nothing is saved until she says.
 */
const PastedRow = memo(function PastedRow({
  row,
  onEdit,
}: {
  row: Row;
  onEdit: (key: string, edit: RowEdit) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const currency = useMyCurrency();
  const unpriced = !parseMoney(row.price);
  const detail = [
    row.service.durationMinutes ? formatDuration(row.service.durationMinutes) : undefined,
    row.service.fromPrice ? 'starting price' : undefined,
    row.onMenu ? 'already on your menu' : undefined,
    unpriced ? 'add a price' : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Glass style={[styles.row, !row.include && styles.off]}>
      <PressableScale
        onPress={() => onEdit(row.key, { include: !row.include })}
        haptic="selection"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: row.include }}
        accessibilityLabel={`Add ${row.name}`}
        style={[styles.tick, row.include ? styles.tickOn : styles.tickOff]}
      >
        {row.include && <Check size={14} color={theme.colors.text.onAccent} strokeWidth={3} />}
      </PressableScale>
      <View style={styles.fields}>
        <TextInput
          value={row.name}
          onChangeText={name => onEdit(row.key, { name })}
          style={styles.name}
          accessibilityLabel="Service name"
          autoCapitalize="sentences"
        />
        {!!detail && (
          <Text variant="caption" tone={unpriced ? 'accent' : 'tertiary'}>
            {detail}
          </Text>
        )}
      </View>
      <TextInput
        value={row.price ? `${currencySymbol(currency)}${row.price}` : ''}
        onChangeText={text =>
          onEdit(row.key, {
            price: text.replace(/[^\d.,]/g, ''),
            // Pricing a line is saying yes to it.
            include: parseMoney(text) > 0 ? true : row.include,
          })
        }
        placeholder={currencySymbol(currency)}
        placeholderTextColor={theme.colors.text.tertiary}
        keyboardType="decimal-pad"
        style={[styles.price, unpriced && styles.needsPrice]}
        accessibilityLabel={`Price for ${row.name}`}
      />
    </Glass>
  );
});

/**
 * She already wrote her prices somewhere. This reads them as she pastes, shows
 * every line it found ready to fix in place, and saves only what she ticks.
 */
export default function PastePriceListScreen() {
  const styles = useStyles();
  const router = useRouter();
  const [text, setText] = useState('');
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const importMenu = useImportMenu();
  const { data: menu = [] } = useMenu();
  const currency = useMyCurrency();

  const parsed = useMemo(() => parsePriceList(text), [text]);
  // Pasting the same list twice is the normal way to add the two services she
  // forgot, so anything already on the menu starts unticked rather than doubled.
  const onMenu = useMemo(() => new Set(menu.map(item => serviceKey(item.name))), [menu]);
  const headings = parsed.filter(p => p.heading).length;

  const rows: Row[] = useMemo(
    () =>
      parsed
        .map((service, index) => ({ service, key: `${index}:${service.raw}` }))
        .filter(({ service }) => !service.heading)
        .map(({ service, key }) => {
          const edit = edits[key] ?? {};
          const already = onMenu.has(serviceKey(service.name));
          const price = edit.price ?? (service.price !== undefined ? String(service.price) : '');
          return {
            key,
            service,
            name: edit.name ?? service.name,
            price,
            include: edit.include ?? (service.price !== undefined && !already),
            onMenu: already,
          };
        }),
    [parsed, edits, onMenu]
  );

  const onEdit = useMemo(
    () => (key: string, edit: RowEdit) =>
      setEdits(current => ({ ...current, [key]: { ...current[key], ...edit } })),
    []
  );

  const chosen = rows.filter(r => r.include && r.name.trim() && parseMoney(r.price) > 0);

  const save = async () => {
    const drafts: MenuItemDraft[] = chosen.map(r => ({
      name: r.name.trim(),
      price: parseMoney(r.price),
      fromPrice: r.service.fromPrice,
      durationMinutes: r.service.durationMinutes,
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
        <View style={styles.intro}>
          <Text variant="subhead" tone="secondary">
            Copy it from your notes, your bio or a WhatsApp broadcast, as it is. We read each line
            as you paste.
          </Text>
          {!text && (
            <Button
              label="See how it works"
              icon={Lightbulb}
              variant="ghost"
              size="sm"
              onPress={() => {
                setEdits({});
                setText(EXAMPLE);
              }}
            />
          )}
        </View>

        <Input
          label="Your price list"
          value={text}
          onChangeText={setText}
          placeholder={'Knotless braids – from £120 (5 hrs)\nCornrows £45'}
          multiline
          autoCapitalize="none"
          style={{ minHeight: 140 }}
          testID="paste-field"
        />

        {rows.length > 0 && (
          <View style={styles.rows}>
            <Text variant="overline" tone="tertiary">
              {rows.length} {rows.length === 1 ? 'line' : 'lines'} found
              {headings ? ` · ${headings} ${headings === 1 ? 'heading' : 'headings'} skipped` : ''}
            </Text>
            {rows.map(row => (
              <PastedRow key={row.key} row={row} onEdit={onEdit} />
            ))}
            <Text variant="caption" tone="tertiary">
              Tap a name or price to fix it. We never guess a price — a line without one waits for
              yours.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            label={
              chosen.length
                ? `Add ${chosen.length} ${chosen.length === 1 ? 'service' : 'services'}`
                : 'Add to my menu'
            }
            onPress={save}
            disabled={!chosen.length}
            loading={importMenu.isPending}
            fullWidth
            testID="paste-save"
          />
          {chosen.length > 1 && (
            <Text variant="caption" tone="tertiary" align="center">
              From {formatMoney(Math.min(...chosen.map(r => parseMoney(r.price))), currency)} to{' '}
              {formatMoney(Math.max(...chosen.map(r => parseMoney(r.price))), currency)} · you can
              edit any of them afterwards
            </Text>
          )}
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
