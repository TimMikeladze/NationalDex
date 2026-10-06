"use client";

import {
  Heart,
  Info,
  MessageSquare,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { MotionConfig, motion } from "motion/react";
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
  ViewTransition,
} from "react";
import { Logo } from "@/components/brand/logo";
import { ComparisonDrawer } from "@/components/comparison/comparison-drawer";
import Link from "@/components/link";
import { GenerationPicker } from "@/components/pokemon/generation-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useComparison } from "@/hooks/use-comparison";
import { isNavActive, PRIMARY_NAV, type PrimaryNavId } from "@/lib/nav";
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

// Icons for the phone's tab bar. The destinations themselves are
// `PRIMARY_NAV`, which the manifest's shortcuts are built from too.
const TAB_ICONS: Record<
  PrimaryNavId,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  dex: DexIcon,
  cards: CardsIcon,
  decks: DecksIcon,
  teams: TeamsIcon,
  favorites: Heart,
};

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

const deviceScreenHeight = () => {
  const { width, height } = window.screen;
  return window.innerHeight >= window.innerWidth
    ? Math.max(width, height)
    : Math.min(width, height);
};

/**
 * How much of the screen the shell is not covering.
 *
 * Installed, there is no browser chrome, so every pixel between the shell and
 * the screen is chrome something has already kept clear — and every one of them
 * is a pixel `env(safe-area-inset-*)` is about to ask us to reserve a second
 * time. In a tab the same gap is the address bar, which is not ours to reclaim,
 * so this is standalone-only.
 *
 * Measured against the shell rather than the visual viewport. On iOS the
 * visual viewport can be shorter even while the fixed layout viewport remains
 * visible; sizing the shell to it leaves an empty strip below the tab bar.
 */
const reservedAroundShell = (shellHeight: number) => {
  if (!isStandalone()) return 0;
  const gap = deviceScreenHeight() - shellHeight;
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

      // Safe areas, less whatever the browser already keeps clear of device
      // chrome. On iOS standalone the layout viewport can stop above the
      // physical screen, even with viewport-fit=cover. That strip is outside
      // the web layer, so do not reserve its safe area inside the shell again.
      const probeStyle = getComputedStyle(probe);
      const safeTop = Number.parseFloat(probeStyle.paddingTop) || 0;
      const safeBottom = Number.parseFloat(probeStyle.paddingBottom) || 0;

      const shellBox = shell.getBoundingClientRect();

      // Bottom first: iOS draws under the status bar in a standalone app but
      // stops short of the home indicator, so a gap is the bottom's until the
      // bottom cannot account for it.
      const reserved = reservedAroundShell(shellBox.height);
      const reservedBottom = Math.min(reserved, safeBottom);
      const reservedTop = Math.min(reserved - reservedBottom, safeTop);

      set("--app-safe-top", Math.max(0, safeTop - reservedTop));
      set("--app-safe-bottom", Math.max(0, safeBottom - reservedBottom));

      const shellTop = shellBox.top;
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

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      probe.remove();
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

  const isMoreActive = desktopMoreMenuItems.some((item) =>
    isNavActive(item.href, pathname),
  );

  const renderNavItem = (item: (typeof desktopPrimaryNavItems)[number]) => {
    const isActive = isNavActive(item.href, pathname);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <item.icon className="size-4" strokeWidth={1.5} />
        <span className="text-xs">{item.label}</span>
      </Link>
    );
  };

  // A tab: icon over label, or beside it on a short landscape screen. The pill
  // behind the current one is a single shared element, so it slides from tab
  // to tab rather than blinking between them.
  const tabClasses =
    "pressable relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-colors [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:gap-1.5";
  const tabLabelClasses =
    "relative text-[9px] uppercase tracking-wider [@media(max-height:500px)]:text-[10px]";

  const renderTabPill = () => (
    <motion.span
      layoutId="tab-pill"
      aria-hidden="true"
      className="absolute inset-x-1 inset-y-1.5 bg-muted"
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    />
  );

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
        <header className="app-chrome hidden lg:flex shrink-0 z-50 h-14 items-center border-b bg-background px-6">
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
              {desktopPrimaryNavItems.map((item) => renderNavItem(item))}
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
                    aria-current={isActive ? "page" : undefined}
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
          {/* Only the page animates between routes; the chrome around it
              stays put. `page` is the class `globals.css` styles. */}
          <ViewTransition default="page">
            <div className="w-full min-h-full">{children}</div>
          </ViewTransition>
        </main>

        {/* Phone tab bar - hidden on desktop. Last child of the shell, so it
            runs to the bottom edge of the device; `pb-safe-nav` keeps the
            labels clear of the home indicator without reserving the whole
            strip iOS asks for. */}
        <nav
          ref={navRef}
          aria-label="Primary"
          className="app-chrome shrink-0 z-50 border-t bg-background/85 backdrop-blur-xl backdrop-saturate-150 pb-safe-nav lg:hidden pwa-glass-nav"
        >
          <MotionConfig reducedMotion="user">
            <div className="flex h-14 items-stretch max-w-lg mx-auto px-1 [@media(max-height:500px)]:h-11">
              {PRIMARY_NAV.map((item) => {
                const Icon = TAB_ICONS[item.id];
                const active = isNavActive(item.href, pathname);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      tabClasses,
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {active && renderTabPill()}
                    <Icon
                      className="relative size-[22px]"
                      strokeWidth={active ? 2 : 1.5}
                    />
                    <span className={tabLabelClasses}>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className={cn(
                  tabClasses,
                  isMoreActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isMoreActive && renderTabPill()}
                <MoreHorizontal
                  className="relative size-[22px]"
                  strokeWidth={isMoreActive ? 2 : 1.5}
                />
                <span className={tabLabelClasses}>more</span>
              </button>
            </div>
          </MotionConfig>
        </nav>

        <MoreSheet />

        {/* Comparison Drawer - available on all pages */}
        <ComparisonDrawer />
      </div>
    </SecondaryToolbarContext.Provider>
  );
}
