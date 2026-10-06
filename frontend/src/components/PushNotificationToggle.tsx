"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { axiosInstance } from "@/lib/axios";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "denied" | "off" | "on";

export default function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const check = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setStatus(subscription ? "on" : "off");
      } catch {
        setStatus("off");
      }
    };
    check();
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const { data } = await axiosInstance.get("/push/public-key");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      });

      await axiosInstance.post("/push/subscribe", subscription.toJSON());
      setStatus("on");
    } catch {
      setError("Impossible d'activer les notifications. Réessaie dans quelques instants.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await axiosInstance.post("/push/unsubscribe", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Impossible de désactiver les notifications pour le moment.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "checking") return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <h2 className="font-semibold mb-1">Notifications push</h2>
      <p className="text-sm text-zinc-500 mb-4">
        Reçois une alerte directement sur ton téléphone ou ton ordinateur quand un budget
        approche ou dépasse sa limite — en plus de l&apos;email.
      </p>

      {error && (
        <p className="text-sm bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {status === "unsupported" && (
        <p className="text-sm text-zinc-400">
          Ton navigateur ne supporte pas les notifications push.
        </p>
      )}

      {status === "denied" && (
        <p className="text-sm text-zinc-400">
          Les notifications sont bloquées pour ce site. Autorise-les dans les réglages de ton
          navigateur pour pouvoir les activer ici.
        </p>
      )}

      {status === "off" && (
        <button
          onClick={handleEnable}
          disabled={isLoading}
          className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
        >
          <Bell size={15} strokeWidth={2.5} />
          {isLoading ? "Activation..." : "Activer les notifications"}
        </button>
      )}

      {status === "on" && (
        <button
          onClick={handleDisable}
          disabled={isLoading}
          className="flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-700 hover:border-red-400 hover:text-red-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition"
        >
          <BellOff size={15} strokeWidth={2} />
          {isLoading ? "Désactivation..." : "Désactiver les notifications"}
        </button>
      )}
    </div>
  );
}
