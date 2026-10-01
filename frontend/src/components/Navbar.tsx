"use client";

import { useState, useEffect } from "react";
import { Wallet, LogOut, Moon, Sun, Bell, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { getInitialTheme, toggleTheme } from "@/lib/theme";

type Budget = {
  _id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
};

export default function Navbar() {
  const router = useRouter();
  const { authUser, logout } = useAuthStore();
  const { budgets, getBudgets } = useBudgetStore();
  const [isDark, setIsDark] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    setIsDark(getInitialTheme());
  }, []);

  useEffect(() => {
    getBudgets();
  }, [getBudgets]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Un budget est "dépassé" une fois franchi, "presque atteint" à partir
  // de 80% — ce deuxième seuil permet d'agir avant le dépassement plutôt
  // que de le constater après coup
  const overBudgets = budgets.filter((b: Budget) => b.spent >= b.monthlyLimit);
  const nearBudgets = budgets.filter(
    (b: Budget) => b.spent < b.monthlyLimit && b.spent >= b.monthlyLimit * 0.8,
  );
  const alertCount = overBudgets.length + nearBudgets.length;

  return (
    <nav className="relative border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between">
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2"
        aria-label="Retour au tableau de bord"
      >
        <div className="w-8 h-8 rounded-xl bg-accent-600 flex items-center justify-center">
          <Wallet size={16} className="text-white" strokeWidth={2} />
        </div>
        <span className="font-bold">FinTrack</span>
      </button>

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-500 hidden sm:inline">{authUser?.username}</span>

        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            aria-label="Alertes"
            className="relative text-zinc-400 hover:text-accent-600 transition p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Bell size={18} strokeWidth={2} />
            {alertCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-expense-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowAlerts(false)} />
              <div className="absolute z-40 right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase px-3 pb-1">Alertes budget</p>
                {alertCount === 0 ? (
                  <p className="text-sm text-zinc-400 px-3 py-3">
                    Rien à signaler, tous tes budgets sont dans les clous.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {overBudgets.map((b: Budget) => (
                      <div key={b._id} className="px-3 py-2 text-sm">
                        <span className="text-expense-600 font-medium">{b.category}</span>
                        <span className="text-zinc-500"> — dépassé ({b.spent.toLocaleString("fr-FR")} / {b.monthlyLimit.toLocaleString("fr-FR")})</span>
                      </div>
                    ))}
                    {nearBudgets.map((b: Budget) => (
                      <div key={b._id} className="px-3 py-2 text-sm">
                        <span className="font-medium">{b.category}</span>
                        <span className="text-zinc-500">
                          {" "}
                          — presque atteint ({Math.round((b.spent / b.monthlyLimit) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setIsDark(toggleTheme())}
          aria-label="Basculer le mode sombre"
          className="text-zinc-400 hover:text-accent-600 transition p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {isDark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
        </button>
        <button
          onClick={() => router.push("/settings")}
          aria-label="Paramètres"
          className="text-zinc-400 hover:text-accent-600 transition p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Settings size={18} strokeWidth={2} />
        </button>
        <button
          onClick={handleLogout}
          aria-label="Se déconnecter"
          className="text-zinc-400 hover:text-red-600 transition p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}
