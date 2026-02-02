"use client";

import { Check, Search, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllSpecies, toID } from "@/lib/pkmn";
import { pokemonSpriteById } from "@/lib/sprites";
import { cn } from "@/lib/utils";
import type { PokemonType } from "@/types/pokemon";

interface PokemonPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (pokemon: PokemonPickerResult) => void;
  /** Pokemon IDs to exclude from selection */
  excludeIds?: number[];
  /** Filter by Pokemon ID range (inclusive) */
  idRange?: [number, number];
  /** Title for the dialog */
  title?: string;
  /** Description for the dialog */
  description?: string;
  /** Allow multiple selections */
  multiSelect?: boolean;
  /** Currently selected IDs (for multi-select mode) */
  selectedIds?: number[];
}

export interface PokemonPickerResult {
  id: number;
  name: string;
  types: PokemonType[];
  sprite: string;
}

interface PokemonListItem {
  id: number;
  name: string;
  types: PokemonType[];
  sprite: string;
}

export function PokemonPicker({
  open,
  onOpenChange,
  onSelect,
  excludeIds = [],
  idRange,
  title = "select pokemon",
  description,
  multiSelect = false,
  selectedIds = [],
}: PokemonPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<PokemonType | null>(null);

  // Get all Pokemon in the allowed range
  const allPokemon = useMemo((): PokemonListItem[] => {
    const species = getAllSpecies();
    return species
      .filter((s) => {
        // Filter by ID range if specified
        if (idRange) {
          if (s.num < idRange[0] || s.num > idRange[1]) return false;
        }
        // Exclude already selected Pokemon
        if (excludeIds.includes(s.num)) return false;
        return true;
      })
      .map((s) => ({
        id: s.num,
        name: s.name,
        types: s.types as PokemonType[],
        sprite: pokemonSpriteById(s.num),
      }))
      .sort((a, b) => a.id - b.id);
  }, [excludeIds, idRange]);

  // Filter Pokemon based on search and type filter
  const filteredPokemon = useMemo(() => {
    let result = allPokemon;

    // Filter by search query (name or ID)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const queryAsNumber = Number.parseInt(query, 10);

      result = result.filter((p) => {
        // Match by ID
        if (!Number.isNaN(queryAsNumber) && p.id === queryAsNumber) return true;
        if (p.id.toString().includes(query)) return true;
        // Match by name
        if (toID(p.name).includes(query.replace(/\s/g, ""))) return true;
        return false;
      });
    }

    // Filter by type
    if (selectedType) {
      result = result.filter((p) => p.types.includes(selectedType));
    }

    return result;
  }, [allPokemon, searchQuery, selectedType]);

  const handleSelect = useCallback(
    (pokemon: PokemonListItem) => {
      onSelect({
        id: pokemon.id,
        name: pokemon.name,
        types: pokemon.types,
        sprite: pokemon.sprite,
      });
      if (!multiSelect) {
        setSearchQuery("");
        setSelectedType(null);
      }
    },
    [onSelect, multiSelect],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setSearchQuery("");
    setSelectedType(null);
  }, [onOpenChange]);

  const typeFilters: PokemonType[] = [
    "Normal",
    "Fire",
    "Water",
    "Electric",
    "Grass",
    "Ice",
    "Fighting",
    "Poison",
    "Ground",
    "Flying",
    "Psychic",
    "Bug",
    "Rock",
    "Ghost",
    "Dragon",
    "Dark",
    "Steel",
    "Fairy",
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedType(null)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded border transition-colors",
              !selectedType
                ? "bg-foreground text-background border-foreground"
                : "border-muted-foreground/30 hover:border-muted-foreground/50",
            )}
          >
            all
          </button>
          {typeFilters.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                setSelectedType(selectedType === type ? null : type)
              }
            >
              <TypeBadge
                type={type}
                size="sm"
                className={cn(
                  "cursor-pointer transition-opacity",
                  selectedType && selectedType !== type && "opacity-40",
                )}
              />
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-xs text-muted-foreground">
          {filteredPokemon.length} pokemon
          {idRange && ` (${idRange[0]}-${idRange[1]})`}
        </div>

        {/* Pokemon grid */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {filteredPokemon.slice(0, 100).map((pokemon) => {
              const isSelected = selectedIds.includes(pokemon.id);
              return (
                <button
                  key={pokemon.id}
                  type="button"
                  onClick={() => handleSelect(pokemon)}
                  className={cn(
                    "relative flex flex-col items-center p-2 rounded-lg border transition-colors",
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted border-transparent hover:border-muted-foreground/20",
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 size-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="size-3 text-primary-foreground" />
                    </div>
                  )}
                  <Image
                    src={pokemon.sprite}
                    alt={pokemon.name}
                    width={48}
                    height={48}
                    className="size-12 pixelated"
                    unoptimized
                  />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    #{pokemon.id}
                  </span>
                  <span className="text-xs font-medium truncate max-w-full">
                    {pokemon.name}
                  </span>
                  <div className="flex gap-0.5 mt-0.5">
                    {pokemon.types.map((type) => (
                      <TypeBadge key={type} type={type} size="sm" />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredPokemon.length > 100 && (
            <p className="text-xs text-muted-foreground text-center mt-4 pb-2">
              Showing first 100 results. Refine your search to see more.
            </p>
          )}

          {filteredPokemon.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedType
                  ? "No Pokemon found matching your criteria"
                  : "All Pokemon from this range are already selected"}
              </p>
              {(searchQuery || selectedType) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType(null);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
