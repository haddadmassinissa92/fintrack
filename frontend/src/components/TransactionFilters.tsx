"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

export type Filters = {
  search: string;
  type: string;
  category: string;
  minAmount?: string;
  maxAmount?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
};

export default function TransactionFilters({
  filters,
  onChange,
  categories,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categories: { expense: string[]; income: string[] };
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fusion des catégories sans doublons
  const allCategories = [...new Set([...(categories.expense || []), ...(categories.income || [])])];

  const hasActiveAdvanced = Boolean(
    filters.minAmount ||
    filters.maxAmount ||
    filters.startDate ||
    filters.endDate ||
    filters.sortBy ||
    filters.sortOrder
  );

  const handleReset = () => {
    onChange({
      search: "",
      type: "",
      category: "",
      minAmount: "",
      maxAmount: "",
      startDate: "",
      endDate: "",
      sortBy: "date",
      sortOrder: "desc",
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 mb-4 space-y-3">
      {/* Ligne principale de filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Rechercher dans les descriptions..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value, category: "" })}
          className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Tous types</option>
          <option value="revenu">Revenus</option>
          <option value="dépense">Dépenses</option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Toutes catégories</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition ${
            hasActiveAdvanced || showAdvanced
              ? "border-accent-500 text-accent-600 bg-accent-50/50 dark:bg-accent-950/20"
              : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400"
          }`}
        >
          <SlidersHorizontal size={15} />
          <span>Filtres</span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Panneau des filtres avancés */}
      {showAdvanced && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Montant Min / Max */}
          <div>
            <label className="block text-zinc-500 mb-1">Montant Min / Max</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.minAmount || ""}
                onChange={(e) => onChange({ ...filters, minAmount: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-transparent text-xs"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxAmount || ""}
                onChange={(e) => onChange({ ...filters, maxAmount: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-transparent text-xs"
              />
            </div>
          </div>

          {/* Dates Début / Fin */}
          <div>
            <label className="block text-zinc-500 mb-1">Période (Début - Fin)</label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-transparent text-xs"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-transparent text-xs"
              />
            </div>
          </div>

          {/* Tri */}
          <div>
            <label className="block text-zinc-500 mb-1">Trier par</label>
            <div className="flex gap-2">
              <select
                value={filters.sortBy || "date"}
                onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-xs"
              >
                <option value="date">Date</option>
                <option value="amount">Montant</option>
              </select>
              <select
                value={filters.sortOrder || "desc"}
                onChange={(e) => onChange({ ...filters, sortOrder: e.target.value })}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-xs"
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </div>
          </div>

          {/* Réinitialiser */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1.5 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg px-3 py-1.5 text-xs transition"
            >
              <RotateCcw size={13} />
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
