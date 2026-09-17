import type { HairTexture } from '../types';

/** The strand drawings live in a 60 × 100 box. */
export const STRAND_BOX = { width: 60, height: 100 } as const;

export interface Strand {
  d: string;
  /** Path length, for drawing the strand on. */
  length: number;
}

type Point = [number, number];

// Each pattern is a curve x(t), y(t). Loops appear when y briefly runs backwards, which
// is exactly what a coil does when you look at it side on.
const PATTERNS: Record<HairTexture, { turns: number; at: (t: number) => Point }> = {
  straight: { turns: 1, at: t => [30 + Math.sin(t * 1.2) * 0.8, t] },
  wavy: { turns: 3.5 * Math.PI, at: t => [30 + Math.sin(t) * 9, t * 4] },
  curly: { turns: 6 * Math.PI, at: t => [30 + Math.sin(t) * 12, t * 4.2 - Math.cos(t) * 6] },
  coily: { turns: 11 * Math.PI, at: t => [30 + Math.sin(t) * 8, t * 2.3 - Math.cos(t) * 6.5] },
  kinky: {
    turns: 14,
    // Tight zig-zags: a triangle wave with a small kink at every turn.
    at: t => {
      const phase = t % 2;
      const tri = phase < 1 ? phase : 2 - phase;
      return [23 + tri * 14 + Math.sin(t * Math.PI * 2) * 1.2, t * 6];
    },
  },
};

const PAD = 6;
const SAMPLES = 180;

export function strand(texture: HairTexture): Strand {
  const { turns, at } = PATTERNS[texture];
  const raw = Array.from({ length: SAMPLES + 1 }, (_, i) => at((i / SAMPLES) * turns));

  // Fit the drawing to the box, top to bottom, whatever the curve's own scale.
  const ys = raw.map(p => p[1]);
  const min = Math.min(...ys);
  const span = Math.max(...ys) - min || 1;
  const scale = (STRAND_BOX.height - PAD * 2) / span;
  const points = raw.map(([x, y]): Point => [x, PAD + (y - min) * scale]);

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  return { d, length: Math.ceil(length) };
}
