"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLastPage } from "@/hooks/use-last-page";

export function LastPageRestorer() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, rememberLastPage, lastPage, setLastPage } = useLastPage();
  const hasRestored = useRef(false);

  // Restore last page on initial load
  useEffect(() => {
    if (!isLoaded || hasRestored.current) return;
    hasRestored.current = true;

    if (rememberLastPage && lastPage && lastPage !== "/" && pathname === "/") {
      router.replace(lastPage);
    }
  }, [isLoaded, rememberLastPage, lastPage, pathname, router]);

  // Track page changes
  useEffect(() => {
    if (!isLoaded || !rememberLastPage) return;
    // Don't save until after initial restore attempt
    if (!hasRestored.current) return;

    setLastPage(pathname);
  }, [isLoaded, rememberLastPage, pathname, setLastPage]);

  return null;
}
