import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import "./design-role-tokens.css";
import InstallPromptBridge from "@/components/InstallPromptBridge";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import UpdateBanner from "@/components/UpdateBanner";
import { ToastProvider } from "@/components/Toast";
import NotificationPrompt from "@/components/NotificationPrompt";
import AmbientGlow from "@/components/ui/AmbientGlow";
import OfflineCacheWarmup from "@/components/OfflineCacheWarmup";
import ImportedProfileIntegrityGate from "@/components/ImportedProfileIntegrityGate";
import AppLockGate from "@/components/AppLockGate";
import { TopNavProvider } from "@/components/nav/TopNavContext";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  style: ["normal", "italic"],
});
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
  themeColor: "#E45AAB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`h-full ${instrumentSans.variable} ${fraunces.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;});`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <AmbientGlow />
        <AppLockGate>
          <InstallPromptBridge />
          <OfflineCacheWarmup />
          <TopNavProvider>
            <TopNav />
            <BottomNav />
            <ToastProvider>
              <ImportedProfileIntegrityGate>
                {children}
                <UpdateBanner />
                <NotificationPrompt />
              </ImportedProfileIntegrityGate>
            </ToastProvider>
          </TopNavProvider>
        </AppLockGate>
      </body>
    </html>
  );
}
