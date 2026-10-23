"use client";

import { Users } from "lucide-react";

// Infos du compte affiché (voir GET /accounts/active côté backend). Le
// store est un fichier .js non typé : on décrit la forme ici.
export type ActiveAccount = {
  isShared: boolean;
  ownerId: string;
  username: string;
  currency: string;
};

// Bandeau affiché en haut du dashboard quand on consulte le compte de
// quelqu'un d'autre : rappelle de qui sont les données, dans quelle devise
// elles sont exprimées (celle du propriétaire, pas celle du visiteur), et
// que les modifications sont bien enregistrées sur SON compte.
export default function SharedAccountBanner({
  active,
  onLeave,
}: {
  active: ActiveAccount | null;
  onLeave: () => void;
}) {
  if (!active?.isShared) return null;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
        <Users size={16} strokeWidth={2} className="shrink-0" />
        <span>
          Tu consultes le compte de <strong>{active.username}</strong> (montants en{" "}
          {active.currency}). Toute modification est enregistrée sur son compte.
        </span>
      </p>
      <button
        onClick={onLeave}
        className="text-sm font-medium text-amber-800 dark:text-amber-300 underline whitespace-nowrap"
      >
        Revenir à mon compte
      </button>
    </div>
  );
}
