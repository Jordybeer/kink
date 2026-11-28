import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import JourneyProvider from "./JourneyProvider";
import "./world.css";
import "./editions.css";

export const metadata: Metadata = {
  title: "Ontdekkingsstudio · KinkSync",
  robots: { index: false, follow: false },
};

export default function JourneyLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  return <JourneyProvider>{children}</JourneyProvider>;
}
