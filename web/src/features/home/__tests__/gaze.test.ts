import { FRAME_COUNT, MAX_ANGLE, angleFromPointer, describeAngle, loadOrder } from '../gaze';

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

  it('loads the centre first, then every frame exactly once', () => {
    const order = loadOrder();
    expect(order[0]).toBe((FRAME_COUNT - 1) / 2);
    expect(new Set(order).size).toBe(FRAME_COUNT);
    expect(order).toHaveLength(FRAME_COUNT);
  });
});
