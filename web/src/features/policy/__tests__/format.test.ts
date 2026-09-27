import { policyBlocks } from '../format';

describe('policyBlocks', () => {
  it('finds the numbered sections and keeps the paragraphs', () => {
    const body =
      'Intro line.\n\n1. What we collect\n\nYour name.\nAnd email.\n\n2. Why\n\nTo run it.';
    expect(policyBlocks(body)).toEqual([
      { kind: 'paragraph', text: 'Intro line.' },
      { kind: 'heading', text: '1. What we collect', id: 'section-1' },
      { kind: 'paragraph', text: 'Your name.\nAnd email.' },
      { kind: 'heading', text: '2. Why', id: 'section-2' },
      { kind: 'paragraph', text: 'To run it.' },
    ]);
  });

  it('doesn’t take a numbered sentence for a heading', () => {
    const long = `3. ${'a very long sentence that keeps going '.repeat(4)}`;
    expect(policyBlocks(long)[0].kind).toBe('paragraph');
  });
});
