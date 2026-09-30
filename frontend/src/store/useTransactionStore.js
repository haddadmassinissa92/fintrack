// store/useTransactionStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  stats: null,
  categories: { expense: [], income: [], all: [] },
  isLoading: false,
  isLoadingMore: false,
  page: 1,
  total: 0,
  hasMore: false,
  lastFilters: {},

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

  // Recharge toujours depuis la page 1 — utilisé au premier chargement et
  // à chaque changement de filtre. Voir loadMoreTransactions pour la suite.
  getTransactions: async (filters = {}) => {
    set({ isLoading: true, lastFilters: filters });
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.category) params.set("category", filters.category);
      if (filters.search) params.set("search", filters.search);
      if (filters.month) params.set("month", filters.month);
      if (filters.year) params.set("year", filters.year);
      params.set("page", "1");

      const res = await axiosInstance.get(`/transactions?${params.toString()}`);
      set({
        transactions: res.data.transactions,
        total: res.data.total,
        page: res.data.page,
        hasMore: res.data.hasMore,
      });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Ajoute la page suivante à la liste déjà affichée, avec les mêmes
  // filtres que le dernier chargement (bouton "Charger plus")
  loadMoreTransactions: async () => {
    const { hasMore, isLoadingMore, page, lastFilters, transactions } = get();
    if (!hasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const params = new URLSearchParams();
      if (lastFilters.type) params.set("type", lastFilters.type);
      if (lastFilters.category) params.set("category", lastFilters.category);
      if (lastFilters.search) params.set("search", lastFilters.search);
      if (lastFilters.month) params.set("month", lastFilters.month);
      if (lastFilters.year) params.set("year", lastFilters.year);
      params.set("page", String(page + 1));

      const res = await axiosInstance.get(`/transactions?${params.toString()}`);
      set({
        transactions: [...transactions, ...res.data.transactions],
        total: res.data.total,
        page: res.data.page,
        hasMore: res.data.hasMore,
      });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoadingMore: false });
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
      set({
        transactions: [res.data, ...get().transactions],
        total: get().total + 1,
      });
      get().getStats();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  deleteTransaction: async (id) => {
    try {
      await axiosInstance.delete(`/transactions/${id}`);
      set({
        transactions: get().transactions.filter((t) => t._id !== id),
        total: Math.max(0, get().total - 1),
      });
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
