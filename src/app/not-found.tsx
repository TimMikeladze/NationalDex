import Link from "next/link";
import { DexIcon } from "@/components/navigation/app-icons";
import { Button } from "@/components/ui/button";

// Next's built-in 404 lays itself out at `height: 100vh`, which inside the
// shell's scroll container is a viewport's worth of chrome-height overscroll.
// The app's own one is measured like every other page: it fits.
export default function NotFound() {
  return (
    <div className="flex min-h-(--app-content-height) flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-2 text-lg font-medium">not found</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        That page isn&rsquo;t in the dex.
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/">
          <DexIcon className="mr-2 size-4" />
          back to the dex
        </Link>
      </Button>
    </div>
  );
}
