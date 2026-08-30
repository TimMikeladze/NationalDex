import { RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

// The service worker serves this page in place of anything it has never
// seen when the network is gone. It is precached as HTML only, so nothing
// here may depend on hydration: the retry is a plain form that re-submits
// the current URL, which works even when no script chunk is cached.
export default function OfflinePage() {
  return (
    <div className="flex min-h-(--app-content-height) flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-2 text-lg font-medium">offline</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        This page isn&rsquo;t saved yet. Pages you&rsquo;ve already visited
        still open without a connection.
      </p>
      <form method="get">
        <Button type="submit" variant="outline" size="sm">
          <RefreshCw className="mr-2 size-4" />
          try again
        </Button>
      </form>
    </div>
  );
}
