"use client";

import { useEffect } from "react";
import { ensureGuestSession } from "@/lib/auth-client";

/** Gives every visitor a session — guest or real — before any synced hook mounts. */
export function GuestSessionBoot() {
  useEffect(() => {
    ensureGuestSession().catch((err) => {
      console.error("Failed to start guest session", err);
    });
  }, []);

  return null;
}
