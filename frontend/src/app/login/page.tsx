"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyLogin2FA } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // État pour la validation 2FA
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [preAuthToken, setPreAuthToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      if (result.requires2FA && result.preAuthToken) {
        setPreAuthToken(result.preAuthToken);
        setStep("2fa");
        setError("");
      } else {
        router.push("/dashboard");
      }
    } else {
      setError(result.message);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setError("Veuillez saisir votre code à 6 chiffres ou un code de secours.");
      return;
    }

    setError("");
    setIsLoading(true);

    const result = await verifyLogin2FA(preAuthToken, twoFactorCode.trim());
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

        {step === "credentials" ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800"
          >
            <h2 className="font-semibold mb-4 text-base">Connexion</h2>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-4 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
            />

            <label className="block text-sm mb-1 text-zinc-600 dark:text-zinc-400">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <div className="text-right mb-4">
              <Link href="/forgot-password" className="text-xs text-accent-600 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50"
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </button>

            <p className="text-sm text-center text-zinc-500 mt-4">
              Pas encore de compte ?{" "}
              <Link href="/signup" className="text-accent-600 font-medium hover:underline">
                Créer un compte
              </Link>
            </p>
          </form>
        ) : (
          <form
            onSubmit={handle2FASubmit}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4"
          >
            <div className="flex items-center gap-2.5 text-accent-600 mb-1">
              <div className="p-2 bg-accent-50 dark:bg-accent-950/50 rounded-xl">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-white text-base">
                  Double Authentification
                </h2>
                <p className="text-xs text-zinc-500">Protection renforcée (2FA)</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Ouvrez votre application d&apos;authentification (Google Authenticator, Authy...) et entrez le code à 6 chiffres, ou saisissez un code de secours.
            </p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Code à 6 chiffres ou code de secours
              </label>
              <input
                type="text"
                autoFocus
                required
                placeholder="123456 ou a1b2-c3d4"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-center text-lg tracking-widest font-mono bg-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50"
            >
              {isLoading ? "Vérification..." : "Confirmer"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setTwoFactorCode("");
                setError("");
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 pt-1"
            >
              <ArrowLeft size={13} />
              Retour aux identifiants
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
