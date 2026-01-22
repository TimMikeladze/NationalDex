"use client";

import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/lib/query-provider";
import { AppShell } from "./app-shell";
import { LastPageRestorer } from "./last-page-restorer";
import { NavProvider } from "./navigation/nav-provider";
import { SearchOverlay } from "./search/search-overlay";

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
          <LastPageRestorer />
        </NavProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
