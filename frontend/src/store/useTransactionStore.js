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
  statsMonthYear: null,
  // Suppressions "en attente" : la transaction a déjà disparu de la liste
  // affichée, mais la requête de suppression réelle n'est envoyée qu'après
  // le délai d'annulation (voir UndoToasts.tsx pour l'affichage).
  pendingDeletes: {},

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

  getStats: async ({ month, year } = {}) => {
    try {
      const params = new URLSearchParams();
      if (month && year) {
        params.set("month", month);
        params.set("year", year);
        set({ statsMonthYear: { month, year } });
      } else {
        set({ statsMonthYear: null });
      }
      const res = await axiosInstance.get(`/transactions/stats?${params.toString()}`);
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
      get().getStats(get().statsMonthYear || {});
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  // Supprime "visuellement" tout de suite (retrait de la liste), mais
  // n'envoie la requête de suppression réelle qu'après un délai — le
  // temps de laisser l'utilisateur annuler via le toast affiché.
  deleteTransaction: (id) => {
    const transaction = get().transactions.find((t) => t._id === id);
    if (!transaction) return;

    set({
      transactions: get().transactions.filter((t) => t._id !== id),
      total: Math.max(0, get().total - 1),
    });

    const timeoutId = setTimeout(() => get().finalizeDelete(id), 6000);
    set({
      pendingDeletes: {
        ...get().pendingDeletes,
        [id]: { transaction, timeoutId },
      },
    });
  },

  // Appelé par le bouton "Annuler" du toast : remet la transaction dans
  // la liste et annule l'envoi de la suppression réelle
  undoDelete: (id) => {
    const pending = get().pendingDeletes[id];
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    const { [id]: _removed, ...rest } = get().pendingDeletes;

    set({
      transactions: [...get().transactions, pending.transaction].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      ),
      total: get().total + 1,
      pendingDeletes: rest,
    });
  },

  // Appelé automatiquement une fois le délai d'annulation écoulé — envoie
  // enfin la vraie suppression au serveur
  finalizeDelete: async (id) => {
    const pending = get().pendingDeletes[id];
    if (!pending) return;

    const { [id]: _removed, ...rest } = get().pendingDeletes;
    set({ pendingDeletes: rest });

    try {
      await axiosInstance.delete(`/transactions/${id}`);
      get().getStats(get().statsMonthYear || {});
    } catch (error) {
      console.error(error);
      // La suppression a échoué côté serveur : on remet la transaction
      // dans la liste plutôt que de laisser l'affichage mentir
      set({
        transactions: [...get().transactions, pending.transaction].sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        ),
        total: get().total + 1,
      });
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
