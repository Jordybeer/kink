import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// The /offline fallback page is an app route, so it isn't in Serwist's asset
// manifest — precache it explicitly or the fallback has nothing to serve and
// uncached navigations hard-fail offline. Revision tracks the page source so a
// fresh offline page ships on every change.
const offlineRevision = createHash("sha256")
  .update(readFileSync("app/offline/page.tsx"))
  .digest("hex")
  .slice(0, 16);

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  additionalPrecacheEntries: [{ url: "/offline", revision: offlineRevision }],
});

const nextConfig: NextConfig = { turbopack: {}, devIndicators: false };

export default withSerwist(nextConfig);
