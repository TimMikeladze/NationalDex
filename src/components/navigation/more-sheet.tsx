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
import { Logo } from "@/components/brand/logo";
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
  TrainersIcon,
} from "./app-icons";
import { useNav } from "./nav-provider";

type MenuItem = {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  /** Says what the page is for, so the grid reads without opening every cell. */
  hint: string;
};

// The three the bottom bar already carries. They are repeated here so the
// menu is a complete map of the app rather than the leftovers.
const sectionItems: MenuItem[] = [
  { href: "/", icon: DexIcon, label: "Dex", hint: "all pokemon" },
  { href: "/cards", icon: CardsIcon, label: "Cards", hint: "tcg sets" },
  { href: "/favorites", icon: Heart, label: "Favorites", hint: "saved picks" },
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
  {
    href: "/trainers",
    icon: TrainersIcon,
    label: "Trainers",
    hint: "gym leaders & league",
  },
];

// About the app rather than about Pokemon, so they sit in their own row.
const appItems: MenuItem[] = [
  { href: "/settings", icon: Settings, label: "Settings", hint: "preferences" },
  {
    href: "/feedback",
    icon: MessageSquare,
    label: "Feedback",
    hint: "send a note",
  },
  { href: "/about", icon: Info, label: "About", hint: "the app" },
];

/**
 * The phone's "more" drawer.
 *
 * Nine identical rows made everything look equally important and pushed the
 * last of them under the fold. Every destination is a tile instead — icon
 * over a name over a word on what it does — so the three rows read as one
 * grid, three up for the sections and app pages, two up for the tools that
 * carry longer names.
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

  const renderTile = (item: MenuItem) => {
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
          <span className="block text-sm leading-tight">{item.label}</span>
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
  };

  return (
    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      {/* The sheet is anchored to the bottom edge and sized by its content, so
          the cap keeps a short phone from pushing the header off the top. */}
      <SheetContent
        side="bottom"
        className="max-h-[90svh] gap-0 overflow-y-auto p-0 pb-safe"
      >
        {/* The drawer is the only chrome on the phone that can carry the mark —
            the header above it belongs to the page. */}
        <SheetHeader className="h-14 shrink-0 flex-row items-center gap-0 p-0 px-4">
          <SheetTitle asChild>
            <Link href="/" onClick={close} className="min-w-0">
              <Logo
                className="gap-2"
                iconClassName="size-7"
                labelClassName="truncate text-sm"
              />
            </Link>
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
          {sectionItems.map(renderTile)}
        </nav>

        <nav className="grid grid-cols-2 gap-px border-y bg-border">
          {toolItems.map(renderTile)}
        </nav>

        <nav className="grid grid-cols-3 gap-px bg-border">
          {appItems.map(renderTile)}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
