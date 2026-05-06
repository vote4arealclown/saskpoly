"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, TrendingUp, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

export default function MyBetsPage() {
  const { data: session } = useSession();
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/bets")
        .then((r) => r.json())
        .then((data) => {
          setBets(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Wallet className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white">Connect Wallet</h1>
        <p className="mt-2 text-zinc-400">Connect your wallet to view your bets.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-zinc-400">Loading your bets...</p>
      </div>
    );
  }

  const activeBets = bets.filter((b) => b.status === "ACTIVE");
  const settledBets = bets.filter((b) => b.status !== "ACTIVE");

  const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
  const totalWon = settledBets.filter((b) => b.status === "WON").reduce((sum, b) => sum + (b.payout || 0), 0);
  const totalLost = settledBets.filter((b) => b.status === "LOST").reduce((sum, b) => sum + b.amount, 0);
  const netPnl = totalWon - totalLost;

  const statusBadge = (status: string, payout?: number) => {
    if (status === "ACTIVE") return <span className="inline-flex items-center gap-1 text-xs text-amber-400"><Clock className="w-3 h-3" /> Active</span>;
    if (status === "WON") return <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" /> Won +${(payout || 0).toFixed(2)}</span>;
    if (status === "LOST") return <span className="inline-flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3 h-3" /> Lost</span>;
    return <span className="text-xs text-zinc-500">{status}</span>;
  };

  const BetCard = ({ bet }: { bet: any }) => {
    const m = bet.market;
    const totalPool = m.yesPool + m.noPool;
    const yesProb = totalPool > 0 ? (m.yesPool / totalPool) * 100 : 50;
    const currentOdds = bet.outcome ? yesProb : 100 - yesProb;

    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/markets/${m.slug || m.id}`}
              className="text-sm font-medium text-white hover:text-emerald-400 transition line-clamp-1"
            >
              {m.title}
            </Link>
            <div className="mt-1 flex items-center gap-3">
              {statusBadge(bet.status, bet.payout)}
              <span className="text-xs text-zinc-500">{m.status}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">${bet.amount.toFixed(2)}</p>
            <p className="text-xs text-zinc-500">{bet.outcome ? "Yes" : "No"}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500">Shares</p>
            <p className="text-sm font-medium text-white">{bet.shares?.toFixed(2) || "—"}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500">Odds</p>
            <p className="text-sm font-medium text-white">{currentOdds.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500">Potential</p>
            <p className="text-sm font-medium text-emerald-400">
              {bet.status === "ACTIVE"
                ? `~$${(bet.shares || 0).toFixed(2)}`
                : bet.payout
                ? `$${bet.payout.toFixed(2)}`
                : "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          {new Date(bet.createdAt).toLocaleDateString()}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-emerald-400" />
        My Bets
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-500">Total Wagered</p>
          <p className="text-lg font-bold text-white">${totalWagered.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-500">Net P&L</p>
          <p className={`text-lg font-bold ${netPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-500">Active Bets</p>
          <p className="text-lg font-bold text-white">{activeBets.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs text-zinc-500">Settled</p>
          <p className="text-lg font-bold text-white">{settledBets.length}</p>
        </div>
      </div>

      {bets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-4">No bets yet.</p>
          <Link href="/markets" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
            Browse markets <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {activeBets.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Active ({activeBets.length})</h2>
              <div className="space-y-4">
                {activeBets.map((bet) => (
                  <BetCard key={bet.id} bet={bet} />
                ))}
              </div>
            </div>
          )}

          {settledBets.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Settled ({settledBets.length})</h2>
              <div className="space-y-4">
                {settledBets.map((bet) => (
                  <BetCard key={bet.id} bet={bet} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
