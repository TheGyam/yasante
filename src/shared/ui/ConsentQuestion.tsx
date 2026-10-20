import { View } from 'react-native';
import { useConsentStore } from '@/shared/config/consentStore';
import { CONSENT_WORDING, type AskedPurpose } from '@/shared/config/consentWording';
import { makeStyles, space } from '@/shared/theme';
import { Button } from './Button';
import { Screen } from './Screen';
import { Text } from './Text';

const useStyles = makeStyles(() => ({
  body: { flex: 1, justifyContent: 'space-between', paddingBottom: space.lg },
  words: { gap: space.md, paddingTop: space.xl },
  buttons: { flexDirection: 'row', gap: space.md },
  button: { flex: 1 },
}));

export interface ConsentQuestionProps {
  purpose: AskedPurpose;
  title?: string;
  /** Called after her answer is recorded. */
  onAnswered?: (granted: boolean) => void;
  modal?: boolean;
  back?: boolean;
  onBack?: () => void;
}

/**
 * One consent, asked on its own. Both answers look the same and weigh the same, so
 * neither is the easy one, and "Not now" costs her nothing beyond what it's for.
 */
export function ConsentQuestion({
  purpose,
  title: screenTitle,
  onAnswered,
  modal,
  back,
  onBack,
}: ConsentQuestionProps) {
  const styles = useStyles();
  const setConsent = useConsentStore(s => s.setConsent);
  const { title, body } = CONSENT_WORDING[purpose];

  const answer = (granted: boolean) => {
    setConsent(purpose, granted);
    onAnswered?.(granted);
  };

  return (
    <Screen
      title={screenTitle}
      scroll={false}
      modal={modal}
      back={back}
      onBack={onBack}
      testID={`consent-${purpose}`}
    >
      <View style={styles.body}>
        <View style={styles.words}>
          <Text variant="title1" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="body" tone="secondary">
            {body}
          </Text>
        </View>
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button label="Allow" variant="secondary" onPress={() => answer(true)} fullWidth />
          </View>
          <View style={styles.button}>
            <Button label="Not now" variant="secondary" onPress={() => answer(false)} fullWidth />
          </View>
        </View>
      </View>
    </Screen>
  );
}
