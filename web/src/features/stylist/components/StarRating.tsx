import { Star } from 'lucide-react';
import { vars } from '@/shared/theme/vars.css';

/** Five stars, `value` of them filled. Read out as words, not five images. */
export function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span
      role="img"
      aria-label={`${value} out of 5 stars`}
      style={{ display: 'inline-flex', gap: 2 }}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          strokeWidth={2}
          aria-hidden
          style={{
            color: vars.color.gold,
            fill: n <= value ? vars.color.gold : 'transparent',
          }}
        />
      ))}
    </span>
  );
}
