import type { HairDensity, HairLength, HairPorosity, HairProfile, HairTexture } from './types';

const TEXTURE: Record<HairTexture, string> = {
  straight: 'Straight',
  wavy: 'Wavy',
  curly: 'Curly',
  coily: 'Coily',
  kinky: 'Zig-zag coils',
};
/** How each texture is named to people, not in the chart's numbers. */
export const TEXTURE_LABELS = TEXTURE;

const LENGTH: Record<HairLength, string> = {
  cropped: 'TWA',
  ear: 'Ear length',
  chin: 'Chin length',
  neck: 'Neck length',
  shoulder: 'Shoulder length',
  armpit: 'Armpit length',
  'bra-strap': 'Bra-strap length',
  'mid-back': 'Mid-back length',
  waist: 'Waist length',
  hip: 'Hip length',
  tailbone: 'Tailbone length',
};
const DENSITY: Record<HairDensity, string> = {
  fine: 'Low density',
  medium: 'Medium density',
  thick: 'High density',
};
const POROSITY: Record<HairPorosity, string> = {
  low: 'Low porosity',
  medium: 'Medium porosity',
  high: 'High porosity',
};

/** ["Coily", "Shoulder length", "High density", "Low porosity"] — only what's been answered. */
export function hairTraits(profile?: HairProfile | null): string[] {
  if (!profile) return [];
  return [
    profile.texture && TEXTURE[profile.texture],
    (profile.length ?? profile.shrunkLength) && LENGTH[(profile.length ?? profile.shrunkLength)!],
    profile.density && DENSITY[profile.density],
    profile.porosity && POROSITY[profile.porosity],
  ].filter((trait): trait is string => !!trait);
}

/** The answers in `local` the account doesn't have yet. */
export function mergeGaps(server: HairProfile, local: HairProfile): Partial<HairProfile> {
  return Object.fromEntries(
    (Object.entries(local) as [keyof HairProfile, unknown][]).filter(
      ([key, value]) => value !== undefined && server[key] === undefined
    )
  ) as Partial<HairProfile>;
}
