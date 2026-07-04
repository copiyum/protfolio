import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sarang",
  description:
    "Software developer focused on clean design and engaging, detail-obsessed user experiences.",
};

// Inline only the initial paint-critical theme tokens so the document never
// flashes unstyled while globals.css is still loading. Public chrome lives in
// `(public)/layout.tsx`; admin routes keep this root document without it.
const THEME_TOKENS = `:root{--background:#ffffff;--page-bg:#ffffff;--foreground:#0a0a0a;--foreground-rgb:10,10,10;--card-bg:rgba(10,10,10,0.02);--card-border:rgba(10,10,10,0.06);--thumb-border:rgba(10,10,10,0.08);--cursor-dot-bg:#0a0a0a;--cursor-halo-bg:rgba(156,163,175,0.6);--cursor-halo-border:rgba(107,114,128,0.8);--tooltip-bg:rgba(0,0,0,0.8);--tooltip-fg:#ffffff}.dark{--background:#000;--page-bg:#0a0a0a;--foreground:#ededed;--foreground-rgb:237,237,237;--card-bg:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01));--card-border:rgba(255,255,255,0.06);--thumb-border:rgba(255,255,255,0.1);--cursor-dot-bg:#ffffff;--cursor-halo-bg:rgba(255,255,255,0.1);--cursor-halo-border:rgba(255,255,255,0.3);--tooltip-bg:rgba(17,17,17,0.9);--tooltip-fg:#ededed}html,body{margin:0}html{background:var(--page-bg);color:var(--foreground)}body{background:var(--page-bg);color:var(--foreground);font-family:var(--font-geist-sans),system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_TOKENS }} />
      </head>
      {/* suppressHydrationWarning: browser extensions (Grammarly, dark-mode addons,
          etc.) mutate <body> attributes before React hydrates — a benign mismatch. */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
