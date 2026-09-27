// store/useTransactionStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  stats: null,
  categories: { expense: [], income: [], all: [] },
  isLoading: false,

  getCategories: async () => {
    try {
      const res = await axiosInstance.get("/categories");
      set({ categories: res.data });
    } catch (error) {
      console.error(error);
    }
  },

  createCategory: async (name, type) => {
    try {
      await axiosInstance.post("/categories", { name, type });
      await get().getCategories();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  renameCategory: async (id, name) => {
    try {
      await axiosInstance.put(`/categories/${id}`, { name });
      await get().getCategories();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  // Classe une catégorie de dépense comme besoin/envie/épargne pour le
  // plan budgétaire 50/30/20 (passer null pour la laisser non classée)
  setCategoryBudgetType: async (id, budgetType) => {
    try {
      await axiosInstance.put(`/categories/${id}`, { budgetType });
      await get().getCategories();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  deleteCategory: async (id) => {
    try {
      await axiosInstance.delete(`/categories/${id}`);
      await get().getCategories();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  getTransactions: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.category) params.set("category", filters.category);
      if (filters.search) params.set("search", filters.search);
      if (filters.month) params.set("month", filters.month);
      if (filters.year) params.set("year", filters.year);

      const res = await axiosInstance.get(`/transactions?${params.toString()}`);
      set({ transactions: res.data });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  getStats: async () => {
    try {
      const res = await axiosInstance.get("/transactions/stats");
      set({ stats: res.data });
    } catch (error) {
      console.error(error);
    }
  },

  addTransaction: async (data) => {
    try {
      const res = await axiosInstance.post("/transactions", data);
      set({ transactions: [res.data, ...get().transactions] });
      get().getStats();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  deleteTransaction: async (id) => {
    try {
      await axiosInstance.delete(`/transactions/${id}`);
      set({ transactions: get().transactions.filter((t) => t._id !== id) });
      get().getStats();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  // Télécharge l'export CSV ou PDF de toutes les transactions. La requête
  // demande la réponse sous forme de "blob" (données brutes) plutôt que du
  // JSON habituel, puisque la réponse est ici un vrai fichier binaire/texte
  exportTransactions: async (format) => {
    try {
      const res = await axiosInstance.get(`/transactions/export?format=${format}`, {
        responseType: "blob",
      });

      // Déclenche le téléchargement côté navigateur en simulant un clic
      // sur un lien invisible pointant vers les données reçues
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `fintrack-transactions.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },
}));
