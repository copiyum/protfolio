export function computeWpm(correctChars: number, startedAt: number | null): number {
  if (!startedAt) return 0;
  const elapsedMinutes = Math.max(0.0001, (Date.now() - startedAt) / 1000 / 60);
  return Math.round((correctChars / 5) / elapsedMinutes);
}

export function computeAccuracy(correctChars: number, totalTyped: number): number {
  if (!totalTyped) return 100;
  return Math.round((correctChars / totalTyped) * 100);
}
