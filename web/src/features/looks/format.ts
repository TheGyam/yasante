import { formatPrice } from '@/shared/lib/format';
import type { Look } from './types';

/** "Knotless braids by Ama" — what a look is, in a line. */
export function lookTitle(look: Pick<Look, 'serviceName' | 'stylist'>) {
  const what = look.serviceName || 'A look';
  return look.stylist ? `${what} by ${look.stylist.name}` : what;
}

/** Words for the photo, for anyone who can't see it. */
export function lookAlt(look: Pick<Look, 'serviceName' | 'caption' | 'stylist'>) {
  const caption = look.caption?.trim();
  return caption ? `${lookTitle(look)}: ${caption.slice(0, 120)}` : lookTitle(look);
}

export function lookPrice(look: Pick<Look, 'price' | 'fromPrice'>) {
  return look.price === undefined ? undefined : formatPrice(look.price, look.fromPrice);
}

export const HAIR_TEXTURES: { id: NonNullable<Look['hairTexture']>; name: string }[] = [
  { id: 'straight', name: 'Straight' },
  { id: 'wavy', name: 'Wavy' },
  { id: 'curly', name: 'Curly' },
  { id: 'coily', name: 'Coily' },
  { id: 'kinky', name: 'Kinky' },
];
