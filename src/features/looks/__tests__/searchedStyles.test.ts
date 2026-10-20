import { searchedStyles } from '../filters';

const styles = [
  { id: 'knotless', name: 'Knotless braids' },
  { id: 'box-braids', name: 'Box braids' },
  { id: 'locs', name: 'Locs' },
  { id: 'faux-locs', name: 'Faux locs' },
];

describe('styles from her recent searches', () => {
  it('finds the styles a search names, newest first', () => {
    expect(searchedStyles(['box braids for summer', 'knotless'], styles)).toEqual([
      'box-braids',
      'knotless',
    ]);
    expect(searchedStyles(['locs'], styles)).toEqual(['locs']);
  });

  it('doesn’t read a broad word or a short one as every style', () => {
    expect(searchedStyles(['braids', 'box'], styles)).toEqual([]);
  });

  it('keeps at most three', () => {
    const many = ['knotless', 'box braids', 'locs', 'faux locs'];
    expect(searchedStyles(many, styles)).toHaveLength(3);
  });
});
