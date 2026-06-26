export function hideLeadingSpacesAndGetActive(line: HTMLElement, activeIdx: number): HTMLElement | null {
  const nodes = Array.from(line.querySelectorAll<HTMLElement>(`[data-idx]`));
  nodes.forEach((el) => { el.style.width = ""; el.style.display = ""; });

  let prevTop: number | null = null;
  nodes.forEach((el, i) => {
    const top = el.offsetTop;
    const text = el.textContent ?? "";
    const isSpace = text === "\u00A0" || text === "\u00a0" || text === " ";
    if (prevTop === null) {
      if (isSpace) el.style.display = "none";
      prevTop = top;
      return;
    }
    if (isSpace) {
      const prev = nodes[i - 1];
      if (prev && top > prev.offsetTop) {
        el.style.display = "none";
      } else {
        el.style.display = "";
      }
    }
    prevTop = top;
  });

  let targetEl = line.querySelector<HTMLElement>(`[data-idx='${activeIdx}']`);
  if (targetEl && (targetEl.textContent ?? "") === "\u00A0" && targetEl.offsetWidth < 1) {
    const next = line.querySelector<HTMLElement>(`[data-idx='${activeIdx + 1}']`);
    if (next) targetEl = next;
  }
  return targetEl;
}
