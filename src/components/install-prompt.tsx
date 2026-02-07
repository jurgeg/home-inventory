"use client";

import { useState, useEffect } from "react";

function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    );
  }, []);
  return isStandalone;
}

function useIsIOS(): boolean {
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream,
    );
  }, []);
  return isIOS;
}

export function InstallPrompt() {
  const isStandalone = useIsStandalone();
  const isIOS = useIsIOS();
  const [dismissed, setDismissed] = useState(true);

  // Android/Chrome beforeinstallprompt
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    setDismissed(localStorage.getItem("a2hs-dismissed") === "true");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem("a2hs-dismissed", "true");
    setDismissed(true);
  };

  // Android install
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-0 inset-x-0 bg-slate-900 text-white p-4 z-50 pb-[env(safe-area-inset-bottom)]">
        <button onClick={dismiss} className="absolute top-2 right-3 text-slate-400 text-lg">
          ✕
        </button>
        <p className="text-sm font-medium">Install Home Inventory</p>
        <p className="text-xs text-slate-300 mt-1">Add to your home screen for the best experience.</p>
        <button
          onClick={() => {
            (deferredPrompt as unknown as { prompt: () => void }).prompt();
            dismiss();
          }}
          className="mt-2 px-4 py-1.5 bg-white text-slate-900 rounded-lg text-sm font-medium"
        >
          Install
        </button>
      </div>
    );
  }

  // iOS guidance
  if (!isIOS) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-slate-900 text-white p-4 z-50 pb-[env(safe-area-inset-bottom)]">
      <button onClick={dismiss} className="absolute top-2 right-3 text-slate-400 text-lg">
        ✕
      </button>
      <p className="text-sm font-medium">Install Home Inventory</p>
      <p className="text-xs text-slate-300 mt-1">
        Tap{" "}
        <svg className="w-4 h-4 inline align-text-bottom" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h3v2H6v11h12V10h-3V8h3a2 2 0 012 2z" />
        </svg>{" "}
        then <strong>&quot;Add to Home Screen&quot;</strong>
      </p>
    </div>
  );
}
