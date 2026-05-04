"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, TrendingUp, Shield, CreditCard } from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState({ markets: 0, volume: 0 });

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => {
        const markets = Array.isArray(data) ? data : [];
        setStats({
          markets: markets.length,
          volume: markets.reduce((a: number, m: any) => a + (m.totalVolume || 0), 0),
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            SaskPoly
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
            Saskatchewan&apos;s prediction market. Bet on darts, local leagues, and events
            with secure card payments.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/markets"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition"
            >
              Explore Markets
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 px-8 py-3 text-sm font-semibold text-white hover:border-zinc-500 transition"
            >
              Create Event
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white">{stats.markets}</div>
              <div className="text-sm text-zinc-500 mt-1">Active Markets</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">${stats.volume.toLocaleString()}</div>
              <div className="text-sm text-zinc-500 mt-1">Total Volume</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">2.5%</div>
              <div className="text-sm text-zinc-500 mt-1">Platform Vig</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="rounded-2xl border border-zinc-800 p-8">
            <CreditCard className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="text-lg font-semibold text-white">Card Payments</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Securely pay with any credit or debit card via Stripe. No crypto wallet required.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 p-8">
            <TrendingUp className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-white">Self-Regulating Markets</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Prices adjust automatically based on supply and demand. The market finds the true odds.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 p-8">
            <Shield className="w-8 h-8 text-amber-400 mb-4" />
            <h3 className="text-lg font-semibold text-white">Audited Resolutions</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Markets are resolved by admin and audit teams with full transparency and evidence.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
