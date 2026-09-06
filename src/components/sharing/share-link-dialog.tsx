"use client";

import { Check, Copy, Globe, Link2, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Visibility } from "@/db/schema";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type ShareResource = "decks" | "teams" | "lists";

interface ShareState {
  visibility: Visibility;
  shareSlug: string | null;
}

const PRIVATE_STATE: ShareState = { visibility: "private", shareSlug: null };

const OPTIONS: {
  value: Visibility;
  label: string;
  hint: string;
  icon: typeof Lock;
}[] = [
  {
    value: "private",
    label: "Private",
    hint: "Only you can see this",
    icon: Lock,
  },
  {
    value: "unlisted",
    label: "Unlisted",
    hint: "Anyone with the link can view it",
    icon: Link2,
  },
  {
    value: "public",
    label: "Public",
    hint: "Also listed on the browse page",
    icon: Globe,
  },
];

function shareUrl(resource: ShareResource, slug: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/${resource}/share/${slug}`;
}

/** Visibility + share-link control, shared by the deck/team/list detail pages. */
export function ShareLinkDialog({
  resource,
  id,
  open,
  onOpenChange,
}: {
  resource: ShareResource;
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const [state, setState] = useState<ShareState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState(null);
    fetch(`/api/${resource}/${id}/share`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setState(data ?? PRIVATE_STATE))
      .catch(() => setState(PRIVATE_STATE));
  }, [open, resource, id]);

  async function patchShare(
    body: { visibility: Visibility; rotate?: boolean },
    failureMessage: string,
  ): Promise<boolean> {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/${resource}/${id}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(failureMessage);
      setState(await res.json());
      return true;
    } catch {
      toast.error(failureMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  function setVisibility(visibility: Visibility) {
    void patchShare({ visibility }, "Couldn't update sharing — try again.");
  }

  async function rotateSlug() {
    const ok = await patchShare(
      { visibility: state?.visibility ?? "unlisted", rotate: true },
      "Couldn't rotate the link — try again.",
    );
    if (ok) toast.success("Old link revoked — a new one is ready to copy.");
  }

  async function copyLink() {
    if (!state?.shareSlug) return;
    await navigator.clipboard.writeText(shareUrl(resource, state.shareSlug));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // A guest signing up later re-parents everything they own, but a public URL
  // an unclaimed guest never comes back for would just be orphaned — so
  // sharing itself is gated on having a real account.
  const isGuest = session?.user?.isAnonymous ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription>
            Control who can open this with a link.
          </DialogDescription>
        </DialogHeader>

        {isGuest ? (
          <p className="text-muted-foreground text-sm">
            <Link href="/settings" className="underline">
              Sign in
            </Link>{" "}
            to share this — an unclaimed guest link would have nowhere to go.
          </p>
        ) : !state ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={state.visibility}
              onValueChange={(value) => setVisibility(value as Visibility)}
              disabled={isLoading}
              className="gap-3"
            >
              {OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`share-visibility-${option.value}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                    state.visibility === option.value && "border-primary",
                  )}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`share-visibility-${option.value}`}
                    className="mt-0.5"
                  />
                  <option.icon className="mt-0.5 size-4 shrink-0" />
                  <span className="flex flex-col gap-0.5">
                    <Label className="cursor-pointer">{option.label}</Label>
                    <span className="text-muted-foreground text-xs">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            {state.visibility !== "private" && state.shareSlug && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border bg-muted px-2 py-1.5 text-xs">
                    {shareUrl(resource, state.shareSlug)}
                  </code>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={copyLink}
                    aria-label="Copy link"
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={rotateSlug}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className="size-3.5" />
                    Get a new link (revokes the old one)
                  </Button>
                  {state.visibility === "public" && (
                    <Link
                      href={`/${resource}/browse`}
                      className="text-muted-foreground text-xs underline"
                    >
                      See the browse page
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
