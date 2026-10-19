import { finishProgress, waitingLabel } from '../format';

describe('making a page yours', () => {
  it('says how many are waiting, in words', () => {
    expect(waitingLabel(1)).toBe('1 person is waiting to book you');
    expect(waitingLabel(14)).toBe('14 people are waiting to book you');
  });

  it('counts the three steps of Finish your page', () => {
    const state = { styles: [], hoursSet: false, tagsChecked: false, done: false };
    expect(finishProgress(state)).toBe(1); // no styles to price is priced
    expect(
      finishProgress({
        ...state,
        styles: [{ slug: 'knotless', name: 'Knotless braids', photoCount: 2, priced: false }],
        hoursSet: true,
      })
    ).toBe(1);
    expect(
      finishProgress({
        ...state,
        styles: [{ slug: 'knotless', name: 'Knotless braids', photoCount: 2, priced: true }],
        hoursSet: true,
        tagsChecked: true,
      })
    ).toBe(3);
  });
});
