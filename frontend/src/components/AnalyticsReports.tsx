"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Trophy,
  Flame,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { useTransactionStore } from "@/store/useTransactionStore";

interface Props {
  currentMonth: number;
  currentYear: number;
  currency: string;
}

interface CategoryDiff {
  category: string;
  current: number;
  previous: number;
  diff: number;
  change: number | null;
  status: "hausse" | "baisse" | "stable";
}

interface MonthComparisonData {
  month: number;
  year: number;
  totals: {
    current: {
      income: number;
      expense: number;
      balance: number;
      savingsRate: number;
    };
    previous: {
      income: number;
      expense: number;
      balance: number;
      savingsRate: number;
    };
    evolution: {
      income: number | null;
      expense: number | null;
      balance: number | null;
      savingsRateDiff: number;
    };
  };
  categoryComparison: CategoryDiff[];
  highestIncrease: CategoryDiff | null;
  highestSaving: CategoryDiff | null;
}

interface MonthlyData {
  month: number;
  name: string;
  shortName: string;
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
}

interface AnnualReportData {
  year: number;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    annualSavingsRate: number;
    avgMonthlyExpense: number;
    avgMonthlyIncome: number;
    activeMonthsCount: number;
    totalTransactions: number;
  };
  highlights: {
    bestMonth: MonthlyData | null;
    heaviestMonth: MonthlyData | null;
  };
  topExpenses: {
    title: string;
    amount: number;
    category: string;
    date: string;
  }[];
  topCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  monthlyBreakdown: MonthlyData[];
}

