// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Falsches Passwort.");
        setLoading(false);
        return;
      }

      // On success, go to the main app
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Es ist ein Fehler aufgetreten. Bitte versuche es später noch einmal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-md border border-slate-200">
        <h1 className="text-xl font-semibold mb-2 text-center">
          Latein-Trainer – Anmeldung
        </h1>
        <p className="text-xs text-slate-600 mb-4 text-center">
          Bitte gib das Passwort ein, um den Trainer zu verwenden.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {loading ? "Prüfe Passwort…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
