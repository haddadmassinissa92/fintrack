"use client";

import { useState } from "react";
import { Trash2, Pencil, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Paperclip, X } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { CategoryIcon } from "./categoryIcons";

export type Transaction = {
  _id: string;
  type: "revenu" | "dépense" | "transfert";
  amount: number;
  category: string;
  description: string;
  date: string;
  wallet?: { _id: string; name: string; color: string; icon: string } | null;
  toWallet?: { _id: string; name: string; color: string; icon: string } | null;
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
  onEdit,
}: {
  transactions: Transaction[];
  currency: string;
  categories?: CategoryDoc[];
  onEdit?: (transaction: Transaction) => void;
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
          <div key={t._id} className="flex items-center gap-3 p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
            {t.type === "transfert" ? (
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <ArrowRightLeft size={16} strokeWidth={2} />
              </div>
            ) : categoryDoc ? (
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {t.type === "transfert"
                    ? t.description || `Virement de ${t.wallet?.name || "Compte"} vers ${t.toWallet?.name || "Compte"}`
                    : t.description || t.category}
                </p>
                {t.wallet && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md font-medium border"
                    style={{
                      borderColor: `${t.wallet.color || "#10b981"}40`,
                      color: t.wallet.color || "#10b981",
                      backgroundColor: `${t.wallet.color || "#10b981"}15`,
                    }}
                  >
                    {t.wallet.name}
                    {t.toWallet && ` → ${t.toWallet.name}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                {t.category} · {new Date(t.date).toLocaleDateString("fr-FR")}
              </p>
            </div>

            <p
              className={`text-sm font-semibold shrink-0 ${
                t.type === "transfert"
                  ? "text-blue-600 dark:text-blue-400"
                  : t.type === "revenu"
                  ? "text-accent-600"
                  : "text-expense-600"
              }`}
            >
              {t.type === "transfert" ? "⇄ " : t.type === "revenu" ? "+" : "-"}
              {t.amount.toLocaleString("fr-FR")} {currency}
            </p>

            {t.receiptImage && (
              <button
                onClick={() => setViewingReceipt(t.receiptImage!)}
                aria-label="Voir le reçu"
                className="text-zinc-400 hover:text-accent-600 transition shrink-0 p-1 rounded"
              >
                <Paperclip size={16} strokeWidth={2} />
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(t)}
                aria-label="Modifier"
                className="text-zinc-400 hover:text-accent-600 transition shrink-0 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Pencil size={15} strokeWidth={2} />
              </button>
            )}

            <button
              onClick={() => deleteTransaction(t._id)}
              aria-label="Supprimer"
              className="text-zinc-400 hover:text-red-600 transition shrink-0 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Trash2 size={15} strokeWidth={2} />
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
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
