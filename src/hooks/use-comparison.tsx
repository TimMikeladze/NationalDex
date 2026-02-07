"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "pokedex-comparison";
const PANEL_STATE_KEY = "pokedex-comparison-panel";

export type ComparisonPanelState = "closed" | "minimized" | "expanded";

type ComparisonContextValue = {
  comparison: number[];
  isLoaded: boolean;
  addToComparison: (id: number) => void;
  removeFromComparison: (id: number) => void;
  toggleComparison: (id: number) => void;
  isInComparison: (id: number) => boolean;
  clearComparison: () => void;
  panelState: ComparisonPanelState;
  expandPanel: () => void;
  minimizePanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
};

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

export function ComparisonProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [comparison, setComparison] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [panelState, setPanelState] = useState<ComparisonPanelState>("closed");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setComparison(JSON.parse(stored));
      } catch {
        setComparison([]);
      }
    }

    // Restore panel state (default to minimized if there are items)
    const panelStored = localStorage.getItem(PANEL_STATE_KEY);
    if (panelStored) {
      setPanelState(panelStored as ComparisonPanelState);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparison));
      // Auto-show minimized panel when first item is added
      if (comparison.length > 0 && panelState === "closed") {
        setPanelState("minimized");
      }
      // Auto-close panel when all items are removed
      if (comparison.length === 0 && panelState !== "closed") {
        setPanelState("closed");
      }
    }
  }, [comparison, isLoaded, panelState]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(PANEL_STATE_KEY, panelState);
    }
  }, [panelState, isLoaded]);

  const addToComparison = useCallback((id: number) => {
    setComparison((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const removeFromComparison = useCallback((id: number) => {
    setComparison((prev) => prev.filter((item) => item !== id));
  }, []);

  const toggleComparison = useCallback((id: number) => {
    setComparison((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  }, []);

  const isInComparison = useCallback(
    (id: number) => comparison.includes(id),
    [comparison],
  );

  const clearComparison = useCallback(() => {
    setComparison([]);
  }, []);

  const expandPanel = useCallback(() => {
    setPanelState("expanded");
  }, []);

  const minimizePanel = useCallback(() => {
    setPanelState("minimized");
  }, []);

  const closePanel = useCallback(() => {
    setPanelState("closed");
  }, []);

  const togglePanel = useCallback(() => {
    setPanelState((prev) => {
      if (prev === "closed") return "minimized";
      if (prev === "minimized") return "expanded";
      return "minimized";
    });
  }, []);

  const value = useMemo<ComparisonContextValue>(
    () => ({
      comparison,
      isLoaded,
      addToComparison,
      removeFromComparison,
      toggleComparison,
      isInComparison,
      clearComparison,
      panelState,
      expandPanel,
      minimizePanel,
      closePanel,
      togglePanel,
    }),
    [
      comparison,
      isLoaded,
      addToComparison,
      removeFromComparison,
      toggleComparison,
      isInComparison,
      clearComparison,
      panelState,
      expandPanel,
      minimizePanel,
      closePanel,
      togglePanel,
    ],
  );

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const ctx = useContext(ComparisonContext);
  if (!ctx) {
    throw new Error("useComparison must be used within a ComparisonProvider");
  }
  return ctx;
}
