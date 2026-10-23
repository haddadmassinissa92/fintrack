"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useAccountStore } from "@/store/useAccountStore";

type SharedByMe = {
  _id: string;
  member: { _id: string; username: string; emailMasked: string };
};

type SharedWithMe = {
  _id: string;
  owner: { _id: string; username: string };
};

type Preview = { username: string; emailMasked: string };

// Carte de la page Paramètres : donner accès à son compte à quelqu'un,
// retirer cet accès, ouvrir ou quitter un compte partagé avec soi.
export default function ShareManager() {
  const sharedByMe = useAccountStore((state) => state.sharedByMe) as SharedByMe[];
  const sharedWithMe = useAccountStore((state) => state.sharedWithMe) as SharedWithMe[];
  const activeOwnerId = useAccountStore((state) => state.activeOwnerId) as string | null;
  const { getAccounts, previewMember, shareWith, removeShare, switchTo } = useAccountStore();

  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    getAccounts();
  }, [getAccounts]);

  // Étape 1 : retrouver la personne derrière l'email, SANS rien partager
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setError("");
    setNotice("");
    setPreview(null);

    setIsBusy(true);
    const result = await previewMember(email);
    setIsBusy(false);

    if (result.success) setPreview(result.member);
    else setError(result.message);
  };

  // Étape 2 : l'utilisateur a vu qui c'est et confirme
  const handleConfirm = async () => {
    if (isBusy || !preview) return;
    setIsBusy(true);
    const result = await shareWith(email);
    setIsBusy(false);

    if (result.success) {
      setNotice(`Ton compte est maintenant partagé avec ${preview.username}.`);
      setPreview(null);
      setEmail("");
    } else {
      setError(result.message);
    }
  };

  const handleRevoke = async (share: SharedByMe) => {
    if (!window.confirm(`Retirer l'accès de ${share.member.username} à ton compte ?`)) return;
    const result = await removeShare(share._id);
    if (!result.success) setError(result.message);
  };

  const handleLeave = async (share: SharedWithMe) => {
    if (!window.confirm(`Quitter le compte de ${share.owner.username} ?`)) return;
    const result = await removeShare(share._id);
    if (!result.success) {
      setError(result.message);
      return;
    }
    // Si on était en train de le consulter, on revient sur son propre compte
    if (activeOwnerId === share.owner._id) switchTo(null);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2">
        <Users size={16} className="text-accent-600" />
        Partage du compte
      </h2>
      <p className="text-sm text-zinc-500 mb-4">
        Donne accès à ton compte à une personne de confiance (conjoint, colocataire...) qui a
        déjà un compte FinTrack. Elle pourra le consulter et le modifier depuis le sien. Tes
        données restent les tiennes : tu peux retirer cet accès à tout moment.
      </p>

      {error && (
        <p className="text-sm bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400 rounded-lg px-3 py-2 mb-4">
          {notice}
        </p>
      )}

      {preview ? (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4 mb-5">
          <p className="text-sm text-amber-900 dark:text-amber-200 mb-1">
            Partager ton compte avec <strong>{preview.username}</strong> ({preview.emailMasked}) ?
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
            Cette personne pourra voir <strong>et modifier</strong> toutes tes données :
            transactions, budgets, objectifs, dettes, catégories... Vérifie que c&apos;est bien la
            bonne personne.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPreview(null)}
              className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={isBusy}
              className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-sm font-medium"
            >
              {isBusy ? "Partage..." : "Confirmer le partage"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSearch} className="flex gap-2 mb-5">
          <input
            type="email"
            required
            placeholder="Email de la personne"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-0 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-transparent text-sm"
          />
          <button
            type="submit"
            disabled={isBusy}
            className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap"
          >
            {isBusy ? "Recherche..." : "Rechercher"}
          </button>
        </form>
      )}

      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
        Ont accès à ton compte
      </h3>
      {sharedByMe.length === 0 ? (
        <p className="text-sm text-zinc-400 mb-5">Personne pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-5">
          {sharedByMe.map((share) => (
            <div key={share._id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">
                {share.member.username}{" "}
                <span className="text-zinc-400">({share.member.emailMasked})</span>
              </span>
              <button
                onClick={() => handleRevoke(share)}
                className="text-xs text-zinc-500 hover:text-red-600 whitespace-nowrap transition"
              >
                Retirer l&apos;accès
              </button>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
        Comptes partagés avec toi
      </h3>
      {sharedWithMe.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun compte n&apos;est partagé avec toi.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sharedWithMe.map((share) => (
            <div key={share._id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">Compte de {share.owner.username}</span>
              <span className="flex items-center gap-3 shrink-0">
                {activeOwnerId === share.owner._id ? (
                  <span className="text-xs text-accent-600">Affiché</span>
                ) : (
                  <button
                    onClick={() => switchTo(share.owner._id)}
                    className="text-xs text-accent-600 hover:underline"
                  >
                    Ouvrir
                  </button>
                )}
                <button
                  onClick={() => handleLeave(share)}
                  className="text-xs text-zinc-500 hover:text-red-600 transition"
                >
                  Quitter
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
