"use client";

import { useEffect } from "react";

const VISUAL_VIEWPORT_HEIGHT = "--visual-viewport-height";

export default function VisualViewportBridge() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let renderedHeight = -1;

    const syncHeight = () => {
      const nextHeight = Math.round(viewport?.height ?? window.innerHeight);
      if (nextHeight === renderedHeight) return;
      renderedHeight = nextHeight;
      root.style.setProperty(VISUAL_VIEWPORT_HEIGHT, `${nextHeight}px`);
    };

    syncHeight();
    viewport?.addEventListener("resize", syncHeight);
    viewport?.addEventListener("scroll", syncHeight);
    window.addEventListener("resize", syncHeight);
    window.addEventListener("orientationchange", syncHeight);
    window.addEventListener("pageshow", syncHeight);
    document.addEventListener("visibilitychange", syncHeight);

    return () => {
      viewport?.removeEventListener("resize", syncHeight);
      viewport?.removeEventListener("scroll", syncHeight);
      window.removeEventListener("resize", syncHeight);
      window.removeEventListener("orientationchange", syncHeight);
      window.removeEventListener("pageshow", syncHeight);
      document.removeEventListener("visibilitychange", syncHeight);
      root.style.removeProperty(VISUAL_VIEWPORT_HEIGHT);
    };
  }, []);

  return null;
}
