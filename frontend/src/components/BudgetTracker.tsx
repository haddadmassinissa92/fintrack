"use client";

import { useState, useEffect } from "react";
import { Wallet2, Plus, Trash2 } from "lucide-react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useTransactionStore } from "@/store/useTransactionStore";

type Budget = {
  _id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
};

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${currency}`;
}

export default function BudgetTracker({ currency }: { currency: string }) {
  const { budgets, getBudgets, setBudget, deleteBudget } = useBudgetStore();
  const { categories, getCategories } = useTransactionStore();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getBudgets();
    getCategories();
  }, [getBudgets, getCategories]);

  // Catégories de dépense pas encore budgétées, pour éviter de proposer
  // dans le menu déroulant une catégorie déjà suivie (il suffit de
  // redéfinir la limite existante pour la changer, pas d'en recréer une)
  const budgetedCategories = budgets.map((b: Budget) => b.category);
  const availableCategories = (categories.expense || []).filter(
    (c: string) => !budgetedCategories.includes(c),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!category || !monthlyLimit || Number(monthlyLimit) <= 0) {
      setError("Choisis une catégorie et une limite valide.");
      return;
    }
    const result = await setBudget(category, Number(monthlyLimit));
    if (result.success) {
      setCategory("");
      setMonthlyLimit("");
      setShowForm(false);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Wallet2 size={16} className="text-accent-600" />
          Budgets mensuels
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-accent-600 border border-accent-600 rounded-full px-2.5 py-1 hover:bg-accent-50 dark:hover:bg-accent-950 transition"
        >
          <Plus size={13} strokeWidth={2.5} />
          Définir un budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-6">
          Aucun budget défini. Fixe une limite mensuelle sur une catégorie pour suivre tes dépenses par rapport à elle.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {budgets.map((b: Budget) => {
            const percent = Math.min(100, Math.round((b.spent / b.monthlyLimit) * 100));
            const isOver = b.spent > b.monthlyLimit;
            return (
              <div key={b._id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{b.category}</span>
                  <button
                    onClick={() => deleteBudget(b._id)}
                    aria-label="Supprimer le budget"
                    className="text-zinc-300 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOver ? "bg-expense-600" : "bg-accent-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className={`text-xs ${isOver ? "text-expense-600 font-medium" : "text-zinc-500"}`}>
                  {formatAmount(b.spent, currency)} / {formatAmount(b.monthlyLimit, currency)} ({percent}%)
                  {isOver && " — dépassé"}
                </p>
              </div>
            );
          })}
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
            <h3 className="font-bold mb-4">Définir un budget mensuel</h3>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-white dark:bg-zinc-900 text-sm"
            >
              <option value="">Choisir...</option>
              {availableCategories.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Limite mensuelle
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
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
                Définir
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
