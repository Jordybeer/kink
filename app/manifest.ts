import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KinkSync",
    short_name: "KinkSync",
    description: "Verken grenzen samen.",
    // De installatie-identiteit hangt anders aan start_url; wie die later
    // verandert, laat bestaande installaties als wees achter.
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#E45AAB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android snijdt maskable-iconen tot ongeveer 80% en zou de ringen anders
      // aansnijden; deze variant draagt het merk op 68% met marge rondom.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
