"use client"

import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useFavorites } from "@/hooks/use-favorites"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { favorites, clearFavorites } = useFavorites()

  return (
    <div className="p-4 md:p-6">
      <header className="mb-6 border-b pb-4">
        <h1 className="text-lg font-medium">settings</h1>
      </header>

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
