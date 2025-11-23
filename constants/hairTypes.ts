import { HairType, HairTexture, HairPorosity, HairDensity } from '@/types/user';

export const HAIR_TYPES: { value: HairType; label: string; description: string }[] = [
  { value: 'straight', label: 'Straight', description: 'Hair with no curl pattern' },
  { value: 'wavy', label: 'Wavy', description: 'Hair with a slight S-shaped pattern' },
  { value: 'curly', label: 'Curly', description: 'Hair with defined curls' },
  { value: 'coily', label: 'Coily', description: 'Tightly coiled hair pattern' },
  { value: 'kinky', label: 'Kinky', description: 'Very tight, zigzag curl pattern' },
];

export const HAIR_TEXTURES: { value: HairTexture; label: string; description: string }[] = [
  { value: 'fine', label: 'Fine', description: 'Thin individual strands' },
  { value: 'medium', label: 'Medium', description: 'Average strand thickness' },
  { value: 'thick', label: 'Thick', description: 'Thick individual strands' },
];

export const HAIR_POROSITY_LEVELS: { value: HairPorosity; label: string; description: string }[] = [
  { value: 'low', label: 'Low Porosity', description: 'Hair cuticles are tightly closed' },
  { value: 'medium', label: 'Medium Porosity', description: 'Hair cuticles are moderately open' },
  { value: 'high', label: 'High Porosity', description: 'Hair cuticles are very open' },
];

export const HAIR_DENSITY_LEVELS: { value: HairDensity; label: string; description: string }[] = [
  { value: 'low', label: 'Low Density', description: 'Fewer hairs per square inch' },
  { value: 'medium', label: 'Medium Density', description: 'Average amount of hair' },
  { value: 'high', label: 'High Density', description: 'Many hairs per square inch' },
];

export const HAIR_CONCERNS = [
  'Dryness',
  'Frizz',
  'Breakage',
  'Split Ends',
  'Hair Loss',
  'Scalp Issues',
  'Color Fading',
  'Lack of Volume',
  'Product Build-up',
  'Tangles',
];

export const HAIR_GOALS = [
  'Grow Longer Hair',
  'Increase Hair Thickness',
  'Reduce Breakage',
  'Improve Hair Health',
  'Maintain Color',
  'Reduce Frizz',
  'Improve Curl Definition',
  'Strengthen Hair',
  'Improve Scalp Health',
  'Transition to Natural',
];














