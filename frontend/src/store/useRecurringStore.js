// store/useRecurringStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useRecurringStore = create((set, get) => ({
  recurring: [],
  isLoading: false,

  getRecurring: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/recurring");
      set({ recurring: res.data });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  createRecurring: async (data) => {
    try {
      const res = await axiosInstance.post("/recurring", data);
      set({ recurring: [...get().recurring, res.data] });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  toggleActive: async (id) => {
    try {
      const res = await axiosInstance.put(`/recurring/${id}/toggle`);
      set({ recurring: get().recurring.map((r) => (r._id === id ? res.data : r)) });
    } catch (error) {
      console.error(error);
    }
  },

  deleteRecurring: async (id) => {
    try {
      await axiosInstance.delete(`/recurring/${id}`);
      set({ recurring: get().recurring.filter((r) => r._id !== id) });
    } catch (error) {
      console.error(error);
    }
  },
}));
