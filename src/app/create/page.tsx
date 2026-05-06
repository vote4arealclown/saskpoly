"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PlusCircle, Wallet, AlertCircle, Shield } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

const CREATION_FEE = 20;

export default function CreatePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Sports");
  const [closesAt, setClosesAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((data) => setBalance(data.balance ?? 0))
        .catch(() => {});
    }
  }, [session]);

  const isStaff = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "AUDIT";
  const hasEnough = isStaff || balance >= CREATION_FEE;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !hasEnough) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/markets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      trackEvent("market_created", { category });
      router.push(`/markets/${data.id}`);
    } else {
      setError(data.error || "Failed to create market");
    }
  };

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">
        Sign in to create markets.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
        <PlusCircle className="w-6 h-6 text-emerald-400" />
        Create Market
      </h1>

      {isStaff ? (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-4 mb-6 flex items-center gap-3">
          <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-white font-medium">Staff Account</p>
            <p className="text-xs text-zinc-400">You can create markets for free.</p>
          </div>
        </div>
      ) : (
        <>
          <div className={`rounded-xl border p-4 mb-6 flex items-center justify-between ${hasEnough ? "border-emerald-800 bg-emerald-950/20" : "border-amber-800 bg-amber-950/20"}`}>
            <div className="flex items-center gap-3">
              <Wallet className={`w-5 h-5 ${hasEnough ? "text-emerald-400" : "text-amber-400"}`} />
              <div>
                <p className="text-sm text-white font-medium">Creation Fee: ${CREATION_FEE}</p>
                <p className="text-xs text-zinc-400">This will be deducted from your account balance</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white font-medium">${balance.toFixed(2)}</p>
              <p className="text-xs text-zinc-400">Your Balance</p>
            </div>
          </div>

          {!hasEnough && (
            <div className="rounded-xl border border-amber-800 bg-amber-950/20 p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-400 font-medium">Insufficient Balance</p>
                <p className="text-xs text-zinc-400">
                  You need ${CREATION_FEE} to create a market.{" "}
                  <Link href="/deposit" className="text-emerald-400 hover:underline">
                    Deposit funds
                  </Link>
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/20 p-4 mb-6 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Will Saskatoon Blades win the championship?"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the event and resolution criteria..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option>Sports</option>
            <option>Politics</option>
            <option>Weather</option>
            <option>Entertainment</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Closes At</label>
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !hasEnough}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Creating..." : !hasEnough ? `Need $${CREATION_FEE} Balance` : `Create Market — $${CREATION_FEE} Fee`}
        </button>
      </form>
    </div>
  );
}
