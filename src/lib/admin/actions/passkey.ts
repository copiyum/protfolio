"use server";
import { updateTag } from "next/cache";
import { prepareAudit } from "../audit";
import { requireActionAdmin } from "./_security";

export async function deletePasskey(credentialId: string): Promise<{ ok: true }> {
  const admin = await requireActionAdmin({ write: true, fresh: true });
  const count = await admin.env.DB.prepare("SELECT COUNT(*) as c FROM passkeys").first<{ c: number }>();
  if ((count?.c ?? 0) <= 2) throw new Error("Cannot leave fewer than two passkeys");
  const audit = prepareAudit(admin.env.DB, {
    action: "passkey_delete",
    targetTable: "passkeys",
    targetId: credentialId,
    actorCredentialId: admin.credentialId,
    ip: admin.meta.ip,
    ua: admin.meta.ua,
  });
  await admin.env.DB.batch([
    admin.env.DB.prepare("DELETE FROM sessions WHERE passkey_credential_id = ?").bind(credentialId),
    admin.env.DB.prepare("DELETE FROM passkeys WHERE credential_id = ?").bind(credentialId),
    audit.statement,
  ]);
  updateTag("passkeys");
  return { ok: true };
}
