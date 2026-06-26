import { generatePassage } from '../passage';

// Smoke test deterministic length boundaries (15-18 words)
function countWords(s: string) { return s.trim().split(/\s+/).length; }

describe('passage', () => {
  test('length within expected range', () => {
    const p = generatePassage(1234);
    const n = countWords(p.replace(/\.$/, ''));
    expect(n).toBeGreaterThanOrEqual(15);
    expect(n).toBeLessThanOrEqual(18);
  });
});
