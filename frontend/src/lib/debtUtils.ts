// lib/debtUtils.ts
//
// Calculs purs sur les dettes (montants, échéances, totaux), séparés du
// composant pour pouvoir les vérifier isolément.

export type DebtPayment = {
  _id: string;
  amount: number;
  date: string;
};

export type Debt = {
  _id: string;
  person: string;
  direction: "owed_to_me" | "i_owe";
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  note: string;
  payments: DebtPayment[];
  createdAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Arrondi à 2 décimales (voir debt.logic.js côté backend)
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Reste à rembourser, jamais négatif
export const remainingOf = (debt: Pick<Debt, "amount" | "paidAmount">) =>
  Math.max(0, round2(debt.amount - debt.paidAmount));

export const isSettled = (debt: Pick<Debt, "amount" | "paidAmount">) => remainingOf(debt) <= 0;

export const progressPercent = (debt: Pick<Debt, "amount" | "paidAmount">) =>
  debt.amount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100)) : 100;

// L'échéance est saisie comme une date de calendrier ("2026-11-30") mais
// stockée comme un instant (minuit UTC). La convertir directement en date
// locale la ferait tomber la veille dans les fuseaux à l'ouest de Greenwich
// (ex. New York). On relit donc les chiffres de la date telle qu'elle a été
// saisie, et on reconstruit un jour de calendrier local.
export function calendarDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return new Date(iso);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Jours calendaires entre aujourd'hui et l'échéance : négatif = en retard,
// 0 = aujourd'hui, 1 = demain. Math.round absorbe les changements d'heure.
export function daysUntil(iso: string, today: Date): number {
  return Math.round((calendarDate(iso).getTime() - startOfDay(today).getTime()) / DAY_MS);
}

// Totaux des dettes encore en cours, par sens
export function summarize(debts: Debt[]): { owedToMe: number; iOwe: number } {
  let owedToMe = 0;
  let iOwe = 0;
  for (const debt of debts) {
    if (isSettled(debt)) continue;
    if (debt.direction === "owed_to_me") owedToMe += remainingOf(debt);
    else iOwe += remainingOf(debt);
  }
  return { owedToMe: round2(owedToMe), iOwe: round2(iOwe) };
}

// Dettes en cours : échéance la plus proche d'abord, celles sans échéance
// en dernier, à égalité la plus récente d'abord
export function sortActive(debts: Debt[]): Debt[] {
  return debts
    .filter((d) => !isSettled(d))
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        const diff = calendarDate(a.dueDate).getTime() - calendarDate(b.dueDate).getTime();
        if (diff !== 0) return diff;
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}
