/**
 * The client's own planning: what she's saving, and how she's looking after the
 * hair she has. Collections replace mood boards — the stylist, price and
 * appointment fields that used to live on a board belong to a booking now. Care
 * plans merge the old routines and treatments into one thing with ordered steps.
 */

export type CollectionItemKind = 'look' | 'content';

export interface Collection {
  id: string;
  name: string;
  /** Private by default. A public collection can be shared as a page. */
  isPrivate: boolean;
  itemCount: number;
  /** The newest item's picture, for the card. */
  coverUri?: string;
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

export interface CarePlan {
  id: string;
  name: string;
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
