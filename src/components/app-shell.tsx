"use client";

import {
  CircleHelp,
  GitCompareArrows,
  Grid3X3,
  Heart,
  Info,
  ListPlus,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Package,
  Search,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useComparison } from "@/hooks/use-comparison";
import { cn } from "@/lib/utils";
import { useNav } from "./navigation/nav-provider";

type SecondaryToolbarState = {
  content: React.ReactNode | null;
  className?: string;
  heightClassName?: string; // defaults to h-14
};

type SecondaryToolbarContextValue = {
  setSecondaryToolbar: (next: SecondaryToolbarState | null) => void;
};

const SecondaryToolbarContext =
  createContext<SecondaryToolbarContextValue | null>(null);

export function useSecondaryToolbar() {
  const ctx = useContext(SecondaryToolbarContext);
  if (!ctx) {
    throw new Error("useSecondaryToolbar must be used within AppShell");
  }

  return ctx.setSecondaryToolbar;
}

const navItems = [
  { href: "/", icon: Grid3X3, label: "dex" },
  { href: "/teams", icon: Users, label: "teams" },
  { href: "#search", icon: Search, label: "search", action: true },
  { href: "/favorites", icon: Heart, label: "favs" },
  { href: "#more", icon: MoreHorizontal, label: "more", action: true },
];

