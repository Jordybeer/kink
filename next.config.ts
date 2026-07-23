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

const nextConfig: NextConfig = { turbopack: {}, devIndicators: false };

export default withSerwist(nextConfig);
