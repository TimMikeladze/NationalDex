"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deckToCode,
  deckToText,
  type ParsedDeck,
  parseDeckInput,
} from "@/lib/deck-share";
import type { Deck } from "@/types/deck";

/**
 * A deck out of the browser and back into it.
 *
 * Decks live in local storage, so without a way out they live on one device.
 * The written list is the one players already paste to each other; the code
 * carries the deck exactly, including which printing of each card it used.
 */
export function DeckShareDialog({
  deck,
  open,
  onOpenChange,
  onImport,
}: {
  deck: Deck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Loads a pasted deck into this one, replacing what is in it. */
  onImport: (parsed: ParsedDeck) => Promise<void>;
}) {
  const [pasted, setPasted] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = useMemo(() => deckToText(deck), [deck]);
  const code = useMemo(() => deckToCode(deck), [deck]);

  const handleImport = async () => {
    const parsed = parseDeckInput(pasted);
    if (!parsed) {
      setError(
        "Nothing recognisable in there — paste a deck code, or a list whose lines end in a card number.",
      );
      return;
    }
    setError(null);
    setImporting(true);
    try {
      await onImport(parsed);
      setPasted("");
      onOpenChange(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{deck.name}</DialogTitle>
          <DialogDescription>
            Copy the deck out, or paste one in.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-2">
            <CopyBox value={text} rows={12} label="Copy deck list" />
            <p className="text-[11px] text-muted-foreground">
              The three piles with their totals, each line naming the set and
              card number the copy came from.
            </p>
          </TabsContent>

          <TabsContent value="code" className="space-y-2">
            <CopyBox value={code} rows={4} label="Copy deck code" />
            <p className="text-[11px] text-muted-foreground">
              Carries the whole deck. Card details are looked up again when it
              is imported, so a code never goes stale.
            </p>
          </TabsContent>

          <TabsContent value="import" className="space-y-2">
            <Textarea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              rows={8}
              placeholder="Paste a deck code or a deck list..."
              className="font-mono text-xs"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                This replaces the cards in {deck.name}.
              </p>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={!pasted.trim() || importing}
              >
                {importing && <Loader2 className="size-3.5 animate-spin" />}
                load deck
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CopyBox({
  value,
  rows,
  label,
}: {
  value: string;
  rows: number;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <Textarea
        readOnly
        value={value}
        rows={rows}
        className="font-mono text-xs"
        onFocus={(event) => event.currentTarget.select()}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard access can be refused; the text is selectable anyway.
          }
        }}
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
        {copied ? "copied" : label}
      </Button>
    </div>
  );
}
