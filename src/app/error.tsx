"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <h2 className="text-lg font-medium mb-2">something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-6">
        An unexpected error occurred.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw className="size-4 mr-2" />
        try again
      </Button>
    </div>
  );
}
