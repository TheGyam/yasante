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
  /** Taken from her menu when she tagged one, so the price shown is the real price. */
  serviceName?: string;
  price?: number;
  fromPrice?: boolean;
  createdAt: string;
  /** True on your own looks: you can take one down, but not report it. */
  mine?: boolean;
}

export interface LookDraft {
  photoUri: string;
  caption?: string;
  serviceId?: string;
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
