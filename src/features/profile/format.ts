import type { HairDensity, HairLength, HairPorosity, HairProfile, HairTexture } from './types';

const TEXTURE: Record<HairTexture, string> = {
  straight: 'Straight',
  wavy: 'Wavy',
  curly: 'Curly',
  coily: 'Coily',
  kinky: 'Zig-zag coils',
};
const LENGTH: Record<HairLength, string> = {
  cropped: 'Cropped',
  ear: 'Ear length',
  chin: 'Chin length',
  shoulder: 'Shoulder length',
  armpit: 'Armpit length',
  'mid-back': 'Mid-back length',
  waist: 'Waist length',
  hip: 'Hip length',
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
    profile.length && LENGTH[profile.length],
    profile.density && DENSITY[profile.density],
    profile.porosity && POROSITY[profile.porosity],
  ].filter((trait): trait is string => !!trait);
}
