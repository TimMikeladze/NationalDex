"use client";

import {
  Gamepad2,
  Heart,
  Info,
  MessageSquare,
  MoreHorizontal,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Logo } from "@/components/brand/logo";
import { ComparisonDrawer } from "@/components/comparison/comparison-drawer";
import { GenerationPicker } from "@/components/pokemon/generation-picker";
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
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { getGenerationName } from "@/lib/pkmn";
import { cn } from "@/lib/utils";
import {
  CardsIcon,
  CompareIcon,
  DecksIcon,
  DexIcon,
  ListsIcon,
  LocationsIcon,
  QuizIcon,
  TeamsIcon,
} from "./navigation/app-icons";
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
  { href: "/", icon: DexIcon, label: "dex" },
  { href: "/cards", icon: CardsIcon, label: "cards" },
  { href: "#search", icon: Search, label: "search", action: true },
  { href: "/favorites", icon: Heart, label: "favs" },
  { href: "#more", icon: MoreHorizontal, label: "more", action: true },
];

// Items promoted to desktop navbar (still shown in mobile "more" sheet)
const desktopExtraNavItems = [
  { href: "/decks", icon: DecksIcon, label: "decks" },
  { href: "/teams", icon: TeamsIcon, label: "teams" },
  { href: "/lists", icon: ListsIcon, label: "lists" },
  { href: "/whos-that-pokemon", icon: QuizIcon, label: "quiz" },
  { href: "/comparison", icon: CompareIcon, label: "compare" },
  { href: "/locations", icon: LocationsIcon, label: "locations" },
];

// Items that stay in the "more" dropdown/sheet
const desktopMoreMenuItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/feedback", icon: MessageSquare, label: "Feedback" },
  { href: "/about", icon: Info, label: "About" },
];

// All items for the mobile "more" sheet
const moreMenuItems = [
  ...desktopExtraNavItems.map((item) => {
    // Restore original labels for mobile sheet
    const labelMap: Record<string, string> = {
      decks: "Deck Builder",
      teams: "Teams",
      lists: "Lists",
      quiz: "Who's That Pokemon?",
      compare: "Comparison",
      locations: "Locations",
    };
    return { ...item, label: labelMap[item.label] ?? item.label };
  }),
  ...desktopMoreMenuItems,
];

interface AppShellProps {
  children: React.ReactNode;
}

