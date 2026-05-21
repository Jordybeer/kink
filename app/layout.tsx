import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "KinkList — BDSM contract builder",
  description: "Build and compare kink lists for BDSM negotiation and contracts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`h-full ${dmSans.variable}`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
