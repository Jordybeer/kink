import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HOT_DOCUMENT } from "./studio";
import { PROFILE_CONCEPT } from "./profile-concept";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // The lab bypasses the app shell entirely. Never make it available on a production deployment.
  const deployment = process.env.VERCEL_ENV;
  if (deployment === "production" || (process.env.NODE_ENV !== "development" && deployment !== "preview")) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const searchParams = new URL(request.url).searchParams;
  const asset = searchParams.get("asset");
  if (asset === "profile-theme") {
    const source = await readFile(join(process.cwd(), "app/design-role-tokens.css"), "utf8");
    return new Response(source, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  if (asset === "gsap" || asset === "morph") {
    const source = asset === "gsap"
      ? await readFile(join(process.cwd(), "node_modules/gsap/dist/gsap.min.js"), "utf8")
      : await readFile(join(process.cwd(), "node_modules/gsap/dist/MorphSVGPlugin.min.js"), "utf8");
    return new Response(source, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  if (asset === "motion") {
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
  return new Response(searchParams.get("concept") === "profiel" ? PROFILE_CONCEPT : HOT_DOCUMENT, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
