import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DevQaConsole from "@/components/qa/DevQaConsole";
import { devQaRouteAllowed } from "@/lib/devQaGate";

function hostnameFromRequestHost(rawHost: string): string {
  const first = rawHost.split(",", 1)[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("[")) {
    const closingBracket = first.indexOf("]");
    return closingBracket >= 0 ? first.slice(0, closingBracket + 1) : first;
  }
  return first.split(":", 1)[0] ?? "";
}

export default async function QaPage() {
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const hostname = hostnameFromRequestHost(rawHost);

  // Two independent server-side locks: the request must be on the explicit
  // dev/localhost host allow-list, and an explicit main/master build is always
  // denied. This remains a 404 even if QA source code is accidentally carried
  // into a production branch later.
  if (!devQaRouteAllowed(hostname, process.env.VERCEL_GIT_COMMIT_REF)) notFound();

  return <DevQaConsole />;
}
