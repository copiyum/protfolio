import { ThemeProvider } from "next-themes";
import GradientBackdrop from "@/components/ui/gradient-backdrop";
import Header from "@/components/ui/header";
import LoadingBeam from "@/components/ui/loading-beam";
import ScrollToTop from "@/components/ui/scroll-to-top";
import SelectionTooltip from "@/components/ui/selection-tooltip";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <GradientBackdrop />
      <LoadingBeam />
      <Header />
      <main className="pt-[3.75rem]">{children}</main>
      <ScrollToTop />
      <SelectionTooltip />
    </ThemeProvider>
  );
}
