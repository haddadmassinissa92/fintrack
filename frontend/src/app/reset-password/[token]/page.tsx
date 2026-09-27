"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const resetPassword = useAuthStore((state) => state.resetPassword);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(token, password);
    setIsLoading(false);

    if (result.success) {
      setIsDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setError(result.message);
    }
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
          <h2 className="font-semibold mb-4">Nouveau mot de passe</h2>

          {isDone ? (
            <p className="text-sm text-accent-700 bg-accent-50 dark:bg-accent-950 rounded-lg px-3 py-3">
              Mot de passe changé ! Redirection vers la connexion...
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-4">
                  {error}
                </p>
              )}

              <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
              />

              <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">
                Confirmez le mot de passe
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6 bg-transparent text-sm"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50"
              >
                {isLoading ? "Enregistrement..." : "Changer le mot de passe"}
              </button>
            </form>
          )}

          <p className="text-sm text-center text-zinc-500 mt-4">
            <Link href="/login" className="text-accent-600 font-medium">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
