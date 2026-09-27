"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#059669", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

export default function CategoryChart({
  data,
  currency,
}: {
  data: { category: string; total: number }[];
  currency: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 h-80 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Aucune dépense ce mois-ci pour l&apos;instant.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <h3 className="font-semibold mb-4">Dépenses par catégorie</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ category, percent }: { category: string; percent?: number }) =>
              `${category} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value.toLocaleString("fr-FR")} ${currency}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
