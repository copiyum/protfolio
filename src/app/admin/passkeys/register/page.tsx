import { getTurnstileSiteKey } from "@/lib/admin/runtime-env";
import { RegisterPasskeyForm } from "./RegisterPasskeyForm";

export default async function RegisterPasskeyPage() {
  return <RegisterPasskeyForm sitekey={await getTurnstileSiteKey()} />;
}
