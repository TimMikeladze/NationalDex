"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFavorites } from "@/hooks/use-favorites"
import { useGameVersion } from "@/hooks/use-game-version"
import { VERSION_GROUPS } from "@/lib/pokeapi"
import type { VersionGroup } from "@/lib/pokeapi"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { favorites, clearFavorites } = useFavorites()
  const { gameVersion, setGameVersion } = useGameVersion()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const selectedGameInfo = VERSION_GROUPS.find((g) => g.id === gameVersion)

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-md space-y-8">
        <section className="space-y-3">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            theme
          </label>
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
                    : "hover:bg-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            default game
          </label>
          <p className="text-xs text-muted-foreground">
            Choose which game version to show moves for by default
          </p>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between gap-2 text-xs px-3 py-1.5 border w-full hover:bg-muted transition-colors"
            >
              <span>{selectedGameInfo?.name ?? "Select Game"}</span>
              <ChevronDown className="size-3" />
            </button>
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-background border shadow-lg max-h-64 overflow-y-auto">
                  {VERSION_GROUPS.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => {
                        setGameVersion(game.id)
                        setIsDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                        gameVersion === game.id && "bg-muted"
                      )}
                    >
                      {game.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            data
          </label>
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
            data: <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">pokeapi.co</a>
          </p>
          <p>pokemon is a trademark of nintendo</p>
        </section>
      </div>
    </div>
  )
}
