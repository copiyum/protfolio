"use server";
import { updateTag } from "next/cache";
import { requireActionAdmin } from "./_security";
import { deletePasskeyIfAboveMinimum } from "../passkey-store";

export async function deletePasskey(credentialId: string): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  if (!(await deletePasskeyIfAboveMinimum(admin.db, credentialId))) {
    throw new Error("Cannot leave fewer than two passkeys");
  }
  await admin.writeAudit({
    action: "passkey_delete",
    targetTable: "passkeys",
    targetId: credentialId,
  });
  updateTag("passkeys");
  return { ok: true };
}
