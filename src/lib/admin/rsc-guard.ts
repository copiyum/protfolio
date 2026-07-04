import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, createAuthGuard, type AdminAuthEnv } from "./auth-guard";

export async function rscGuard() {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as unknown as AdminAuthEnv;
  const h = await headers();
  const jar = await cookies();
  return createAuthGuard(env).rscGuard({
    headers: h,
    cookie: jar.get(ADMIN_COOKIE_NAME)?.value,
    redirect,
  });
}
