"use client";

import { useState } from "react";
import { Trash2, ArrowUpRight, ArrowDownRight, Paperclip, X } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { CategoryIcon } from "./categoryIcons";

type Transaction = {
  _id: string;
  type: "revenu" | "dépense";
  amount: number;
  category: string;
  description: string;
  date: string;
  receiptImage?: string | null;
};

type CategoryDoc = {
  name: string;
  type: "revenu" | "dépense";
  icon?: string;
  color?: string;
};

export default function TransactionList({
  transactions,
  currency,
  categories = [],
}: {
  transactions: Transaction[];
  currency: string;
  categories?: CategoryDoc[];
}) {
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

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
      {transactions.map((t) => {
        // Une transaction ne stocke que le NOM de sa catégorie : on
        // retrouve ici l'icône/couleur correspondantes. Si la catégorie a
        // été supprimée depuis, on retombe sur la flèche d'avant.
        const categoryDoc = categories.find((c) => c.name === t.category && c.type === t.type);
        return (
        <div key={t._id} className="flex items-center gap-3 p-4">
          {categoryDoc ? (
            <CategoryIcon icon={categoryDoc.icon} color={categoryDoc.color} size={16} />
          ) : (
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
          )}

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

          {t.receiptImage && (
            <button
              onClick={() => setViewingReceipt(t.receiptImage!)}
              aria-label="Voir le reçu"
              className="text-zinc-300 hover:text-accent-600 transition shrink-0"
            >
              <Paperclip size={16} strokeWidth={2} />
            </button>
          )}

          <button
            onClick={() => deleteTransaction(t._id)}
            aria-label="Supprimer"
            className="text-zinc-300 hover:text-red-600 transition shrink-0"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
        );
      })}

      {viewingReceipt && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingReceipt(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingReceipt(null)}
              aria-label="Fermer"
              className="absolute -top-3 -right-3 bg-zinc-900 text-white rounded-full p-1.5"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingReceipt}
              alt="Reçu"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
