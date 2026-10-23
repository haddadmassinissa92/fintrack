"use client";

import { useEffect, useState } from "react";
import { Users, Check } from "lucide-react";
import { useAccountStore } from "@/store/useAccountStore";

type SharedWithMe = {
  _id: string;
  owner: { _id: string; username: string };
};

// Menu de la barre de navigation pour passer de son compte à un compte
// partagé avec soi. N'apparaît que si au moins un compte est partagé avec
// l'utilisateur (ou s'il en consulte un en ce moment).
export default function AccountSwitcher() {
  const sharedWithMe = useAccountStore((state) => state.sharedWithMe) as SharedWithMe[];
  const activeOwnerId = useAccountStore((state) => state.activeOwnerId) as string | null;
  const getAccounts = useAccountStore((state) => state.getAccounts);
  const switchTo = useAccountStore((state) => state.switchTo);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getAccounts();
  }, [getAccounts]);

  if (sharedWithMe.length === 0 && !activeOwnerId) return null;

  const current = activeOwnerId ? sharedWithMe.find((s) => s.owner._id === activeOwnerId) : null;
  const label = activeOwnerId ? `Compte de ${current?.owner.username ?? "…"}` : "Mon compte";

  const choose = (ownerId: string | null) => {
    setOpen(false);
    if (ownerId !== activeOwnerId) switchTo(ownerId);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Changer de compte"
        className={`flex items-center gap-1.5 text-sm rounded-lg px-2 py-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          activeOwnerId ? "text-amber-700 dark:text-amber-400" : "text-zinc-500"
        }`}
      >
        <Users size={16} strokeWidth={2} />
        <span className="hidden sm:inline max-w-[140px] truncate">{label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 py-1">
            <button
              onClick={() => choose(null)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Mon compte
              {!activeOwnerId && <Check size={14} className="text-accent-600" strokeWidth={2.5} />}
            </button>
            {sharedWithMe.map((share) => (
              <button
                key={share._id}
                onClick={() => choose(share.owner._id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span className="truncate">Compte de {share.owner.username}</span>
                {activeOwnerId === share.owner._id && (
                  <Check size={14} className="text-accent-600 shrink-0" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
