/**
 * The client's own planning: what she's saving, and how she's looking after the
 * hair she has. Collections replace mood boards — the stylist, price and
 * appointment fields that used to live on a board belong to a booking now. Care
 * plans merge the old routines and treatments into one thing with ordered steps.
 */

export type CollectionItemKind = 'look' | 'content';

/** "Only you", or anyone with its link. Never shared until she chooses. */
export type Sharing = 'private' | 'link';

/** Who made something shared: all anyone else sees of her. */
export interface SharedAuthor {
  name: string;
  username?: string;
  avatarUri?: string;
}

/** What only the author sees of something she shares: counts, never who. */
export interface ShareState {
  /** Missing from servers older than sharing: the same as 'private'. */
  sharing?: Sharing;
  /** Her link, while it's shared. */
  shareUrl?: string;
  /** How many follow it, and how many made it theirs. */
  followers?: number;
  madeItTheirs?: number;
}

/** Someone else's, which she follows: it updates as they change it, and isn't hers to edit. */
export interface Following {
  author: SharedAuthor;
  code: string;
  /** When they last changed it. */
  updatedAt: string;
}

/** Hers, started from someone else's ("Based on Winter braids by Ama"). */
export interface BasedOn {
  name: string;
  authorName: string;
  /** The original's link, while it's still shared. */
  code?: string;
}

export interface Collection extends ShareState {
  id: string;
  name: string;
  /** The same as `sharing === 'private'`, for older versions of the app. */
  isPrivate: boolean;
  following?: Following;
  basedOn?: BasedOn;
  itemCount: number;
  /** The newest item's picture, for the card. */
  coverUri?: string;
  /** The newest few pictures, newest first, for the stacked card. */
  previewUris?: string[];
  createdAt: string;
}

export interface CollectionItem {
  id: string;
  kind: CollectionItemKind;
  /** The look or the article this points at. */
  refId: string;
  imageUri?: string;
  title?: string;
  addedAt: string;
}

export type CarePlanFrequency = 'daily' | 'every-2-days' | 'weekly' | 'specific-days';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** One thing to do, in the order it's done. */
export interface CarePlanStep {
  id: string;
  text: string;
}

/** A time the plan was actually followed. Appended, never overwritten. */
export interface CarePlanSession {
  id: string;
  completedAt: string;
  notes?: string;
}

export interface CarePlan extends ShareState {
  id: string;
  name: string;
  /** Someone else's she follows: their steps, her own schedule. */
  following?: Following;
  basedOn?: BasedOn;
  frequency: CarePlanFrequency;
  /** 0–6, Sunday = 0. Only when the frequency is specific days. */
  specificDays?: number[];
  timeOfDay: TimeOfDay;
  remindersOn: boolean;
  steps: CarePlanStep[];
  /** When it was last done, which is what the next due date is counted from. */
  lastDoneAt?: string;
  createdAt: string;
}

/** Everything the form sends. The server owns ids, sessions and dates. */
export type CarePlanDraft = Pick<
  CarePlan,
  'name' | 'frequency' | 'specificDays' | 'timeOfDay' | 'remindersOn'
> & {
  /** Steps as text, in order — the server gives them ids. */
  steps: string[];
};

/** A shared collection, as anyone with its link sees it. */
export interface SharedCollection {
  code: string;
  name: string;
  author: SharedAuthor;
  itemCount: number;
  updatedAt: string;
  previewUris: string[];
  items: CollectionItem[];
  /** It's hers: the id of her own, which she sees instead. */
  ownId?: string;
  /** She follows it: the id of it in her Planner. */
  followingId?: string;
}

/** A shared care plan, as anyone with its link sees it: the steps and the author's rhythm. */
export interface SharedCarePlan {
  code: string;
  name: string;
  author: SharedAuthor;
  frequency: CarePlanFrequency;
  specificDays?: number[];
  timeOfDay: TimeOfDay;
  steps: CarePlanStep[];
  updatedAt: string;
  ownId?: string;
  followingId?: string;
}

/** Her own rhythm for a plan she follows. */
export type CarePlanSchedule = Pick<
  CarePlan,
  'frequency' | 'specificDays' | 'timeOfDay' | 'remindersOn'
>;
