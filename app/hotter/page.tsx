import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MaterialStudio from "./MaterialStudio";
import "./material.css";

export const metadata: Metadata = {
  title: "Materialenstudio · KinkSync",
  robots: { index: false, follow: false },
};

export default function HotterPage() {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  return <MaterialStudio />;
}
