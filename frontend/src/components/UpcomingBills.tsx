"use client";

import { useEffect } from "react";
import { CalendarClock } from "lucide-react";
import { useRecurringStore } from "@/store/useRecurringStore";
import { CategoryIcon } from "./categoryIcons";

type Recurring = {
  _id: string;
  type: "revenu" | "dépense";
  amount: number;
  category: string;
  description: string;
  nextDueDate: string;
  active: boolean;
};

type CategoryDoc = {
  name: string;
  type: "revenu" | "dépense";
  icon?: string;
  color?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
const MAX_VISIBLE = 5;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Nombre de jours calendaires entre aujourd'hui et l'échéance (0 = aujourd'hui,
// 1 = demain...). On compare des jours entiers, pas des heures : une
// échéance demain à 00h01 doit afficher "Demain" même s'il reste moins de
// 24 h. Math.round absorbe les changements d'heure (journées de 23/25 h).
function daysUntil(dueDate: Date, today: Date) {
  return Math.round((startOfDay(dueDate).getTime() - startOfDay(today).getTime()) / DAY_MS);
}

function countdownLabel(days: number) {
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return `Dans ${days} jours`;
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${currency}`;
}

export default function UpcomingBills({
  currency,
  categories = [],
}: {
  currency: string;
  categories?: CategoryDoc[];
}) {
  // Le store est un fichier .js non typé : on précise la forme ici, sinon
  // TypeScript infère un tableau de `never` et refuse tout accès aux champs
  const recurring = useRecurringStore((state) => state.recurring) as Recurring[];
  const getRecurring = useRecurringStore((state) => state.getRecurring);

  useEffect(() => {
    getRecurring();
  }, [getRecurring]);

  const today = new Date();
  const todayStart = startOfDay(today);
  const windowEnd = new Date(todayStart.getTime() + (WINDOW_DAYS + 1) * DAY_MS);

  // Uniquement les dépenses actives à venir dans la fenêtre — un revenu
  // récurrent (salaire) n'est pas une "facture" à anticiper, et une
  // récurrence en pause ne sera de toute façon pas prélevée
  const upcoming = recurring
    .filter((r) => {
      if (!r.active || r.type !== "dépense") return false;
      const due = new Date(r.nextDueDate);
      return due >= todayStart && due < windowEnd;
    })
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

  if (upcoming.length === 0) return null;

  const total = upcoming.reduce((sum, r) => sum + r.amount, 0);
  const visible = upcoming.slice(0, MAX_VISIBLE);
  const hiddenCount = upcoming.length - visible.length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarClock size={18} className="text-accent-600" strokeWidth={2} />
            Prochainement
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {upcoming.length} prélèvement{upcoming.length > 1 ? "s" : ""} dans les {WINDOW_DAYS}{" "}
            prochains jours
          </p>
        </div>
        <p className="text-sm font-semibold text-expense-600 shrink-0">
          {formatAmount(total, currency)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((r) => {
          const due = new Date(r.nextDueDate);
          const days = daysUntil(due, today);
          const categoryDoc = categories.find((c) => c.name === r.category && c.type === "dépense");
          const urgent = days <= 2;

          return (
            <div key={r._id} className="flex items-center gap-3">
              <CategoryIcon icon={categoryDoc?.icon} color={categoryDoc?.color} size={14} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.description || r.category}</p>
                <p
                  className={`text-xs ${
                    urgent ? "text-amber-600 dark:text-amber-500 font-medium" : "text-zinc-400"
                  }`}
                >
                  {countdownLabel(days)} · {due.toLocaleDateString("fr-FR")}
                </p>
              </div>
              <p className="text-sm font-medium text-expense-600 shrink-0">
                -{formatAmount(r.amount, currency)}
              </p>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <p className="text-xs text-zinc-400 mt-3">
          + {hiddenCount} autre{hiddenCount > 1 ? "s" : ""} prélèvement{hiddenCount > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
