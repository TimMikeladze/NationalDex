"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pokedex-recently-viewed";
const MAX_RECENT = 20;

export interface RecentlyViewedItem {
  id: number;
  name: string;
  viewedAt: number;
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>(
    [],
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch {
        setRecentlyViewed([]);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed, isLoaded]);

  const addRecentlyViewed = useCallback((id: number, name: string) => {
    setRecentlyViewed((prev) => {
      // Remove if already exists
      const filtered = prev.filter((item) => item.id !== id);
      // Add to front
      const updated = [{ id, name, viewedAt: Date.now() }, ...filtered];
      // Keep only MAX_RECENT items
      return updated.slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
  }, []);

  const removeRecentlyViewed = useCallback((id: number) => {
    setRecentlyViewed((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    recentlyViewed,
    isLoaded,
    addRecentlyViewed,
    clearRecentlyViewed,
    removeRecentlyViewed,
  };
}
