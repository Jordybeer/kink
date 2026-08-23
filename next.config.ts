import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { STATIC_OFFLINE_ROUTES } from "./lib/offlineRoutes";

// The /offline fallback page is an app route, so it isn't in Serwist's asset
// manifest — precache it explicitly or the fallback has nothing to serve and
// uncached navigations hard-fail offline. Revision tracks the page source so a
// fresh offline page ships on every change.
const offlineRevision = createHash("sha256")
  .update(readFileSync("app/offline/page.tsx"))
  .digest("hex")
  .slice(0, 16);

// Vercel exposes the commit SHA during every production/preview build. Using it
// as the document revision keeps cached HTML in lockstep with hashed Next chunks.
const appShellRevision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  offlineRevision;

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  additionalPrecacheEntries: [
    ...STATIC_OFFLINE_ROUTES.map((url) => ({
      url,
      revision: appShellRevision,
    })),
    { url: "/offline", revision: offlineRevision },
  ],
});

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// `next dev` draait zijn HMR door `eval()`. Dat mag daar, en alleen daar: de
// productiebundel heeft het niet nodig, dus de strenge regel geldt waar hij telt.
const DEV_SCRIPT_SRC = IS_PRODUCTION ? "" : " 'unsafe-eval'";

/**
 * De huisregels, aan de deur voorgelezen.
 *
 * KinkSync belooft dat er niets naar buiten gaat. Tot nu toe was dat een belofte
 * van de code aan zichzelf: er staat nergens een `fetch()`, dus er gebeurt niets.
 * `connect-src 'self'` maakt er een afspraak van die de browser afdwingt, ook als
 * er ooit per ongeluk wél iets naar buiten wil bellen.
 *
 * `frame-ancestors 'none'` is de andere helft. Deze app kent knoppen die niet
 * terug te draaien zijn: alle data wissen, toestemming intrekken, een contract
 * tekenen. Zulke knoppen horen niet in een onzichtbaar iframe op andermans site
 * te hangen waar iemand er blind op klikt.
 *
 * Wat hier bewust nog niet staat: een strikte `script-src`. Next zet zijn eigen
 * inline bootstrap in het document, dus dat vraagt om nonces via middleware, en
 * middleware raakt elke route tegelijk. Dat is geen ingreep voor een release
 * candidate. Zolang die er niet is, doet `object-src`, `base-uri` en
 * `form-action` het zware werk: geen plugins, geen gekaapte <base>, geen
 * formulier dat elders post.
 */
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${DEV_SCRIPT_SRC}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      // Alleen in productie. `next dev` serveert over http://localhost, en waar
      // Chromium localhost met rust laat, tilt WebKit die requests wél naar
      // https en loopt de pagina vast voordat ze hydrateert. De hele
      // iPhone/iPad-launchmatrix viel erop om terwijl de Chromium-tegel groen
      // bleef. In productie is alles al https, dus daar kost de regel niets.
      ...(IS_PRODUCTION ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Een deelprofiel reist in het fragment en fragmenten staan nooit in een
  // Referer. Maar het pad /profile/<id> wel, en dat hoeft bdsmtest.org of
  // FetLife niet te weten.
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {},
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default withSerwist(nextConfig);
