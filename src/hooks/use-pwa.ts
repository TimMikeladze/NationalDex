"use client";

import { useEffect, useState } from "react";

export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari specific check
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    setIsPWA(isStandalone);

    // Listen for display mode changes (e.g., if user installs while using)
    const mql = window.matchMedia("(display-mode: standalone)");
    const onChange = (e: MediaQueryListEvent) => {
      setIsPWA(e.matches);
    };
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isPWA;
}
