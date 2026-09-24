import { stepsFor } from '../components/BookingProgress';

describe('booking progress', () => {
  it('includes the deposit step only when there is one', () => {
    expect(stepsFor({ status: 'requested' })!.steps.map(s => s.key)).toEqual([
      'requested',
      'accepted',
      'confirmed',
      'completed',
    ]);
    const withDeposit = stepsFor({
      status: 'awaiting_deposit',
      deposit: { amount: 20, method: 'x', status: 'awaiting' },
    })!;
    expect(withDeposit.steps[withDeposit.at].key).toBe('deposit');
  });

  it('confirmed and done sit at their own steps; ended bookings have no road', () => {
    expect(stepsFor({ status: 'confirmed' })!.at).toBe(2);
    expect(stepsFor({ status: 'completed' })!.at).toBe(3);
    expect(stepsFor({ status: 'declined' })).toBeNull();
  });
});
