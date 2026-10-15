"use client";

import type { ReactNode } from "react";
import { Lightbulb, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { CategoryIcon } from "./categoryIcons";

// Forme des données renvoyées par GET /transactions/insights (voir
// insights.service.js côté backend)
type Insight =
  | { type: "overall"; direction: "up" | "down"; percent: number; current: number; average: number }
  | { type: "category_spike"; category: string; percent: number; current: number; average: number }
  | { type: "category_drop"; category: string; percent: number; current: number; average: number }
  | { type: "savings_rate"; rate: number; income: number; expense: number };

type InsightsData = {
  partial: boolean;
  comparable: boolean;
  comparedMonths: number;
  insights: Insight[];
};

type CategoryDoc = {
  name: string;
  type: "revenu" | "dépense";
  icon?: string;
  color?: string;
};

type Tone = "good" | "warn" | "bad" | "neutral";

const TONE_STYLES: Record<Tone, { text: string; circle: string }> = {
  good: {
    text: "text-accent-600",
    circle: "bg-accent-50 dark:bg-accent-950 text-accent-600",
  },
  warn: {
    text: "text-amber-600 dark:text-amber-500",
    circle: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500",
  },
  bad: {
    text: "text-expense-600",
    circle: "bg-red-50 dark:bg-red-950/40 text-expense-600",
  },
  neutral: {
    text: "text-zinc-500",
    circle: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500",
  },
};

function formatAmount(amount: number, currency: string) {
  return `${Math.round(amount).toLocaleString("fr-FR")} ${currency}`;
}

// Pastille d'icône teintée selon le ton de l'observation, pour les
// insights qui ne concernent pas une catégorie précise
function ToneIcon({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${TONE_STYLES[tone].circle}`}
    >
      {children}
    </span>
  );
}

function describeInsight(
  insight: Insight,
  currency: string,
  categories: CategoryDoc[],
): { icon: ReactNode; tone: Tone; title: string; detail: string } {
  switch (insight.type) {
    case "overall": {
      const up = insight.direction === "up";
      return {
        icon: (
          <ToneIcon tone={up ? "warn" : "good"}>
            {up ? <TrendingUp size={16} strokeWidth={2} /> : <TrendingDown size={16} strokeWidth={2} />}
          </ToneIcon>
        ),
        tone: up ? "warn" : "good",
        title: `Tes dépenses sont ${insight.percent}% ${up ? "au-dessus de" : "sous"} ta moyenne`,
        detail: `${formatAmount(insight.current, currency)} contre ${formatAmount(insight.average, currency)} en moyenne`,
      };
    }

    case "category_spike":
    case "category_drop": {
      const spike = insight.type === "category_spike";
      const doc = categories.find((c) => c.name === insight.category && c.type === "dépense");
      return {
        icon: <CategoryIcon icon={doc?.icon} color={doc?.color} size={16} />,
        tone: spike ? "warn" : "good",
        title: `${insight.category} : ${spike ? "+" : "−"}${insight.percent}% vs ta moyenne`,
        detail: `${formatAmount(insight.current, currency)} contre ${formatAmount(insight.average, currency)} en moyenne`,
      };
    }

    case "savings_rate": {
      if (insight.rate < 0) {
        return {
          icon: (
            <ToneIcon tone="bad">
              <PiggyBank size={16} strokeWidth={2} />
            </ToneIcon>
          ),
          tone: "bad",
          title: `Tes dépenses dépassent tes revenus de ${Math.abs(insight.rate)}%`,
          detail: `${formatAmount(insight.expense, currency)} dépensés pour ${formatAmount(insight.income, currency)} de revenus`,
        };
      }
      const good = insight.rate >= 20;
      return {
        icon: (
          <ToneIcon tone={good ? "good" : "neutral"}>
            <PiggyBank size={16} strokeWidth={2} />
          </ToneIcon>
        ),
        tone: good ? "good" : "neutral",
        title: `Tu as ${good ? "mis de côté" : "conservé"} ${insight.rate}% de tes revenus`,
        detail: `${formatAmount(insight.income - insight.expense, currency)} sur ${formatAmount(insight.income, currency)} de revenus`,
      };
    }
  }
}

function subtitle(data: InsightsData) {
  if (!data.comparable) {
    return "Les comparaisons avec tes mois précédents apparaîtront après quelques jours d'activité.";
  }
  if (data.comparedMonths === 0) {
    return "Les comparaisons apparaîtront dès que tu auras un mois d'historique.";
  }
  const n = data.comparedMonths;
  if (data.partial) {
    return n === 1
      ? "Comparé à la même période du mois précédent"
      : `Comparé à la même période des ${n} derniers mois`;
  }
  return n === 1 ? "Comparé au mois précédent" : `Comparé à la moyenne des ${n} mois précédents`;
}

export default function InsightsCards({
  currency,
  categories = [],
}: {
  currency: string;
  categories?: CategoryDoc[];
}) {
  // Le store est un fichier .js non typé : sans cette précision,
  // TypeScript infère `null` et refuse tout accès aux champs
  const data = useTransactionStore((state) => state.insights) as InsightsData | null;

  if (!data || data.insights.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Lightbulb size={18} className="text-accent-600" strokeWidth={2} />
          Analyse du mois
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle(data)}</p>
      </div>

      <div className="flex flex-col gap-3">
        {data.insights.map((insight, index) => {
          const { icon, tone, title, detail } = describeInsight(insight, currency, categories);
          return (
            <div key={`${insight.type}-${index}`} className="flex items-center gap-3">
              {icon}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${TONE_STYLES[tone].text}`}>{title}</p>
                <p className="text-xs text-zinc-400">{detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
