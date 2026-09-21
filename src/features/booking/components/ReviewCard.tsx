import { View } from 'react-native';
import { format } from 'date-fns';
import { Flag } from 'lucide-react-native';
import { makeStyles, space } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { IconButton } from '@/shared/ui/IconButton';
import { StarRating } from '@/shared/ui/StarRating';
import { Text } from '@/shared/ui/Text';
import type { Review } from '../types';

const useStyles = makeStyles(() => ({
  body: { gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));

export interface ReviewCardProps {
  review: Review;
  onReport: (review: Review) => void;
}

/** One review, with who left it (first name only), what for, and a way to report it. */
export function ReviewCard({ review, onReport }: ReviewCardProps) {
  const styles = useStyles();
  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.top}>
          <StarRating value={review.rating} size={14} />
          <IconButton
            icon={Flag}
            size={32}
            accessibilityLabel={`Report ${review.authorName}'s review`}
            onPress={() => onReport(review)}
          />
        </View>
        {!!review.body && <Text variant="body">{review.body}</Text>}
        <Text variant="footnote" tone="tertiary">
          {review.authorName} · {review.serviceName} ·{' '}
          {format(new Date(review.createdAt), 'MMM yyyy')}
        </Text>
      </View>
    </Card>
  );
}
