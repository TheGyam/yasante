import { Share } from 'react-native';
import type { Content, ContentTopic } from './types';

export const TOPIC_LABELS: Record<ContentTopic, string> = {
  care: 'Hair care',
  growth: 'Growth',
  styling: 'Styling',
  treatments: 'Treatments',
  products: 'Products',
  health: 'Scalp & health',
  color: 'Colour',
  tips: 'Quick tips',
};

export const TOPIC_ORDER: readonly ContentTopic[] = [
  'care',
  'growth',
  'styling',
  'treatments',
  'products',
  'health',
  'color',
  'tips',
];

export type ArticleBlock = { type: 'heading' | 'paragraph'; text: string };

/**
 * Split article text into headings and paragraphs. A block is a heading when it's a
 * short Title Case line with no closing punctuation.
 */
export function parseArticle(text: string): ArticleBlock[] {
  return text
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const heading =
        block.length < 80 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(block) && !/[.?!]$/.test(block);
      return { type: heading ? 'heading' : 'paragraph', text: block } as const;
    });
}

const RATIOS = [1.32, 1.56, 1.24, 1.44, 1.62, 1.36] as const;

/**
 * A stable height ratio for a feed card. The API doesn't send image dimensions, so
 * this varies heights for a natural masonry rhythm without the layout ever shifting.
 */
export function feedAspectRatio(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return RATIOS[Math.abs(hash) % RATIOS.length];
}

const TIPS = [
  'Use a heat protectant before any heat styling. It’s the cheapest insurance your ends will ever get.',
  'Deep condition once a week. Consistency does more for moisture than any single product.',
  'Sleep on silk or satin. Less friction overnight means less breakage by morning.',
  'Trim every 6–8 weeks so split ends don’t travel up the strand.',
  'Detangle wet hair with a wide-tooth comb or your fingers, starting from the ends.',
];

/** The same tip all day, a different one tomorrow. */
export function tipOfTheDay(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return TIPS[day % TIPS.length];
}

export function shareContent(content: Pick<Content, 'title' | 'description'>) {
  return Share.share({
    title: content.title,
    message: content.description
      ? `${content.title} — ${content.description}\n\nFound on Yasante`
      : `${content.title}\n\nFound on Yasante`,
  }).catch(() => {});
}
