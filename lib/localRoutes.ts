export const PROFILE_SHELL_ROUTE = "/profile";
export const SCENE_DETAIL_SHELL_ROUTE = "/scenes/view";
const PERSISTED_STORE_KEY = "kink-profiles";

interface StorageReader {
  getItem(key: string): string | null;
}

interface SearchParamsReader {
  get(name: string): string | null;
}

interface PersistenceWaitOptions {
  storage?: StorageReader | null;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function profileHref(id: string): string {
  return `${PROFILE_SHELL_ROUTE}?id=${encodeURIComponent(id)}`;
}

export function sceneDetailHref(id: string): string {
  return `${SCENE_DETAIL_SHELL_ROUTE}?id=${encodeURIComponent(id)}`;
}

export function profileIdFromLocation(
  pathname: string,
  searchParams: SearchParamsReader,
): string {
  const queryId = searchParams.get("id");
  if (queryId) return queryId;

  const legacyMatch = /^\/profile\/([^/]+)(?:\/questions)?$/.exec(pathname);
  return legacyMatch ? safeDecode(legacyMatch[1]) : "";
}

export function sceneIdFromLocation(
  pathname: string,
  searchParams: SearchParamsReader,
): string {
  const queryId = searchParams.get("id");
  if (queryId) return queryId;

  const legacyMatch = /^\/scenes\/([^/]+)$/.exec(pathname);
  return legacyMatch && legacyMatch[1] !== "view"
    ? safeDecode(legacyMatch[1])
    : "";
}

export function canonicalizeLocalUrl(input: URL): URL {
  const url = new URL(input.href);
  const profileMatch = /^\/profile\/([^/]+)$/.exec(url.pathname);

  if (profileMatch) {
    url.pathname = PROFILE_SHELL_ROUTE;
    url.searchParams.set("id", safeDecode(profileMatch[1]));
    return url;
  }

  const sceneMatch = /^\/scenes\/([^/]+)$/.exec(url.pathname);
  if (sceneMatch && sceneMatch[1] !== "view") {
    url.pathname = SCENE_DETAIL_SHELL_ROUTE;
    url.searchParams.set("id", safeDecode(sceneMatch[1]));
  }

  return url;
}

export function findSingleAddedId(
  previousIds: readonly string[],
  currentIds: readonly string[],
): string | null {
  const previous = new Set(previousIds);
  const added = currentIds.filter((id) => !previous.has(id));
  return added.length === 1 ? added[0] : null;
}

export function hasPersistedProfile(
  storage: StorageReader,
  profileId: string,
): boolean {
  try {
    const raw = storage.getItem(PERSISTED_STORE_KEY);
    if (!raw) return false;

    const persisted = JSON.parse(raw) as {
      state?: { profiles?: Array<{ id?: unknown }> };
    };

    return persisted.state?.profiles?.some(
      (profile) => profile.id === profileId,
    ) === true;
  } catch {
    return false;
  }
}

export async function waitForPersistedProfile(
  profileId: string,
  options: PersistenceWaitOptions = {},
): Promise<boolean> {
  const storage = options.storage ??
    (typeof window !== "undefined" ? window.localStorage : null);
  if (!storage) return false;

  const timeoutMs = options.timeoutMs ?? 2_000;
  const pollIntervalMs = options.pollIntervalMs ?? 16;
  const deadline = Date.now() + timeoutMs;

  do {
    if (hasPersistedProfile(storage, profileId)) return true;
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, pollIntervalMs));
  } while (Date.now() < deadline);

  return hasPersistedProfile(storage, profileId);
}
