import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import Header from "@/components/ui/header";
import LoadingBeam from "@/components/ui/loading-beam";
import GradientBackdrop from "@/components/ui/gradient-backdrop";
import ScrollToTop from "@/components/ui/scroll-to-top";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sarang — Software Developer",
  description:
    "Software developer focused on clean design and engaging, detail-obsessed user experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (Grammarly, dark-mode addons,
          etc.) mutate <body> attributes before React hydrates — a benign mismatch. */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <GradientBackdrop />
          <LoadingBeam />
          <Header />
          <main className="pt-[3.75rem]">{children}</main>
          <ScrollToTop />
        </ThemeProvider>
      </body>
    </html>
  );
}
