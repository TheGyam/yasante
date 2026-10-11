import { MAX_ANGLE, angleFromPointer, describeAngle, settle } from '../gaze';

describe('the hero’s gaze', () => {
  it('looks straight ahead at the centre and 60° at either edge', () => {
    expect(angleFromPointer(500, 0, 1000)).toBe(0);
    expect(angleFromPointer(0, 0, 1000)).toBe(-MAX_ANGLE);
    expect(angleFromPointer(1000, 0, 1000)).toBe(MAX_ANGLE);
    expect(angleFromPointer(5000, 0, 1000)).toBe(MAX_ANGLE);
  });

  it('says which way she’s looking', () => {
    expect(describeAngle(0.6)).toBe('ahead');
    expect(describeAngle(-24.4)).toBe('24° left');
    expect(describeAngle(60)).toBe('60° right');
  });

  it('glides to where she’s looking without ever going past it', () => {
    let x = 0;
    let v = 0;
    let furthest = 0;
    for (let i = 0; i < 120; i++) {
      [x, v] = settle(x, v, 40, 7, 1 / 60);
      furthest = Math.max(furthest, x);
    }
    expect(furthest).toBeLessThanOrEqual(40);
    expect(x).toBeCloseTo(40, 1);
  });
});
