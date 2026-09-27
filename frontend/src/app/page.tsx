"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function Home() {
  const router = useRouter();
  const { authUser, isCheckingAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isCheckingAuth) return;
    router.replace(authUser ? "/dashboard" : "/login");
  }, [authUser, isCheckingAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-zinc-400 text-sm">Chargement...</p>
    </div>
  );
}
