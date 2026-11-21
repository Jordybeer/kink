import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuestionnaireStudy from "./QuestionnaireStudy";
import "./questionnaire.css";

export const metadata: Metadata = {
  title: "Vragenlijst · KinkSync Studio",
  robots: { index: false, follow: false },
};

export default function HotPage() {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") {
    notFound();
  }

  return <QuestionnaireStudy />;
}
