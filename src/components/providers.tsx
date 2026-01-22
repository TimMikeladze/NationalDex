"use client";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/lib/query-provider";
import { AppShell } from "./app-shell";
import { NavProvider } from "./navigation/nav-provider";
import { SearchOverlay } from "./search/search-overlay";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
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
    </NuqsAdapter>
  );
}
