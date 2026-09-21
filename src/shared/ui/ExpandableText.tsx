import { useState, type ReactNode } from 'react';
import { Text, type TextProps } from './Text';

export interface ExpandableTextProps extends Omit<TextProps, 'children'> {
  text: string;
  /** Characters shown before "more". */
  limit?: number;
  /** Laid in front of the text, inside the same line — "@Ama" on a reply. */
  prefix?: ReactNode;
}

/** Room left over is shown rather than hidden: "more" for ten characters is a tease. */
const SLACK = 40;

/**
 * Long text, cut at a word near `limit` with "more" to read the rest — the way
 * social apps keep a long comment from taking over the thread. Counted in
 * characters rather than measured lines, so it costs no layout pass and reads the
 * same at every text size. Inside a recycled list, key it by the item so a reused
 * row starts closed.
 */
export function ExpandableText({ text, limit = 180, prefix, ...textProps }: ExpandableTextProps) {
  const [open, setOpen] = useState(false);
  const long = text.length > limit + SLACK;
  const cut = text.lastIndexOf(' ', limit);
  const shown = !long || open ? text : `${text.slice(0, cut > limit / 2 ? cut : limit).trimEnd()}…`;

  return (
    <Text {...textProps}>
      {prefix}
      {shown}
      {long && !open && (
        <Text
          {...textProps}
          tone="tertiary"
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Read the rest"
          suppressHighlighting
        >
          {' '}
          more
        </Text>
      )}
    </Text>
  );
}
