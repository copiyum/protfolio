export function updateTag(tag: string) {
  void tag;
}

export function revalidateTag(tag: string) {
  void tag;
}

export function unstable_cache<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
