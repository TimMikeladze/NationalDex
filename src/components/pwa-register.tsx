"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// Registers `public/sw.js` once the page is interactive. Skipped in
// development so HMR and the service worker never fight over `/_next/`.
// When a new worker has installed behind a running one, the user gets a
// toast to reload into it rather than silently using the old bundle.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (cancelled) return;

        const promptUpdate = (worker: ServiceWorker) => {
          toast("A new version of NationalDex is ready", {
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

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
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
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
