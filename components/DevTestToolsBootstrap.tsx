"use client";

import { useEffect } from "react";
import { syncDevTestToolsFromLocation } from "@/lib/devTestTools";

export default function DevTestToolsBootstrap() {
  useEffect(() => {
    syncDevTestToolsFromLocation();
  }, []);

  return null;
}
