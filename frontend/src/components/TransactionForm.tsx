"use client";

import { useState, useEffect } from "react";
import { Camera, X } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";
import CategoryManager from "./CategoryManager";

// Redimensionne et compresse une image côté navigateur avant envoi, pour
// qu'une photo de téléphone (souvent plusieurs Mo) devienne une data URI
// de quelques centaines de Ko — largement sous la limite du backend, et
// beaucoup plus rapide à envoyer.
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

export default function TransactionForm({ onClose }: { onClose: () => void }) {
  const { categories, getCategories, addTransaction } = useTransactionStore();
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [type, setType] = useState<"dépense" | "revenu">("dépense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de resélectionner le même fichier ensuite
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

  useEffect(() => {
    getCategories();
  }, [getCategories]);

  const availableCategories = type === "dépense" ? categories.expense : categories.income;

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
    const result = await addTransaction({
      type,
      amount: Number(amount),
      category,
      description,
      date,
      receiptImage,
    });
    setIsSaving(false);

    if (result.success) {
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
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm"
      >
        <h3 className="font-bold mb-4">Ajouter une transaction</h3>

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
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
        />

        <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Catégorie</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-1 bg-white dark:bg-zinc-900 text-sm"
        >
          <option value="">Choisir...</option>
          {availableCategories.map((c: string) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCategoryManager(true)}
          className="text-xs text-accent-600 mb-4 block"
        >
          Gérer les catégories
        </button>

        <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Description (optionnel)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
        />

        <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6 bg-transparent text-sm"
        />

        <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
          Reçu (optionnel)
        </label>
        {receiptImage ? (
          <div className="relative inline-block mb-6">
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
          <label className="flex items-center gap-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6 text-sm text-zinc-500 cursor-pointer hover:border-accent-500 transition w-fit">
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
            className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg py-2 text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      </form>
      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}
    </div>
  );
}
