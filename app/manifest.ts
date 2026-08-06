import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KinkSync",
    short_name: "KinkSync",
    description: "Verken grenzen samen.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#E45AAB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
