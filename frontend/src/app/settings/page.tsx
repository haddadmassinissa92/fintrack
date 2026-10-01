"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Check, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Navbar from "@/components/Navbar";

// Liste volontairement courte de devises courantes — l'utilisateur peut
// toujours en saisir une autre via le champ libre juste en dessous.
const COMMON_CURRENCIES = [
  { code: "DZD", label: "DZD — Dinar algérien" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "USD", label: "USD — Dollar américain" },
  { code: "GBP", label: "GBP — Livre sterling" },
  { code: "MAD", label: "MAD — Dirham marocain" },
  { code: "TND", label: "TND — Dinar tunisien" },
  { code: "CAD", label: "CAD — Dollar canadien" },
  { code: "CHF", label: "CHF — Franc suisse" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { authUser, isCheckingAuth, checkAuth, updateCurrency } = useAuthStore();
  const [currency, setCurrency] = useState("DZD");
  const [customCurrency, setCustomCurrency] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isCheckingAuth && !authUser) {
      router.replace("/login");
    }
  }, [authUser, isCheckingAuth, router]);

  // Initialise le sélecteur avec la devise actuelle de l'utilisateur dès
  // qu'elle est disponible (gère aussi le cas d'une devise déjà en base
  // mais absente de la liste courante, ex. si modifiée manuellement)
  useEffect(() => {
    if (!authUser?.currency) return;
    const known = COMMON_CURRENCIES.some((c) => c.code === authUser.currency);
    if (known) {
      setCurrency(authUser.currency);
      setIsCustom(false);
    } else {
      setIsCustom(true);
      setCustomCurrency(authUser.currency);
    }
  }, [authUser?.currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = (isCustom ? customCurrency : currency).trim().toUpperCase();
    if (!value) {
      setMessage({ type: "error", text: "Indique un code de devise." });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const result = await updateCurrency(value);
    setIsSaving(false);

    if (result.success) {
      setMessage({ type: "success", text: "Devise mise à jour." });
    } else {
      setMessage({ type: "error", text: result.message });
    }
  };

  if (isCheckingAuth || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-accent-600 transition"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Retour au tableau de bord
        </button>

        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <SettingsIcon size={20} className="text-accent-600" />
            Paramètres
          </h1>
          <p className="text-sm text-zinc-500">Gère les préférences de ton compte</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-1">Devise</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Devise utilisée pour l&apos;affichage de tous tes montants — revenus, dépenses,
            budgets et objectifs d&apos;épargne. Il ne s&apos;agit que d&apos;un affichage : FinTrack
            ne convertit pas automatiquement entre devises.
          </p>

          <form onSubmit={handleSubmit}>
            {message && (
              <p
                className={`text-sm rounded-lg px-3 py-2 mb-4 ${
                  message.type === "success"
                    ? "bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400"
                    : "bg-red-50 dark:bg-red-950/40 text-red-600"
                }`}
              >
                {message.text}
              </p>
            )}

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Devise
            </label>
            <select
              value={isCustom ? "custom" : currency}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setIsCustom(true);
                } else {
                  setIsCustom(false);
                  setCurrency(e.target.value);
                }
              }}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-3 bg-white dark:bg-zinc-900 text-sm"
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
              <option value="custom">Autre (code personnalisé)...</option>
            </select>

            {isCustom && (
              <input
                type="text"
                maxLength={8}
                placeholder="Ex. JPY"
                value={customCurrency}
                onChange={(e) => setCustomCurrency(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-white dark:bg-zinc-900 text-sm uppercase"
              />
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
            >
              <Check size={15} strokeWidth={2.5} />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
