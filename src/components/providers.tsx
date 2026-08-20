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
                  nav rather than behind it, clearing however tall the nav
                  actually is on the device instead of a guess at 64px that a
                  home indicator was enough to make wrong. */}
              <Toaster
                position="bottom-center"
                offset={64}
                mobileOffset={{
                  bottom: "calc(var(--app-bottom-inset, 5rem) + 1rem)",
                  left: 16,
                  right: 16,
                }}
              />
            </NavProvider>
          </ComparisonProvider>
        </QueryProvider>
      </ThemeProvider>
    </NuqsAdapter>
  );
}
