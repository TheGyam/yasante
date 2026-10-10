/**
 * The menu's starting points, the app's own (src/features/stylist/format.ts): what most
 * braiders offer and how it's usually priced. Never a price — that's hers to say.
 */
import type { MenuItem, MenuOption, OptionGroup } from './types';

export const OPTION_GROUPS: { group: OptionGroup; name: string }[] = [
  { group: 'length', name: 'Length' },
  { group: 'size', name: 'Size' },
];

/** The groups a service is priced by, each with its choices in order. */
export function optionGroups(item: Pick<MenuItem, 'options'>) {
  return OPTION_GROUPS.map(({ group, name }) => ({
    group,
    name,
    choices: (item.options ?? []).filter(o => o.group === group),
  })).filter(g => g.choices.length > 0);
}

export type ChosenOptions = Partial<Record<OptionGroup, string>>;

/**
 * What it comes to with her choices: the base, plus each chosen option. Exact once
 * every group is chosen; a starting price until then. The app's own sum; the server
 * prices the request itself either way.
 */
export function estimate(item: MenuItem, chosen: ChosenOptions = {}) {
  const groups = optionGroups(item);
  const picked = groups
    .map(g => g.choices.find(c => c.id === chosen[g.group]))
    .filter((o): o is MenuOption => !!o);
  const complete = picked.length === groups.length;
  return {
    price: item.price + picked.reduce((sum, o) => sum + o.add, 0),
    minutes: item.durationMinutes
      ? item.durationMinutes + picked.reduce((sum, o) => sum + (o.addMinutes ?? 0), 0)
      : undefined,
    labels: picked.map(o => o.label),
    fromPrice: groups.length ? !complete : item.fromPrice,
    complete,
  };
}

export interface OptionDraft {
  group: OptionGroup;
  label: string;
  add: number;
  addMinutes?: number;
}

/** Typical London braid pricing, to start her off — she changes every number. */
export const TYPICAL_OPTIONS: OptionDraft[] = [
  { group: 'length', label: 'Shoulder', add: 0 },
  { group: 'length', label: 'Mid-back', add: 20, addMinutes: 60 },
  { group: 'length', label: 'Waist', add: 40, addMinutes: 120 },
  { group: 'size', label: 'Large', add: 0 },
  { group: 'size', label: 'Medium', add: 20, addMinutes: 60 },
  { group: 'size', label: 'Small', add: 40, addMinutes: 120 },
];

export const SERVICE_PRESETS: { name: string; minutes: number; by: OptionGroup[] }[] = [
  { name: 'Knotless braids', minutes: 300, by: ['length', 'size'] },
  { name: 'Box braids', minutes: 300, by: ['length', 'size'] },
  { name: 'Cornrows', minutes: 120, by: ['size'] },
  { name: 'Feed-in braids', minutes: 180, by: ['size'] },
  { name: 'Boho braids', minutes: 360, by: ['length', 'size'] },
  { name: 'Twists', minutes: 240, by: ['length', 'size'] },
  { name: 'Faux locs', minutes: 360, by: ['length'] },
  { name: 'Silk press', minutes: 120, by: [] },
  { name: 'Wig install', minutes: 120, by: [] },
  { name: 'Take down and wash', minutes: 60, by: [] },
];

/** How long a job takes, in half hours up to ten hours. */
export const DURATIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 30);
