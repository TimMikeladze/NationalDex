"use client";

import {
  ArrowLeft,
  ArrowUpDown,
  GitCompareArrows,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  ComparisonCard,
  ComparisonCardSkeleton,
  type SortOption,
  StatsComparisonTable,
  TeamCoverageSection,
} from "@/components/comparison/comparison-shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComparison } from "@/hooks/use-comparison";

export default function ComparisonPage() {
  const { comparison, isLoaded, removeFromComparison, clearComparison } =
    useComparison();
  const [sortBy, setSortBy] = useState<SortOption>("id");
  const [activeTab, setActiveTab] = useState("cards");

  if (!isLoaded) {
    return (
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ComparisonCardSkeleton key={`skeleton-${i}`} variant="full" />
          ))}
        </div>
      </div>
    );
  }

  if (comparison.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="py-16 text-center">
          <GitCompareArrows className="size-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">no pokemon to compare</p>
          <p className="text-xs text-muted-foreground mt-1">
            click the compare icon on any pokemon to add it here
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4 mr-2" />
              browse pokemon
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium">
            comparing {comparison.length} pokemon
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
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
          <Button variant="ghost" size="sm" onClick={clearComparison}>
            <Trash2 className="size-4 mr-1" />
            clear
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="cards">cards</TabsTrigger>
          <TabsTrigger value="table">table</TabsTrigger>
          <TabsTrigger value="coverage">coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-4">
          {/* Comparison Grid */}
          <div className="overflow-x-auto pb-4">
            <div className="inline-flex gap-4 min-w-full">
              <SortedComparisonCards
                pokemonNames={comparison}
                sortBy={sortBy}
                onRemove={removeFromComparison}
              />
              <AddMoreCard />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="table">
          <StatsComparisonTable pokemonNames={comparison} variant="full" />
        </TabsContent>

        <TabsContent value="coverage">
          <TeamCoverageSection pokemonNames={comparison} variant="full" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SortedComparisonCards({
  pokemonNames,
  onRemove,
}: {
  pokemonNames: string[];
  sortBy: SortOption;
  onRemove: (name: string) => void;
}) {
  // We need to sort the cards, but we can't call hooks conditionally
  // So we render all cards and let them sort themselves via CSS order
  // For now, we just render them in order and let the user sort
  return (
    <>
      {pokemonNames.map((name) => (
        <ComparisonCard
          key={name}
          pokemonName={name}
          variant="full"
          onRemove={() => onRemove(name)}
        />
      ))}
    </>
  );
}

function AddMoreCard() {
  return (
    <Link href="/" className="block">
      <Card className="w-72 flex-shrink-0 p-4 h-full min-h-[400px] flex flex-col items-center justify-center border-dashed hover:bg-muted/50 transition-colors">
        <Plus className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">add pokemon</p>
        <p className="text-xs text-muted-foreground mt-1">
          click the compare button on any pokemon
        </p>
      </Card>
    </Link>
  );
}
