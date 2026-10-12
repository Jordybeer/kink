"use client";

import { useEffect, useRef, useState } from "react";

/** Decorative loops run only when both their surface and the document are visible. */
export function useMotionActivity<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let inView = typeof IntersectionObserver === "undefined";
    const update = () => setActive(inView && document.visibilityState === "visible");
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer?.observe(element);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return { ref, active };
}
