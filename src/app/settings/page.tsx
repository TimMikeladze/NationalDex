"use client";

import { useTheme } from "next-themes";
import { useFavorites } from "@/hooks/use-favorites";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { favorites, clearFavorites } = useFavorites();
  const {
    defaultPokemonSpriteGen,
    showPokemonSpriteVariants,
    setDefaultPokemonSpriteGen,
    setShowPokemonSpriteVariants,
  } = useSpritePreferences();

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-8">
        <section className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            theme
          </p>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  "text-xs px-3 py-1.5 border transition-colors",
                  theme === t
                    ? "bg-foreground text-background"
                    : "hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            sprites
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 py-2 border-b">
              <div>
                <p className="text-sm">default pokemon avatar</p>
                <p className="text-xs text-muted-foreground">
                  Used across cards, evolutions, and pokemon pages
                </p>
              </div>
              <Select
                value={defaultPokemonSpriteGen}
                onValueChange={(value) =>
                  setDefaultPokemonSpriteGen(value as "gen5" | "ani")
                }
              >
                <SelectTrigger className="w-44 justify-between">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="gen5">Gen 5 (static)</SelectItem>
                  <SelectItem value="ani">Animated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4 py-2 border-b">
              <div>
                <p className="text-sm">pokemon page sprite variants</p>
                <p className="text-xs text-muted-foreground">
                  Show controls to switch shiny / back sprites
                </p>
              </div>
              <Switch
                checked={showPokemonSpriteVariants}
                onCheckedChange={setShowPokemonSpriteVariants}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            data
          </p>
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="text-sm">favorites</p>
              <p className="text-xs text-muted-foreground">
                {favorites.length} saved
              </p>
            </div>
            <button
              type="button"
              onClick={clearFavorites}
              disabled={favorites.length === 0}
              className="text-xs px-3 py-1.5 border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              clear
            </button>
          </div>
        </section>

        <section className="pt-8 border-t text-xs text-muted-foreground space-y-1">
          <p>
            data:{" "}
            <a
              href="https://pokeapi.co"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              pokeapi.co
            </a>
          </p>
          <p>pokemon is a trademark of nintendo</p>
        </section>
      </div>
    </div>
  );
}
