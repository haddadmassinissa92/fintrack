"use client";

import { Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";

type Transaction = {
  _id: string;
  type: "revenu" | "dépense";
  amount: number;
  category: string;
  description: string;
  date: string;
};

export default function TransactionList({
  transactions,
  currency,
}: {
  transactions: Transaction[];
  currency: string;
}) {
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction);

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
        <p className="text-sm text-zinc-400">
          Aucune transaction pour le moment. Ajoutez la première avec le bouton ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
      {transactions.map((t) => (
        <div key={t._id} className="flex items-center gap-3 p-4">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              t.type === "revenu"
                ? "bg-accent-50 dark:bg-accent-950 text-accent-600"
                : "bg-red-50 dark:bg-red-950/40 text-expense-600"
            }`}
          >
            {t.type === "revenu" ? (
              <ArrowUpRight size={16} strokeWidth={2} />
            ) : (
              <ArrowDownRight size={16} strokeWidth={2} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {t.description || t.category}
            </p>
            <p className="text-xs text-zinc-400">
              {t.category} · {new Date(t.date).toLocaleDateString("fr-FR")}
            </p>
          </div>

          <p
            className={`text-sm font-semibold shrink-0 ${
              t.type === "revenu" ? "text-accent-600" : "text-expense-600"
            }`}
          >
            {t.type === "revenu" ? "+" : "-"}
            {t.amount.toLocaleString("fr-FR")} {currency}
          </p>

          <button
            onClick={() => deleteTransaction(t._id)}
            aria-label="Supprimer"
            className="text-zinc-300 hover:text-red-600 transition shrink-0"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
