import type { HairDensity, HairPorosity, HairProfile, HairTexture } from './types';

const TEXTURE: Record<HairTexture, string> = {
  straight: 'Straight',
  wavy: 'Wavy',
  curly: 'Curly',
  coily: 'Coily',
  kinky: 'Kinky',
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

/** ["Coily", "High density", "Low porosity"] — only what's been answered. */
export function hairTraits(profile?: HairProfile | null): string[] {
  if (!profile) return [];
  return [
    profile.texture && TEXTURE[profile.texture],
    profile.density && DENSITY[profile.density],
    profile.porosity && POROSITY[profile.porosity],
  ].filter((trait): trait is string => !!trait);
}
