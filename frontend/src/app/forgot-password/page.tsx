"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function ForgotPasswordPage() {
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await forgotPassword(email);
    setIsLoading(false);
    setMessage(result.message);
    setIsSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent-600 flex items-center justify-center mb-3">
            <Wallet size={24} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold">FinTrack</h1>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <Link href="/login" className="flex items-center gap-1 text-xs text-zinc-500 mb-4">
            <ArrowLeft size={14} strokeWidth={2} />
            Retour à la connexion
          </Link>

          <h2 className="font-semibold mb-2">Mot de passe oublié</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Entrez votre email, nous vous envoyons un lien pour en choisir un nouveau.
          </p>

          {isSent ? (
            <p className="text-sm text-accent-700 bg-accent-50 dark:bg-accent-950 rounded-lg px-3 py-3">
              {message}
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50"
              >
                {isLoading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
