import { differenceInDays } from 'date-fns';
import type { HairLength, HairProfile } from '../types';

export type SectionKey =
  | 'texture'
  | 'length'
  | 'density'
  | 'porosity'
  | 'goals'
  | 'scalp'
  | 'chemicals'
  | 'area'
  | 'budget';

export interface Section {
  key: SectionKey;
  title: string;
  help: string;
  /** Short name for the profile's list. */
  name: string;
  /** Can be skipped with "I'm not sure". */
  optional?: boolean;
  answered: (profile: HairProfile) => boolean;
}

/**
 * The hair profile, in the order it's asked. The first run asks the core; the
 * rest can be answered one at a time whenever she likes, and each one saves on
 * its own — so nothing is ever lost halfway.
 */
export const SECTIONS: readonly Section[] = [
  {
    key: 'texture',
    name: 'Curl pattern',
    title: 'Which strand looks like yours?',
    help: 'Pull out a single curl when your hair is dry and has no product in it.',
    answered: p => !!p.texture,
  },
  {
    key: 'length',
    name: 'Length',
    title: 'How long is it?',
    help: 'Drag along the figure to where it reaches.',
    answered: p => !!(p.length || p.shrunkLength),
  },
  {
    key: 'density',
    name: 'Density',
    title: 'How full is it?',
    help: '',
    optional: true,
    answered: p => !!p.density,
  },
  {
    key: 'porosity',
    name: 'Porosity',
    title: 'How does it take water?',
    help: '',
    optional: true,
    answered: p => !!p.porosity,
  },
  {
    key: 'goals',
    name: 'Goals',
    title: 'What are you working towards?',
    help: 'Pick as many as you like.',
    answered: p => !!p.goals?.length,
  },
  {
    key: 'scalp',
    name: 'Scalp',
    title: 'How’s your scalp?',
    help: 'Pick any that are true most of the time.',
    answered: p => !!p.scalp?.length,
  },
  {
    key: 'chemicals',
    name: 'Chemical history',
    title: 'Has your hair ever had any of these?',
    help: 'Stylists need to know before they quote. Pick all that apply.',
    answered: p => p.chemicals !== undefined,
  },
  {
    key: 'area',
    name: 'Area',
    title: 'Where would you like stylists near?',
    help: 'So the stylists you see are ones you can get to.',
    answered: p => !!p.area?.trim(),
  },
  {
    key: 'budget',
    name: 'Budget',
    title: 'What do you usually spend on a style?',
    help: 'Roughly, before hair. It helps us show prices that fit.',
    answered: p => !!p.budget,
  },
];

/** What the first run asks. The rest wait for the profile. */
export const CORE: readonly SectionKey[] = ['texture', 'length', 'density', 'porosity', 'goals'];

export const sectionFor = (key: string) => SECTIONS.find(s => s.key === key);

export function progressOf(profile?: HairProfile | null) {
  const done = SECTIONS.filter(s => profile && s.answered(profile)).length;
  return {
    done,
    total: SECTIONS.length,
    next: SECTIONS.find(s => !profile || !s.answered(profile)),
  };
}

const LENGTH_WORDS: Record<HairLength, string> = {
  cropped: 'Cropped',
  ear: 'Ear',
  chin: 'Chin',
  shoulder: 'Shoulder',
  armpit: 'Armpit',
  'bra-strap': 'Bra strap',
  'mid-back': 'Mid-back',
  waist: 'Waist',
  hip: 'Hip',
  tailbone: 'Tailbone',
};

/** "Mid-back stretched · Shoulder as it shrinks" — whichever of the two she's given. */
export function lengthLine(p: Pick<HairProfile, 'length' | 'shrunkLength'>) {
  return [
    p.length && `${LENGTH_WORDS[p.length]} stretched`,
    p.shrunkLength && `${LENGTH_WORDS[p.shrunkLength]} as it shrinks`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** A month on from the last length, it's worth asking again — that's the growth curve. */
export function lengthIsStale(profile?: HairProfile | null, now = new Date()) {
  if (!(profile?.length || profile?.shrunkLength) || !profile.lengthMeasuredAt) return false;
  return differenceInDays(now, new Date(profile.lengthMeasuredAt)) >= 30;
}

const SCALP_WORDS = {
  balanced: 'Balanced',
  dry: 'Dry',
  oily: 'Oily',
  flaky: 'Flaky',
  sensitive: 'Sensitive',
} as const;
const CHEMICAL_WORDS = {
  relaxer: 'Relaxer',
  texturiser: 'Texturiser',
  colour: 'Colour',
  bleach: 'Bleach',
  keratin: 'Keratin',
} as const;
const BUDGET_WORDS = {
  under_50: 'Under £50',
  '50_100': '£50–100',
  '100_150': '£100–150',
  '150_plus': '£150 or more',
} as const;
const GOAL_WORDS = {
  growth: 'Length',
  health: 'Health',
  moisture: 'Moisture',
  strength: 'Less breakage',
  color: 'Colour care',
  style: 'New styles',
} as const;

/** The answer to a section in a few words, for the profile's list. */
export function sectionSummary(
  key: SectionKey,
  p: HairProfile,
  labels: (p: HairProfile) => string[]
) {
  const [texture, length, density, porosity] = [
    p.texture && labels({ texture: p.texture })[0],
    p.length && labels({ length: p.length })[0],
    p.density && labels({ density: p.density })[0],
    p.porosity && labels({ porosity: p.porosity })[0],
  ];
  switch (key) {
    case 'texture':
      return texture;
    case 'length':
      return lengthLine(p) || undefined;
    case 'density':
      return density;
    case 'porosity':
      return porosity;
    case 'goals':
      return p.goals?.map(g => GOAL_WORDS[g]).join(', ');
    case 'scalp':
      return p.scalp?.map(s => SCALP_WORDS[s]).join(', ');
    case 'chemicals':
      return (
        p.chemicals &&
        (p.chemicals.length ? p.chemicals.map(c => CHEMICAL_WORDS[c]).join(', ') : 'None')
      );
    case 'area':
      return p.area?.trim();
    case 'budget':
      return p.budget && BUDGET_WORDS[p.budget];
  }
}
