// store/useAnalyticsStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useAnalyticsStore = create((set) => ({
  monthComparison: null,
  annualReport: null,
  isComparisonLoading: false,
  isAnnualLoading: false,
  comparisonError: null,
  annualError: null,

  getMonthComparison: async (month, year) => {
    set({ isComparisonLoading: true, comparisonError: null });
    try {
      const res = await axiosInstance.get("/transactions/comparison", {
        params: { month, year },
      });
      set({ monthComparison: res.data, isComparisonLoading: false });
      return { success: true, data: res.data };
    } catch (error) {
      const message = error.response?.data?.message || "Erreur de chargement du comparatif";
      set({ comparisonError: message, isComparisonLoading: false });
      return { success: false, message };
    }
  },

  getAnnualReport: async (year) => {
    set({ isAnnualLoading: true, annualError: null });
    try {
      const res = await axiosInstance.get("/transactions/annual-report", {
        params: { year },
      });
      set({ annualReport: res.data, isAnnualLoading: false });
      return { success: true, data: res.data };
    } catch (error) {
      const message = error.response?.data?.message || "Erreur de chargement du bilan annuel";
      set({ annualError: message, isAnnualLoading: false });
      return { success: false, message };
    }
  },
}));
