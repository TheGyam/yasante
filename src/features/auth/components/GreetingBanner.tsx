import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { makeStyles, space } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { getNextGreeting, getTimeOfDayPrefix } from '@/shared/utils/greetings';
import { useAuth } from '../AuthContext';

export interface GreetingBannerProps {
  firstName?: string;
}

const useStyles = makeStyles(() => ({
  wrap: { gap: space.xs },
}));

export function GreetingBanner({ firstName }: GreetingBannerProps) {
  const styles = useStyles();
  const { isAuthenticated } = useAuth();
  const [line, setLine] = useState('');

  useEffect(() => {
    let active = true;
    getNextGreeting()
      .then(text => active && setLine(text))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const name = isAuthenticated && firstName ? firstName : 'there';

  return (
    <View style={styles.wrap}>
      <Text variant="overline" tone="tertiary">
        {getTimeOfDayPrefix().replace(/[,\s]+$/, '')}
      </Text>
      <Text variant="title1" accessibilityRole="header">
        Hey {name}
      </Text>
      {!!line && (
        <Text variant="subhead" tone="secondary">
          {line}
        </Text>
      )}
    </View>
  );
}
