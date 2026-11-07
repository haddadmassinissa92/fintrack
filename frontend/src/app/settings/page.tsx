"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Check, ArrowLeft, Download, Lock, Tag, User, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Navbar from "@/components/Navbar";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import ShareManager from "@/components/ShareManager";
import CategoryManager from "@/components/CategoryManager";

const COMMON_CURRENCIES = [
  { code: "DZD", label: "DZD — Dinar algérien" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "USD", label: "USD — Dollar américain" },
  { code: "GBP", label: "GBP — Livre sterling" },
  { code: "MAD", label: "MAD — Dirham marocain" },
  { code: "TND", label: "TND — Dinar tunisien" },
  { code: "CAD", label: "CAD — Dollar canadien" },
  { code: "CHF", label: "CHF — Franc suisse" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { authUser, isCheckingAuth, checkAuth, updateCurrency, exportAccountData, updatePassword, updateProfile, deleteAccount } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const [currency, setCurrency] = useState("DZD");
  const [customCurrency, setCustomCurrency] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Gestion des catégories
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Modifier le profil
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Suppression du compte
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleExport = async () => {
    setIsExporting(true);
    setExportError("");
    const res = await exportAccountData();
    setIsExporting(false);
    if (!res.success) setExportError(res.message);
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isCheckingAuth && !authUser) {
      router.replace("/login");
    }
  }, [authUser, isCheckingAuth, router]);

  useEffect(() => {
    if (!authUser?.currency) return;
    const known = COMMON_CURRENCIES.some((c) => c.code === authUser.currency);
    if (known) {
      setCurrency(authUser.currency);
      setIsCustom(false);
    } else {
      setIsCustom(true);
      setCustomCurrency(authUser.currency);
    }
  }, [authUser?.currency]);

  // Pré-remplir les champs profil dès que authUser est disponible
  useEffect(() => {
    if (authUser) {
      setEditUsername(authUser.username || "");
      setEditEmail(authUser.email || "");
    }
  }, [authUser]);

  const handleSubmitCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = (isCustom ? customCurrency : currency).trim().toUpperCase();
    if (!value) {
      setMessage({ type: "error", text: "Indique un code de devise." });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const result = await updateCurrency(value);
    setIsSaving(false);

    if (result.success) {
      if (result.from && result.to && result.rate !== 1) {
        setMessage({
          type: "success",
          text: `Conversion effectuée : 1 ${result.from} = ${result.rate.toFixed(6)} ${result.to}. Tous tes montants ont été mis à jour.`,
        });
      } else {
        setMessage({ type: "success", text: "Devise mise à jour." });
      }
    } else {
      setMessage({ type: "error", text: result.message });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    const uname = editUsername.trim();
    const mail = editEmail.trim();
    if (!uname || !mail) {
      setProfileMessage({ type: "error", text: "Le nom d'utilisateur et l'email sont requis." });
      return;
    }
    setProfileLoading(true);
    const res = await updateProfile(uname, mail);
    setProfileLoading(false);
    if (res.success) {
      setProfileMessage({ type: "success", text: "Profil mis à jour avec succès !" });
    } else {
      setProfileMessage({ type: "error", text: res.message });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== authUser?.username) {
      setDeleteError("Le nom d'utilisateur ne correspond pas.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    const res = await deleteAccount();
    setDeleteLoading(false);
    if (res.success) {
      router.replace("/login");
    } else {
      setDeleteError(res.message || "Erreur lors de la suppression.");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "Tous les champs sont requis." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Les nouveaux mots de passe ne correspondent pas." });
      return;
    }

    setPasswordLoading(true);
    const res = await updatePassword(currentPassword, newPassword);
    setPasswordLoading(false);

    if (res.success) {
      setPasswordMessage({ type: "success", text: "Mot de passe modifié avec succès !" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordMessage({ type: "error", text: res.message });
    }
  };

  if (isCheckingAuth || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-accent-600 transition"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Retour au tableau de bord
        </button>

        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <SettingsIcon size={20} className="text-accent-600" />
            Paramètres
          </h1>
          <p className="text-sm text-zinc-500">Gère les préférences et la sécurité de ton compte</p>
        </div>

        {/* 1. Catégories personnalisées */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Tag size={18} className="text-accent-600" />
                Catégories de transactions
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Personnalise, renomme ou supprime tes catégories de revenus et de dépenses, ainsi que leurs couleurs et icônes.
              </p>
            </div>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="shrink-0 ml-4 bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
            >
              Gérer les catégories
            </button>
          </div>
        </div>

        {/* 2. Devise du compte */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-1">Devise</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Devise utilisée pour l&apos;affichage de tous tes montants — revenus, dépenses,
            budgets et objectifs d&apos;épargne. Changer de devise convertit automatiquement
            tous tes montants existants au taux de change actuel.
          </p>

          <form onSubmit={handleSubmitCurrency}>
            {message && (
              <p
                className={`text-sm rounded-lg px-3 py-2 mb-4 ${
                  message.type === "success"
                    ? "bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400"
                    : "bg-red-50 dark:bg-red-950/40 text-red-600"
                }`}
              >
                {message.text}
              </p>
            )}

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
              Devise
            </label>
            <select
              value={isCustom ? "custom" : currency}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setIsCustom(true);
                } else {
                  setIsCustom(false);
                  setCurrency(e.target.value);
                }
              }}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-3 bg-white dark:bg-zinc-900 text-sm"
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
              <option value="custom">Autre (code personnalisé)...</option>
            </select>

            {isCustom && (
              <input
                type="text"
                maxLength={8}
                placeholder="Ex. JPY"
                value={customCurrency}
                onChange={(e) => setCustomCurrency(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-white dark:bg-zinc-900 text-sm uppercase"
              />
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
            >
              <Check size={15} strokeWidth={2.5} />
              {isSaving ? "Conversion en cours..." : "Enregistrer la devise"}
            </button>
          </form>
        </div>

        {/* 3. Sécurité : Changer de mot de passe */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-1">
            <Lock size={18} className="text-accent-600" />
            Sécurité — Mot de passe
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Modifie directement ton mot de passe de connexion.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {passwordMessage && (
              <p
                className={`text-sm rounded-lg px-3 py-2 ${
                  passwordMessage.type === "success"
                    ? "bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400"
                    : "bg-red-50 dark:bg-red-950/40 text-red-600"
                }`}
              >
                {passwordMessage.text}
              </p>
            )}

            <div>
              <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
                Mot de passe actuel
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
                Nouveau mot de passe (min. 6 caractères)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
            >
              <Check size={15} strokeWidth={2.5} />
              {passwordLoading ? "Mise à jour..." : "Modifier le mot de passe"}
            </button>
          </form>
        </div>

        {/* 4. Modifier le profil */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-1">
            <User size={18} className="text-accent-600" />
            Mon profil
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Modifie ton nom d&apos;utilisateur et ton adresse e-mail.
          </p>

          <form onSubmit={handleProfileSubmit} className="space-y-3">
            {profileMessage && (
              <p
                className={`text-sm rounded-lg px-3 py-2 ${
                  profileMessage.type === "success"
                    ? "bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400"
                    : "bg-red-50 dark:bg-red-950/40 text-red-600"
                }`}
              >
                {profileMessage.text}
              </p>
            )}

            <div>
              <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
                Nom d&apos;utilisateur
              </label>
              <input
                type="text"
                required
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
                Adresse e-mail
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
            >
              <Check size={15} strokeWidth={2.5} />
              {profileLoading ? "Mise à jour..." : "Enregistrer le profil"}
            </button>
          </form>
        </div>

        {/* 5. Exporter les données */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-1">Exporter mes données</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Télécharge un fichier contenant toutes tes données FinTrack : transactions,
            budgets, objectifs d&apos;épargne, transactions récurrentes, dettes et catégories.
          </p>

          {exportError && (
            <p className="text-sm bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg px-3 py-2 mb-4">
              {exportError}
            </p>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-700 hover:border-accent-500 hover:text-accent-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            <Download size={15} strokeWidth={2} />
            {isExporting ? "Préparation..." : "Télécharger toutes mes données (JSON)"}
          </button>
        </div>

        <ShareManager />

        <PushNotificationToggle />

        {/* 6. Zone de danger : Suppression du compte */}
        <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5">
          <h2 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-1">
            <Trash2 size={18} />
            Zone de danger
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            La suppression de ton compte est irréversible. Toutes tes transactions, budgets, objectifs et paramètres seront définitivement effacés conformément au RGPD.
          </p>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmText("");
              setDeleteError("");
              setShowDeleteModal(true);
            }}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            <Trash2 size={15} />
            Supprimer définitivement mon compte
          </button>
        </div>
      </main>

      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Confirmer la suppression</h3>
                <p className="text-xs text-zinc-500">Action irréversible</p>
              </div>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Pour confirmer la suppression de toutes tes données, saisis ton nom d&apos;utilisateur : <span className="font-semibold text-zinc-900 dark:text-white">{authUser?.username}</span>
            </p>

            {deleteError && (
              <p className="text-sm bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            <input
              type="text"
              placeholder={authUser?.username || "Ton pseudo"}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteLoading || deleteConfirmText !== authUser?.username}
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition flex items-center gap-1.5"
              >
                {deleteLoading ? "Suppression..." : "Supprimer mon compte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