// The shell only ever renders in the browser after hydration, but the render
// itself still happens on the server, where `useLayoutEffect` warns.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { toggleSearch, moreOpen, setMoreOpen } = useNav();
  const { comparison } = useComparison();
  const { preferredGeneration } = useGenerationPreference();
  const isPopStateNav = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
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

  // Publish the geometry the shell actually ended up with.
  //
  // The CSS starting values are estimates — a nav is "3rem plus the home
  // indicator", a header is "3.5rem" — and an estimate is exactly what broke
  // this before: on a device whose insets did not match the guess, pages sized
  // against `--app-content-height` were a strip taller or shorter than the room
  // they had. These are the measured heights of the real boxes, so a page can
  // ask how much room it has and get an answer that is true on that device.
  useIsomorphicLayoutEffect(() => {
    const shell = shellRef.current;
    const main = mainRef.current;
    if (!shell || !main) return;

    let frame = 0;

    const publish = () => {
      frame = 0;
      const shellTop = shell.getBoundingClientRect().top;
      const mainBox = main.getBoundingClientRect();
      const navHeight = navRef.current?.getBoundingClientRect().height ?? 0;

      // On the root as well as the shell: anything portalled out of the shell
      // — toasts, sheets — has to clear the same nav, and cannot inherit a
      // variable scoped to a subtree it is no longer in.
      const set = (name: string, value: number) => {
        const px = `${Math.round(value * 100) / 100}px`;
        shell.style.setProperty(name, px);
        document.documentElement.style.setProperty(name, px);
      };

      // Measured from the top of the viewport, so the top safe area the shell
      // pads out is already part of it.
      set("--app-top-inset", mainBox.top - shellTop);
      set("--app-bottom-inset", navHeight);
      set("--app-content-height", mainBox.height);
    };

    // Resize observers fire during layout; defer so a page reading these back
    // in its own effect never sees a value from the previous frame.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(publish);
    };

    publish();

    const observer = new ResizeObserver(schedule);
    observer.observe(shell);
    observer.observe(main);
    if (navRef.current) observer.observe(navRef.current);

    // `resize` covers the cases a ResizeObserver cannot see on iOS: rotation
    // and the safe area changing under it.
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

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

  const isMoreActive = desktopMoreMenuItems.some((item) =>
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
        ref={shellRef}
        // Geometry lives in `app-shell` (globals.css): the shell is pinned to
        // the four edges of the viewport and the chrome sits in normal flow
        // inside it, so `main` gets the leftover and the nav is flush with the
        // bottom of the device without anything having to be worked out.
        className="app-shell"
        data-secondary={secondaryToolbar?.content ? "true" : "false"}
      >
        {/* Desktop Header */}
        <header className="hidden lg:flex shrink-0 z-50 h-14 items-center border-b bg-background px-6">
          <div className="flex w-full items-center justify-between">
            <Link href="/" aria-label="NationalDex home">
              <Logo
                iconSrc="/icons/logo-app.svg"
                className="gap-1.5"
                iconClassName="size-7"
                labelClassName="text-sm"
              />
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => renderNavItem(item, "desktop"))}
              {desktopExtraNavItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const isComparison = item.href === "/comparison";
                const showBadge = isComparison && comparison.length > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
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
                    <span className="text-xs">{item.label}</span>
                  </Link>
                );
              })}
              {/* Desktop More Dropdown (Settings, Feedback, About) */}
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
                  {desktopMoreMenuItems.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);

                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            isActive && "bg-muted",
                          )}
                        >
                          <item.icon className="size-4" strokeWidth={1.5} />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="mx-1 h-5 w-px bg-border" />
              <GenerationPicker />
            </nav>
          </div>
        </header>

        {/* Optional per-page secondary toolbar */}
        {secondaryToolbar?.content && (
          <header
            className={cn(
              "shrink-0 z-40 border-b bg-background lg:bg-background/80 lg:backdrop-blur lg:supports-backdrop-filter:bg-background/60",
              "pwa-glass-header",
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
          // `app-main` (globals.css) owns the geometry: it takes whatever the
          // chrome above and below it leaves over. Giving it a height here as
          // well is how the two got out of step and left a strip of background
          // above the bottom nav.
          className="app-main overflow-y-auto overflow-x-hidden"
        >
          <div className="w-full min-h-full">{children}</div>
        </main>

        {/* Mobile/Tablet Bottom Nav - hidden on desktop. Last child of the
            shell, so its padding is the last thing before the bottom edge of
            the device and the home indicator sits on it. */}
        <nav
          ref={navRef}
          className="shrink-0 z-50 border-t bg-background pb-safe lg:hidden pwa-glass-nav"
        >
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
            {/* The whole row is the control — a label beside an icon gave no
                clue that either was pressable, or what pressing did. It is
                built like the links below it, icon first, so the sheet reads
                as one list rather than a row and then a menu. */}
            <GenerationPicker
              align="end"
              trigger={
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted hover:text-foreground",
                    preferredGeneration !== null
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Gamepad2 className="size-5 shrink-0" strokeWidth={1.5} />
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="text-sm">view as</span>
                      <span className="truncate text-xs lowercase text-muted-foreground">
                        {preferredGeneration !== null
                          ? getGenerationName(preferredGeneration)
                          : "national dex"}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Pin the app to one generation&rsquo;s games — its Pokemon,
                      moves, abilities and sprites — or leave it on National Dex
                      for everything.
                    </span>
                  </span>
                </button>
              }
            />
            <nav className="flex flex-col gap-1 py-2">
              {moreMenuItems.map(renderMoreMenuItem)}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Comparison Drawer - available on all pages */}
        <ComparisonDrawer />
      </div>
    </SecondaryToolbarContext.Provider>
  );
}
