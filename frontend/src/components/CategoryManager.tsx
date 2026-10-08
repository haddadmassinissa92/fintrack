"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";
import {
  CategoryIcon,
  CATEGORY_ICON_MAP,
  CATEGORY_ICON_NAMES,
  CATEGORY_COLORS,
  DEFAULT_ICON,
  DEFAULT_COLOR,
} from "./categoryIcons";

type CategoryDoc = {
  _id: string;
  name: string;
  type: "revenu" | "dépense";
  budgetType?: "besoin" | "envie" | "épargne" | null;
  icon?: string;
  color?: string;
};

// Sélecteur d'icône + couleur, partagé entre la modification d'une
// catégorie existante et la création d'une nouvelle
function StylePicker({
  icon,
  color,
  onChange,
}: {
  icon: string;
  color: string;
  onChange: (style: { icon: string; color: string }) => void;
}) {
  return (
    <div className="px-3 pb-3 pt-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg mb-1">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ icon, color: c })}
            aria-label={`Couleur ${c}`}
            className={`w-6 h-6 rounded-full transition ${
              color === c ? "ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {CATEGORY_ICON_NAMES.map((name) => {
          const Icon = CATEGORY_ICON_MAP[name];
          const selected = icon === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange({ icon: name, color })}
              aria-label={name}
              className={`p-1.5 rounded-lg flex items-center justify-center transition ${
                selected ? "" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              style={selected ? { backgroundColor: `${color}26`, color } : undefined}
            >
              <Icon size={16} strokeWidth={2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CategoryManager({ onClose }: { onClose: () => void }) {
  const {
    categories,
    createCategory,
    renameCategory,
    deleteCategory,
    setCategoryBudgetType,
    setCategoryStyle,
  } = useTransactionStore();
  const [type, setType] = useState<"dépense" | "revenu">("dépense");
  const [newName, setNewName] = useState("");
  const [newStyle, setNewStyle] = useState({ icon: DEFAULT_ICON, color: DEFAULT_COLOR });
  const [showNewPicker, setShowNewPicker] = useState(false);
  const [stylingId, setStylingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  const list = (categories.all || []).filter((c: CategoryDoc) => c.type === type);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newName.trim()) return;
    const result = await createCategory(newName.trim(), type, newStyle.icon, newStyle.color);
    if (result.success) {
      setNewName("");
      setNewStyle({ icon: DEFAULT_ICON, color: DEFAULT_COLOR });
      setShowNewPicker(false);
    } else {
      setError(result.message);
    }
  };

  const startEditing = (cat: CategoryDoc) => {
    setEditingId(cat._id);
    setEditingName(cat.name);
  };

  const confirmEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    const result = await renameCategory(editingId, editingName.trim());
    if (result.success) {
      setEditingId(null);
    } else {
      setError(result.message);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold mb-4">Gérer les catégories</h3>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType("dépense")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              type === "dépense"
                ? "bg-expense-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            Dépenses
          </button>
          <button
            type="button"
            onClick={() => setType("revenu")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              type === "revenu"
                ? "bg-accent-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            Revenus
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <div className="custom-scrollbar max-h-64 overflow-y-auto flex flex-col gap-1 mb-4">
          {list.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-4">Aucune catégorie pour l&apos;instant.</p>
          )}
          {list.map((cat: CategoryDoc) => (
            <div key={cat._id}>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <button
                type="button"
                onClick={() => setStylingId(stylingId === cat._id ? null : cat._id)}
                aria-label="Changer l'icône et la couleur"
                className="shrink-0"
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size={12} />
              </button>
              {editingId === cat._id ? (
                <>
                  <input
                    type="text"
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 bg-transparent text-sm"
                  />
                  <button onClick={confirmEdit} aria-label="Confirmer" className="text-accent-600">
                    <Check size={16} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    aria-label="Annuler"
                    className="text-zinc-400"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{cat.name}</span>
                  {type === "dépense" && (
                    <select
                      value={cat.budgetType || ""}
                      onChange={(e) =>
                        setCategoryBudgetType(cat._id, e.target.value || null)
                      }
                      className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 px-1 py-0.5"
                    >
                      <option value="">Non classé</option>
                      <option value="besoin">Besoin</option>
                      <option value="envie">Envie</option>
                      <option value="épargne">Épargne</option>
                    </select>
                  )}
                  <button
                    onClick={() => startEditing(cat)}
                    aria-label="Renommer"
                    className="text-zinc-400 hover:text-accent-600"
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    aria-label="Supprimer"
                    className="text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
            {stylingId === cat._id && (
              <StylePicker
                icon={cat.icon || DEFAULT_ICON}
                color={cat.color || DEFAULT_COLOR}
                onChange={(style) => setCategoryStyle(cat._id, style)}
              />
            )}
            </div>
          ))}
        </div>

        {showNewPicker && (
          <StylePicker
            icon={newStyle.icon}
            color={newStyle.color}
            onChange={setNewStyle}
          />
        )}

        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setShowNewPicker((v) => !v)}
            aria-label="Choisir l'icône et la couleur"
            className="shrink-0 self-center"
          >
            <CategoryIcon icon={newStyle.icon} color={newStyle.color} size={14} />
          </button>
          <input
            type="text"
            placeholder="Nouvelle catégorie..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-transparent text-sm"
          />
          <button
            type="submit"
            aria-label="Ajouter"
            className="bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-3 transition"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </form>

        <button
          onClick={onClose}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg py-2 text-sm"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
