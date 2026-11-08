import { ThemeProvider } from "next-themes";
import Link from "next/link";
import GradientBackdrop from "@/components/ui/gradient-backdrop";
import Header from "@/components/ui/header";
import ScrollToTop from "@/components/ui/scroll-to-top";
import SelectionTooltip from "@/components/ui/selection-tooltip";
import { REVEAL_ARM_SCRIPT } from "@/components/ui/reveal-script";
import { getPublicLayoutData } from "@/lib/admin/read";

export const revalidate = 300;

// No headers()/cookies() here: public pages must stay statically renderable so
// they can be ISR-cached. Public CSP therefore has no per-request nonce (see
// buildContentSecurityPolicy); nav/profile come from the tagged data cache and
// are refreshed by revalidation or by admin actions calling updateTag().
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { navItems, profile } = await getPublicLayoutData();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* Runs before the content below is parsed: lets <Reveal> pre-hide sections
          only when JS is actually running (see globals.css .reveal). */}
      <script dangerouslySetInnerHTML={{ __html: REVEAL_ARM_SCRIPT }} />
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
