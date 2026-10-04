import { decodeLocalRouteId, profileHref } from "@/lib/localRoutes";

export type BottomNavSection = "space" | "together" | "moments" | null;

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
    return { title: "Profiel", back: "/space", hideBottomNav: false, bottomNavSection: "space" };
  }
  if (path === "/scene") {
    return { title: "Scène", back: "/moments", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/scenes") {
    return { title: "Scènes", back: "/moments", hideBottomNav: false, bottomNavSection: "moments" };
  }
  if (path.startsWith("/scenes/")) {
    return { title: dynamic.sceneTitle ?? "Scène", back: "/scenes", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/intimacy") {
    return { title: "Intimiteit", back: "/moments", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/compare" || path.startsWith("/compare/")) {
    return { title: "Vergelijk", back: "/together", hideBottomNav: false, bottomNavSection: "together" };
  }
  if (path === "/timeline") {
    return { title: "Contractgeschiedenis", back: "/contracts", hideBottomNav: false, bottomNavSection: "together" };
  }
  if (path === "/about") {
    return { title: "Hoe KinkSync werkt", back: "/", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/security") {
    return { title: "Security & privacy", back: "/about", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/sandbox") {
    return { title: "Intimiteit sandbox", back: "/", hideBottomNav: true, bottomNavSection: null };
  }
  if (path === "/qa") {
    return { title: "QA-lab", back: "/", hideBottomNav: true, bottomNavSection: null };
  }
  if (path.includes("/versions/") && path.startsWith("/contracts/")) {
    return {
      title: "Getekend document",
      back: path.replace(/\/versions\/[^/]+$/, "/history"),
      hideBottomNav: false,
      bottomNavSection: "together",
    };
  }
  if (path.endsWith("/history") && path.startsWith("/contracts/")) {
    return {
      title: "Contractgeschiedenis",
      back: path.replace(/\/history$/, ""),
      hideBottomNav: false,
      bottomNavSection: "together",
    };
  }
  if (path.startsWith("/contracts/")) {
    return { title: "Contract", back: "/contracts", hideBottomNav: false, bottomNavSection: "together" };
  }
  if (path === "/contracts") {
    return { title: "Contracten", back: "/together", hideBottomNav: false, bottomNavSection: "together" };
  }
  if (path === "/contract") {
    return { title: "Contract opstellen", back: "/together", hideBottomNav: false, bottomNavSection: "together" };
  }
  if (path === "/space") {
    return { title: "Ik", back: "/?profiles=1", hideBottomNav: false, bottomNavSection: "space" };
  }
  if (path === "/together") {
    return { title: "Samen", back: "/space", hideBottomNav: false, bottomNavSection: "together" };
  }
  if (path === "/moments") {
    return { title: "Momenten", back: "/space", hideBottomNav: false, bottomNavSection: "moments" };
  }
  if (path === "/") {
    return { title: "KinkSync", back: "/", hideBottomNav: false, bottomNavSection: "space" };
  }
  return { title: "KinkSync", back: "/", hideBottomNav: false, bottomNavSection: null };
}
