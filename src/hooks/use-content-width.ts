"use client";

import { useCallback, useEffect, useState } from "react";

export type ContentWidth = "contained" | "full";

const STORAGE_KEY = "nationaldex-content-width";

export function useContentWidth() {
  const [contentWidth, setContentWidth] = useState<ContentWidth>("contained");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "contained" || stored === "full") {
      setContentWidth(stored);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, contentWidth);
  }, [contentWidth, isLoaded]);

  const setContained = useCallback(() => setContentWidth("contained"), []);
  const setFull = useCallback(() => setContentWidth("full"), []);

  return {
    contentWidth,
    isLoaded,
    setContentWidth,
    setContained,
    setFull,
  };
}
