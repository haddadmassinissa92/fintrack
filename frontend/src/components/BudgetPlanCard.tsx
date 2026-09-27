"use client";

import { useEffect } from "react";
import { PieChart } from "lucide-react";
import { useBudgetPlanStore } from "@/store/useBudgetPlanStore";

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${currency}`;
}

const ROWS: { key: "besoin" | "envie" | "épargne"; label: string; percent: number }[] = [
  { key: "besoin", label: "Besoins (50%)", percent: 50 },
  { key: "envie", label: "Envies (30%)", percent: 30 },
  { key: "épargne", label: "Épargne (20%)", percent: 20 },
];

export default function BudgetPlanCard({ currency }: { currency: string }) {
  const { plan, getBudgetPlan } = useBudgetPlanStore();

  useEffect(() => {
    getBudgetPlan();
  }, [getBudgetPlan]);

  if (!plan) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-1">
        <PieChart size={16} className="text-accent-600" />
        Plan budgétaire 50/30/20
      </h3>
      <p className="text-xs text-zinc-400 mb-4">
        Basé sur tes revenus de ce mois-ci ({formatAmount(plan.totalIncome, currency)})
      </p>

      {plan.totalIncome === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-4">
          Aucun revenu enregistré ce mois-ci — le plan se calculera dès que tu en ajoutes un.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {ROWS.map((row) => {
            const target = plan.targets[row.key];
            const spent = plan.spent[row.key];
            const percentUsed = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0;
            const isOver = spent > target;
            return (
              <div key={row.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{row.label}</span>
                  <span className="text-xs text-zinc-400">Cible : {formatAmount(target, currency)}</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOver ? "bg-expense-600" : "bg-accent-500"
                    }`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
                <p className={`text-xs ${isOver ? "text-expense-600 font-medium" : "text-zinc-500"}`}>
                  {formatAmount(spent, currency)} dépensé ({percentUsed}%){isOver && " — dépassé"}
                </p>
              </div>
            );
          })}

          {plan.spent.nonClassifie > 0 && (
            <p className="text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              {formatAmount(plan.spent.nonClassifie, currency)} de dépenses ce mois-ci ne sont pas
              encore classées (besoin/envie/épargne) — va dans &laquo; Gérer les catégories &raquo;
              pour les classer et affiner ce calcul.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
