export function rowToObj<T>(
  row: Record<string, unknown>,
  jsonColumns: readonly string[] = [],
  booleanColumns: readonly string[] = [],
): T {
  const out: Record<string, unknown> = { ...row };
  for (const col of jsonColumns) {
    const v = out[col];
    if (typeof v === "string") {
      try {
        out[col] = JSON.parse(v);
      } catch {
        // Keep invalid legacy JSON visible for repair in admin screens.
      }
    }
  }
  for (const col of booleanColumns) {
    const v = out[col];
    if (v !== undefined && v !== null) out[col] = v === true || v === 1 || v === "1";
  }
  return out as T;
}
