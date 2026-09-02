import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import "./design-role-tokens.css";
import "./print.css";
import VisualViewportBridge from "@/components/VisualViewportBridge";
import DevTestToolsBootstrap from "@/components/DevTestToolsBootstrap";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import UpdateBanner from "@/components/UpdateBanner";
import { ToastProvider } from "@/components/Toast";
import NotificationPrompt from "@/components/NotificationPrompt";
import StorageFullNotice from "@/components/StorageFullNotice";
import AmbientGlow from "@/components/ui/AmbientGlow";
import OfflineCacheWarmup from "@/components/OfflineCacheWarmup";
import ImportedProfileIntegrityGate from "@/components/ImportedProfileIntegrityGate";
import AppLockGate from "@/components/AppLockGate";
import MotionPolicy from "@/components/MotionPolicy";
import OnboardingRouteGate from "@/components/OnboardingRouteGate";
import { TopNavProvider } from "@/components/nav/TopNavContext";
import IntimacyReminderRunner from "@/components/intimacy/IntimacyReminderRunner";
import ThemeProvider from "@/components/ThemeProvider";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";

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
  title: "KinkSync: BDSM contract builder",
  description: "Verken grenzen samen. Kink negotiation en contracten voor volwassenen. kinksync.be",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#09070D" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="nl"
      data-theme="dark"
      suppressHydrationWarning
      className={`h-full ${instrumentSans.variable} ${fraunces.variable}`}
      style={{ scrollPaddingTop: "var(--nav-h)" }}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col antialiased text-pretty">
        <ThemeProvider>
          <MotionPolicy>
            <VisualViewportBridge />
            <DevTestToolsBootstrap />
            <AmbientGlow />
            <AppLockGate>
              <OnboardingRouteGate>
                <OfflineCacheWarmup />
                <TopNavProvider>
                  <TopNav />
                  <BottomNav />
                  <ToastProvider>
                    <ImportedProfileIntegrityGate>
                      {children}
                      <IntimacyReminderRunner />
                      <UpdateBanner />
                      <NotificationPrompt />
                      <StorageFullNotice />
                    </ImportedProfileIntegrityGate>
                  </ToastProvider>
                </TopNavProvider>
              </OnboardingRouteGate>
            </AppLockGate>
          </MotionPolicy>
        </ThemeProvider>
      </body>
    </html>
  );
}
