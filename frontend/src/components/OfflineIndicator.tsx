"use client";

import { useEffect, useState, useCallback } from "react";
import { WifiOff, RefreshCw, CheckCircle, X } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";

// Nombre de transactions en attente dans IndexedDB
async function countPending(): Promise<number> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return 0;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("fintrack-offline", 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("pending-transactions")) {
          resolve(0);
          return;
        }
        const tx    = db.transaction("pending-transactions", "readonly");
        const count = tx.objectStore("pending-transactions").count();
        count.onsuccess = () => resolve(count.result);
        count.onerror   = () => resolve(0);
      };
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

type ToastState =
  | { kind: "offline" }
  | { kind: "queued"; count: number }
  | { kind: "synced"; count: number }
  | null;

export default function OfflineIndicator() {
  const [isOnline, setIsOnline]       = useState(true);
  const [toast, setToast]             = useState<ToastState>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const { getTransactions, getStats, lastFilters, statsMonthYear } = useTransactionStore();

  // Ferme le toast après un délai
  const scheduleClose = useCallback((delayMs: number) => {
    setTimeout(() => setToast(null), delayMs);
  }, []);

  // Mise à jour du compteur de transactions en attente
  const refreshPending = useCallback(async () => {
    const n = await countPending();
    setPendingCount(n);
    return n;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    refreshPending();

    const handleOnline = () => {
      setIsOnline(true);
      setToast(null);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setToast({ kind: "offline" });
    };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    // Messages du service worker
    const handleSWMessage = async (event: MessageEvent) => {
      if (!event.data?.type) return;

      if (event.data.type === "TRANSACTION_QUEUED") {
        const n = await refreshPending();
        setToast({ kind: "queued", count: n });
      }

      if (event.data.type === "SYNC_COMPLETED") {
        const count = event.data.count as number;
        // Recharge les données depuis le serveur
        getTransactions(lastFilters);
        getStats(statsMonthYear || {});
        await refreshPending();
        setToast({ kind: "synced", count });
        scheduleClose(5000);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSWMessage);
    }

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
      }
    };
  }, [getStats, getTransactions, lastFilters, refreshPending, scheduleClose, statsMonthYear]);

  // Pas d'affichage si tout va bien et pas de toast
  if (isOnline && !toast) return null;

  return (
    <>
      {/* Bandeau hors-ligne permanent en haut de page */}
      {!isOnline && (
        <div
          className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2
                     bg-amber-500 text-white text-xs font-semibold py-2 px-4 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <WifiOff size={14} className="shrink-0" />
          <span>
            Vous êtes hors ligne. Les transactions saisies seront synchronisées au retour du réseau.
          </span>
          {pendingCount > 0 && (
            <span className="ml-1 bg-white/30 px-2 py-0.5 rounded-full text-xs font-bold">
              {pendingCount} en attente
            </span>
          )}
        </div>
      )}

      {/* Toast flottant (transaction mise en file / sync terminée) */}
      {toast && isOnline && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998]
                     flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl
                     bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900
                     border border-zinc-700 dark:border-zinc-200
                     max-w-sm w-full text-sm font-medium animate-in fade-in slide-in-from-bottom-4"
          role="status"
        >
          {toast.kind === "synced" && (
            <>
              <CheckCircle size={18} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
              <span>
                {toast.count} transaction{toast.count > 1 ? "s" : ""} synchronisée{toast.count > 1 ? "s" : ""} avec succès !
              </span>
              <button
                onClick={() => setToast(null)}
                className="ml-auto p-1 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 transition"
                aria-label="Fermer"
              >
                <X size={15} />
              </button>
            </>
          )}
          {toast.kind === "queued" && (
            <>
              <RefreshCw size={18} className="text-amber-400 dark:text-amber-600 shrink-0 animate-spin" />
              <span>
                {toast.count} transaction{toast.count > 1 ? "s" : ""} en attente — synchronisation au retour du réseau.
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
