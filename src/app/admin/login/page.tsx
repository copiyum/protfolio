import { getTurnstileSiteKey } from "@/lib/admin/runtime-env";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage() {
  return <LoginForm sitekey={await getTurnstileSiteKey()} turnstileBypass={process.env.PLAYWRIGHT_TEST === "1"} />;
}
