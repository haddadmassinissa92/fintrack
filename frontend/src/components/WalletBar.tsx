"use client";

import { useState, useEffect } from "react";
import type { ComponentType } from "react";
import {
  Wallet as WalletIcon,
  Plus,
  ArrowRightLeft,
  PiggyBank,
  Banknote,
  TrendingUp,
  CreditCard,
  MoreVertical,
  X,
  Trash2,
  Pencil,
} from "lucide-react";
import { useWalletStore } from "@/store/useWalletStore";
import { useTransactionStore } from "@/store/useTransactionStore";

export type WalletType = "courant" | "epargne" | "especes" | "investissement" | "autre";

export type WalletItem = {
  _id: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  balance: number;
  color: string;
  icon: string;
  isDefault: boolean;
};

const WALLET_ICONS: Record<WalletType, ComponentType<{ size?: number; className?: string }>> = {
  courant: CreditCard,
  epargne: PiggyBank,
  especes: Banknote,
  investissement: TrendingUp,
  autre: WalletIcon,
};

const COLOR_PALETTE = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

export default function WalletBar({ currency }: { currency: string }) {
  const {
    wallets,
    activeWalletId,
    setActiveWalletId,
    getWallets,
    createWallet,
    updateWallet,
    deleteWallet,
    transferBetweenWallets,
  } = useWalletStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletItem | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Formulaire d'ajout / édition
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<"courant" | "epargne" | "especes" | "investissement" | "autre">("courant");
  const [walletInitialBalance, setWalletInitialBalance] = useState("0");
  const [walletColor, setWalletColor] = useState("#10b981");
  const [walletError, setWalletError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulaire de virement interne
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const [transferError, setTransferError] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Menu contextuel
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    getWallets();
  }, [getWallets]);

  // Solde total consolidé
  const totalBalance = wallets.reduce((acc: number, w: WalletItem) => acc + (w.balance || 0), 0);

  const openAddModal = () => {
    setEditingWallet(null);
    setWalletName("");
    setWalletType("courant");
    setWalletInitialBalance("0");
    setWalletColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setWalletError("");
    setShowAddModal(true);
  };

  const openEditModal = (w: WalletItem) => {
    setEditingWallet(w);
    setWalletName(w.name);
    setWalletType(w.type);
    setWalletInitialBalance(String(w.initialBalance));
    setWalletColor(w.color || "#10b981");
    setWalletError("");
    setMenuOpenId(null);
    setShowAddModal(true);
  };

  const openTransferModal = () => {
    if (wallets.length < 2) {
      alert("Il vous faut au moins 2 comptes pour effectuer un virement interne.");
      return;
    }
    setFromWalletId(wallets[0]?._id || "");
    setToWalletId(wallets[1]?._id || "");
    setTransferAmount("");
    setTransferDescription("");
    setTransferError("");
    setShowTransferModal(true);
  };

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) {
      setWalletError("Le nom du portefeuille est requis.");
      return;
    }

    setIsSubmitting(true);
    setWalletError("");

    let res;
    if (editingWallet) {
      res = await updateWallet(editingWallet._id, {
        name: walletName.trim(),
        type: walletType,
        initialBalance: Number(walletInitialBalance) || 0,
        color: walletColor,
      });
    } else {
      res = await createWallet({
        name: walletName.trim(),
        type: walletType,
        initialBalance: Number(walletInitialBalance) || 0,
        color: walletColor,
      });
    }
    setIsSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      // Rafraîchir les transactions et stats
      useTransactionStore.getState().getTransactions(useTransactionStore.getState().lastFilters);
      useTransactionStore.getState().getStats(useTransactionStore.getState().statsMonthYear || {});
    } else {
      setWalletError(res.message);
    }
  };

  const handleDeleteWallet = async (w: WalletItem) => {
    if (w.isDefault) {
      alert("Vous ne pouvez pas supprimer le compte par défaut.");
      return;
    }
    if (confirm(`Supprimer le compte « ${w.name} » ? Ses transactions seront réassignées au compte principal.`)) {
      await deleteWallet(w._id);
      setMenuOpenId(null);
      useTransactionStore.getState().getTransactions(useTransactionStore.getState().lastFilters);
      useTransactionStore.getState().getStats(useTransactionStore.getState().statsMonthYear || {});
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(transferAmount);
    if (!amountNum || amountNum <= 0) {
      setTransferError("Le montant doit être positif.");
      return;
    }
    if (fromWalletId === toWalletId) {
      setTransferError("Les deux comptes doivent être différents.");
      return;
    }

    setIsTransferring(true);
    setTransferError("");

    const res = await transferBetweenWallets({
      fromWalletId,
      toWalletId,
      amount: amountNum,
      description: transferDescription,
    });
    setIsTransferring(false);

    if (res.success) {
      setShowTransferModal(false);
      useTransactionStore.getState().getTransactions(useTransactionStore.getState().lastFilters);
      useTransactionStore.getState().getStats(useTransactionStore.getState().statsMonthYear || {});
    } else {
      setTransferError(res.message);
    }
  };

  return (
    <div className="space-y-3">
      {/* En-tête des comptes et boutons d'action */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <WalletIcon size={16} className="text-accent-600" />
          <h2 className="text-sm font-semibold">Mes Portefeuilles & Comptes</h2>
        </div>
        <div className="flex items-center gap-2">
          {wallets.length >= 2 && (
            <button
              onClick={openTransferModal}
              className="flex items-center gap-1.5 text-xs text-accent-600 border border-accent-600/30 hover:bg-accent-50 dark:hover:bg-accent-950/40 rounded-lg px-2.5 py-1.5 font-medium transition"
            >
              <ArrowRightLeft size={13} />
              Virement interne
            </button>
          )}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:border-accent-500 hover:text-accent-600 rounded-lg px-2.5 py-1.5 transition"
          >
            <Plus size={13} strokeWidth={2.5} />
            Nouveau compte
          </button>
        </div>
      </div>

      {/* Rangée horizontale défilable des comptes */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Carte "Tous les comptes" */}
        <button
          onClick={() => setActiveWalletId(null)}
          className={`flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition ${
            activeWalletId === null
              ? "border-accent-500 bg-accent-50/50 dark:bg-accent-950/20 shadow-sm"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <WalletIcon size={16} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-medium">Patrimoine total</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {formatAmount(totalBalance, currency)}
            </p>
          </div>
        </button>

        {/* Cartes des portefeuilles individuels */}
        {wallets.map((w: WalletItem) => {
          const IconComponent = WALLET_ICONS[w.type] || WalletIcon;
          const isSelected = activeWalletId === w._id;

          return (
            <div
              key={w._id}
              className={`relative flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition group ${
                isSelected
                  ? "border-accent-500 bg-accent-50/50 dark:bg-accent-950/20 shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <button
                onClick={() => setActiveWalletId(isSelected ? null : w._id)}
                className="flex items-center gap-2.5 text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: w.color || "#10b981" }}
                >
                  <IconComponent size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                      {w.name}
                    </p>
                    {w.isDefault && (
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded px-1">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {formatAmount(w.balance || 0, currency)}
                  </p>
                </div>
              </button>

              {/* Bouton options (éditer / supprimer) */}
              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setMenuOpenId(menuOpenId === w._id ? null : w._id)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md"
                  aria-label="Options du compte"
                >
                  <MoreVertical size={14} />
                </button>

                {menuOpenId === w._id && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 py-1 text-xs">
                    <button
                      onClick={() => openEditModal(w)}
                      className="w-full text-left px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      <Pencil size={12} />
                      Modifier
                    </button>
                    {!w.isDefault && (
                      <button
                        onClick={() => handleDeleteWallet(w)}
                        className="w-full text-left px-3 py-1.5 flex items-center gap-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 size={12} />
                        Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL : Ajouter / Modifier un Portefeuille */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingWallet ? "Modifier le compte" : "Nouveau portefeuille / compte"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} />
              </button>
            </div>

            {walletError && (
              <p className="text-xs bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg p-2.5">
                {walletError}
              </p>
            )}

            <form onSubmit={handleWalletSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Nom du compte
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Livret A, Espèces, Boursorama..."
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Type de compte
                </label>
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value as WalletType)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                >
                  <option value="courant">Compte Courant</option>
                  <option value="epargne">Épargne / Livret</option>
                  <option value="especes">Espèces / Cash</option>
                  <option value="investissement">Investissement / Crypto</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Solde de départ ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={walletInitialBalance}
                  onChange={(e) => setWalletInitialBalance(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Couleur du badge
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setWalletColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        walletColor === c ? "border-zinc-900 dark:border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium bg-accent-600 hover:bg-accent-700 text-white disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Enregistrement..." : editingWallet ? "Modifier" : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Virement Interne entre Portefeuilles */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-accent-600" />
                Virement interne
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Transfère de l&apos;argent entre tes propres comptes sans fausser tes statistiques de dépenses globales.
            </p>

            {transferError && (
              <p className="text-xs bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg p-2.5">
                {transferError}
              </p>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Compte source (Débité)
                </label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                >
                  {wallets.map((w: WalletItem) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({formatAmount(w.balance || 0, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Compte destination (Crédité)
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                >
                  {wallets.map((w: WalletItem) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({formatAmount(w.balance || 0, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Montant à transférer ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Motif / Description (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Épargne du mois, Remboursement..."
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium bg-accent-600 hover:bg-accent-700 text-white disabled:opacity-50 transition"
                >
                  {isTransferring ? "Virement en cours..." : "Effectuer le virement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
