import type { HairTexture } from '@/features/profile';

/**
 * A look is finished work, posted by the person who did it. It carries its author
 * with it — a client who likes a look has to be one tap from the page that prices
 * it, or the feed is just pictures.
 */
export interface Look {
  id: string;
  authorId: string;
  authorName: string;
  /** The stylist page the author's name links to, when she has one. */
  authorHandle?: string;
  authorAvatarUri?: string;
  photoUri: string;
  caption?: string;
  /** Who did the hair: the author when a stylist posts, the one she tagged when a client does. */
  stylist?: { id: string; name: string; handle?: string };
  /** Taken from her menu when she tagged one, so the price shown is the real price. */
  serviceId?: string;
  serviceName?: string;
  price?: number;
  fromPrice?: boolean;
  /** Style ids from the taxonomy. */
  styles: string[];
  /** The hair in the photo, which is what "hair like mine" matches on. */
  hairTexture?: HairTexture;
  /** The stylist's district, never more. */
  area?: string;
  /** Products used on it, from the catalogue. */
  products?: TaggedProduct[];
  /** `private` is a record for herself: never in the feed, never on the web. */
  visibility: LookVisibility;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  createdAt: string;
  /** True on your own looks: you can take one down, but not report it. */
  mine?: boolean;
}

export interface LookDraft {
  photoUri: string;
  caption?: string;
  /** A stylist tags her own service. */
  serviceId?: string;
  /** A client tags who did it, through the completed booking — never a free-typed name. */
  bookingId?: string;
  styles: string[];
  hairTexture?: HairTexture;
  /** Catalogue product ids, from her shelf. */
  productIds?: string[];
  visibility?: LookVisibility;
}

export type LookVisibility = 'public' | 'private';

export interface TaggedProduct {
  id: string;
  brand: string;
  name: string;
}

/** A style in the taxonomy. The server owns the list. */
export interface Style {
  id: string;
  name: string;
}

export interface LookComment {
  id: string;
  lookId: string;
  authorId: string;
  authorName: string;
  authorAvatarUri?: string;
  body: string;
  createdAt: string;
  mine?: boolean;
}

export interface CommentsPage {
  data: LookComment[];
  nextCursor?: string;
}

/** What the feed is narrowed to. Nothing set is everything. */
export interface LookFilters {
  hair?: HairTexture;
  style?: string;
  area?: string;
}

/** Why someone reported a look. The wording is what the reporter sees. */
export const REPORT_REASONS = [
  { value: 'not-their-work', label: "It isn't their work" },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'hate', label: 'Hateful or abusive' },
  { value: 'scam', label: 'A scam, or selling something else' },
  { value: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

export interface LooksPage {
  data: Look[];
  /** Cursor for the next page, absent at the end. */
  nextCursor?: string;
}
