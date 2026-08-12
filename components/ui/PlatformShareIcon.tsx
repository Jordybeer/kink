"use client";

import { Export, ShareNetwork } from "@phosphor-icons/react";
import { useEffect, useState, type ComponentProps } from "react";
import { detectClientPlatform, type ClientPlatform } from "@/lib/clientPlatform";

type PlatformShareIconProps = ComponentProps<typeof ShareNetwork> & {
  platform?: ClientPlatform | "auto";
};

/**
 * Render the familiar platform share glyph while keeping the first render
 * deterministic for SSR hydration. Auto detection only runs after mount.
 */
export default function PlatformShareIcon({
  platform = "auto",
  ...props
}: PlatformShareIconProps) {
  const [detectedPlatform, setDetectedPlatform] = useState<ClientPlatform>("other");

  useEffect(() => {
    if (platform !== "auto") return;
    setDetectedPlatform(detectClientPlatform(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
    ));
  }, [platform]);

  const resolvedPlatform = platform === "auto" ? detectedPlatform : platform;
  const Icon = resolvedPlatform === "ios" ? Export : ShareNetwork;

  return <Icon {...props} />;
}
