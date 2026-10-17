// store/useDebtStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

const errorMessage = (error) => error.response?.data?.message || "Erreur";

export const useDebtStore = create((set, get) => ({
  debts: [],
  isLoading: false,

  getDebts: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/debts");
      set({ debts: res.data });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  createDebt: async (data) => {
    try {
      const res = await axiosInstance.post("/debts", data);
      set({ debts: [res.data, ...get().debts] });
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  },

  // Le serveur renvoie la dette mise à jour (nouveau total remboursé et
  // historique) : on remplace simplement l'ancienne version
  addPayment: async (id, amount) => {
    try {
      const res = await axiosInstance.post(`/debts/${id}/payments`, { amount });
      set({ debts: get().debts.map((d) => (d._id === id ? res.data : d)) });
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  },

  deletePayment: async (id, paymentId) => {
    try {
      const res = await axiosInstance.delete(`/debts/${id}/payments/${paymentId}`);
      set({ debts: get().debts.map((d) => (d._id === id ? res.data : d)) });
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  },

  deleteDebt: async (id) => {
    try {
      await axiosInstance.delete(`/debts/${id}`);
      set({ debts: get().debts.filter((d) => d._id !== id) });
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  },
}));
