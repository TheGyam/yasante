/** What her private link shows before she makes the page hers. */
export interface ClaimPreview {
  displayName: string;
  handle: string;
  avatarUri?: string;
  lookCount: number;
  /** Already public, or still being set up. */
  live: boolean;
  /** How many people are waiting to book her. Only her link ever shows this. */
  waiting: number;
  photos: { uri: string; thumbUri?: string }[];
}

/** One style her photos are tagged with, and whether she's priced it yet. */
export interface FinishStyle {
  slug: string;
  name: string;
  photoCount: number;
  priced: boolean;
}

/** The three things a claimed page needs before it takes bookings. */
export interface FinishState {
  styles: FinishStyle[];
  hoursSet: boolean;
  tagsChecked: boolean;
  done: boolean;
}

export interface StylePrice {
  style: string;
  price: number;
  fromPrice: boolean;
  durationMinutes?: number | null;
}
