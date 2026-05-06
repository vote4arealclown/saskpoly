"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";

export default function MarketsPage() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => setMarkets(Array.isArray(data) ? data : []))
      .catch(() => setMarkets([]));
  }, []);

  const filtered = markets.filter((m) => (filter === "ALL" ? true : m.status === filter));

  const statusIcon = (status: string) => {
    if (status === "OPEN") return <Clock className="w-4 h-4 text-emerald-400" />;
    if (status === "RESOLVED") return <CheckCircle className="w-4 h-4 text-cyan-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-white">Markets</h1>
        <div className="flex gap-2">
          {["ALL", "OPEN", "CLOSED", "RESOLVED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === f
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((market) => {
          const totalPool = market.yesPool + market.noPool;
          const yesProb = totalPool > 0 ? (market.yesPool / totalPool) * 100 : 50;
          return (
            <Link
              key={market.id}
              href={`/markets/${market.id}`}
              className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 hover:border-zinc-600 transition"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-800">
                  {statusIcon(market.status)}
                  {market.status}
                </span>
                <span className="text-xs text-zinc-500">{market.category}</span>
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                {market.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{market.description}</p>
              <div className="mt-6">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Yes {yesProb.toFixed(1)}%</span>
                  <span>No {(100 - yesProb).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${yesProb}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Vol: ${market.totalVolume.toLocaleString()}
                </span>
                <span>{market.bets?.length || 0} bets</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
