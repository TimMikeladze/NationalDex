"use client";

import {
  Heart,
  Info,
  MessageSquare,
  MoreHorizontal,
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
import { useComparison } from "@/hooks/use-comparison";
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
import { MoreSheet } from "./navigation/more-sheet";
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

// The phone's bottom bar. Six destinations is the most that fits without the
// labels colliding, so it carries the places you go back to constantly and
// hands everything else to "more".
const navItems = [
  { href: "/", icon: DexIcon, label: "dex" },
  { href: "/cards", icon: CardsIcon, label: "cards" },
  { href: "/decks", icon: DecksIcon, label: "decks" },
  { href: "/teams", icon: TeamsIcon, label: "teams" },
  { href: "/favorites", icon: Heart, label: "favs" },
  { href: "#more", icon: MoreHorizontal, label: "more", action: true },
];

// The desktop header has room for every destination, so it lists them all
// rather than hiding any behind a menu.
const desktopPrimaryNavItems = [
  { href: "/", icon: DexIcon, label: "dex" },
  { href: "/cards", icon: CardsIcon, label: "cards" },
  { href: "/favorites", icon: Heart, label: "favs" },
];

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

interface AppShellProps {
  children: React.ReactNode;
}

// The shell only ever renders in the browser after hydration, but the render
// itself still happens on the server, where `useLayoutEffect` warns.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// The most any device chrome takes off an edge — a home indicator, a gesture
// bar, a status bar, or all of them at once — with room to spare. Anything
// larger is a software keyboard or a reading taken mid-rotation, and reading
// either as device chrome would pull the nav up over the content.
const MAX_CHROME_INSET = 160;

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.matchMedia?.("(display-mode: fullscreen)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;

// A focused field means a software keyboard is on its way in or out, and the
// visible viewport is mid-flight with it.
const isTyping = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return false;

  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
};

/**
 * How much of the screen the browser is keeping to itself at the edges.
 *
 * Installed, there is no browser chrome, so every pixel between the viewport
 * and the screen is chrome the OS has already reserved — and every one of them
 * is a pixel `env(safe-area-inset-*)` is about to ask us to reserve a second
 * time. In a tab the same gap is the address bar, which is not ours to reclaim,
 * so this is standalone-only.
 */
const reservedByBrowser = () => {
  const screen = window.screen;
  if (!screen || !isStandalone()) return 0;

  // iOS reports the screen unrotated, so the taller of the two dimensions is
  // the screen's height only while the device is upright.
  const portrait = window.innerHeight >= window.innerWidth;
  const screenHeight = portrait
    ? Math.max(screen.width, screen.height)
    : Math.min(screen.width, screen.height);

  const gap = screenHeight - window.innerHeight;
  return gap > 0 && gap <= MAX_CHROME_INSET ? gap : 0;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { setMoreOpen } = useNav();
  const { comparison } = useComparison();
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

    // Reads back what `env(safe-area-inset-*)` actually resolves to on this
    // device. It has to be a real element in the document: the values are not
    // exposed anywhere else, and they change with rotation.
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = [
      "position:absolute",
      "top:0",
      "left:0",
      "width:0",
      "height:0",
      "visibility:hidden",
      "pointer-events:none",
      "padding-top:env(safe-area-inset-top, 0px)",
      "padding-bottom:env(safe-area-inset-bottom, 0px)",
    ].join(";");
    document.body.appendChild(probe);

    const publish = () => {
      frame = 0;

      // On the root as well as the shell: anything portalled out of the shell
      // — toasts, sheets — has to clear the same nav, and cannot inherit a
      // variable scoped to a subtree it is no longer in.
      const set = (name: string, value: number) => {
        const px = `${Math.round(value * 100) / 100}px`;
        shell.style.setProperty(name, px);
        document.documentElement.style.setProperty(name, px);
      };

      // The safe areas, less whatever the browser has already held back. On a
      // browser that hands over the whole screen — every desktop one, Android,
      // iOS up to 25 and from 26.1 — nothing is held back and these are the raw
      // `env()` values. On an installed iOS 26.0 app the bottom strip has been
      // reserved twice, and this is the copy we drop; without it the nav floats
      // a home indicator's worth of empty background above the bottom edge.
      const probeStyle = getComputedStyle(probe);
      const safeTop = Number.parseFloat(probeStyle.paddingTop) || 0;
      const safeBottom = Number.parseFloat(probeStyle.paddingBottom) || 0;

      // Bottom first: iOS draws under the status bar in a standalone app but
      // stops short of the home indicator, so a gap is the bottom's until the
      // bottom cannot account for it.
      const reserved = reservedByBrowser();
      const reservedBottom = Math.min(reserved, safeBottom);
      const reservedTop = Math.min(reserved - reservedBottom, safeTop);

      set("--app-safe-top", Math.max(0, safeTop - reservedTop));
      set("--app-safe-bottom", Math.max(0, safeBottom - reservedBottom));

      // And the other half of the same problem: a viewport-sized fixed box that
      // is taller than the window is showing. Only worth overriding when the
      // visible viewport is measurably shorter for a reason the size of device
      // chrome — a keyboard takes far more than that, and shrinking the shell
      // around one would drag the nav up onto the content. A keyboard is also
      // ruled out by hand rather than by size alone, so the shell does not
      // flinch on its way in or out, when it is briefly chrome-sized.
      const visual = window.visualViewport;
      const shortfall = visual
        ? document.documentElement.clientHeight - visual.height
        : 0;
      const clipped =
        isStandalone() &&
        !isTyping() &&
        shortfall >= 4 &&
        shortfall <= MAX_CHROME_INSET;
      shell.style.setProperty(
        "--app-viewport-height",
        clipped && visual
          ? `${Math.round(visual.height * 100) / 100}px`
          : "auto",
      );

      const shellTop = shell.getBoundingClientRect().top;
      const mainBox = main.getBoundingClientRect();
      const navHeight = navRef.current?.getBoundingClientRect().height ?? 0;

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

    // The visual viewport moves without the layout viewport ever changing size
    // — that is the whole point of it — so it needs its own listener for the
    // shell to notice the window is showing less than it was handed.
    const visual = window.visualViewport;
    visual?.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      probe.remove();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      visual?.removeEventListener("resize", schedule);
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
      "flex flex-col items-center justify-center gap-0.5 px-2 py-2";
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
          onClick={() => setMoreOpen(true)}
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
              {desktopPrimaryNavItems.map((item) =>
                renderNavItem(item, "desktop"),
              )}
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

        <MoreSheet />

        {/* Comparison Drawer - available on all pages */}
        <ComparisonDrawer />
      </div>
    </SecondaryToolbarContext.Provider>
  );
}
