import { isDevTestToolsHost } from "@/lib/devTestTools";

const PRODUCTION_BRANCH_REFS = new Set(["main", "master"]);

/**
 * Server-side QA route boundary. Host allow-list is the primary lock; an
 * explicit production branch ref is an independent fail-closed second lock.
 * Missing branch metadata is allowed so localhost and non-Vercel dev servers
 * keep working, while an explicit main/master deployment can never expose QA.
 */
export function devQaRouteAllowed(hostname: string, gitRef?: string | null): boolean {
  if (!isDevTestToolsHost(hostname)) return false;
  const normalizedRef = gitRef?.trim().toLowerCase() ?? "";
  return !PRODUCTION_BRANCH_REFS.has(normalizedRef);
}
