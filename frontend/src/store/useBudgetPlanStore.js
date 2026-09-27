// store/useBudgetPlanStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useBudgetPlanStore = create((set) => ({
  plan: null,

  getBudgetPlan: async () => {
    try {
      const res = await axiosInstance.get("/budget-plan");
      set({ plan: res.data });
    } catch (error) {
      console.error(error);
    }
  },
}));
