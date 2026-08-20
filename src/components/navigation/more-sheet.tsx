"use client";

import {
  ChevronsUpDown,
  Gamepad2,
  Heart,
  Info,
  MessageSquare,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GenerationPicker } from "@/components/pokemon/generation-picker";
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
} from "./app-icons";
import { useNav } from "./nav-provider";

type MenuItem = {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  /** Says what the page is for, so the grid reads without opening every cell. */
  hint?: string;
};

// The three the bottom bar already carries. They are repeated here so the
// menu is a complete map of the app rather than the leftovers.
const sectionItems: MenuItem[] = [
  { href: "/", icon: DexIcon, label: "Dex" },
  { href: "/cards", icon: CardsIcon, label: "Cards" },
  { href: "/favorites", icon: Heart, label: "Favorites" },
];

// The tools that earn a full tile: each is a place you go to work, not a
// setting you flip.
const toolItems: MenuItem[] = [
  { href: "/decks", icon: DecksIcon, label: "Deck Builder", hint: "tcg decks" },
  { href: "/teams", icon: TeamsIcon, label: "Teams", hint: "battle squads" },
  { href: "/lists", icon: ListsIcon, label: "Lists", hint: "collections" },
  {
    href: "/whos-that-pokemon",
    icon: QuizIcon,
    label: "Who's That Pokemon?",
    hint: "silhouette quiz",
  },
  {
    href: "/comparison",
    icon: CompareIcon,
    label: "Comparison",
    hint: "stats side by side",
  },
  {
    href: "/locations",
    icon: LocationsIcon,
    label: "Locations",
    hint: "where they spawn",
  },
];

// About the app rather than about Pokemon, so they sit apart and smaller.
const appItems: MenuItem[] = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/feedback", icon: MessageSquare, label: "Feedback" },
  { href: "/about", icon: Info, label: "About" },
];

/**
 * The phone's "more" drawer.
 *
 * Nine identical rows made everything look equally important and pushed the
 * last of them under the fold. The tools are a hairline grid instead — two up,
 * each with a word on what it does — and the app pages are a small strip
 * underneath, so the whole menu lands in one screen without scrolling.
 */
export function MoreSheet() {
  const pathname = usePathname();
  const { moreOpen, setMoreOpen } = useNav();
  const { comparison } = useComparison();
  const { preferredGeneration } = useGenerationPreference();

  // "/" prefixes everything, so the dex is only current on the dex itself.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const close = () => setMoreOpen(false);

  // The two three-up rows that bracket the grid: same cell, different weight —
  // the sections above are destinations, the app links below are footnotes.
  const renderStripItem = (item: MenuItem, tone: "loud" | "quiet" = "loud") => {
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={close}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-1.5 py-3 transition-colors",
          active
            ? "bg-foreground text-background"
            : cn(
                "bg-background hover:bg-muted hover:text-foreground active:bg-muted",
                tone === "loud" ? "text-foreground" : "text-muted-foreground",
              ),
        )}
      >
        <item.icon className="size-4" strokeWidth={1.5} />
        <span className="text-[11px]">{item.label}</span>
      </Link>
    );
  };

  return (
    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <SheetContent side="bottom" className="gap-0 p-0 pb-safe">
        <SheetHeader className="h-12 flex-row items-center gap-0 p-0 px-4">
          <SheetTitle className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            More
          </SheetTitle>
        </SheetHeader>

        {/* The whole row is the control — a label beside an icon gave no clue
            that either was pressable, or what pressing did. */}
        <GenerationPicker
          align="end"
          trigger={
            <button
              type="button"
              className="flex w-full items-center gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-muted active:bg-muted"
            >
              <span className="flex size-9 shrink-0 items-center justify-center border bg-muted">
                <Gamepad2 className="size-4" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  view as
                </span>
                <span className="block truncate text-sm text-foreground">
                  {preferredGeneration !== null
                    ? getGenerationName(preferredGeneration)
                    : "National Dex"}
                </span>
              </span>
              <ChevronsUpDown
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
              />
            </button>
          }
        />

        {/* gap-px over a border-coloured backdrop draws the dividers, so every
            cell shares one hairline instead of stacking two. */}
        <nav className="grid grid-cols-3 gap-px border-t bg-border">
          {sectionItems.map((item) => renderStripItem(item))}
        </nav>

        <nav className="grid grid-cols-2 gap-px border-y bg-border">
          {toolItems.map((item) => {
            const active = isActive(item.href);
            const badge = item.href === "/comparison" ? comparison.length : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[5.25rem] flex-col justify-between gap-2 p-3 transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted active:bg-muted",
                )}
              >
                <item.icon className="size-5" strokeWidth={1.5} />
                <span className="space-y-0.5">
                  <span className="block text-sm leading-tight">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "block text-[10px] uppercase tracking-wider",
                      active ? "text-background/60" : "text-muted-foreground",
                    )}
                  >
                    {item.hint}
                  </span>
                </span>
                {badge > 0 && (
                  <span
                    className={cn(
                      "absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center border px-1 text-[10px] leading-none",
                      active
                        ? "border-background bg-background text-foreground"
                        : "border-foreground bg-foreground text-background",
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <nav className="grid grid-cols-3 gap-px bg-border">
          {appItems.map((item) => renderStripItem(item, "quiet"))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
