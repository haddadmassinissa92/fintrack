// store/useWalletStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useWalletStore = create((set, get) => ({
  wallets: [],
  activeWalletId: null, // null = Vue consolidée de tous les comptes
  isLoading: false,

  setActiveWalletId: (id) => set({ activeWalletId: id }),

  getWallets: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/wallets");
      set({ wallets: res.data });
      return { success: true, data: res.data };
    } catch (error) {
      console.error(error);
      return { success: false, message: error.response?.data?.message || "Erreur" };
    } finally {
      set({ isLoading: false });
    }
  },

  createWallet: async (data) => {
    try {
      const res = await axiosInstance.post("/wallets", data);
      await get().getWallets();
      return { success: true, wallet: res.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  updateWallet: async (id, data) => {
    try {
      const res = await axiosInstance.put(`/wallets/${id}`, data);
      await get().getWallets();
      return { success: true, wallet: res.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  deleteWallet: async (id) => {
    try {
      await axiosInstance.delete(`/wallets/${id}`);
      if (get().activeWalletId === id) {
        set({ activeWalletId: null });
      }
      await get().getWallets();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  transferBetweenWallets: async ({ fromWalletId, toWalletId, amount, description, date }) => {
    try {
      const res = await axiosInstance.post("/wallets/transfer", {
        fromWalletId,
        toWalletId,
        amount,
        description,
        date,
      });
      await get().getWallets();
      return { success: true, transaction: res.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },
}));
