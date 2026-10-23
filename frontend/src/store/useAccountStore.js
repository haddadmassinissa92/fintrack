// store/useAccountStore.js
//
// Comptes partagés : quel compte est consulté (le sien ou celui d'un autre),
// qui a accès au sien, et à quels comptes on a accès.
//
// Principe : les données restent celles du propriétaire. Consulter son
// compte, c'est simplement joindre son identifiant à chaque requête (voir
// lib/axios.js) ; le serveur revérifie le droit à chaque fois.

import { create } from "zustand";
import { axiosInstance, ACTIVE_ACCOUNT_KEY } from "@/lib/axios";

const errorMessage = (error) => error.response?.data?.message || "Erreur";

// Lu au chargement du module : côté navigateur, reflète le compte déjà
// sélectionné avant un rechargement de page. Côté serveur (rendu initial),
// window n'existe pas : null, comme pour un utilisateur sans compte partagé.
const readActiveOwner = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);

export const useAccountStore = create((set, get) => ({
  // Identifiant du propriétaire du compte partagé consulté, ou null si
  // l'utilisateur consulte son propre compte
  activeOwnerId: readActiveOwner(),
  // Infos du compte affiché (voir GET /accounts/active), notamment sa devise
  active: null,
  activeError: false,
  sharedByMe: [],
  sharedWithMe: [],

  getActive: async () => {
    try {
      const res = await axiosInstance.get("/accounts/active");
      set({ active: res.data, activeError: false });
    } catch (error) {
      console.error(error);
      set({ activeError: true });
    }
  },

  getAccounts: async () => {
    try {
      const res = await axiosInstance.get("/accounts");
      set({ sharedByMe: res.data.sharedByMe, sharedWithMe: res.data.sharedWithMe });
    } catch (error) {
      console.error(error);
    }
  },

  // Étape de confirmation : qui se cache derrière cet email ?
  previewMember: async (email) => {
    try {
      const res = await axiosInstance.post("/accounts/preview", { email });
      return { success: true, member: res.data };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  },

  shareWith: async (email) => {
    try {
      await axiosInstance.post("/accounts", { email });
      await get().getAccounts();
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  },

  // Révoque un accès donné, ou quitte un compte partagé avec soi
  removeShare: async (id) => {
    try {
      await axiosInstance.delete(`/accounts/${id}`);
      await get().getAccounts();
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  },

  // Change de compte consulté. Recharge la page : tous les autres stores
  // (transactions, budgets...) contiennent les données de l'ancien compte
  // et doivent repartir de zéro plutôt que de risquer un mélange.
  // ownerId = null pour revenir à son propre compte.
  switchTo: (ownerId) => {
    if (typeof window === "undefined") return;
    if (ownerId) window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, ownerId);
    else window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    window.location.reload();
  },
}));

// Changement de compte dans un AUTRE onglet : celui-ci enverrait désormais
// ses requêtes pour le nouveau compte tout en affichant les anciennes
// données. On recharge pour rester cohérent.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === ACTIVE_ACCOUNT_KEY) window.location.reload();
  });
}
