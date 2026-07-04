import { RegisterPasskeyForm } from "./RegisterPasskeyForm";
import { getTurnstileSiteKey } from "@/lib/admin/runtime-env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RegisterPasskeyPage() {
  return <RegisterPasskeyForm sitekey={await getTurnstileSiteKey()} turnstileBypass={process.env.PLAYWRIGHT_TEST === "1"} />;
}
