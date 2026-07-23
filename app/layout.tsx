import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import UpdateBanner from "@/components/UpdateBanner";
import { ToastProvider } from "@/components/Toast";
import NotificationPrompt from "@/components/NotificationPrompt";
import AmbientGlow from "@/components/ui/AmbientGlow";
import OfflineCacheWarmup from "@/components/OfflineCacheWarmup";

/* Body voice — Instrument Sans: tall x-height, warm grotesque, reads clean at 12px on a phone */
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  style: ["normal", "italic"],
});
/* Display voice — Fraunces: editorial serif with teeth; optical sizing keeps small italics legible
   where Cormorant went hairline-thin */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "KinkSync — BDSM contract builder",
  description: "Verken grenzen samen. Kink negotiation en contracten voor volwassenen. kinksync.be",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KinkSync",
  },
};

export const viewport: Viewport = {
  themeColor: "#D946AF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" data-theme="midnight" className={`h-full ${instrumentSans.variable} ${fraunces.variable}`}>
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
        <AmbientGlow />
        <ThemeProvider />
        <OfflineCacheWarmup />
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
