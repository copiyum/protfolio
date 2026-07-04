export function redirectFromDigest(error: unknown): string | null {
  const digest = typeof error === "object" && error && "digest" in error ? String((error as { digest?: unknown }).digest) : "";
  if (!digest.startsWith("NEXT_REDIRECT")) return null;
  return digest.split(";").find((part) => part.startsWith("/admin")) ?? null;
}

export function slugify(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
