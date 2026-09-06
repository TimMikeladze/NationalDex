"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

/**
 * The settings page's account section: who you're signed in as with a way
 * out, or — for a guest — the way in. Signing in or up from a guest session
 * re-parents everything the guest built onto the account (see
 * `claimGuestData` in `src/lib/auth.ts`), so nothing is lost by doing it late.
 */
export function AccountSection({ githubEnabled }: { githubEnabled: boolean }) {
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = session?.user;
  const isSignedIn = Boolean(user) && !user?.isAnonymous;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result =
        mode === "sign-up"
          ? await signUp.email({
              email,
              password,
              name: name.trim() || email.split("@")[0],
            })
          : await signIn.email({ email, password });
      if (result.error) {
        toast.error(
          result.error.message ??
            (mode === "sign-up"
              ? "Couldn't create the account"
              : "Couldn't sign in"),
        );
        return;
      }
      setPassword("");
      toast.success(
        mode === "sign-up"
          ? "Account created — everything you built as a guest is on it now."
          : "Signed in — your guest data has been merged into this account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGithub() {
    setIsSubmitting(true);
    const result = await signIn.social({
      provider: "github",
      callbackURL: "/settings",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't start GitHub sign-in");
      setIsSubmitting(false);
    }
    // Otherwise the browser is on its way to GitHub.
  }

  return (
    <section className="space-y-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider block">
        account
      </p>

      {isPending ? (
        <p className="text-xs text-muted-foreground">Checking your session…</p>
      ) : isSignedIn ? (
        <div className="flex items-center justify-between gap-4 py-2 border-b">
          <div className="min-w-0">
            <p className="text-sm truncate">{user?.name || user?.email}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email} · synced across your devices
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void signOut()}
          >
            <LogOut className="size-4" />
            sign out
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            You&rsquo;re browsing as a guest. Everything you save is kept on
            this device and on your guest session; sign in to keep it across
            devices and to share decks, teams, and lists by link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
            {mode === "sign-up" && (
              <div className="space-y-1.5">
                <Label htmlFor="account-name">name</Label>
                <Input
                  id="account-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Trainer"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="account-email">email</Label>
              <Input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-password">password</Label>
              <Input
                id="account-password"
                type="password"
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {mode === "sign-up" ? "create account" : "sign in"}
              </Button>
              {githubEnabled && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleGithub}
                >
                  continue with GitHub
                </Button>
              )}
              <button
                type="button"
                onClick={() =>
                  setMode(mode === "sign-up" ? "sign-in" : "sign-up")
                }
                className="text-xs text-muted-foreground underline"
              >
                {mode === "sign-up"
                  ? "already have an account? sign in"
                  : "new here? create an account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
