import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeckBuilder } from "./client";

// A deck lives in one browser's storage, so its page is nobody else's to read.
export const metadata: Metadata = {
  title: "Deck builder",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DeckBuilderPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<BuilderSkeleton />}>
      <DeckBuilder deckId={id} />
    </Suspense>
  );
}

function BuilderSkeleton() {
  return (
    <div className="flex h-[var(--app-content-height)] flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-3 md:px-6">
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton
                key={`deck-skeleton-${index}`}
                className="aspect-[63/88] w-full"
              />
            ))}
          </div>
        </div>
        <div className="hidden border-l p-4 lg:block">
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
