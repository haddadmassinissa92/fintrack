"use client";

import { Undo2 } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";

// Le store est un fichier .js sans annotations : TypeScript infère
// pendingDeletes comme un objet vide ({}) à partir de son état initial,
// sans connaître la forme qu'il prend une fois rempli. On décrit donc
// cette forme ici, côté composant, plutôt que de laisser TS deviner.
type PendingDelete = {
  transaction: { description?: string; category: string };
  timeoutId: ReturnType<typeof setTimeout>;
};

// Affiche un petit toast par suppression en attente d'annulation (voir
// deleteTransaction/undoDelete dans useTransactionStore). Rendu une seule
// fois dans le dashboard, en position fixe — invisible tant qu'aucune
// suppression n'est en attente.
export default function UndoToasts() {
  const pendingDeletes = useTransactionStore((state) => state.pendingDeletes) as Record<
    string,
    PendingDelete
  >;
  const undoDelete = useTransactionStore((state) => state.undoDelete);

  const entries = Object.entries(pendingDeletes);
  if (entries.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90vw] max-w-sm">
      {entries.map(([id, { transaction }]) => (
        <div
          key={id}
          className="flex items-center justify-between gap-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl px-4 py-3 shadow-lg text-sm"
        >
          <span className="truncate">
            « {transaction.description || transaction.category} » supprimée
          </span>
          <button
            onClick={() => undoDelete(id)}
            className="flex items-center gap-1 font-medium text-accent-400 dark:text-accent-600 hover:underline shrink-0"
          >
            <Undo2 size={14} strokeWidth={2.5} />
            Annuler
          </button>
        </div>
      ))}
    </div>
  );
}
