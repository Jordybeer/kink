import "./studio.css";
import { ProfileDrafts } from "./ProfileDrafts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Bewegingsstudio · KinkSync",
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  return <div data-motion-studio><ProfileDrafts>{children}</ProfileDrafts></div>;
}
