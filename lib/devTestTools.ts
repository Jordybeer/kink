const DEV_TEST_TOOLS_STORAGE_KEY = "kinksync-dev-test-tools";
const DEV_TEST_TOOLS_QUERY_PARAM = "testtools";

const DEV_TEST_HOSTS = new Set([
  "dev.jordy.beer",
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

export interface DevTestToolsDecision {
  enabled: boolean;
  persist: "enable" | "disable" | null;
}

function normalizedHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

export function isDevTestToolsHost(hostname: string): boolean {
  return DEV_TEST_HOSTS.has(normalizedHost(hostname));
}

export function resolveDevTestToolsDecision(input: {
  hostname: string;
  search: string;
  storedValue: string | null;
}): DevTestToolsDecision {
  if (!isDevTestToolsHost(input.hostname)) {
    return { enabled: false, persist: null };
  }

  const requested = new URLSearchParams(input.search).get(DEV_TEST_TOOLS_QUERY_PARAM);
  if (requested === "1") return { enabled: true, persist: "enable" };
  if (requested === "0") return { enabled: false, persist: "disable" };
  return { enabled: input.storedValue === "1", persist: null };
}

function readStoredValue(): string | null {
  try {
    return window.localStorage.getItem(DEV_TEST_TOOLS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setDevTestToolsEnabled(enabled: boolean): boolean {
  if (typeof window === "undefined" || !isDevTestToolsHost(window.location.hostname)) return false;
  try {
    if (enabled) window.localStorage.setItem(DEV_TEST_TOOLS_STORAGE_KEY, "1");
    else window.localStorage.removeItem(DEV_TEST_TOOLS_STORAGE_KEY);
    return enabled;
  } catch {
    return false;
  }
}

export function devTestToolsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return resolveDevTestToolsDecision({
    hostname: window.location.hostname,
    search: window.location.search,
    storedValue: readStoredValue(),
  }).enabled;
}

export function syncDevTestToolsFromLocation(): boolean {
  if (typeof window === "undefined") return false;

  const decision = resolveDevTestToolsDecision({
    hostname: window.location.hostname,
    search: window.location.search,
    storedValue: readStoredValue(),
  });

  if (isDevTestToolsHost(window.location.hostname)) {
    try {
      if (decision.persist === "enable") {
        window.localStorage.setItem(DEV_TEST_TOOLS_STORAGE_KEY, "1");
      } else if (decision.persist === "disable") {
        window.localStorage.removeItem(DEV_TEST_TOOLS_STORAGE_KEY);
      }
    } catch {
      return false;
    }
  }

  // Intentionally do not rewrite the URL. An explicit ?testtools=1 link stays
  // visible/bookmarkable, while localStorage keeps the mode active after normal
  // navigation to routes that no longer carry the query parameter.
  return decision.enabled;
}
