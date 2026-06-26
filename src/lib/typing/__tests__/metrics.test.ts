import { computeWpm, computeAccuracy } from '../metrics';

describe('metrics', () => {
  test('computeWpm returns 0 when not started', () => {
    expect(computeWpm(50, null)).toBe(0);
  });

  test('computeAccuracy 100% all correct', () => {
    expect(computeAccuracy(10, 10)).toBe(100);
  });

  test('computeAccuracy partial', () => {
    expect(computeAccuracy(5, 10)).toBe(50);
  });
});
