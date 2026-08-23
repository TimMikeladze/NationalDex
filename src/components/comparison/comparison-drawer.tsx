"use client";

import { ArrowUpDown, ChevronDown, ChevronUp, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  ComparisonCard,
  type SortOption,
  StatsComparisonTable,
  TeamCoverageSection,
} from "@/components/comparison/comparison-shared";
import { CompareIcon } from "@/components/navigation/app-icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComparison } from "@/hooks/use-comparison";
import { pokemonSprite } from "@/lib/sprites";
import { cn } from "@/lib/utils";

export function ComparisonDrawer() {
  const {
    comparison,
    isLoaded,
    removeFromComparison,
    clearComparison,
    panelState,
    expandPanel,
    minimizePanel,
    closePanel,
  } = useComparison();
  const [sortBy, setSortBy] = useState<SortOption>("id");
  const [activeTab, setActiveTab] = useState("cards");

  // Don't render until loaded or if panel is closed
  if (!isLoaded || panelState === "closed" || comparison.length === 0) {
    return null;
  }

  const isExpanded = panelState === "expanded";

  return (
    <div
      className={cn(
        "fixed z-40 transition-all duration-300 ease-in-out",
        // Position: bottom on mobile with padding for nav, full screen on desktop when expanded
        "left-0 right-0",
        isExpanded
          ? "bottom-0 lg:bottom-0 top-0 lg:top-14"
          : // Sit on top of the bottom nav, home indicator included, rather
            // than on top of a guess at how tall the nav is.
            "bottom-(--app-bottom-inset) lg:bottom-0",
      )}
    >
      {/* Backdrop when expanded */}
      {isExpanded && (
        <button
          type="button"
          className="absolute inset-0 bg-black/50 lg:hidden cursor-default"
          onClick={minimizePanel}
          aria-label="Close comparison panel"
        />
      )}

      {/* Main Panel */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-0 bg-background border-t shadow-lg transition-all duration-300 ease-in-out",
          isExpanded
            ? "h-full lg:h-[70dvh] max-h-[calc(100dvh-3rem)] lg:max-h-[70dvh] rounded-t-xl"
            : "h-auto",
        )}
      >
        {/* Header - always visible */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive header */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-2 border-b",
            !isExpanded && "cursor-pointer hover:bg-muted/50",
          )}
          onClick={!isExpanded ? expandPanel : undefined}
          onKeyDown={
            !isExpanded ? (e) => e.key === "Enter" && expandPanel() : undefined
          }
          role={!isExpanded ? "button" : undefined}
          tabIndex={!isExpanded ? 0 : undefined}
        >
          <div className="flex items-center gap-3">
            <CompareIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              comparing {comparison.length} pokemon
            </span>

            {/* Preview sprites when minimized */}
            {!isExpanded && (
              <div className="flex -space-x-2 ml-2">
                {comparison.slice(0, 4).map((name) => (
                  // biome-ignore lint/performance/noImgElement: external sprite URLs
                  <img
                    key={name}
                    src={pokemonSprite(name)}
                    alt=""
                    className="size-8 pixelated rounded-full bg-muted border-2 border-background"
                  />
                ))}
                {comparison.length > 4 && (
                  <span className="size-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{comparison.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isExpanded && (
              <>
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortOption)}
                >
                  <SelectTrigger className="w-[110px] h-7 text-xs">
                    <ArrowUpDown className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">By ID</SelectItem>
                    <SelectItem value="total">By Total</SelectItem>
                    <SelectItem value="hp">By HP</SelectItem>
                    <SelectItem value="attack">By Attack</SelectItem>
                    <SelectItem value="defense">By Defense</SelectItem>
                    <SelectItem value="spatk">By Sp. Atk</SelectItem>
                    <SelectItem value="spdef">By Sp. Def</SelectItem>
                    <SelectItem value="speed">By Speed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearComparison();
                  }}
                  className="h-7 text-xs"
                >
                  <Trash2 className="size-3 mr-1" />
                  clear
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation();
                isExpanded ? minimizePanel() : expandPanel();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation();
                closePanel();
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="flex-1 overflow-hidden h-[calc(100%-3rem)]">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              <div className="px-4 py-2 border-b">
                <TabsList>
                  <TabsTrigger value="cards">cards</TabsTrigger>
                  <TabsTrigger value="table">table</TabsTrigger>
                  <TabsTrigger value="coverage">coverage</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="cards"
                className="flex-1 overflow-auto p-4 m-0"
              >
                <div className="flex gap-4 pb-4 overflow-x-auto">
                  {comparison.map((name) => (
                    <ComparisonCard
                      key={name}
                      pokemonName={name}
                      variant="compact"
                      onRemove={() => removeFromComparison(name)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="table"
                className="flex-1 overflow-auto p-4 m-0"
              >
                <StatsComparisonTable
                  pokemonNames={comparison}
                  variant="compact"
                />
              </TabsContent>

              <TabsContent
                value="coverage"
                className="flex-1 overflow-auto p-4 m-0"
              >
                <TeamCoverageSection
                  pokemonNames={comparison}
                  variant="compact"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
