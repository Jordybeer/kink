import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DevQaConsole from "@/components/qa/DevQaConsole";
import { isDevTestToolsHost } from "@/lib/devTestTools";

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

  // This is a server-side boundary, not a hidden button. Even if this code is
  // ever present in another deployment, the QA route is a 404 outside the
  // explicitly allow-listed dev/localhost hosts.
  if (!isDevTestToolsHost(hostname)) notFound();

  return <DevQaConsole />;
}
