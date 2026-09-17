import { feedAspectRatio, parseArticle, tipOfTheDay } from '../content';

describe('parseArticle', () => {
  it('treats short Title Case lines as headings and everything else as paragraphs', () => {
    const blocks = parseArticle(
      'Why Moisture Matters\n\nHair loses water through the day.\n\n  \n\nWhat to do?'
    );
    expect(blocks).toEqual([
      { type: 'heading', text: 'Why Moisture Matters' },
      { type: 'paragraph', text: 'Hair loses water through the day.' },
      { type: 'paragraph', text: 'What to do?' },
    ]);
  });

  it('returns nothing for empty text', () => {
    expect(parseArticle('   ')).toEqual([]);
  });
});

describe('feedAspectRatio', () => {
  it('is stable for the same id, so the feed layout never shifts on re-render', () => {
    expect(feedAspectRatio('content-42')).toBe(feedAspectRatio('content-42'));
    expect(feedAspectRatio('content-42')).toBeGreaterThan(1);
  });
});

describe('tipOfTheDay', () => {
  it('gives the same tip all day and a different one the next day', () => {
    const morning = new Date(2026, 8, 16, 8);
    const evening = new Date(2026, 8, 16, 22);
    const tomorrow = new Date(2026, 8, 17, 8);
    expect(tipOfTheDay(morning)).toBe(tipOfTheDay(evening));
    expect(tipOfTheDay(tomorrow)).not.toBe(tipOfTheDay(morning));
  });
});
