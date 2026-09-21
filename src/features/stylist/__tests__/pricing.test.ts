import { estimate, optionGroups } from '../format';
import type { MenuItem } from '../types';

const knotless: MenuItem = {
  id: 'k',
  name: 'Knotless braids',
  price: 120,
  fromPrice: true,
  durationMinutes: 300,
  options: [
    { id: 'shoulder', group: 'length', label: 'Shoulder', add: 0 },
    { id: 'waist', group: 'length', label: 'Waist', add: 40, addMinutes: 120 },
    { id: 'large', group: 'size', label: 'Large', add: 0 },
    { id: 'small', group: 'size', label: 'Small', add: 40, addMinutes: 120 },
  ],
};

describe('pricing by length and size', () => {
  it('groups her options, length first', () => {
    expect(optionGroups(knotless).map(g => g.group)).toEqual(['length', 'size']);
  });

  it('stays a starting price until every group is chosen', () => {
    expect(estimate(knotless, { length: 'waist' })).toMatchObject({
      price: 160,
      fromPrice: true,
      complete: false,
    });
  });

  it('adds up to her quote once it is', () => {
    expect(estimate(knotless, { length: 'waist', size: 'small' })).toEqual({
      price: 200,
      minutes: 540,
      labels: ['Waist', 'Small'],
      fromPrice: false,
      complete: true,
    });
  });

  it('leaves a service without options as it was', () => {
    const plain = { ...knotless, options: undefined, fromPrice: false };
    expect(estimate(plain)).toMatchObject({ price: 120, fromPrice: false, complete: true });
  });
});
