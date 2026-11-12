"use client";

import { useState, useEffect } from "react";
import { Camera, X, Sparkles } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useWalletStore } from "@/store/useWalletStore";
import CategoryManager from "./CategoryManager";
import type { WalletItem } from "./WalletBar";
import { predictCategory, type PredictionResult } from "@/lib/categorizer";

export type TransactionData = {
  _id: string;
  type: "dépense" | "revenu" | "transfert";
  amount: number;
  category: string;
  description: string;
  date: string;
  wallet?: any;
  toWallet?: any;
  receiptImage?: string | null;
};

// Redimensionne et compresse une image côté navigateur avant envoi
function compressImage(file: File, maxWidth = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas non supporté par ce navigateur."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Image invalide."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Lecture du fichier échouée."));
    reader.readAsDataURL(file);
  });
}

export default function TransactionForm({
  onClose,
  initialType = "dépense",
  transactionToEdit = null,
}: {
  onClose: () => void;
  initialType?: "dépense" | "revenu";
  transactionToEdit?: TransactionData | null;
}) {
  const { categories, getCategories, addTransaction, updateTransaction, transactions } = useTransactionStore();
  const { wallets, activeWalletId } = useWalletStore();
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [selectedWalletId, setSelectedWalletId] = useState<string>(() => {
    if (transactionToEdit?.wallet) {
      return typeof transactionToEdit.wallet === "object" ? transactionToEdit.wallet._id : transactionToEdit.wallet;
    }
    return activeWalletId || (wallets[0]?._id ?? "");
  });

  const [type, setType] = useState<"dépense" | "revenu">(
    transactionToEdit && transactionToEdit.type !== "transfert"
      ? transactionToEdit.type
      : initialType,
  );
  const [amount, setAmount] = useState(
    transactionToEdit ? String(transactionToEdit.amount) : "",
  );
  const [category, setCategory] = useState(
    transactionToEdit ? transactionToEdit.category : "",
  );
  const [description, setDescription] = useState(
    transactionToEdit ? transactionToEdit.description || "" : "",
  );
  const [date, setDate] = useState(() =>
    transactionToEdit
      ? new Date(transactionToEdit.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(
    transactionToEdit ? transactionToEdit.receiptImage || null : null,
  );
  const [isCompressing, setIsCompressing] = useState(false);

  // IA : Prédiction et auto-catégorisation
  const [isCategoryManuallySet, setIsCategoryManuallySet] = useState(Boolean(transactionToEdit));
  const [aiSuggestion, setAiSuggestion] = useState<PredictionResult | null>(null);

  const availableCategories = type === "dépense" ? categories.expense : categories.income;

  useEffect(() => {
    getCategories();
  }, [getCategories]);

  // Analyse intelligente de la description en temps réel
  const handleDescriptionChange = (text: string) => {
    setDescription(text);

    if (isCategoryManuallySet && category) return;

    const allCatNames = [...(categories.expense || []), ...(categories.income || [])];
    const prediction = predictCategory(text, allCatNames, transactions);

    if (prediction) {
      setAiSuggestion(prediction);
      if (prediction.suggestedType && prediction.suggestedType !== type) {
        setType(prediction.suggestedType);
      }
      setCategory(prediction.category);
    } else {
      setAiSuggestion(null);
    }
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Le reçu doit être une image.");
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setReceiptImage(compressed);
      setError("");
    } catch {
      setError("Impossible de traiter cette image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Entrez un montant valide.");
      return;
    }
    if (!category) {
      setError("Choisissez une catégorie.");
      return;
    }

    setIsSaving(true);
    let result;
    if (transactionToEdit) {
      result = await updateTransaction(transactionToEdit._id, {
        type,
        amount: Number(amount),
        category,
        description,
        wallet: selectedWalletId || null,
        date,
        receiptImage,
      });
    } else {
      result = await addTransaction({
        type,
        amount: Number(amount),
        category,
        description,
        wallet: selectedWalletId || null,
        date,
        receiptImage,
      });
    }
    setIsSaving(false);

    if (result.success) {
      useWalletStore.getState().getWallets();
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-bold mb-4 text-base">
          {transactionToEdit ? "Modifier la transaction" : "Ajouter une transaction"}
        </h3>

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
              if (!transactionToEdit || transactionToEdit.type !== "dépense") {
                setCategory("");
                setIsCategoryManuallySet(false);
              }
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
              if (!transactionToEdit || transactionToEdit.type !== "revenu") {
                setCategory("");
                setIsCategoryManuallySet(false);
              }
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

        {/* Description / Libellé avec Auto-catégorisation IA */}
        <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
          Libellé / Titre
        </label>
        <input
          type="text"
          placeholder="Ex: Courses Carrefour, Uber, Netflix..."
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
        />

        {/* Suggestion IA affichée */}
        {aiSuggestion && (
          <div className="flex items-center gap-1.5 text-xs text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/30 px-2.5 py-1.5 rounded-lg mb-3">
            <Sparkles size={13} className="shrink-0" />
            <span>
              Catégorie auto-détectée : <strong>{aiSuggestion.category}</strong> ({aiSuggestion.reason})
            </span>
          </div>
        )}

        {/* Montant */}
        <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Montant</label>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
        />

        {/* Catégorie */}
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">Catégorie</label>
          <button
            type="button"
            onClick={() => setShowCategoryManager(true)}
            className="text-xs text-accent-600 hover:underline"
          >
            Gérer
          </button>
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setIsCategoryManuallySet(true);
            setAiSuggestion(null);
          }}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Choisir une catégorie...</option>
          {availableCategories.map((c: string) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Compte / Portefeuille */}
        {wallets.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Compte / Portefeuille
            </label>
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
            >
              {wallets.map((w: WalletItem) => (
                <option key={w._id} value={w._id}>
                  {w.name} {w.isDefault ? "(Principal)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date */}
        <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
        />

        {/* Photo du reçu */}
        <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
          Reçu (optionnel)
        </label>
        {receiptImage ? (
          <div className="relative inline-block mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptImage}
              alt="Aperçu du reçu"
              className="h-20 w-20 object-cover rounded-lg border border-zinc-300 dark:border-zinc-700"
            />
            <button
              type="button"
              onClick={() => setReceiptImage(null)}
              aria-label="Retirer le reçu"
              className="absolute -top-2 -right-2 bg-zinc-900 text-white rounded-full p-1"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-5 text-sm text-zinc-500 cursor-pointer hover:border-accent-500 transition w-fit">
            <Camera size={15} strokeWidth={2} />
            {isCompressing ? "Traitement..." : "Ajouter une photo"}
            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptChange}
              disabled={isCompressing}
              className="hidden"
            />
          </label>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition"
          >
            {isSaving
              ? transactionToEdit
                ? "Modification..."
                : "Ajout..."
              : transactionToEdit
              ? "Enregistrer"
              : "Ajouter"}
          </button>
        </div>
      </form>
      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}
    </div>
  );
}