const moreMenuItems = [
  { href: "/lists", icon: ListPlus, label: "Lists" },
  {
    href: "/whos-that-pokemon",
    icon: CircleHelp,
    label: "Who's That Pokemon?",
  },
  { href: "/comparison", icon: GitCompareArrows, label: "Comparison" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/locations", icon: MapPin, label: "Locations" },
  { href: "/items", icon: Package, label: "Items" },
  { href: "/feedback", icon: MessageSquare, label: "Feedback" },
  { href: "/about", icon: Info, label: "About" },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { toggleSearch, moreOpen, setMoreOpen } = useNav();
  const { comparison } = useComparison();
  const isPopStateNav = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const prevPathname = useRef(pathname);
  const [secondaryToolbar, setSecondaryToolbar] =
    useState<SecondaryToolbarState | null>(null);
  const setSecondaryToolbarStable = useCallback(
    (next: SecondaryToolbarState | null) => {
      setSecondaryToolbar(next);
    },
    [],
  );

  const secondaryToolbarValue = useMemo<SecondaryToolbarContextValue>(
    () => ({ setSecondaryToolbar: setSecondaryToolbarStable }),
    [setSecondaryToolbarStable],
  );

  // Track back/forward navigation via popstate
  useEffect(() => {
    const handlePopState = () => {
      isPopStateNav.current = true;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Save scroll position before navigation and restore/reset on route change
  useEffect(() => {
    if (pathname === prevPathname.current) return;

    const mainEl = mainRef.current;
    if (!mainEl) return;

    // Save scroll position of the previous page before navigating
    const scrollKey = `scroll:${prevPathname.current}`;
    const currentScroll = mainEl.scrollTop;
    if (currentScroll > 0) {
      sessionStorage.setItem(scrollKey, String(currentScroll));
    } else {
      sessionStorage.removeItem(scrollKey);
    }

    if (isPopStateNav.current) {
      // Back/forward navigation - restore saved scroll position
      isPopStateNav.current = false;
      const savedScroll = sessionStorage.getItem(`scroll:${pathname}`);
      if (savedScroll) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          mainEl.scrollTo(0, parseInt(savedScroll, 10));
        });
      }
    } else {
      // Forward navigation - scroll to top
      mainEl.scrollTo(0, 0);
    }

    prevPathname.current = pathname;
  }, [pathname]);

  const handleAction = (item: (typeof navItems)[0]) => {
    if (item.label === "search") {
      toggleSearch();
    } else if (item.label === "more") {
      setMoreOpen(true);
    }
  };

  const isMoreActive = moreMenuItems.some((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );

  const renderNavItem = (
    item: (typeof navItems)[0],
    variant: "mobile" | "desktop",
  ) => {
    const isActive =
      !item.action &&
      (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));

    const mobileClasses =
      "flex flex-col items-center justify-center gap-0.5 px-4 py-2";
    const desktopClasses =
      "flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted";

    if (item.action) {
      // On desktop, don't show the "more" button - we show the items directly
      if (item.label === "more" && variant === "desktop") {
        return null;
      }

      return (
        <button
          key={item.label}
          type="button"
          onClick={() => handleAction(item)}
          className={cn(
            variant === "mobile" ? mobileClasses : desktopClasses,
            "text-muted-foreground hover:text-foreground transition-colors",
            item.label === "more" && isMoreActive && "text-foreground",
          )}
        >
          <item.icon className="size-4" strokeWidth={1.5} />
          <span
            className={
              variant === "mobile"
                ? "text-[9px] uppercase tracking-wider"
                : "text-xs"
            }
          >
            {item.label}
          </span>
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          variant === "mobile" ? mobileClasses : desktopClasses,
          "transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <item.icon className="size-4" strokeWidth={1.5} />
        <span
          className={
            variant === "mobile"
              ? "text-[9px] uppercase tracking-wider"
              : "text-xs"
          }
        >
          {item.label}
        </span>
      </Link>
    );
  };

  const renderMoreMenuItem = (item: (typeof moreMenuItems)[0]) => {
    const isActive =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const isComparison = item.href === "/comparison";
    const showBadge = isComparison && comparison.length > 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMoreOpen(false)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <div className="relative">
          <item.icon className="size-5" strokeWidth={1.5} />
          {showBadge && (
            <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-medium flex items-center justify-center">
              {comparison.length}
            </span>
          )}
        </div>
        <span className="text-sm">{item.label}</span>
        {showBadge && (
          <span className="ml-auto text-xs text-muted-foreground">
            {comparison.length} pokemon
          </span>
        )}
      </Link>
    );
  };

  return (
    <SecondaryToolbarContext.Provider value={secondaryToolbarValue}>
      <div
        className="app-shell min-h-screen flex flex-col"
        data-secondary={secondaryToolbar?.content ? "true" : "false"}
      >
        {/* Desktop Header */}
        <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-14 items-center border-b bg-background px-6 fixed-bottom-stable">
          <div className="flex w-full items-center justify-between">
            <Link href="/" className="text-lg font-medium">
              nationaldex
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => renderNavItem(item, "desktop"))}
              {/* Desktop More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted transition-colors",
                    isMoreActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <MoreHorizontal className="size-4" strokeWidth={1.5} />
                  <span className="text-xs">more</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {moreMenuItems.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const isComparison = item.href === "/comparison";
                    const showBadge = isComparison && comparison.length > 0;

                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            isActive && "bg-muted",
                          )}
                        >
                          <div className="relative">
                            <item.icon className="size-4" strokeWidth={1.5} />
                            {showBadge && (
                              <span className="absolute -top-1 -right-1 size-3 rounded-full bg-primary text-primary-foreground text-[8px] font-medium flex items-center justify-center">
                                {comparison.length}
                              </span>
                            )}
                          </div>
                          <span>{item.label}</span>
                          {showBadge && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {comparison.length}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </header>

        {/* Optional per-page secondary toolbar */}
        {secondaryToolbar?.content && (
          <header
            className={cn(
              "fixed left-0 right-0 z-40 border-b fixed-bottom-stable bg-background lg:bg-background/80 lg:backdrop-blur lg:supports-backdrop-filter:bg-background/60",
              "top-0 lg:top-14 pwa-glass-header",
              secondaryToolbar.className,
            )}
          >
            <div
              className={cn(
                "flex items-center px-4 md:px-6",
                secondaryToolbar.heightClassName ?? "h-14",
              )}
            >
              {secondaryToolbar.content}
            </div>
          </header>
        )}

        <main
          ref={mainRef}
          className={cn(
            // Keep content constrained between fixed toolbars.
            // Height = viewport minus top/bottom chrome (and safe-area bottom).
            // In PWA mode, pwa-main-height and pwa-pt-safe handle safe areas.
            "flex-1 min-h-0 pwa-pt-safe pwa-main-height",
            "overflow-y-auto overflow-x-hidden",
            "h-[calc(100dvh-var(--app-top-offset)-var(--app-bottom-offset)-env(safe-area-inset-bottom,0px))]",
            "max-h-[calc(100dvh-var(--app-top-offset)-var(--app-bottom-offset)-env(safe-area-inset-bottom,0px))]",
            // On mobile: use padding-top for offset (pwa-pt-safe overrides in PWA mode)
            // On desktop (lg+): use margin-top so scroll container starts below header
            "pt-(--app-top-offset) lg:pt-0 lg:mt-(--app-top-offset)",
          )}
        >
          <div className="w-full">{children}</div>
        </main>

        {/* Mobile/Tablet Bottom Nav - hidden on desktop */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe lg:hidden fixed-bottom-stable pwa-glass-nav">
          <div className="flex h-12 items-center justify-around max-w-lg mx-auto">
            {navItems.map((item) => renderNavItem(item, "mobile"))}
          </div>
        </nav>

        {/* Mobile More Menu Sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="pb-safe">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 py-2">
              {moreMenuItems.map(renderMoreMenuItem)}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </SecondaryToolbarContext.Provider>
  );
}
