import { ThemeProvider } from "next-themes";
import GradientBackdrop from "@/components/ui/gradient-backdrop";
import Header from "@/components/ui/header";
import LoadingBeam from "@/components/ui/loading-beam";
import ScrollToTop from "@/components/ui/scroll-to-top";
import SelectionTooltip from "@/components/ui/selection-tooltip";
import { getPublicLayoutData } from "@/lib/admin/read";

export const revalidate = 300;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { navItems, profile } = await getPublicLayoutData();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <GradientBackdrop />
      <LoadingBeam />
      <Header items={navItems} />
      <main className="pt-[3.75rem]">{children}</main>
      <ScrollToTop />
      <SelectionTooltip phrases={profile.selectionTooltipPhrases} />
    </ThemeProvider>
  );
}
