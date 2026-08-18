"use client";

import {
  ArrowUpDown,
  ChevronsUpDown,
  Layers,
  ListFilter,
  Search,
  Shuffle,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Chip, FilterSection } from "@/components/tcg/tcg-chip";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TcgLanguage, TcgSetBrief } from "@/types/tcg";
import {
  DEFAULT_TCG_LANGUAGE,
  energyTextColor,
  TCG_CATEGORIES,
  TCG_ENERGY_COLORS,
  TCG_ENERGY_TYPES,
  TCG_LANGUAGES,
  TCG_VARIANT_KEYS,
  TCG_VARIANT_LABELS,
  withTcgLanguage,
} from "@/types/tcg";
import {
  type CardFilterState,
  type CardFilterUpdate,
  GAME_OPTIONS,
  type GameFilter,
  HP_PRESETS,
  RANDOM_SORT_VALUE,
  SORT_OPTIONS,
  sortOptionFor,
} from "./filters";

/**
 * A chip that goes somewhere rather than narrowing something. It borrows the
 * unselected chip's shape so the row reads as one strip, and earns a hover
 * because unlike a filter it is a link.
 */
const WAY_IN_CHIP =
  "inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground";

interface CardsFilterBarProps {
  filters: CardFilterState;
  setFilters: (next: CardFilterUpdate) => void;
  game: GameFilter;
  /** Whether the results are currently being dealt in a random order. */
  isRandom: boolean;
  /** Sets the order — a `SORT_OPTIONS` value, or `RANDOM_SORT_VALUE`. */
  onOrderChange: (value: string) => void;
  sets: TcgSetBrief[];
  selectedSet: TcgSetBrief | null;
  /** The catalogue being browsed — sets and rarities differ between them. */
  language: TcgLanguage;
  /** Whether this catalogue has Pocket sets at all — only English does. */
  hasPocket: boolean;
  rarities: string[];
  stages: string[];
  suffixes: string[];
  regulationMarks: string[];
  trainerTypes: string[];
  energyTypes: string[];
  panelFilterCount: number;
  resultLabel: string;
  /** Collapses the secondary rows while the grid is being scrolled. */
  collapsed?: boolean;
}

/**
 * Everything that narrows the card list, in the dex's sticky-toolbar shape: a
 * search field with the panel behind an icon, then the two choices worth
 * keeping visible — which game, and in what order.
 */
