"use client";

import { useEffect } from "react";

export function PwaLoadingScreen() {
  useEffect(() => {
    const el = document.getElementById("pwa-loading-screen");
    if (!el) return;

    // Fade out then hide. Using style.display instead of el.remove() because
    // this div is rendered by the root layout — removing it from the DOM breaks
    // React's fiber tree and causes crashes on subsequent client-side navigations.
    el.classList.add("pwa-loading-fade-out");
    const onEnd = () => {
      el.style.display = "none";
    };
    el.addEventListener("animationend", onEnd);
    return () => el.removeEventListener("animationend", onEnd);
  }, []);

  return null;
}
