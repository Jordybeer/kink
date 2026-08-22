import { decodeLocalRouteId, profileHref } from "@/lib/localRoutes";

export type BottomNavSection = "compare" | "scenes" | "intimacy" | "profile" | null;

export interface RouteChromeSemantics {
  title: string;
  back: string;
  hideBottomNav: boolean;
  bottomNavSection: BottomNavSection;
}

export function routeChromeSemantics(
  path: string,
  dynamic: { sceneTitle?: string } = {},
): RouteChromeSemantics {
  if (/^\/profile\/[^/]+\/questions$/.test(path)) {
    const id = path.split("/")[2] ?? "";
    return {
      title: "Vragenlijst",
      back: profileHref(decodeLocalRouteId(id)),
      hideBottomNav: true,
      bottomNavSection: null,
    };
  }
  if (path === "/profile" || /^\/profile\/[^/]+$/.test(path)) {
    return { title: "Profiel", back: "/", hideBottomNav: false, bottomNavSection: "profile" };
  }
  if (path === "/scene") {
    return { title: "Scène", back: "/scenes", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/scenes") {
    return { title: "Scènes", back: "/", hideBottomNav: false, bottomNavSection: "scenes" };
  }
  if (path.startsWith("/scenes/")) {
    return { title: dynamic.sceneTitle ?? "Scène", back: "/scenes", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/intimacy") {
    return { title: "Intimiteit", back: "/", hideBottomNav: false, bottomNavSection: "intimacy" };
  }
  if (path === "/compare" || path.startsWith("/compare/")) {
    return { title: "Vergelijk", back: "/", hideBottomNav: false, bottomNavSection: "compare" };
  }
  if (path === "/timeline") {
    return { title: "Contractgeschiedenis", back: "/contracts", hideBottomNav: false, bottomNavSection: null };
  }
  if (path === "/about") {
    return { title: "Hoe KinkSync werkt", back: "/", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/security") {
    return { title: "Security & privacy", back: "/about", hideBottomNav: true, bottomNavSection: null };
  }
  if (path.includes("/versions/") && path.startsWith("/contracts/")) {
    return {
      title: "Getekend document",
      back: path.replace(/\/versions\/[^/]+$/, "/history"),
      hideBottomNav: false,
      bottomNavSection: null,
    };
  }
  if (path.endsWith("/history") && path.startsWith("/contracts/")) {
    return {
      title: "Contractgeschiedenis",
      back: path.replace(/\/history$/, ""),
      hideBottomNav: false,
      bottomNavSection: null,
    };
  }
  if (path.startsWith("/contracts/")) {
    return { title: "Contract", back: "/contracts", hideBottomNav: false, bottomNavSection: null };
  }
  if (path === "/contracts") {
    return { title: "Contracten", back: "/", hideBottomNav: false, bottomNavSection: null };
  }
  if (path === "/contract") {
    return { title: "Contract opstellen", back: "/compare", hideBottomNav: false, bottomNavSection: null };
  }
  return { title: "KinkSync", back: "/", hideBottomNav: false, bottomNavSection: null };
}
