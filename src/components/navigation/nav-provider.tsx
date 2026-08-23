"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface NavContextValue {
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  toggleMore: () => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleMore = useCallback(() => {
    setMoreOpen((prev) => !prev);
  }, []);

  return (
    <NavContext.Provider
      value={{
        moreOpen,
        setMoreOpen,
        toggleMore,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error("useNav must be used within NavProvider");
  }
  return context;
}
