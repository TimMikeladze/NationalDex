"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;

// Registers `public/sw.js` once the page is interactive. Skipped in
// development so HMR and the service worker never fight over `/_next/`;
// `NEXT_PUBLIC_SW_DEV=1` opts in for testing it locally. When a new worker has
// installed behind a running one, the user gets a toast to reload into it
// rather than silently using the old bundle. See docs/pwa.md.
export function PwaRegister() {
  // Marks an installed app on the root, for CSS that only applies there.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      if (isStandalone()) root.dataset.standalone = "";
      else delete root.dataset.standalone;
    };
    sync();
    const mql = window.matchMedia("(display-mode: standalone)");
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_SW_DEV !== "1"
    ) {
      return;
    }
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let registration: ServiceWorkerRegistration | undefined;

    // An installed app can stay open for days; look for a new deploy whenever
    // it comes back to the foreground.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          // Always fetch the worker script itself from the network.
          updateViaCache: "none",
        });
        if (cancelled) return;

        const promptUpdate = (worker: ServiceWorker) => {
          toast("New version ready", {
            id: "sw-update",
            action: {
              label: "Reload",
              onClick: () => worker.postMessage("SKIP_WAITING"),
            },
            duration: Number.POSITIVE_INFINITY,
          });
        };

        // Already waiting from a previous visit.
        if (registration.waiting && navigator.serviceWorker.controller) {
          promptUpdate(registration.waiting);
        }

        const current = registration;
        registration.addEventListener("updatefound", () => {
          const worker = current.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              promptUpdate(worker);
            }
          });
        });
      } catch {
        // Registration failing is not worth surfacing; the site works without it.
      }
    };

    // `controllerchange` also fires when the very first worker claims the
    // page; only reload when the user has opted into a *new* worker.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    const onControllerChange = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
