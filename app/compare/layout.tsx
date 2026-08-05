import type { ReactNode } from "react";

export default function CompareLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* The compare page still carries legacy inline accent colours on its
          category headings. Keep section hierarchy neutral, matching the
          white category titles used throughout the profile experience. */}
      <style>{`
        main section[id^="cat-"] > h2,
        main section[id^="cat-"] ~ section > h2 {
          color: var(--text) !important;
        }
      `}</style>
      {children}
    </>
  );
}
