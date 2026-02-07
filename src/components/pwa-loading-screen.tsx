"use client";

import { useEffect } from "react";

export function PwaLoadingScreen() {
  useEffect(() => {
    const el = document.getElementById("pwa-loading-screen");
    if (!el) return;

    // Fade out then remove
    el.classList.add("pwa-loading-fade-out");
    const onEnd = () => el.remove();
    el.addEventListener("animationend", onEnd);
    return () => el.removeEventListener("animationend", onEnd);
  }, []);

  return null;
}
