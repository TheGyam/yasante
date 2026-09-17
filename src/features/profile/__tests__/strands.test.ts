import { STRAND_BOX, strand } from '../quiz/strands';

const TEXTURES = ['straight', 'wavy', 'curly', 'coily', 'kinky'] as const;

describe('strand drawings', () => {
  it('fit every pattern inside the box', () => {
    for (const texture of TEXTURES) {
      const numbers = strand(texture)
        .d.match(/-?\d+(\.\d+)?/g)!
        .map(Number);
      const xs = numbers.filter((_, i) => i % 2 === 0);
      const ys = numbers.filter((_, i) => i % 2 === 1);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(STRAND_BOX.height);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThanOrEqual(STRAND_BOX.width);
    }
  });

  it('gets longer as the pattern gets tighter', () => {
    const lengths = TEXTURES.map(t => strand(t).length);
    expect(lengths[0]).toBeLessThan(lengths[1]);
    expect(lengths[1]).toBeLessThan(lengths[2]);
    expect(lengths[2]).toBeLessThan(lengths[3]);
  });
});
