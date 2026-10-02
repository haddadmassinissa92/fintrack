// store/useBudgetStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useBudgetStore = create((set, get) => ({
  budgets: [],
  isLoading: false,
  monthYear: null,

  getBudgets: async ({ month, year } = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (month && year) {
        params.set("month", month);
        params.set("year", year);
        set({ monthYear: { month, year } });
      } else {
        set({ monthYear: null });
      }
      const res = await axiosInstance.get(`/budgets?${params.toString()}`);
      set({ budgets: res.data });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Crée ou remplace la limite d'une catégorie (upsert côté serveur) —
  // recharge la liste ensuite pour récupérer le montant dépensé à jour,
  // en restant sur le mois actuellement consulté
  setBudget: async (category, monthlyLimit) => {
    try {
      await axiosInstance.post("/budgets", { category, monthlyLimit });
      await get().getBudgets(get().monthYear || {});
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  deleteBudget: async (id) => {
    try {
      await axiosInstance.delete(`/budgets/${id}`);
      set({ budgets: get().budgets.filter((b) => b._id !== id) });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },
}));
