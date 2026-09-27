import { Skeleton } from "@/components/ui/skeleton";

// Painted the instant a tab is tapped, while the next page's payload is on its
// way, so a tap always answers straight away.
export default function Loading() {
  return (
    <div
      className="flex flex-col gap-4 p-4 md:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}
