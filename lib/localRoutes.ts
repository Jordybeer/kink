export const PROFILE_SHELL_ROUTE = "/profile";
export const SCENE_DETAIL_SHELL_ROUTE = "/scenes/view";

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
