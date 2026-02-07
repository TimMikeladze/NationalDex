"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PokemonError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <h2 className="text-lg font-medium mb-2">failed to load pokemon</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Something went wrong while loading this page.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="size-4 mr-2" />
          try again
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/">back to pokedex</Link>
        </Button>
      </div>
    </div>
  );
}
