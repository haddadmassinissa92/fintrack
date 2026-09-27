"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function BalanceChart({
  data,
  currency,
}: {
  data: { label: string; balance: number }[];
  currency: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <h3 className="font-semibold mb-4">Évolution du solde</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip formatter={(value: number) => `${value.toLocaleString("fr-FR")} ${currency}`} />
          <Line
            type="monotone"
            dataKey="balance"
            name="Solde"
            stroke="#059669"
            strokeWidth={2.5}
            dot={{ fill: "#059669", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
