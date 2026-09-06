"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ShareResource } from "./share-link-dialog";

interface CloneButtonProps<T extends { id: string }> {
  resource: ShareResource;
  /** "deck", "team" or "list" — for the toasts. */
  noun: string;
  /** The server action that copies the shared row into the viewer's collection. */
  clone: () => Promise<T>;
  /** Puts the copy into the local mirror so its page finds it on arrival. */
  receive: (copy: T) => void;
}

/** "Copy to my collection" on a share page — one button for decks, teams and lists. */
export function CloneButton<T extends { id: string }>({
  resource,
  noun,
  clone,
  receive,
}: CloneButtonProps<T>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCloning, setIsCloning] = useState(false);
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const copy = await clone();
      // The detail page redirects to the index when the id isn't in the
      // local mirror, so the copy goes in before navigating rather than
      // waiting on a refetch. The refetch still runs, so the cached snapshot
      // catches up and can't later apply a stale list without the copy.
      receive(copy);
      void queryClient.invalidateQueries({ queryKey: [resource] });
      toast.success(`${Noun} copied to your collection`);
      router.push(`/${resource}/${copy.id}`);
    } catch {
      toast.error(`Couldn't copy this ${noun} — it may no longer be shared`);
      setIsCloning(false);
    }
  };

  return (
    <Button onClick={handleClone} disabled={isCloning}>
      <Copy className="mr-1.5 size-4" />
      {isCloning ? "Copying..." : "Copy to my collection"}
    </Button>
  );
}
