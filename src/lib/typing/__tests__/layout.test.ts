import { hideLeadingSpacesAndGetActive } from '../layout';

// Basic DOM test via jsdom

describe('layout helper', () => {
  test('hides leading spaces on new line', () => {
    document.body.innerHTML = `<div id="line"></div>`;
    const line = document.getElementById('line') as HTMLElement;
    // Simulate characters with data-idx and positions
    for (let i = 0; i < 5; i++) {
      const span = document.createElement('span');
      span.dataset.idx = String(i);
      span.textContent = i === 0 ? '\u00A0' : 'a';
      Object.defineProperty(span, 'offsetTop', { value: 0, configurable: true });
      line.appendChild(span);
    }
    // Force a wrapped space at index 0 considered leading
    const active = hideLeadingSpacesAndGetActive(line, 0);
    const first = line.querySelector('[data-idx="0"]') as HTMLElement;
    expect(first.style.display).toBe('none');
    expect(active).toBeTruthy();
  });
});
