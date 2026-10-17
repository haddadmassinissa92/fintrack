"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useDebtStore } from "@/store/useDebtStore";
import {
  type Debt,
  remainingOf,
  isSettled,
  progressPercent,
  calendarDate,
  daysUntil,
  summarize,
  sortActive,
} from "@/lib/debtUtils";

// Jusqu'à 2 décimales : après une conversion de devise, un reste peut valoir
// 6,5 EUR, et l'arrondir à l'unité ("7 EUR") afficherait un montant faux
function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currency}`;
}

function dueInfo(debt: Debt): { text: string; urgent: boolean } | null {
  if (!debt.dueDate) return null;
  const days = daysUntil(debt.dueDate, new Date());
  const date = calendarDate(debt.dueDate).toLocaleDateString("fr-FR");
  if (days < 0) {
    return { text: `Échue depuis ${-days} jour${-days > 1 ? "s" : ""} (${date})`, urgent: true };
  }
  if (days === 0) return { text: "À régler aujourd'hui", urgent: true };
  if (days === 1) return { text: "À régler demain", urgent: true };
  return { text: `Échéance : ${date}`, urgent: false };
}

export default function Debts({ currency }: { currency: string }) {
  // Le store est un fichier .js non typé : sans cette précision, TypeScript
  // infère un tableau de `never` et refuse tout accès aux champs
  const debts = useDebtStore((state) => state.debts) as Debt[];
  const { getDebts, createDebt, addPayment, deletePayment, deleteDebt } = useDebtStore();

  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<"owed_to_me" | "i_owe">("owed_to_me");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSettled, setShowSettled] = useState(false);

  useEffect(() => {
    getDebts();
  }, [getDebts]);

  const active = sortActive(debts);
  const settled = debts.filter((d) => isSettled(d));
  const totals = summarize(debts);

  const resetForm = () => {
    setDirection("owed_to_me");
    setPerson("");
    setAmount("");
    setDueDate("");
    setNote("");
    setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    if (!person.trim()) {
      setFormError("Indique le nom de la personne.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setFormError("Le montant doit être positif.");
      return;
    }

    setIsSubmitting(true);
    const result = await createDebt({
      person: person.trim(),
      direction,
      amount: Number(amount),
      dueDate: dueDate || null,
      note: note.trim(),
    });
    setIsSubmitting(false);

    if (result.success) {
      resetForm();
      setShowForm(false);
    } else {
      setFormError(result.message);
    }
  };

  const openPayment = (id: string) => {
    setPayingId(id);
    setPaymentAmount("");
    setPaymentError("");
  };

  const handlePayment = async (debt: Debt) => {
    if (isPaying) return; // évite l'envoi en double en cas de double clic
    const value = Number(paymentAmount);
    const remaining = remainingOf(debt);

    if (!paymentAmount || value <= 0) {
      setPaymentError("Saisis un montant positif.");
      return;
    }
    if (value > remaining) {
      setPaymentError(`Il ne reste que ${formatAmount(remaining, currency)} à régler.`);
      return;
    }

    setIsPaying(true);
    setPaymentError("");
    const result = await addPayment(debt._id, value);
    setIsPaying(false);

    if (result.success) {
      setPayingId(null);
      setPaymentAmount("");
    } else {
      setPaymentError(result.message);
    }
  };

  const handleDelete = (debt: Debt) => {
    // La suppression emporte aussi l'historique des remboursements : on
    // demande confirmation, contrairement à un simple objectif d'épargne
    if (window.confirm(`Supprimer la dette de « ${debt.person} » et son historique ?`)) {
      deleteDebt(debt._id);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ArrowLeftRight size={16} className="text-accent-600" />
          Dettes
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-accent-600 border border-accent-600 rounded-full px-2.5 py-1 hover:bg-accent-50 dark:hover:bg-accent-950 transition"
        >
          <Plus size={13} strokeWidth={2.5} />
          Nouvelle dette
        </button>
      </div>

      {debts.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-6">
          Aucune dette enregistrée. Note ici l&apos;argent que tu as prêté ou emprunté à un proche.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3">
              <p className="text-xs text-zinc-500 mb-0.5">On te doit</p>
              <p className="text-sm font-semibold text-accent-600">
                {formatAmount(totals.owedToMe, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3">
              <p className="text-xs text-zinc-500 mb-0.5">Tu dois</p>
              <p className="text-sm font-semibold text-expense-600">
                {formatAmount(totals.iOwe, currency)}
              </p>
            </div>
          </div>

          {active.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-2">Toutes tes dettes sont soldées. 🎉</p>
          ) : (
            <div className="flex flex-col gap-5">
              {active.map((debt) => {
                const owedToMe = debt.direction === "owed_to_me";
                const remaining = remainingOf(debt);
                const due = dueInfo(debt);
                const expanded = expandedId === debt._id;

                return (
                  <div key={debt._id}>
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          owedToMe
                            ? "bg-accent-50 dark:bg-accent-950 text-accent-600"
                            : "bg-red-50 dark:bg-red-950/40 text-expense-600"
                        }`}
                      >
                        {owedToMe ? (
                          <ArrowDownLeft size={16} strokeWidth={2} />
                        ) : (
                          <ArrowUpRight size={16} strokeWidth={2} />
                        )}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {owedToMe ? `${debt.person} te doit` : `Tu dois à ${debt.person}`}
                            </p>
                            {debt.note && (
                              <p className="text-xs text-zinc-400 truncate">{debt.note}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p
                              className={`text-sm font-semibold ${
                                owedToMe ? "text-accent-600" : "text-expense-600"
                              }`}
                            >
                              {formatAmount(remaining, currency)}
                            </p>
                            <button
                              onClick={() => handleDelete(debt)}
                              aria-label="Supprimer la dette"
                              className="text-zinc-300 hover:text-red-600 transition"
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden my-1.5">
                          <div
                            className={`h-full rounded-full transition-all ${
                              owedToMe ? "bg-accent-500" : "bg-expense-600"
                            }`}
                            style={{ width: `${progressPercent(debt)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-500 gap-2">
                          <span>
                            {formatAmount(debt.paidAmount, currency)} remboursés sur{" "}
                            {formatAmount(debt.amount, currency)} ({progressPercent(debt)}%)
                          </span>
                        </div>

                        {due && (
                          <p
                            className={`text-xs mt-0.5 ${
                              due.urgent
                                ? "text-amber-600 dark:text-amber-500 font-medium"
                                : "text-zinc-400"
                            }`}
                          >
                            {due.text}
                          </p>
                        )}

                        {payingId === debt._id ? (
                          <div className="mt-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                autoFocus
                                placeholder="Montant"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="flex-1 min-w-0 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 bg-transparent text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setPaymentAmount(String(remaining))}
                                className="text-xs text-accent-600 whitespace-nowrap"
                              >
                                Tout
                              </button>
                              <button
                                onClick={() => handlePayment(debt)}
                                disabled={isPaying}
                                className="text-xs bg-accent-600 text-white rounded-lg px-3 py-1 disabled:opacity-50"
                              >
                                OK
                              </button>
                              <button
                                onClick={() => setPayingId(null)}
                                aria-label="Annuler"
                                className="text-zinc-400"
                              >
                                <X size={14} strokeWidth={2} />
                              </button>
                            </div>
                            {paymentError && (
                              <p className="text-xs text-red-600 mt-1">{paymentError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 mt-1">
                            <button
                              onClick={() => openPayment(debt._id)}
                              className="text-xs text-accent-600"
                            >
                              {owedToMe ? "+ Remboursement reçu" : "+ Remboursement effectué"}
                            </button>
                            {debt.payments.length > 0 && (
                              <button
                                onClick={() => setExpandedId(expanded ? null : debt._id)}
                                className="flex items-center gap-0.5 text-xs text-zinc-400 hover:text-zinc-600"
                              >
                                Historique ({debt.payments.length})
                                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}
                          </div>
                        )}

                        {expanded && (
                          <div className="mt-2 flex flex-col gap-1">
                            {debt.payments.map((p) => (
                              <div
                                key={p._id}
                                className="flex items-center justify-between text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-2.5 py-1.5"
                              >
                                <span>{new Date(p.date).toLocaleDateString("fr-FR")}</span>
                                <span className="flex items-center gap-2">
                                  {formatAmount(p.amount, currency)}
                                  <button
                                    onClick={() => deletePayment(debt._id, p._id)}
                                    aria-label="Annuler ce remboursement"
                                    className="text-zinc-300 hover:text-red-600 transition"
                                  >
                                    <X size={12} strokeWidth={2} />
                                  </button>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {settled.length > 0 && (
            <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setShowSettled((v) => !v)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
              >
                Dettes soldées ({settled.length})
                {showSettled ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showSettled && (
                <div className="mt-3 flex flex-col gap-2">
                  {settled.map((debt) => (
                    <div
                      key={debt._id}
                      className="flex items-center justify-between text-sm text-zinc-400"
                    >
                      <span className="truncate">
                        {debt.direction === "owed_to_me" ? debt.person : `Tu devais à ${debt.person}`}{" "}
                        · soldée
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        {formatAmount(debt.amount, currency)}
                        <button
                          onClick={() => handleDelete(debt)}
                          aria-label="Supprimer la dette"
                          className="text-zinc-300 hover:text-red-600 transition"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm"
          >
            <h3 className="font-bold mb-4">Nouvelle dette</h3>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-4">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-4">
              <button
                type="button"
                onClick={() => setDirection("owed_to_me")}
                className={`rounded-lg py-1.5 text-sm font-medium transition ${
                  direction === "owed_to_me"
                    ? "bg-white dark:bg-zinc-900 text-accent-600 shadow-sm"
                    : "text-zinc-500"
                }`}
              >
                On me doit
              </button>
              <button
                type="button"
                onClick={() => setDirection("i_owe")}
                className={`rounded-lg py-1.5 text-sm font-medium transition ${
                  direction === "i_owe"
                    ? "bg-white dark:bg-zinc-900 text-expense-600 shadow-sm"
                    : "text-zinc-500"
                }`}
              >
                Je dois
              </button>
            </div>

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              {direction === "owed_to_me" ? "Qui te doit de l'argent ?" : "À qui dois-tu de l'argent ?"}
            </label>
            <input
              type="text"
              maxLength={80}
              placeholder="Ex. Karim"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Montant ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Échéance (optionnel)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Note (optionnel)
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder="Ex. prêt pour le loyer"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6 bg-transparent text-sm"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
              >
                {isSubmitting ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
