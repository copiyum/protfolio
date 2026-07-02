import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SetupForm } from "./SetupForm";

// One-time bootstrap route. Whitelisted in middleware.ts so CF-Access-passed
// users can reach it before they have any credentials. After a passkey is
// registered, anyone hitting this path should be sent to /admin/login — both
// for UX and so a stale tab doesn't offer a re-register form that the server
// would then refuse at the action layer.
export const dynamic = "force-dynamic";

interface AdminEdgeEnv {
  DB: D1Database;
}

export default async function SetupPage() {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as AdminEdgeEnv;
  const row = await env.DB
    .prepare("SELECT EXISTS(SELECT 1 FROM passkeys LIMIT 1) AS has_any")
    .first<{ has_any: number }>();
  if (row?.has_any) redirect("/admin/login");

  return <SetupForm />;
}