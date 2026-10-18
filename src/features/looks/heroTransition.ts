import { Keyboard, type View } from 'react-native';

export interface HeroRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Hero {
  lookId: string;
  /** The copy the tile already shows, so the photo moves without waiting to load. */
  uri: string;
  /** Which of the look's photos was on screen when it was tapped. */
  photoIndex?: number;
  /** Where the tile's photo sits on screen, in window coordinates. */
  from: HeroRect;
}

// One open at a time: the tapped tile hands its photo to the screen it opens.
let pending: Hero | null = null;

/**
 * Measure the tile's photo, remember it, then open the look. The look's page grows
 * the photo out of this rectangle (see app/looks/[id].tsx). If it can't be
 * measured the page simply fades in.
 */
export function openWithHero(photo: View | null, hero: Omit<Hero, 'from'>, open: () => void) {
  // The screen underneath stays alive under the look (it opens as an overlay), so a
  // focused field there, like search, would keep its keyboard up over the look.
  Keyboard.dismiss();
  if (!photo) return open();
  photo.measureInWindow((x, y, width, height) => {
    pending = width > 0 && height > 0 ? { ...hero, from: { x, y, width, height } } : null;
    open();
  });
}

/** The hero for this look, once: a later visit from elsewhere shouldn't replay it. */
export function takeHero(lookId: string): Hero | null {
  const hero = pending?.lookId === lookId ? pending : null;
  pending = null;
  return hero;
}
