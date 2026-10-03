export type AmbientGlowContext = "home" | "profile" | "default";

export function ambientGlowContextForPathname(pathname: string): AmbientGlowContext {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/profile/")) return "profile";
  return "default";
}
