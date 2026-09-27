"use client";

import { useState, useEffect } from "react";
import { Repeat, Plus, Trash2, Pause, Play } from "lucide-react";
import { useRecurringStore } from "@/store/useRecurringStore";
import { useTransactionStore } from "@/store/useTransactionStore";

type Recurring = {
  _id: string;
  type: "revenu" | "dépense";
  amount: number;
  category: string;
  description: string;
  frequency: "weekly" | "monthly" | "yearly";
  nextDueDate: string;
  active: boolean;
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Chaque semaine",
  monthly: "Chaque mois",
  yearly: "Chaque année",
};

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${currency}`;
}

export default function RecurringTransactions({ currency }: { currency: string }) {
  const { recurring, getRecurring, createRecurring, toggleActive, deleteRecurring } = useRecurringStore();
  const { categories, getCategories } = useTransactionStore();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"dépense" | "revenu">("dépense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  useEffect(() => {
    getRecurring();
    getCategories();
  }, [getRecurring, getCategories]);

  const availableCategories = type === "dépense" ? categories.expense : categories.income;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0 || !category) {
      setError("Un montant et une catégorie valides sont requis.");
      return;
    }
    const result = await createRecurring({
      type,
      amount: Number(amount),
      category,
      description,
      frequency,
      startDate,
    });
    if (result.success) {
      setAmount("");
      setCategory("");
      setDescription("");
      setShowForm(false);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Repeat size={16} className="text-accent-600" />
          Transactions récurrentes
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-accent-600 border border-accent-600 rounded-full px-2.5 py-1 hover:bg-accent-50 dark:hover:bg-accent-950 transition"
        >
          <Plus size={13} strokeWidth={2.5} />
          Ajouter
        </button>
      </div>

      {recurring.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-6">
          Aucune récurrence pour le moment. Déclare un loyer ou un abonnement pour qu&apos;il se répète tout seul.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {recurring.map((r: Recurring) => (
            <div key={r._id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${!r.active ? "opacity-40" : ""}`}>
                  {r.description || r.category}
                </p>
                <p className="text-xs text-zinc-400">
                  {r.category} · {FREQUENCY_LABELS[r.frequency]} · Prochaine :{" "}
                  {new Date(r.nextDueDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <p
                className={`text-sm font-semibold shrink-0 ${
                  !r.active ? "opacity-40" : r.type === "revenu" ? "text-accent-600" : "text-expense-600"
                }`}
              >
                {r.type === "revenu" ? "+" : "-"}
                {formatAmount(r.amount, currency)}
              </p>
              <button
                onClick={() => toggleActive(r._id)}
                aria-label={r.active ? "Mettre en pause" : "Réactiver"}
                className="text-zinc-400 hover:text-accent-600 transition shrink-0"
              >
                {r.active ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
              </button>
              <button
                onClick={() => deleteRecurring(r._id)}
                aria-label="Supprimer"
                className="text-zinc-300 hover:text-red-600 transition shrink-0"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm"
          >
            <h3 className="font-bold mb-4">Nouvelle transaction récurrente</h3>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setType("dépense");
                  setCategory("");
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  type === "dépense"
                    ? "bg-expense-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                Dépense
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("revenu");
                  setCategory("");
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  type === "revenu"
                    ? "bg-accent-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                Revenu
              </button>
            </div>

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Montant</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            >
              <option value="">Choisir...</option>
              {availableCategories.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Description (optionnel)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Fréquence</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "weekly" | "monthly" | "yearly")}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            >
              <option value="weekly">Chaque semaine</option>
              <option value="monthly">Chaque mois</option>
              <option value="yearly">Chaque année</option>
            </select>

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Première échéance
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6 bg-transparent text-sm"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2 text-sm font-medium"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
