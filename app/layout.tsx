import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KinkList — BDSM contract builder",
  description: "Build and compare kink lists for BDSM negotiation and contracts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
