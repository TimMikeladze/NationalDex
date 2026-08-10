"use client";

import {
  FlaskConical,
  Layers,
  Loader2,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useNav } from "@/components/navigation/nav-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearchIndex } from "@/hooks/use-search-index";
import { useTcgCardQuickSearch } from "@/hooks/use-tcg";
import { TYPE_COLORS } from "@/types/pokemon";
import type {
  CardSearchResult,
  SearchResult,
  SearchResultType,
} from "@/types/search";
import { cardImageUrl, formatLocalId } from "@/types/tcg";

const TYPE_LABELS: Record<SearchResultType, string> = {
  pokemon: "Pokémon",
  move: "Moves",
  ability: "Abilities",
  type: "Types",
  item: "Items",
  card: "Cards",
};

const TYPE_ICONS: Record<SearchResultType, React.ReactNode> = {
  pokemon: null, // Use sprite instead
  move: <Swords className="size-4" />,
  ability: <Sparkles className="size-4" />,
  type: <Zap className="size-4" />,
  item: null, // Use sprite instead
  card: null, // Use card art instead
};

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useNav();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { search, isLoading, isReady, totalItems } = useSearchIndex();

  // The card database lives behind an API, so typing is debounced before it
  // turns into a request.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: cardMatches, isFetching: cardsFetching } =
    useTcgCardQuickSearch(debouncedQuery);

  // Search results
  const results = useMemo(() => {
    if (!isReady) return [];
    return search(query, 50);
  }, [query, isReady, search]);

  const cardResults = useMemo<CardSearchResult[]>(
    () =>
      (cardMatches ?? []).map((card) => ({
        id: `card-${card.id}`,
        name: card.name,
        type: "card",
        url: `/cards/${card.id.toLowerCase()}`,
        sprite: cardImageUrl(card.image, "low"),
        localId: card.localId,
      })),
    [cardMatches],
  );

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      pokemon: [],
      move: [],
      ability: [],
      type: [],
      item: [],
      card: cardResults,
    };

    for (const result of results) {
      groups[result.type].push(result);
    }

    // Return only non-empty groups, in preferred order
    const order: SearchResultType[] = [
      "pokemon",
      "card",
      "move",
      "ability",
      "type",
      "item",
    ];
    return order
      .filter((type) => groups[type].length > 0)
      .map((type) => ({
        type,
        label: TYPE_LABELS[type],
        results: groups[type].slice(0, 10), // Limit per category
      }));
  }, [results, cardResults]);

  const handleSelect = (result: SearchResult) => {
    setSearchOpen(false);
    setQuery("");
    router.push(result.url);
  };

  const hasResults = results.length > 0 || cardResults.length > 0;

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput
        placeholder={
          isLoading
            ? "Loading search index..."
            : `Search ${totalItems.toLocaleString()} items and every card...`
        }
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Building search index...
          </div>
        )}
        {isReady && !hasResults && query && !cardsFetching && (
          <CommandEmpty>No results found for "{query}"</CommandEmpty>
        )}
        {groupedResults.map((group) => (
          <CommandGroup key={group.type} heading={group.label}>
            {group.results.map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.type}-${result.name}-${result.id}`}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3"
              >
                <ResultIcon result={result} />
                <span>{result.name}</span>
                <ResultMeta result={result} />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

function ResultIcon({ result }: { result: SearchResult }) {
  switch (result.type) {
    case "pokemon":
      return (
        // biome-ignore lint/performance/noImgElement: external sprite URLs
        <img
          src={result.sprite}
          alt={result.name}
          className="size-6 pixelated"
        />
      );
    case "card":
      return result.sprite ? (
        // biome-ignore lint/performance/noImgElement: external card art URLs
        <img
          src={result.sprite}
          alt={result.name}
          className="h-8 w-6 object-contain"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : (
        <Layers className="size-4 text-muted-foreground" />
      );
    case "item":
      return result.sprite ? (
        // biome-ignore lint/performance/noImgElement: external sprite URLs
        <img
          src={result.sprite}
          alt={result.name}
          className="size-6 pixelated"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <FlaskConical className="size-4 text-muted-foreground" />
      );
    case "type":
      return (
        <div
          className="size-4 rounded-full"
          style={{ backgroundColor: TYPE_COLORS[result.pokemonType] }}
        />
      );
    default:
      return (
        <span className="text-muted-foreground">{TYPE_ICONS[result.type]}</span>
      );
  }
}

function ResultMeta({ result }: { result: SearchResult }) {
  switch (result.type) {
    case "pokemon":
      return (
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          #{result.pokemonId.toString().padStart(3, "0")}
        </span>
      );
    case "card":
      // The set-prefixed id is long and unreadable mid-list; the printed
      // number is what identifies a card at a glance.
      return (
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {result.localId ? `#${formatLocalId(result.localId)}` : null}
        </span>
      );
    case "type":
      return (
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: TYPE_COLORS[result.pokemonType] }}
        >
          Type
        </span>
      );
    default:
      return null;
  }
}
