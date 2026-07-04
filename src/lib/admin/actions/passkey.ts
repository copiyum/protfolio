"use server";
import { updateTag } from "next/cache";
import { requireActionAdmin } from "./_security";

export async function deletePasskey(credentialId: string): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  const count = await admin.db.prepare("SELECT COUNT(*) as c FROM passkeys").first<{ c: number }>();
  if ((count?.c ?? 0) <= 2) throw new Error("Cannot leave fewer than two passkeys");
  const audit = admin.prepareAudit({
    action: "passkey_delete",
    targetTable: "passkeys",
    targetId: credentialId,
  });
  await admin.db.batch([
    admin.db.prepare("DELETE FROM sessions WHERE passkey_credential_id = ?").bind(credentialId),
    admin.db.prepare("DELETE FROM passkeys WHERE credential_id = ?").bind(credentialId),
    audit.statement,
  ]);
  updateTag("passkeys");
  return { ok: true };
}
