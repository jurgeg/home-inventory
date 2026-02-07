import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  ExpirationPlugin,
  type PrecacheEntry,
} from "serwist";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /\/api\/.*/i,
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    {
      matcher: /\.(?:png|jpg|jpeg|webp|avif)$/i,
      handler: new CacheFirst({
        cacheName: "image-cache",
        plugins: [
          new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
