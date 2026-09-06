"use client";

import { AlertTriangle, Download, Trash2, Upload } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { AccountSection } from "@/components/account/account-section";
import { BuiltBy } from "@/components/built-by";
import { SpriteSetSelect } from "@/components/pokemon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAmbientPreference } from "@/hooks/use-ambient-preference";
import { useCardFavorites } from "@/hooks/use-card-favorites";
import { type ExportedData, useDataExport } from "@/hooks/use-data-export";
import { useDecks } from "@/hooks/use-decks";
import { useFavorites } from "@/hooks/use-favorites";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { useLists } from "@/hooks/use-lists";
import { usePreferencesStore } from "@/hooks/use-preferences-store";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { useTeams } from "@/hooks/use-teams";
import { GENERATIONS } from "@/lib/pkmn";
import { getSpriteSet, type SpriteSetId } from "@/lib/sprites";
import { cn } from "@/lib/utils";

/** Sentinel for "no pinned set" — Select can't hold an empty value. */
const MATCH_GENERATION = "match-generation";

export function SettingsClient({ githubEnabled }: { githubEnabled: boolean }) {
  const { theme, setTheme } = useTheme();
  const { ambientEnabled, setAmbientEnabled } = useAmbientPreference();
  const { favorites, clearFavorites } = useFavorites();
  const { favoriteCards, clearFavoriteCards } = useCardFavorites();
  const { lists, clearLists } = useLists();
  const { teams, clearTeams } = useTeams();
  const { clearDecks } = useDecks();
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const { resetPreferences } = usePreferencesStore();
  const { spriteSetOverride, generationSpriteSet, setSpriteSetOverride } =
    useSpritePreferences();
  const { preferredGeneration, setPreferredGeneration } =
    useGenerationPreference();
  const { downloadExport, importAllData, clearAllData } = useDataExport();

  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedData;
      setImportStatus({ type: "success", message: "Restoring your backup…" });
      const result = await importAllData(data);

      if (result.success) {
        // Every hook re-reads its store on load, so the restored data shows
        // up everywhere at once.
        window.location.reload();
        return;
      }
      setImportStatus({
        type: "error",
        message: result.error || "Failed to import data",
      });
    } catch {
      setImportStatus({
        type: "error",
        message: "Invalid file format",
      });
    }

    // Reset file input
    e.target.value = "";
  };

  /**
   * Deletes everything, remotely first: each clear resolves once its deletes
   * have been acknowledged (or queued), and only then is local state wiped
   * and the page reloaded — a reload mid-request would abort the deletes and
   * the next load would merge the untouched server rows straight back in.
   * Offline, the deletes sit in the outbox, which `clearAllData` keeps, and
   * replay on reconnect before any snapshot is applied.
   */
  const handleDeleteEverything = async () => {
    setIsDeleting(true);
    await Promise.allSettled([
      clearFavorites(),
      clearFavoriteCards(),
      clearLists(),
      clearDecks(),
      clearTeams(),
      resetPreferences(),
    ]);
    clearAllData();
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-8">
        <AccountSection githubEnabled={githubEnabled} />

        <section className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            appearance
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

          <div className="flex items-center justify-between gap-4 py-2 border-b">
            <div>
              <p className="text-sm">artwork colors</p>
              <p className="text-xs text-muted-foreground">
                Pours the colors of a pokemon&rsquo;s sprite or a card&rsquo;s
                scan down the top of its page. Off leaves those pages plain and
                skips reading the artwork altogether.
              </p>
            </div>
            <Switch
              checked={ambientEnabled}
              onCheckedChange={setAmbientEnabled}
              aria-label="Paint detail pages with their artwork's colors"
            />
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
                  Used across cards, evolutions, and pokemon pages. Follows the
                  generation below ({getSpriteSet(generationSpriteSet).label})
                  unless a set is pinned — a pinned set also hides Pokemon it
                  never drew.
                </p>
              </div>
              <SpriteSetSelect
                value={spriteSetOverride ?? MATCH_GENERATION}
                onValueChange={(value) =>
                  setSpriteSetOverride(
                    value === MATCH_GENERATION ? null : (value as SpriteSetId),
                  )
                }
                extraOption={{
                  value: MATCH_GENERATION,
                  label: "Match generation",
                }}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            game
          </p>

          <div className="flex items-center justify-between gap-4 py-2 border-b">
            <div>
              <p className="text-sm">view the dex as</p>
              <p className="text-xs text-muted-foreground">
                Scopes the whole app — dex, learnsets, stats, types, abilities,
                items, matchups and search — to one generation&rsquo;s games
              </p>
            </div>
            <Select
              value={
                preferredGeneration !== null
                  ? String(preferredGeneration)
                  : "latest"
              }
              onValueChange={(value) =>
                setPreferredGeneration(
                  value === "latest" ? null : Number.parseInt(value, 10),
                )
              }
            >
              <SelectTrigger className="w-52 justify-between">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="latest">Latest data</SelectItem>
                {GENERATIONS.map((generation) => (
                  <SelectItem
                    key={generation.num}
                    value={String(generation.num)}
                  >
                    {generation.name} ({generation.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              onClick={() => void clearFavorites()}
              disabled={favorites.length === 0}
              className="text-xs px-3 py-1.5 border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              clear
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="text-sm">favorite cards</p>
              <p className="text-xs text-muted-foreground">
                {favoriteCards.length} saved
              </p>
            </div>
            <button
              type="button"
              onClick={() => void clearFavoriteCards()}
              disabled={favoriteCards.length === 0}
              className="text-xs px-3 py-1.5 border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              clear
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="text-sm">lists</p>
              <p className="text-xs text-muted-foreground">
                {lists.length} saved
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="text-sm">teams</p>
              <p className="text-xs text-muted-foreground">
                {teams.length} saved
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="text-sm">recently viewed</p>
              <p className="text-xs text-muted-foreground">
                {recentlyViewed.length} items
              </p>
            </div>
            <button
              type="button"
              onClick={clearRecentlyViewed}
              disabled={recentlyViewed.length === 0}
              className="text-xs px-3 py-1.5 border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              clear
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            backup & restore
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadExport}
              className="gap-2"
            >
              <Download className="size-4" />
              Export Data
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              className="gap-2"
            >
              <Upload className="size-4" />
              Import Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="size-4" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-destructive" />
                    Clear All Data
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your favorites, lists,
                    decks, teams, and settings — here and on your account. This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeleting}
                    onClick={(event) => {
                      // Keep the dialog open until the deletes have landed.
                      event.preventDefault();
                      void handleDeleteEverything();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting…" : "Delete Everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {importStatus && (
            <div
              className={cn(
                "text-xs p-2 rounded",
                importStatus.type === "success"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {importStatus.message}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Export your data to back it up or transfer to another device.
            Restoring a backup adds what&rsquo;s missing and replaces the
            lists, decks and teams it contains, items and all; anything not in
            the backup is left as it is.
          </p>
        </section>

        <section className="pt-8">
          <BuiltBy />
        </section>

        <section className="pt-8 border-t text-xs text-muted-foreground space-y-1">
          <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-2">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </p>
          <p>
            data:{" "}
            <a
              href="https://github.com/PokeAPI/pokeapi"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              PokeAPI
            </a>
            {" & "}
            <a
              href="https://github.com/pkmn/ps"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              pkmn/ps
            </a>
          </p>
          <p>pokemon is a trademark of nintendo</p>
        </section>
      </div>
    </div>
  );
}
