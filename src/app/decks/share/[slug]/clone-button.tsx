"use client";

import { CloneButton } from "@/components/sharing/clone-button";
import { useDecks } from "@/hooks/use-decks";
import { cloneSharedDeck } from "./actions";

export function CloneDeckButton({ slug }: { slug: string }) {
  const { receiveDeck } = useDecks();
  return (
    <CloneButton
      resource="decks"
      noun="deck"
      clone={() => cloneSharedDeck(slug)}
      receive={receiveDeck}
    />
  );
}
