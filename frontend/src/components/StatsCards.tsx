"use client";

import { TrendingUp, TrendingDown, Wallet, ArrowUp, ArrowDown } from "lucide-react";

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${currency}`;
}

// Affiche la variation par rapport au mois précédent (ex. "+12% vs mois
// dernier"), colorée en fonction de si cette variation est une bonne ou
// une mauvaise nouvelle — une hausse des dépenses est affichée en rouge,
// alors qu'une hausse des revenus ou du solde est affichée en vert.
// N'affiche rien si la comparaison n'a pas de sens (aucune donnée le mois
// dernier, cf. percentChange côté backend).
function ChangeIndicator({
  change,
  invert = false,
}: {
  change: number | null;
  invert?: boolean;
}) {
  if (change === null) {
    return <p className="text-xs text-zinc-400 mt-1">Pas de comparaison possible</p>;
  }

  const isIncrease = change >= 0;
  const isGood = invert ? !isIncrease : isIncrease;
  const rounded = Math.round(Math.abs(change));

  return (
    <p
      className={`flex items-center gap-1 text-xs mt-1 ${
        isGood ? "text-accent-600" : "text-expense-600"
      }`}
    >
      {isIncrease ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />}
      {rounded}% vs mois dernier
    </p>
  );
}

export default function StatsCards({
  totalIncome,
  totalExpense,
  balance,
  incomeChange,
  expenseChange,
  balanceChange,
  currency,
}: {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeChange: number | null;
  expenseChange: number | null;
  balanceChange: number | null;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
          <TrendingUp size={16} className="text-accent-600" />
          Revenus (ce mois)
        </div>
        <p className="text-2xl font-bold text-accent-600">{formatAmount(totalIncome, currency)}</p>
        <ChangeIndicator change={incomeChange} />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
          <TrendingDown size={16} className="text-expense-600" />
          Dépenses (ce mois)
        </div>
        <p className="text-2xl font-bold text-expense-600">{formatAmount(totalExpense, currency)}</p>
        <ChangeIndicator change={expenseChange} invert />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
          <Wallet size={16} className={balance >= 0 ? "text-accent-600" : "text-expense-600"} />
          Solde (ce mois)
        </div>
        <p className={`text-2xl font-bold ${balance >= 0 ? "text-accent-600" : "text-expense-600"}`}>
          {formatAmount(balance, currency)}
        </p>
        <ChangeIndicator change={balanceChange} />
      </div>
    </div>
  );
}
