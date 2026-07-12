import { ThemeProvider } from "next-themes";
import { headers } from "next/headers";
import Link from "next/link";
import GradientBackdrop from "@/components/ui/gradient-backdrop";
import Header from "@/components/ui/header";
import ScrollToTop from "@/components/ui/scroll-to-top";
import SelectionTooltip from "@/components/ui/selection-tooltip";
import { getPublicLayoutData } from "@/lib/admin/read";

export const revalidate = 300;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const { navItems, profile } = await getPublicLayoutData();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
      <GradientBackdrop />
      <Header items={navItems} />
      <main className="pt-[3.75rem]">{children}</main>
      <footer className="relative z-10 mx-auto max-w-xl px-6 pb-10 pt-4 text-xs text-[color:var(--foreground)]/45">
        <Link
          href="/privacy"
          className="underline decoration-[color:var(--foreground)]/20 underline-offset-4 hover:text-[color:var(--foreground)]/70 hover:decoration-[color:var(--foreground)]/45"
        >
          Privacy
        </Link>
      </footer>
      <ScrollToTop />
      <SelectionTooltip phrases={profile.selectionTooltipPhrases} />
    </ThemeProvider>
  );
}
