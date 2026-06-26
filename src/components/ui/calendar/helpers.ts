export function startOfWeek(d: Date, firstDay: 0 | 1 = 0) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = (day < firstDay ? 7 : 0) + day - firstDay;
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function normalizeDate(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function setupResizeObserver(el: Element | null, cb: () => void) {
  if (!el || typeof ResizeObserver === 'undefined') return () => {};
  const ro = new ResizeObserver(() => cb());
  ro.observe(el);
  return () => ro.disconnect();
}
