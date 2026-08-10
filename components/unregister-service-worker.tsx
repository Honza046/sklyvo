"use client";

import { useEffect } from "react";

/**
 * Clears leftover Serwist registrations that caused Safari to flash
 * “This page couldn’t load” before the real document arrived.
 */
export function UnregisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        // Ignore — best-effort cleanup for returning browsers.
      }
    })();
  }, []);

  return null;
}