export default function AnalyticsReports({ currentMonth, currentYear, currency }: Props) {
  const [viewMode, setViewMode] = useState<"comparatif" | "annuel">("comparatif");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const {
    monthComparison,
    annualReport,
    isComparisonLoading,
    isAnnualLoading,
    getMonthComparison,
    getAnnualReport,
  } = useAnalyticsStore();

  const { exportTransactions } = useTransactionStore();

  useEffect(() => {
    getMonthComparison(currentMonth, currentYear);
  }, [currentMonth, currentYear, getMonthComparison]);

  useEffect(() => {
    getAnnualReport(selectedYear);
  }, [selectedYear, getAnnualReport]);

  const comparison = monthComparison as MonthComparisonData | null;
  const annual = annualReport as AnnualReportData | null;

  const currentYearNum = new Date().getFullYear();
  const availableYears = [currentYearNum, currentYearNum - 1, currentYearNum - 2];

  const formatMoney = (val: number) => `${val.toLocaleString("fr-FR")} ${currency}`;

  return (
    <div className="space-y-6">
      {/* Sélecteur de mode de rapport */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles size={18} className="text-accent-600" />
            Rapports & Analyses Détaillées
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Compare tes performances budgétaires et visualise l&apos;évolution de tes finances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("comparatif")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "comparatif"
                  ? "bg-white dark:bg-zinc-900 text-accent-600 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Layers size={14} />
              Mois par Mois (M vs M-1)
            </button>
            <button
              onClick={() => setViewMode("annuel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "annuel"
                  ? "bg-white dark:bg-zinc-900 text-accent-600 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Trophy size={14} />
              Bilan Annuel (Wrapped)
            </button>
          </div>

          <button
            onClick={() => exportTransactions("csv")}
            title="Exporter les transactions au format CSV"
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-accent-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition shrink-0"
          >
            <FileSpreadsheet size={16} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VUE 1 : COMPARATEUR MOIS PAR MOIS (M vs M-1) */}
      {/* ======================================================== */}
      {viewMode === "comparatif" && (
        <>
          {isComparisonLoading ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center text-sm text-zinc-400">
              Analyse des données comparatives...
            </div>
          ) : !comparison ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-sm text-zinc-500">
              Aucune donnée disponible pour cette période.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cartes de synthèse de la variation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Dépenses */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-medium text-zinc-500">Dépenses du mois</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {formatMoney(comparison.totals.current.expense)}
                    </span>
                    {comparison.totals.evolution.expense !== null && (
                      <span
                        className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                          comparison.totals.evolution.expense > 0
                            ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        }`}
                      >
                        {comparison.totals.evolution.expense > 0 ? (
                          <ArrowUpRight size={12} className="mr-0.5" />
                        ) : (
                          <ArrowDownRight size={12} className="mr-0.5" />
                        )}
                        {Math.abs(comparison.totals.evolution.expense)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Précédent : {formatMoney(comparison.totals.previous.expense)}
                  </p>
                </div>

                {/* Revenus */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-medium text-zinc-500">Revenus du mois</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {formatMoney(comparison.totals.current.income)}
                    </span>
                    {comparison.totals.evolution.income !== null && (
                      <span
                        className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                          comparison.totals.evolution.income >= 0
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {comparison.totals.evolution.income >= 0 ? (
                          <ArrowUpRight size={12} className="mr-0.5" />
                        ) : (
                          <ArrowDownRight size={12} className="mr-0.5" />
                        )}
                        {Math.abs(comparison.totals.evolution.income)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Précédent : {formatMoney(comparison.totals.previous.income)}
                  </p>
                </div>

                {/* Solde Net */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-medium text-zinc-500">Solde net</span>
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`text-xl font-bold ${
                        comparison.totals.current.balance >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatMoney(comparison.totals.current.balance)}
                    </span>
                    {comparison.totals.evolution.balance !== null && (
                      <span className="text-xs font-medium text-zinc-500">
                        {comparison.totals.evolution.balance >= 0 ? "+" : ""}
                        {comparison.totals.evolution.balance}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Précédent : {formatMoney(comparison.totals.previous.balance)}
                  </p>
                </div>

                {/* Taux d'épargne */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-medium text-zinc-500">Taux d&apos;épargne</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-accent-600">
                      {comparison.totals.current.savingsRate}%
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        comparison.totals.evolution.savingsRateDiff >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {comparison.totals.evolution.savingsRateDiff >= 0 ? "+" : ""}
                      {comparison.totals.evolution.savingsRateDiff} pts
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Précédent : {comparison.totals.previous.savingsRate}%
                  </p>
                </div>
              </div>

              {/* Badges d'insights clés */}
              {(comparison.highestIncrease || comparison.highestSaving) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparison.highestSaving && (
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl">
                        <TrendingDown size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Plus belle économie
                        </span>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          <span className="font-bold">{comparison.highestSaving.category}</span> :{" "}
                          {formatMoney(Math.abs(comparison.highestSaving.diff))} de moins que le mois passé.
                        </p>
                      </div>
                    </div>
                  )}

                  {comparison.highestIncrease && (
                    <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 flex items-center gap-3">
                      <div className="p-2.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                          Plus forte augmentation
                        </span>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          <span className="font-bold">{comparison.highestIncrease.category}</span> : +
                          {formatMoney(comparison.highestIncrease.diff)} par rapport au mois passé.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Graphique comparatif en barres M vs M-1 */}
              {comparison.categoryComparison.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Comparaison des dépenses par catégorie
                  </h3>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={comparison.categoryComparison.slice(0, 8)}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                        <XAxis
                          dataKey="category"
                          fontSize={11}
                          tickLine={false}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                        />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(value: number) => formatMoney(value)}
                          contentStyle={{
                            backgroundColor: "rgba(24, 24, 27, 0.95)",
                            borderRadius: "12px",
                            border: "none",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "15px", fontSize: "12px" }} />
                        <Bar
                          dataKey="previous"
                          name="Mois précédent (M-1)"
                          fill="#a1a1aa"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="current"
                          name="Ce mois-ci (M)"
                          fill="#059669"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tableau comparatif détaillé */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Détail par catégorie
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Catégorie</th>
                        <th className="py-3 px-4 text-right">Mois actuel (M)</th>
                        <th className="py-3 px-4 text-right">Mois passé (M-1)</th>
                        <th className="py-3 px-4 text-right">Écart</th>
                        <th className="py-3 px-4 text-right">Évolution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {comparison.categoryComparison.map((cat) => (
                        <tr key={cat.category} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                          <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                            {cat.category}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatMoney(cat.current)}
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-500">
                            {formatMoney(cat.previous)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {cat.diff > 0 ? `+${formatMoney(cat.diff)}` : formatMoney(cat.diff)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {cat.status === "hausse" && (
                              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                                <TrendingUp size={13} />
                                {cat.change !== null ? `+${cat.change}%` : "Nouveau"}
                              </span>
                            )}
                            {cat.status === "baisse" && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <TrendingDown size={13} />
                                {cat.change !== null ? `${cat.change}%` : ""}
                              </span>
                            )}
                            {cat.status === "stable" && (
                              <span className="inline-flex items-center gap-1 text-zinc-400">
                                <Minus size={13} />
                                0%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* VUE 2 : BILAN ANNUEL ("FINTRACK WRAPPED") */}
      {/* ======================================================== */}
      {viewMode === "annuel" && (
        <>
          {/* Sélecteur d'année */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Année du bilan :
            </span>
            <div className="flex gap-1.5">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedYear === yr
                      ? "bg-accent-600 text-white"
                      : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {isAnnualLoading ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center text-sm text-zinc-400">
              Génération de votre FinTrack Wrapped...
            </div>
          ) : !annual ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-sm text-zinc-500">
              Aucune donnée pour l&apos;année {selectedYear}.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Carte Hero Wrapped */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest uppercase bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                      FinTrack Wrapped {annual.year}
                    </span>
                    <Sparkles className="text-amber-300" size={24} />
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {formatMoney(annual.summary.netSavings)}
                    </h3>
                    <p className="text-emerald-100 text-sm mt-1">
                      Épargnés au total sur l&apos;année avec un taux moyen de{" "}
                      <span className="font-bold underline decoration-amber-300">
                        {annual.summary.annualSavingsRate}%
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/20 text-xs">
                    <div>
                      <span className="text-emerald-200/80 block">Revenus totaux</span>
                      <span className="font-bold text-sm sm:text-base">
                        {formatMoney(annual.summary.totalIncome)}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-200/80 block">Dépenses totales</span>
                      <span className="font-bold text-sm sm:text-base">
                        {formatMoney(annual.summary.totalExpense)}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-200/80 block">Dépense mensuelle moy.</span>
                      <span className="font-bold text-sm sm:text-base">
                        {formatMoney(annual.summary.avgMonthlyExpense)}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-200/80 block">Mois actifs</span>
                      <span className="font-bold text-sm sm:text-base">
                        {annual.summary.activeMonthsCount} mois
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trophées du bilan annuel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {annual.highlights.bestMonth && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-2xl shrink-0">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Mois le plus économe
                      </span>
                      <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {annual.highlights.bestMonth.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Taux d&apos;épargne record de{" "}
                        <span className="font-semibold text-emerald-600">
                          {annual.highlights.bestMonth.savingsRate}%
                        </span>{" "}
                        ({formatMoney(annual.highlights.bestMonth.balance)} mis de côté).
                      </p>
                    </div>
                  </div>
                )}

                {annual.highlights.heaviestMonth && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-3 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-2xl shrink-0">
                      <Flame size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Mois le plus dépensier
                      </span>
                      <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {annual.highlights.heaviestMonth.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Total de dépenses de{" "}
                        <span className="font-semibold text-rose-600">
                          {formatMoney(annual.highlights.heaviestMonth.expense)}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Graphique de la trajectoire sur les 12 mois */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Évolution mensuelle des flux ({annual.year})
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={annual.monthlyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                      <XAxis dataKey="shortName" fontSize={11} tickLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(value: number) => formatMoney(value)}
                        contentStyle={{
                          backgroundColor: "rgba(24, 24, 27, 0.95)",
                          borderRadius: "12px",
                          border: "none",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        dataKey="income"
                        name="Revenus"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name="Dépenses"
                        stroke="#dc2626"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Catégories & Top 5 Dépenses exceptionnelles */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Catégories */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Top catégories de dépenses ({annual.year})
                  </h3>
                  <div className="space-y-3">
                    {annual.topCategories.slice(0, 6).map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                            {cat.category}
                          </span>
                          <span className="text-zinc-500">
                            {formatMoney(cat.amount)} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-600 rounded-full"
                            style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 5 Dépenses uniques */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Plus grosses dépenses uniques
                  </h3>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {annual.topExpenses.map((exp, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{exp.title}</p>
                          <span className="text-zinc-400">
                            {new Date(exp.date).toLocaleDateString("fr-FR")} • {exp.category}
                          </span>
                        </div>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          -{formatMoney(exp.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
