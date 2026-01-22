"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "pokedex-last-page";

type LastPagePreferences = {
  rememberLastPage: boolean;
  lastPage: string | null;
};

const DEFAULT_PREFERENCES: LastPagePreferences = {
  rememberLastPage: true,
  lastPage: null,
};

function parsePreferences(value: string | null): LastPagePreferences | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<LastPagePreferences>;
    return {
      rememberLastPage:
        parsed.rememberLastPage ?? DEFAULT_PREFERENCES.rememberLastPage,
      lastPage: parsed.lastPage ?? DEFAULT_PREFERENCES.lastPage,
    };
  } catch {
    return null;
  }
}

export function useLastPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [preferences, setPreferences] =
    useState<LastPagePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = parsePreferences(localStorage.getItem(STORAGE_KEY));
    if (stored) setPreferences(stored);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [isLoaded, preferences]);

  const setRememberLastPage = useCallback((enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, rememberLastPage: enabled }));
  }, []);

  const setLastPage = useCallback((path: string | null) => {
    setPreferences((prev) => ({ ...prev, lastPage: path }));
  }, []);

  const clearLastPage = useCallback(() => {
    setPreferences((prev) => ({ ...prev, lastPage: null }));
  }, []);

  return useMemo(
    () => ({
      ...preferences,
      isLoaded,
      setRememberLastPage,
      setLastPage,
      clearLastPage,
    }),
    [preferences, isLoaded, setRememberLastPage, setLastPage, clearLastPage],
  );
}
