"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { processSyncQueue, getPendingCount } from "@/lib/sync";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [visible, setVisible] = useState(false);

  // Track pending count
  useEffect(() => {
    const check = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      setSyncing(true);
      processSyncQueue().then(async () => {
        const count = await getPendingCount();
        setPendingCount(count);
        setSyncing(false);
      });
    }
  }, [isOnline, pendingCount]);

  // Show/hide with animation
  useEffect(() => {
    if (!isOnline || syncing) {
      setVisible(true);
    } else {
      // Brief delay before hiding after sync completes
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncing]);

  if (!visible && isOnline && !syncing) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-50 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div
        className={`px-4 py-2 text-center text-sm font-medium ${
          !isOnline
            ? "bg-amber-500 text-white"
            : syncing
              ? "bg-blue-500 text-white"
              : "bg-green-500 text-white"
        }`}
      >
        {!isOnline ? (
          <>📡 You&apos;re offline{pendingCount > 0 && ` · ${pendingCount} changes pending`}</>
        ) : syncing ? (
          <>🔄 Syncing {pendingCount} changes…</>
        ) : (
          <>✅ All synced!</>
        )}
      </div>
    </div>
  );
}
