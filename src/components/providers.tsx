"use client";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { ComparisonProvider } from "@/hooks/use-comparison";
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
          <ComparisonProvider>
            <NavProvider>
              <AppShell>{children}</AppShell>
              <SearchOverlay />
              {/* Toasts were being raised — adding to a comparison, filling a
                  deck — with nowhere to appear. They sit above the mobile bottom
                  nav rather than behind it. */}
              <Toaster position="bottom-center" offset={64} mobileOffset={64} />
            </NavProvider>
          </ComparisonProvider>
        </QueryProvider>
      </ThemeProvider>
    </NuqsAdapter>
  );
}
