import type { AdminContext } from "./auth-guard";
import { VISITOR_NOTES_TAG, getVisitorNoteStorage, isVisitorNoteId } from "@/lib/visitor-notes";

type VisitorNoteAdminContext = Pick<AdminContext, "db" | "env" | "prepareAudit">;

function requireR2(env: VisitorNoteAdminContext["env"]): R2Bucket {
  const r2 = (env as VisitorNoteAdminContext["env"] & { R2?: R2Bucket }).R2;
  if (!r2) throw new Error("R2 is not configured");
  return r2;
}

export async function deleteVisitorNoteWithAdmin(
  admin: VisitorNoteAdminContext,
  id: string,
  invalidateTag: (tag: string) => void,
): Promise<{ ok: true; objectDeleted: boolean }> {
  if (!isVisitorNoteId(id)) throw new Error("Invalid visitor note id");
  const storage = await getVisitorNoteStorage(admin.db, id);
  if (!storage) throw new Error("Visitor note not found");

  const audit = admin.prepareAudit({
    action: "delete_visitor_note",
    targetTable: "visitor_notes",
    targetId: id,
  });
  await admin.db.batch([
    admin.db.prepare("DELETE FROM visitor_notes WHERE id = ?").bind(id),
    audit.statement,
  ]);

  let objectDeleted = true;
  try {
    await requireR2(admin.env).delete(storage.r2Key);
  } catch {
    objectDeleted = false;
  }
  invalidateTag(VISITOR_NOTES_TAG);
  return { ok: true, objectDeleted };
}
