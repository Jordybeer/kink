import { HOT_DOCUMENT } from "./studio";

export const dynamic = "force-dynamic";

export function GET() {
  // The lab bypasses the app shell entirely. Never make it available on a production deployment.
  const deployment = process.env.VERCEL_ENV;
  if (deployment === "production" || (process.env.NODE_ENV !== "development" && deployment !== "preview")) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(HOT_DOCUMENT, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
