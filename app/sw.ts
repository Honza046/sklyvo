import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * App Router HTML/RSC must never come from a stale SW cache: after a deploy the
 * cached flight/document can reference CSS/JS that no longer exists, which shows
 * up as a fully unstyled page (often on rarely visited routes like Full Auto).
 */
const appRouterNetworkOnly = [
  {
    matcher: ({
      request,
      url: { pathname },
      sameOrigin,
    }: {
      request: Request;
      url: URL;
      sameOrigin: boolean;
    }) =>
      request.headers.get("RSC") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({
      request,
      url: { pathname },
      sameOrigin,
    }: {
      request: Request;
      url: URL;
      sameOrigin: boolean;
    }) =>
      request.mode === "navigate" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Navigation preload has caused broken/empty document responses with Serwist + Next.
  navigationPreload: false,
  runtimeCaching: [...appRouterNetworkOnly, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
