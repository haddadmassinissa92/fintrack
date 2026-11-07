"use client";

import { useState, useEffect } from "react";
import { Target, Plus, Trash2, Pencil, X } from "lucide-react";
import { useGoalStore } from "@/store/useGoalStore";
import { useTransactionStore } from "@/store/useTransactionStore";

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
// montant visé sera atteint.
function getProjection(goal: Goal): { date: Date; behindSchedule: boolean } | null {
  const now = new Date();
  const createdAt = new Date(goal.createdAt);
  const daysElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

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
  const { goals, getGoals, createGoal, updateGoal, contribute, deleteGoal } = useGoalStore();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [syncTransaction, setSyncTransaction] = useState(false);

  useEffect(() => {
    getGoals();
  }, [getGoals]);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setName("");
    setTargetAmount("");
    setTargetDate("");
    setError("");
    setShowForm(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : "");
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !targetAmount || Number(targetAmount) <= 0) {
      setError("Un nom et un montant visé valide sont requis.");
      return;
    }

    let result;
    if (editingGoal) {
      result = await updateGoal(editingGoal._id, {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        targetDate: targetDate || null,
      });
    } else {
      result = await createGoal({
        name: name.trim(),
        targetAmount: Number(targetAmount),
        targetDate: targetDate || null,
      });
    }

    if (result.success) {
      setName("");
      setTargetAmount("");
      setTargetDate("");
      setEditingGoal(null);
      setShowForm(false);
    } else {
      setError(result.message);
    }
  };

  const handleContribute = async (goal: Goal) => {
    const num = Number(contributionAmount);
    if (!contributionAmount || num === 0) return;
    await contribute(goal._id, num);

    if (syncTransaction && num > 0) {
      await useTransactionStore.getState().addTransaction({
        title: `Épargne : ${goal.name}`,
        amount: num,
        type: "dépense",
        category: "Épargne",
        date: new Date().toISOString(),
      });
    }

    setContributingId(null);
    setContributionAmount("");
    setSyncTransaction(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Target size={16} className="text-accent-600" />
          Objectifs d&apos;épargne
        </h3>
        <button
          onClick={handleOpenAdd}
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      aria-label="Modifier l'objectif"
                      className="text-zinc-400 hover:text-accent-600 transition"
                    >
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => deleteGoal(goal._id)}
                      aria-label="Supprimer l'objectif"
                      className="text-zinc-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isReached ? "bg-accent-500" : "bg-accent-600"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {formatAmount(goal.currentAmount, currency)} / {formatAmount(goal.targetAmount, currency)} ({percent}%)
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
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        autoFocus
                        placeholder="Montant (+ ou -)"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 bg-transparent text-sm"
                      />
                      <button
                        onClick={() => handleContribute(goal)}
                        className="text-xs bg-accent-600 text-white rounded-lg px-3 py-1 font-medium hover:bg-accent-700 transition"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => {
                          setContributingId(null);
                          setSyncTransaction(false);
                        }}
                        aria-label="Annuler"
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                    {Number(contributionAmount) > 0 && (
                      <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncTransaction}
                          onChange={(e) => setSyncTransaction(e.target.checked)}
                          className="rounded text-accent-600 focus:ring-accent-500"
                        />
                        <span>Déduire de mon solde (créer une dépense Épargne)</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setContributingId(goal._id);
                      setSyncTransaction(false);
                    }}
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
          onClick={() => {
            setShowForm(false);
            setEditingGoal(null);
          }}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm"
          >
            <h3 className="font-bold mb-4">
              {editingGoal ? "Modifier l'objectif" : "Nouvel objectif d'épargne"}
            </h3>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Nom de l&apos;objectif</label>
            <input
              type="text"
              placeholder="Ex. Ordinateur, vacances..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Montant visé ({currency})
            </label>
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
                onClick={() => {
                  setShowForm(false);
                  setEditingGoal(null);
                }}
                className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2 text-sm font-medium"
              >
                {editingGoal ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
