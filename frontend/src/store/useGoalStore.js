// store/useGoalStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useGoalStore = create((set, get) => ({
  goals: [],
  isLoading: false,

  getGoals: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/goals");
      set({ goals: res.data });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  createGoal: async (data) => {
    try {
      const res = await axiosInstance.post("/goals", data);
      set({ goals: [res.data, ...get().goals] });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  contribute: async (id, amount) => {
    try {
      const res = await axiosInstance.put(`/goals/${id}/contribute`, { amount });
      set({ goals: get().goals.map((g) => (g._id === id ? res.data : g)) });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  deleteGoal: async (id) => {
    try {
      await axiosInstance.delete(`/goals/${id}`);
      set({ goals: get().goals.filter((g) => g._id !== id) });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },
}));
