import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import UpdateBanner from "@/components/UpdateBanner";
import { ToastProvider } from "@/components/Toast";
import NotificationPrompt from "@/components/NotificationPrompt";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400"],
  style: ["normal", "italic"],
});

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
    <html lang="nl" data-theme="midnight" className={`h-full ${dmSans.variable} ${cormorant.variable}`}>
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
        <TopNav />
        <BottomNav />
        <ToastProvider>
          {children}
          <UpdateBanner />
          <NotificationPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
