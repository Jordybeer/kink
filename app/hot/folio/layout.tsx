import type { ReactNode } from "react";
import FolioMotion from "./FolioMotion";
import "./folio.css";

export default function FolioLayout({ children }: { children: ReactNode }) {
  return <FolioMotion>{children}</FolioMotion>;
}
