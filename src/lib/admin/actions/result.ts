import { z } from "zod";

export type AdminActionResult =
  | { ok: true; redirectTo?: string; message?: string }
  | { ok: false; error: string };

export function adminActionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => {
        const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
      })
      .join("; ");
  }

  if (error instanceof Error) {
    if (/UNIQUE constraint failed/i.test(error.message)) {
      return "A row with that id or slug already exists.";
    }
    if (/FOREIGN KEY constraint failed/i.test(error.message)) {
      return "This item is still referenced by another record.";
    }
    return error.message || "Action failed";
  }

  return "Action failed";
}

export async function adminAction<T extends AdminActionResult>(
  fn: () => Promise<T>,
): Promise<AdminActionResult> {
  try {
    return await fn();
  } catch (error) {
    return { ok: false, error: adminActionError(error) };
  }
}
