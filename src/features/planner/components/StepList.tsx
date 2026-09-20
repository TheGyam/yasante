import { View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';

export interface StepListProps {
  steps: string[];
  onChange: (steps: string[]) => void;
  error?: string;
}

const useStyles = makeStyles(() => ({
  group: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  field: { flex: 1 },
  label: { marginLeft: space.xs },
}));

/** The steps of a plan, in the order they're done. Blank lines are dropped on save. */
export function StepList({ steps, onChange, error }: StepListProps) {
  const styles = useStyles();

  const set = (index: number, text: string) =>
    onChange(steps.map((step, i) => (i === index ? text : step)));

  return (
    <View style={styles.group}>
      <Text variant="footnote" tone="secondary" style={styles.label}>
        The steps, in order
      </Text>
      {steps.map((step, index) => (
        <View key={index} style={styles.row}>
          <Input
            label={`Step ${index + 1}`}
            value={step}
            onChangeText={text => set(index, text)}
            containerStyle={styles.field}
            testID={`step-${index}`}
          />
          {steps.length > 1 && (
            <IconButton
              icon={X}
              variant="plain"
              size={36}
              accessibilityLabel={`Remove step ${index + 1}`}
              onPress={() => onChange(steps.filter((_, i) => i !== index))}
            />
          )}
        </View>
      ))}
      {!!error && (
        <Text variant="footnote" tone="danger" style={styles.label}>
          {error}
        </Text>
      )}
      <Button
        label="Add a step"
        icon={Plus}
        variant="secondary"
        size="sm"
        onPress={() => onChange([...steps, ''])}
        testID="add-step"
      />
    </View>
  );
}
