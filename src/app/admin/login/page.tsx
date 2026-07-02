import { getTurnstileSiteKey } from "@/lib/admin/runtime-env";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  return <LoginForm sitekey={await getTurnstileSiteKey()} />;
}
