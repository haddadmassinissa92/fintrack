"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTransactionStore } from "@/store/useTransactionStore";
import Navbar from "@/components/Navbar";
import StatsCards from "@/components/StatsCards";
import CategoryChart from "@/components/CategoryChart";
import TrendChart from "@/components/TrendChart";
import BalanceChart from "@/components/BalanceChart";
import SavingsGoals from "@/components/SavingsGoals";
import BudgetTracker from "@/components/BudgetTracker";
import RecurringTransactions from "@/components/RecurringTransactions";
import BudgetPlanCard from "@/components/BudgetPlanCard";
import TransactionList from "@/components/TransactionList";
import TransactionForm from "@/components/TransactionForm";
import TransactionFilters from "@/components/TransactionFilters";

export default function DashboardPage() {
  const router = useRouter();
  const { authUser, isCheckingAuth, checkAuth } = useAuthStore();
  const {
    transactions,
    stats,
    categories,
    getTransactions,
    loadMoreTransactions,
    hasMore,
    isLoadingMore,
    getStats,
    getCategories,
    exportTransactions,
  } = useTransactionStore();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ search: "", type: "", category: "" });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isCheckingAuth && !authUser) {
      router.replace("/login");
    }
  }, [authUser, isCheckingAuth, router]);

  useEffect(() => {
    if (authUser) {
      getStats();
      getCategories();
    }
  }, [authUser, getStats, getCategories]);

  // Rejoue la recherche à chaque changement de filtre, avec une courte
  // pause après la frappe (debounce) pour ne pas interroger le serveur à
  // chaque lettre tapée dans le champ de recherche
  useEffect(() => {
    if (!authUser) return;
    const timeout = setTimeout(() => {
      getTransactions(filters);
    }, 300);
    return () => clearTimeout(timeout);
  }, [authUser, filters, getTransactions]);

  if (isCheckingAuth || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Chargement...</p>
      </div>
    );
  }

  const currency = authUser.currency || "DZD";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Bonjour {authUser.username} 👋</h1>
            <p className="text-sm text-zinc-500">Voici un aperçu de votre mois en cours</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-full px-4 py-2 text-sm font-medium transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            Ajouter
          </button>
        </div>

        {stats && (
          <StatsCards
            totalIncome={stats.totalIncome}
            totalExpense={stats.totalExpense}
            balance={stats.balance}
            incomeChange={stats.incomeChange}
            expenseChange={stats.expenseChange}
            balanceChange={stats.balanceChange}
            currency={currency}
          />
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategoryChart data={stats.byCategory} currency={currency} />
            <TrendChart data={stats.monthlyTrend} currency={currency} />
          </div>
        )}

        {stats && <BalanceChart data={stats.balanceTrend} currency={currency} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SavingsGoals currency={currency} />
          <BudgetTracker currency={currency} />
        </div>

        <RecurringTransactions currency={currency} />

        <BudgetPlanCard currency={currency} />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Transactions</h2>
            <div className="flex gap-2">
              <button
                onClick={() => exportTransactions("csv")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-accent-600 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 transition"
              >
                <Download size={13} strokeWidth={2} />
                CSV
              </button>
              <button
                onClick={() => exportTransactions("pdf")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-accent-600 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 transition"
              >
                <Download size={13} strokeWidth={2} />
                PDF
              </button>
            </div>
          </div>
          <TransactionFilters filters={filters} onChange={setFilters} categories={categories} />
          <TransactionList transactions={transactions} currency={currency} />
          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => loadMoreTransactions()}
                disabled={isLoadingMore}
                className="text-sm text-zinc-500 hover:text-accent-600 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2 transition disabled:opacity-50"
              >
                {isLoadingMore ? "Chargement..." : "Charger plus"}
              </button>
            </div>
          )}
        </div>
      </main>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
