import { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import Constants from 'expo-constants';
import { SUPPORT_EMAIL } from '@/shared/config/policies';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  details: { minHeight: 140 },
}));

/**
 * Opens the person's own mail app with the report filled in. There's no support
 * backend yet, and pretending to submit something nobody receives would be worse.
 */
export default function ReportScreen() {
  const styles = useStyles();
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string>();

  const send = async () => {
    if (!details.trim()) {
      setError('Tell us what happened');
      return;
    }
    const device = `${Platform.OS} ${Platform.Version} · Yasante ${Constants.expoConfig?.version ?? ''}`;
    const url =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(subject.trim() || 'Problem report')}` +
      `&body=${encodeURIComponent(`${details.trim()}\n\n—\n${device}`)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No mail app found', `Email us at ${SUPPORT_EMAIL} and we’ll take a look.`);
    }
  };

  return (
    <Screen title="Report a problem" back keyboard testID="report-problem-screen">
      <View style={styles.body}>
        <Text variant="body" tone="secondary">
          Tell us what went wrong. We’ll open your mail app with this filled in, plus your device
          and app version so we can reproduce it.
        </Text>
        <Input
          label="Subject"
          placeholder="What’s it about?"
          value={subject}
          onChangeText={setSubject}
          maxLength={80}
        />
        <Input
          label="What happened"
          placeholder="What you did, what you expected, what you saw"
          multiline
          value={details}
          onChangeText={text => {
            setDetails(text);
            if (error) setError(undefined);
          }}
          error={error}
          style={styles.details}
        />
        <Button label="Write email" onPress={send} fullWidth />
      </View>
    </Screen>
  );
}
