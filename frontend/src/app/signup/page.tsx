"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await signup(username, email, password);
    setIsLoading(false);
    if (result.success) {
      router.push("/dashboard");
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
          <p className="text-sm text-zinc-500 mt-1">Prenez le contrôle de vos finances</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="font-semibold mb-4">Créer un compte</h2>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Nom d&apos;utilisateur</label>
          <input
            type="text"
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
          />

          <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm"
          />

          <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Mot de passe</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6 bg-transparent text-sm"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50"
          >
            {isLoading ? "Création..." : "Créer mon compte"}
          </button>

          <p className="text-sm text-center text-zinc-500 mt-4">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-accent-600 font-medium">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
