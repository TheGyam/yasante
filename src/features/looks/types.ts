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
  /** A smaller copy for grids, from the server's media pipeline. Falls back to the photo. */
  thumbUri?: string;
  /** A 1080-wide copy for feeds, from the same pipeline. Falls back to the photo. */
  feedUri?: string;
  /** Width over height, from the server's media record, when it has one. */
  photoAspect?: number;
  /** Up to 5 photos, in the order the author chose. Use `lookPhotos()` to read these. */
  photos?: LookPhoto[];
  caption?: string;
  /** Who did the hair: the author when a stylist posts, the one she tagged when a client does. */
  stylist?: { id: string; name: string; handle?: string };
  /** Her page was set up by Yasante and isn't taking bookings yet: no price, no booking. */
  stylistFeatured?: boolean;
  /** Taken from her menu when she tagged one, so the price shown is the real price. */
  serviceId?: string;
  serviceName?: string;
  price?: number;
  /** The currency the price is in: the stylist's (ISO 4217). */
  currency?: string;
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
  /** How many people have it in a collection — the quietest signal someone wants it. */
  saveCount?: number;
  /** Whether you have it in one of yours. */
  saved?: boolean;
  createdAt: string;
  /** In a ranked feed: why it's there (a candidate source, such as "trending"). */
  source?: string;
  /** True on your own looks: you can take one down, but not report it. */
  mine?: boolean;
}

export interface LookDraft {
  /** 1 to 5 local photo uris, in the order she wants them shown. */
  photoUris: string[];
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

export interface LookPhoto {
  uri: string;
  thumbUri?: string;
  feedUri?: string;
  aspect?: number;
}

/**
 * A look's photos, in order. Older looks, and anything cached from before this
 * feature, carry no `photos` array — this falls back to the single cover photo
 * so they still render.
 */
export function lookPhotos(look: Look): LookPhoto[] {
  if (look.photos?.length) return look.photos;
  return [
    {
      uri: look.photoUri,
      thumbUri: look.thumbUri,
      feedUri: look.feedUri,
      aspect: look.photoAspect,
    },
  ];
}

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
  /** Set on a reply: the top-level comment whose thread it's in. */
  parentId?: string;
  /** Set on a reply: who it answers, shown as "@Name". */
  replyToName?: string;
  /** On a top-level comment: how many replies its thread has. */
  replyCount?: number;
  likeCount: number;
  liked: boolean;
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
  /** Words to search for: caption, style, service, the stylist or who posted it. */
  q?: string;
  /** Style ids from her recent searches, mixed through the feed. Never kept on the server. */
  searched?: string;
}

/** Why someone reported a look. The wording is what the reporter sees. */
export const REPORT_REASONS = [
  { value: 'not-their-work', label: "It isn't their work" },
  { value: 'not-hair', label: 'It’s not about hair' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'hate', label: 'Hateful or abusive' },
  { value: 'scam', label: 'A scam, or selling something else' },
  { value: 'illegal', label: 'Something illegal, or that puts someone in danger' },
  { value: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

export interface LooksPage {
  data: Look[];
  /** Cursor for the next page, absent at the end. */
  nextCursor?: string;
  /** On the first page while the ranked feed is on: what she sees is recorded against it. */
  session?: string;
}
