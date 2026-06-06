import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import UpdateBanner from "@/components/UpdateBanner";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "KinkSync — BDSM contract builder",
  description: "Verken grenzen samen. Kink negotiation en contracten voor volwassenen. kinksync.be",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KinkSync",
  },
};

export const viewport: Viewport = {
  themeColor: "#c084fc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" data-theme="midnight" className={`h-full ${dmSans.variable}`}>
      <head>
        {/* Synchronous capture of beforeinstallprompt — must run before any module.
            useEffect (post-hydration) is too late on fast devices. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;});`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider />
        {children}
        <BottomNav />
        <UpdateBanner />
      </body>
    </html>
  );
}
