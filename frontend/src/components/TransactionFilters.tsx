"use client";

import { Search } from "lucide-react";

type Filters = {
  search: string;
  type: string;
  category: string;
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
  // Les listes dépenses/revenus contiennent chacune une catégorie "Autre" —
  // une fois fusionnées pour ce menu unique, on retire les doublons (sinon
  // deux options identiques se retrouvent avec la même clé React)
  const allCategories = [...new Set([...categories.expense, ...categories.income])];

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-3">
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
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2 bg-transparent text-sm"
        />
      </div>

      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value, category: "" })}
        className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm"
      >
        <option value="">Tous types</option>
        <option value="revenu">Revenus</option>
        <option value="dépense">Dépenses</option>
      </select>

      <select
        value={filters.category}
        onChange={(e) => onChange({ ...filters, category: e.target.value })}
        className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm"
      >
        <option value="">Toutes catégories</option>
        {allCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
