"use client"

import { ThemeProvider } from "next-themes"
import { QueryProvider } from "@/lib/query-provider"
import { NavProvider } from "./navigation/nav-provider"
import { AppShell } from "./app-shell"
import { SearchOverlay } from "./search/search-overlay"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <NavProvider>
          <AppShell>{children}</AppShell>
          <SearchOverlay />
        </NavProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
