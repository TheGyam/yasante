import { View } from 'react-native';
import { makeStyles, space } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { parseArticle } from '../content';

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  heading: { marginTop: space.md },
}));

/** Renders plain article text as headings and paragraphs. */
export function ArticleBody({ text }: { text: string }) {
  const styles = useStyles();
  const blocks = parseArticle(text);

  return (
    <View style={styles.body}>
      {blocks.map((block, i) =>
        block.type === 'heading' ? (
          <Text key={i} variant="title3" style={styles.heading} accessibilityRole="header">
            {block.text}
          </Text>
        ) : (
          <Text key={i} variant="body" style={{ lineHeight: 26 }}>
            {block.text}
          </Text>
        )
      )}
    </View>
  );
}
