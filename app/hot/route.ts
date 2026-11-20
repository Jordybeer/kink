import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HOT_DOCUMENT } from "./studio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // The lab bypasses the app shell entirely. Never make it available on a production deployment.
  const deployment = process.env.VERCEL_ENV;
  if (deployment === "production" || (process.env.NODE_ENV !== "development" && deployment !== "preview")) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (new URL(request.url).searchParams.get("asset") === "motion") {
    // Same-origin browser bundle from the Motion for React version already in the lockfile.
    const [source, license] = await Promise.all([
      readFile(join(process.cwd(), "node_modules/framer-motion/dist/dom.js"), "utf8"),
      readFile(join(process.cwd(), "node_modules/framer-motion/LICENSE.md"), "utf8"),
    ]);
    return new Response("/*!\n" + license + "\n*/\n" + source, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  return new Response(HOT_DOCUMENT, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
