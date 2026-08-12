"use client";

import { Export, ShareNetwork } from "@phosphor-icons/react";
import { useLayoutEffect, useState, type ComponentProps } from "react";
import { detectClientPlatform, type ClientPlatform } from "@/lib/clientPlatform";

type PlatformShareIconProps = ComponentProps<typeof ShareNetwork> & {
  platform?: ClientPlatform | "auto";
};

/**
 * Render the familiar share glyph without putting hydration in a chokehold.
 * Auto detection waits for a layout effect, then corrects the platform glyph
 * before the browser paints the hydrated UI.
 */
export default function PlatformShareIcon({
  platform = "auto",
  ...props
}: PlatformShareIconProps) {
  const [detectedPlatform, setDetectedPlatform] = useState<ClientPlatform>("other");

  useLayoutEffect(() => {
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
