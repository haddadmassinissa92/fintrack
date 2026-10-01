// store/useAuthStore.js

import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,

  // Appelée au chargement de l'app pour savoir si un cookie de session
  // valide existe déjà (permet de rester connecté après un rafraîchissement
  // de page)
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (username, email, password) => {
    try {
      const res = await axiosInstance.post("/auth/signup", { username, email, password });
      set({ authUser: res.data });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  login: async (email, password) => {
    try {
      const res = await axiosInstance.post("/auth/login", { email, password });
      set({ authUser: res.data });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  logout: async () => {
    await axiosInstance.post("/auth/logout");
    set({ authUser: null });
  },

  forgotPassword: async (email) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      return { success: true, message: res.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  resetPassword: async (token, password) => {
    try {
      const res = await axiosInstance.post(`/auth/reset-password/${token}`, { password });
      return { success: true, message: res.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },

  updateCurrency: async (currency) => {
    try {
      const res = await axiosInstance.put("/auth/currency", { currency });
      set({ authUser: { ...get().authUser, currency: res.data.currency } });
      return { success: true, rate: res.data.rate, from: res.data.from, to: res.data.to };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Erreur" };
    }
  },
}));
