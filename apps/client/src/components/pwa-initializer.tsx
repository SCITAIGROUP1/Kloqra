"use client";

import { useEffect } from "react";
import { useOfflineStore } from "@/stores/offline-store";
import { useSessionStore } from "@/stores/session.store";

export function PwaInitializer() {
  const session = useSessionStore((s) => s.session);
  const workspaceId = session?.workspaceId;
  const setOffline = useOfflineStore((s) => s.setOffline);
  const syncQueue = useOfflineStore((s) => s.syncQueue);

  useEffect(() => {
    // 1. Service Worker Registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.warn("Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }

    // 2. Online/Offline network state handlers
    const handleOnline = () => {
      setOffline(false);
      if (workspaceId) {
        void syncQueue(workspaceId);
      }
    };

    const handleOffline = () => {
      setOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [workspaceId, setOffline, syncQueue]);

  return null;
}
