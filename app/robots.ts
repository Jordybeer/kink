import type { MetadataRoute } from "next";

/**
 * Wie mag er binnenkijken, en waar.
 *
 * De voordeur staat open: `/` en `/about` mogen geïndexeerd worden — daar staat
 * wat KinkSync is, en niemand vindt een tool als deze zonder dat.
 *
 * De kamers blijven dicht. Niet omdat er iets te verbergen valt aan de crawler —
 * dat kan niet: er is geen backend, en een gedeeld profiel reist in het
 * URL-fragment (`origin/#p3=…`, zie `lib/profileQr.ts`), dat nooit een server
 * bereikt en nooit gecrawld wordt. Ze blijven dicht omdat het lege shells zijn
 * zonder lokale data. Google zou er niets vinden en jouw twee echte pagina's
 * verdunnen met dunne, bijna-identieke resultaten.
 *
 * Let op: dit stuurt crawlen, niet indexeren. Een disallowed URL kan alsnog kaal
 * in resultaten opduiken als iemand er extern naar linkt. Wil je harde
 * uitsluiting, dan hoort daar per route `metadata.robots.index = false` bij.
 */

export const PUBLIC_PATHS = ["/", "/about"] as const;

export const PRIVATE_PATHS = [
  "/profile",
  "/compare",
  "/contract",
  "/contracts",
  "/scene",
  "/scenes",
  "/timeline",
  "/quarantine",
  "/offline",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [...PUBLIC_PATHS],
      disallow: [...PRIVATE_PATHS],
    },
  };
}
