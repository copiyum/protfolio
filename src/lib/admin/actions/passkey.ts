"use server";
import { updateTag } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { writeAudit } from "../audit";

export async function deletePasskey(credentialId: string): Promise<{ ok: true }> {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as { DB: D1Database };
  const h = await headers();
  const count = await env.DB.prepare("SELECT COUNT(*) as c FROM passkeys").first<{ c: number }>();
  if ((count?.c ?? 0) <= 1) throw new Error("Cannot delete last passkey");
  await env.DB.prepare("DELETE FROM passkeys WHERE credential_id = ?").bind(credentialId).run();
  await writeAudit(env.DB, {
    action: "passkey_delete",
    targetTable: "passkeys",
    targetId: credentialId,
    actorCredentialId: h.get("x-actor-credential-id") ?? undefined,
  });
  updateTag("passkeys");
  return { ok: true };
}