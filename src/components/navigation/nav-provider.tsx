"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface NavContextValue {
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  toggleSearch: () => void
}

const NavContext = createContext<NavContextValue | null>(null)

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev)
  }, [])

  return (
    <NavContext.Provider value={{ searchOpen, setSearchOpen, toggleSearch }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNav() {
  const context = useContext(NavContext)
  if (!context) {
    throw new Error("useNav must be used within NavProvider")
  }
  return context
}
