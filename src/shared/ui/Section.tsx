import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { makeStyles, radius, space } from '@/shared/theme';
import { Glass } from './Glass';
import { Text } from './Text';

export interface SectionProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

const useStyles = makeStyles(t => ({
  wrap: { gap: space.sm },
  header: { marginLeft: space.lg },
  group: { overflow: 'hidden' },
  separator: { height: 1, backgroundColor: t.colors.separator, marginLeft: space.lg },
  footer: { marginHorizontal: space.lg },
}));

/** A titled glass group of rows, with hairline separators between them. */
export function Section({ title, footer, children }: SectionProps) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.wrap}>
      {title && (
        <Text variant="overline" tone="tertiary" style={styles.header}>
          {title}
        </Text>
      )}
      <Glass radius={radius.lg} style={styles.group}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.separator} />}
            {row}
          </Fragment>
        ))}
      </Glass>
      {footer && (
        <Text variant="footnote" tone="tertiary" style={styles.footer}>
          {footer}
        </Text>
      )}
    </View>
  );
}
