// store/useBudgetStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useBudgetStore = create((set, get) => ({
  budgets: [],
  isLoading: false,

  getBudgets: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/budgets");
      set({ budgets: res.data });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Crée ou remplace la limite d'une catégorie (upsert côté serveur) —
  // recharge la liste ensuite pour récupérer le montant dépensé à jour
  setBudget: async (category, monthlyLimit) => {
    try {
      await axiosInstance.post("/budgets", { category, monthlyLimit });
      await get().getBudgets();
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
