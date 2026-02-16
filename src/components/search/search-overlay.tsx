"use client";

import { FlaskConical, Loader2, Sparkles, Swords, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { TYPE_COLORS } from "@/types/pokemon";
import type { SearchResult, SearchResultType } from "@/types/search";

const TYPE_LABELS: Record<SearchResultType, string> = {
  pokemon: "Pokémon",
  move: "Moves",
  ability: "Abilities",
  type: "Types",
  item: "Items",
};

const TYPE_ICONS: Record<SearchResultType, React.ReactNode> = {
  pokemon: null, // Use sprite instead
  move: <Swords className="size-4" />,
  ability: <Sparkles className="size-4" />,
  type: <Zap className="size-4" />,
  item: null, // Use sprite instead
};

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useNav();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { search, isLoading, isReady, totalItems } = useSearchIndex();

  // Search results
  const results = useMemo(() => {
    if (!isReady) return [];
    return search(query, 50);
  }, [query, isReady, search]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      pokemon: [],
      move: [],
      ability: [],
      type: [],
      item: [],
    };

    for (const result of results) {
      groups[result.type].push(result);
    }

    // Return only non-empty groups, in preferred order
    const order: SearchResultType[] = [
      "pokemon",
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
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    setSearchOpen(false);
    setQuery("");
    router.push(result.url);
  };

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput
        placeholder={
          isLoading
            ? "Loading search index..."
            : `Search ${totalItems.toLocaleString()} items...`
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
        {isReady && results.length === 0 && query && (
          <CommandEmpty>No results found for "{query}"</CommandEmpty>
        )}
        {groupedResults.map((group) => (
          <CommandGroup key={group.type} heading={group.label}>
            {group.results.map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.type}-${result.name}`}
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
