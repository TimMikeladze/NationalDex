"use client";

import { AlertTriangle, Download, Trash2, Upload } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { BuiltBy } from "@/components/built-by";
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
import { type ExportedData, useDataExport } from "@/hooks/use-data-export";
import { useFavorites } from "@/hooks/use-favorites";
import { useLists } from "@/hooks/use-lists";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useSpritePreferences } from "@/hooks/use-sprite-preferences";
import { useTeams } from "@/hooks/use-teams";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { favorites, clearFavorites } = useFavorites();
  const { lists } = useLists();
  const { teams } = useTeams();
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const { defaultPokemonSpriteGen, setDefaultPokemonSpriteGen } =
    useSpritePreferences();
  const { downloadExport, importAllData, clearAllData } = useDataExport();

  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
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
      const result = importAllData(data);

      if (result.success) {
        setImportStatus({
          type: "success",
          message:
            "Data imported successfully. Refresh the page to see changes.",
        });
      } else {
        setImportStatus({
          type: "error",
          message: result.error || "Failed to import data",
        });
      }
    } catch {
      setImportStatus({
        type: "error",
        message: "Invalid file format",
      });
    }

    // Reset file input
    e.target.value = "";
  };

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
                    teams, and settings. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      clearAllData();
                      window.location.reload();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Everything
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
