import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFloatingCaret } from '../../typing/useFloatingCaret';
import { renderHook, act } from '@testing-library/react';

function makeEl(): HTMLSpanElement {
  const el = document.createElement('span');
  // jsdom: provide style object
  return el as HTMLSpanElement;
}

describe('useFloatingCaret', () => {
  let now = 1000;
  beforeEach(() => {
    now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  it('sets initial transform/width instantly', () => {
    const { result } = renderHook(() => useFloatingCaret(false));
    const caret = makeEl();
    const ghost = makeEl();
    const connector = makeEl();
    act(() => {
      result.current.moveCaretTo({ caret, ghost, connector }, 10, 20, 30);
    });
    expect(caret.style.transform).toContain('10px');
    expect(caret.style.width).toBe('30px');
  });

  it('applies duration based on typing cadence and clamps', () => {
    const { result } = renderHook(() => useFloatingCaret(false));
    const caret = makeEl();
    const ghost = makeEl();
    const connector = makeEl();
    // first move
    act(() => { result.current.moveCaretTo({ caret, ghost, connector }, 0, 0, 10); });
    // advance small delta
    now += 50; // small interval
    act(() => { result.current.moveCaretTo({ caret, ghost, connector }, 40, 0, 12); });
    // ghost transition should include transform with a duration >= min (140ms)
    expect(ghost.style.transition).toMatch(/transform 1(4|5)\dms/);
    // large delta
    now += 2000;
    act(() => { result.current.moveCaretTo({ caret, ghost, connector }, 80, 0, 14); });
    // duration should be clamped <= 420ms
    expect(ghost.style.transition).toMatch(/transform 4(1|2)0ms/);
  });

  it('respects reducedMotion by disabling transitions', () => {
    const { result } = renderHook(() => useFloatingCaret(true));
    const caret = makeEl();
    const ghost = makeEl();
    const connector = makeEl();
    act(() => { result.current.moveCaretTo({ caret, ghost, connector }, 5, 5, 5); });
    expect(ghost.style.transition).toBe('none');
    expect(connector.style.transition).toBe('none');
  });
});
