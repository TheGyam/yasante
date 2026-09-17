import { handleProblem, toHandle } from '../handle';

describe('stylist handles', () => {
  it('turns a business name into an address', () => {
    expect(toHandle('Braids by Ama!')).toBe('braidsbyama');
    expect(toHandle('__hair.by.kojo')).toBe('hair.by.kojo');
    expect(toHandle('A'.repeat(40))).toHaveLength(24);
  });

  it('explains why a handle cannot be used', () => {
    expect(handleProblem('braidsbyama')).toBeUndefined();
    expect(handleProblem('ab')).toMatch(/3 characters/);
    expect(handleProblem('_ama')).toMatch(/Start with/);
    expect(handleProblem('ama..hair')).toMatch(/repeated/);
    expect(handleProblem('ama.')).toMatch(/end with/);
  });
});