export function CardsFilterBar({
  filters,
  setFilters,
  game,
  isRandom,
  onOrderChange,
  sets,
  selectedSet,
  language,
  hasPocket,
  rarities,
  stages,
  suffixes,
  regulationMarks,
  trainerTypes,
  energyTypes,
  panelFilterCount,
  resultLabel,
  collapsed = false,
}: CardsFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.q);
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const swipeHref = query
    ? `/cards/swipe?${query}`
    : withTcgLanguage("/cards/swipe", language);

  // The order is only named in the icon's tooltip now, so it has to say what
  // the control would otherwise have shown.
  const orderLabel = isRandom ? "Random" : sortOptionFor(filters.sort).label;

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== filters.q) setFilters({ q: searchInput || null });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, filters.q, setFilters]);

  // A filter cleared from outside the field (a chip, a reset) has to show here.
  useEffect(() => {
    setSearchInput((current) => (current === filters.q ? current : filters.q));
  }, [filters.q]);

  const toggleArrayFilter = (
    key: "types" | "rarities" | "variants",
    value: string,
  ) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    setFilters({ [key]: next.length > 0 ? next : null });
  };

  return (
    <div className="space-y-3">
      {/* Search, with the filter panel and the set index inside the field */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search cards..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="pl-9 pr-20 [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="p-1 text-muted-foreground hover:text-foreground"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative p-1 transition-colors",
                  panelFilterCount > 0
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Filters"
                aria-label={
                  panelFilterCount > 0
                    ? `Filters, ${panelFilterCount} active`
                    : "Filters"
                }
              >
                <ListFilter className="size-4" />
                {panelFilterCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-3 items-center justify-center rounded-full bg-foreground text-[8px] font-medium text-background">
                    {panelFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="max-h-[70dvh] w-80 overflow-y-auto p-3"
            >
              <div className="space-y-4">
                {/* Which catalogue is being read. Not a translation toggle: the
                    Japanese catalogue holds 173 sets English never printed, so
                    changing it changes which cards exist at all — and drops the
                    set and rarity filters, which are catalogue-specific. It
                    leads the panel because everything below it is scoped to
                    whatever it says. */}
                <FilterSection label="Catalogue">
                  <Select
                    value={language}
                    onValueChange={(value) =>
                      setFilters({
                        lang: value === DEFAULT_TCG_LANGUAGE ? null : value,
                        set: null,
                        rarities: null,
                        illustrator: null,
                      })
                    }
                  >
                    <SelectTrigger size="sm" className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {TCG_LANGUAGES.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.native}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>

                <FilterSection
                  label="Set"
                  onClear={
                    filters.set ? () => setFilters({ set: null }) : undefined
                  }
                >
                  <div className="flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 min-w-0 flex-1 justify-between font-normal"
                        >
                          <span className="truncate">
                            {selectedSet ? selectedSet.name : "Any set"}
                          </span>
                          <ChevronsUpDown className="size-3.5 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-0">
                        <Command>
                          <CommandInput placeholder="Find a set..." />
                          <CommandList>
                            <CommandEmpty>No sets found</CommandEmpty>
                            <CommandGroup>
                              {sets.map((set) => (
                                <CommandItem
                                  key={set.id}
                                  value={`${set.name} ${set.id}`}
                                  onSelect={() =>
                                    setFilters({
                                      set:
                                        set.id === filters.set ? null : set.id,
                                    })
                                  }
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="truncate">{set.name}</span>
                                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                    {set.cardCount.official}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedSet && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 px-2 text-xs"
                      >
                        <Link
                          href={withTcgLanguage(
                            `/cards/sets/${selectedSet.id.toLowerCase()}`,
                            language,
                          )}
                        >
                          view
                        </Link>
                      </Button>
                    )}
                  </div>
                </FilterSection>

                <FilterSection
                  label="Category"
                  onClear={
                    filters.category
                      ? () => setFilters({ category: null })
                      : undefined
                  }
                >
                  <div className="flex flex-wrap gap-1">
                    {TCG_CATEGORIES.map((category) => (
                      <Chip
                        key={category}
                        selected={filters.category === category}
                        onClick={() =>
                          setFilters({
                            category:
                              filters.category === category ? null : category,
                          })
                        }
                      >
                        {category}
                      </Chip>
                    ))}
                  </div>
                </FilterSection>

                {/* Which printing a card exists in — the difference between
                    owning the card and owning the version collectors chase. */}
                <FilterSection
                  label="Printing"
                  onClear={
                    filters.variants.length > 0
                      ? () => setFilters({ variants: null })
                      : undefined
                  }
                >
                  <div className="flex flex-wrap gap-1">
                    {TCG_VARIANT_KEYS.map((variant) => (
                      <Chip
                        key={variant}
                        selected={filters.variants.includes(variant)}
                        onClick={() => toggleArrayFilter("variants", variant)}
                      >
                        {TCG_VARIANT_LABELS[variant]}
                      </Chip>
                    ))}
                  </div>
                </FilterSection>

                {/* The `ex`/`V`/`GX` mechanic a card carries — printed on the
                    name, and the way players actually name a card. */}
                {suffixes.length > 0 && (
                  <FilterSection
                    label="Mechanic"
                    onClear={
                      filters.suffix
                        ? () => setFilters({ suffix: null })
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap gap-1">
                      {suffixes.map((suffix) => (
                        <Chip
                          key={suffix}
                          selected={filters.suffix === suffix}
                          onClick={() =>
                            setFilters({
                              suffix: filters.suffix === suffix ? null : suffix,
                            })
                          }
                        >
                          {suffix}
                        </Chip>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {/* Which rotation a card is printed for — what a Standard deck
                    is allowed to play. */}
                {regulationMarks.length > 0 && (
                  <FilterSection
                    label="Regulation mark"
                    onClear={
                      filters.regulationMark
                        ? () => setFilters({ regulationMark: null })
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap gap-1">
                      {regulationMarks.map((mark) => (
                        <Chip
                          key={mark}
                          selected={filters.regulationMark === mark}
                          onClick={() =>
                            setFilters({
                              regulationMark:
                                filters.regulationMark === mark ? null : mark,
                            })
                          }
                        >
                          {mark}
                        </Chip>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {trainerTypes.length > 0 && (
                  <FilterSection
                    label="Trainer type"
                    onClear={
                      filters.trainerType
                        ? () => setFilters({ trainerType: null })
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap gap-1">
                      {trainerTypes.map((trainerType) => (
                        <Chip
                          key={trainerType}
                          selected={filters.trainerType === trainerType}
                          onClick={() =>
                            setFilters({
                              trainerType:
                                filters.trainerType === trainerType
                                  ? null
                                  : trainerType,
                              // Trainer types only exist on Trainer cards.
                              category:
                                filters.trainerType === trainerType
                                  ? filters.category || null
                                  : "Trainer",
                            })
                          }
                        >
                          {trainerType}
                        </Chip>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {energyTypes.length > 0 && (
                  <FilterSection
                    label="Energy card"
                    onClear={
                      filters.energyType
                        ? () => setFilters({ energyType: null })
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap gap-1">
                      {energyTypes.map((energyType) => (
                        <Chip
                          key={energyType}
                          selected={filters.energyType === energyType}
                          onClick={() =>
                            setFilters({
                              energyType:
                                filters.energyType === energyType
                                  ? null
                                  : energyType,
                              category:
                                filters.energyType === energyType
                                  ? filters.category || null
                                  : "Energy",
                            })
                          }
                        >
                          {energyType}
                        </Chip>
                      ))}
                    </div>
                  </FilterSection>
                )}

                <FilterSection
                  label="HP"
                  onClear={
                    filters.hpMin !== null || filters.hpMax !== null
                      ? () => setFilters({ hpMin: null, hpMax: null })
                      : undefined
                  }
                >
                  <div className="flex flex-wrap gap-1">
                    {HP_PRESETS.map((preset) => (
                      <Chip
                        key={preset.label}
                        selected={
                          filters.hpMin === preset.min &&
                          filters.hpMax === preset.max
                        }
                        onClick={() =>
                          setFilters({ hpMin: preset.min, hpMax: preset.max })
                        }
                      >
                        {preset.label}
                      </Chip>
                    ))}
                  </div>
                </FilterSection>

                {stages.length > 0 && (
                  <FilterSection
                    label="Stage"
                    onClear={
                      filters.stage
                        ? () => setFilters({ stage: null })
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap gap-1">
                      {stages.map((stage) => (
                        <Chip
                          key={stage}
                          selected={filters.stage === stage}
                          onClick={() =>
                            setFilters({
                              stage: filters.stage === stage ? null : stage,
                            })
                          }
                        >
                          {stage}
                        </Chip>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {rarities.length > 0 && (
                  <FilterSection
                    label="Rarity"
                    onClear={
                      filters.rarities.length > 0
                        ? () => setFilters({ rarities: null })
                        : undefined
                    }
                  >
                    <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                      {rarities.map((rarity) => (
                        <Chip
                          key={rarity}
                          selected={filters.rarities.includes(rarity)}
                          onClick={() => toggleArrayFilter("rarities", rarity)}
                        >
                          {rarity}
                        </Chip>
                      ))}
                    </div>
                  </FilterSection>
                )}

                <FilterSection
                  label="Illustrator"
                  onClear={
                    filters.illustrator
                      ? () => setFilters({ illustrator: null })
                      : undefined
                  }
                >
                  <Input
                    type="text"
                    placeholder="Any illustrator"
                    defaultValue={filters.illustrator}
                    key={filters.illustrator}
                    className="h-8"
                    onBlur={(event) =>
                      setFilters({ illustrator: event.target.value || null })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setFilters({
                          illustrator: event.currentTarget.value || null,
                        });
                      }
                    }}
                  />
                </FilterSection>
              </div>
            </PopoverContent>
          </Popover>

          {/* What order the cards come in. An icon rather than a named select:
              the row below was overflowing on a phone, and the order is
              something you set once and then read off the cards themselves. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "p-1 transition-colors",
                isRandom || filters.sort !== "default"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={`Order: ${orderLabel}`}
              aria-label={`Order: ${orderLabel}`}
            >
              <ArrowUpDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                order
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={isRandom ? RANDOM_SORT_VALUE : filters.sort}
                onValueChange={onOrderChange}
              >
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer text-xs"
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
                <DropdownMenuRadioItem
                  value={RANDOM_SORT_VALUE}
                  className="cursor-pointer text-xs"
                >
                  Random
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* The dex's shuffle, on the card catalogue: it deals the results in
              a random order and, on an unfiltered browse, draws them from sets
              picked at random rather than the newest ones. It is the same
              choice the sort control makes, reached in one press. */}
          <button
            type="button"
            onClick={() =>
              onOrderChange(isRandom ? "default" : RANDOM_SORT_VALUE)
            }
            aria-pressed={isRandom}
            className={cn(
              "p-1 transition-colors",
              isRandom
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={isRandom ? "Back to set order" : "Shuffle these cards"}
            aria-label={isRandom ? "Back to set order" : "Shuffle these cards"}
          >
            <Shuffle className="size-4" />
          </button>
        </div>
      </div>

      {/* Game and the other ways in — collapsible, like the dex toolbar */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          collapsed
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {/* Wraps rather than clips: the collapse container hides its
              overflow, so anything that does not fit on one line is cut in
              half rather than pushed out of reach. */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-wrap gap-1">
              {GAME_OPTIONS.filter(
                (option) => hasPocket || option.id !== "pocket",
              ).map((option) => (
                <Chip
                  key={option.id}
                  selected={game === option.id}
                  title={option.title}
                  onClick={() =>
                    setFilters({
                      game: option.id === "all" ? null : option.id,
                      // A set from the other game would contradict the switch.
                      set: null,
                    })
                  }
                >
                  {option.label}
                </Chip>
              ))}

              {/* Two other ways to read the same catalogue — set by set, or
                  one card at a time. Both are places to go rather than filters,
                  so they sit together at the end of the row. The deck keeps the
                  whole query string, so a search carries into it. */}
              <Link
                href={withTcgLanguage("/cards/sets", language)}
                title="Browse every set, by series"
                className={WAY_IN_CHIP}
              >
                <Layers className="size-3.5" />
                Set list
              </Link>

              <Link
                href={swipeHref}
                title="Swipe through these cards, one at a time"
                className={WAY_IN_CHIP}
              >
                <WalletCards className="size-3.5" />
                Swipe
              </Link>
            </div>

            <span className="ml-auto hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
              {resultLabel}
            </span>
          </div>

          {/* Energy is the facet a TCG player reaches for first, so it sits in
              the toolbar exactly like the dex's type row — not behind a panel. */}
          <div className="mt-3 flex flex-wrap gap-1">
            {TCG_ENERGY_TYPES.map((type) => {
              const color = TCG_ENERGY_COLORS[type];
              const selected = filters.types.includes(type);
              const dimmed = filters.types.length > 0 && !selected;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleArrayFilter("types", type)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-opacity",
                    "text-(--energy-fg) dark:text-(--energy-fg-dark)",
                    dimmed ? "opacity-40 hover:opacity-70" : "opacity-100",
                  )}
                  style={
                    {
                      backgroundColor: `${color}20`,
                      "--energy-fg": energyTextColor(type),
                      "--energy-fg-dark": color,
                    } as React.CSSProperties
                  }
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
