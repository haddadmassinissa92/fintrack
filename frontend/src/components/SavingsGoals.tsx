"use client";

import { useState, useEffect } from "react";
import { Target, Plus, Trash2, X } from "lucide-react";
import { useGoalStore } from "@/store/useGoalStore";

type Goal = {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  createdAt: string;
};

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${currency}`;
}

// Projection simple : extrapole le rythme moyen depuis la création de
// l'objectif (montant actuel ÷ temps écoulé) pour estimer quand le
// montant visé sera atteint. Pas d'historique détaillé des
// contributions à disposition, donc c'est une moyenne globale, pas une
// tendance récente — suffisant pour une estimation indicative.
function getProjection(goal: Goal): { date: Date; behindSchedule: boolean } | null {
  const now = new Date();
  const createdAt = new Date(goal.createdAt);
  const daysElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Pas assez de recul pour extrapoler un rythme fiable, ou rien n'a
  // encore été mis de côté
  if (daysElapsed < 3 || goal.currentAmount <= 0) return null;
  if (goal.currentAmount >= goal.targetAmount) return null;

  const pacePerDay = goal.currentAmount / daysElapsed;
  if (pacePerDay <= 0) return null;

  const remaining = goal.targetAmount - goal.currentAmount;
  const daysToGo = remaining / pacePerDay;
  const projectedDate = new Date(now.getTime() + daysToGo * 24 * 60 * 60 * 1000);

  const behindSchedule = goal.targetDate ? projectedDate > new Date(goal.targetDate) : false;

  return { date: projectedDate, behindSchedule };
}

export default function SavingsGoals({ currency }: { currency: string }) {
  const { goals, getGoals, createGoal, contribute, deleteGoal } = useGoalStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");

  useEffect(() => {
    getGoals();
  }, [getGoals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !targetAmount || Number(targetAmount) <= 0) {
      setError("Un nom et un montant visé valide sont requis.");
      return;
    }
    const result = await createGoal({
      name: name.trim(),
      targetAmount: Number(targetAmount),
      targetDate: targetDate || null,
    });
    if (result.success) {
      setName("");
      setTargetAmount("");
      setTargetDate("");
      setShowForm(false);
    } else {
      setError(result.message);
    }
  };

  const handleContribute = async (id: string) => {
    if (!contributionAmount || Number(contributionAmount) === 0) return;
    await contribute(id, Number(contributionAmount));
    setContributingId(null);
    setContributionAmount("");
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Target size={16} className="text-accent-600" />
          Objectifs d&apos;épargne
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-accent-600 border border-accent-600 rounded-full px-2.5 py-1 hover:bg-accent-50 dark:hover:bg-accent-950 transition"
        >
          <Plus size={13} strokeWidth={2.5} />
          Nouvel objectif
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-6">
          Aucun objectif pour le moment. Crée le premier pour commencer à suivre une épargne précise.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.map((goal: Goal) => {
            const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const isReached = goal.currentAmount >= goal.targetAmount;
            const projection = isReached ? null : getProjection(goal);
            return (
              <div key={goal._id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{goal.name}</span>
                  <button
                    onClick={() => deleteGoal(goal._id)}
                    aria-label="Supprimer l'objectif"
                    className="text-zinc-300 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isReached ? "bg-accent-600" : "bg-accent-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {formatAmount(goal.currentAmount, currency)} / {formatAmount(goal.targetAmount, currency)} (
                    {percent}%)
                  </span>
                  {goal.targetDate && (
                    <span>Visé pour le {new Date(goal.targetDate).toLocaleDateString("fr-FR")}</span>
                  )}
                </div>

                {projection && (
                  <p
                    className={`text-xs mt-0.5 ${
                      projection.behindSchedule
                        ? "text-amber-600 dark:text-amber-500"
                        : "text-zinc-400"
                    }`}
                  >
                    {projection.behindSchedule
                      ? `À ce rythme, tu l'atteindras le ${projection.date.toLocaleDateString("fr-FR")} — après ton échéance`
                      : `À ce rythme, tu l'atteindras le ${projection.date.toLocaleDateString("fr-FR")}`}
                  </p>
                )}

                {contributingId === goal._id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      autoFocus
                      placeholder="Montant (+ ou -)"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 bg-transparent text-sm"
                    />
                    <button
                      onClick={() => handleContribute(goal._id)}
                      className="text-xs bg-accent-600 text-white rounded-lg px-3 py-1"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setContributingId(null)}
                      aria-label="Annuler"
                      className="text-zinc-400"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setContributingId(goal._id)}
                    className="text-xs text-accent-600 mt-1"
                  >
                    + Ajouter une contribution
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm"
          >
            <h3 className="font-bold mb-4">Nouvel objectif d&apos;épargne</h3>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Nom de l&apos;objectif</label>
            <input
              type="text"
              placeholder="Ex. Laptop, vacances..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Montant visé</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Date visée (optionnel)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6 bg-transparent text-sm"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2 text-sm font-medium"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
