"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  CreditCard,
  HelpCircle,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Mail,
} from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState({ markets: 0, volume: 0 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const faqs = [
    {
      q: "What is SaskPoly?",
      a: "SaskPoly is a prediction market platform where users can create and trade on the outcome of real-world events. Buy shares in 'Yes' or 'No' outcomes and profit when the market resolves correctly.",
    },
    {
      q: "How do prediction markets work?",
      a: "You buy shares based on what you think the outcome of an event will be. If you predict correctly, you earn a payout based on the market odds at the time you placed your bet. Prices adjust dynamically based on supply and demand.",
    },
    {
      q: "Is this legal?",
      a: "SaskPoly operates as a skill-based prediction market platform. Users must be 18+ and located in jurisdictions where participation is permitted. Please review our Terms of Service for full details.",
    },
    {
      q: "How do I deposit and withdraw?",
      a: "We use Stripe for secure card payments. Deposits are instant. Withdrawals are processed through our admin team to ensure compliance and security.",
    },
    {
      q: "What is the platform fee?",
      a: "SaskPoly charges a 2.5% vig (platform fee) on each transaction. This helps cover operational costs, security, and market resolution services.",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            SaskPoly
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
            Saskatchewan&apos;s prediction market. Trade on real-world outcomes with
            transparent odds, secure payments, and audited resolutions.
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
              Create Market
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

      {/* Explainer */}
      <section className="border-y border-zinc-800 bg-zinc-950/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
              Prediction markets let you turn your knowledge into profit. Here&apos;s how SaskPoly works in three simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-white">Browse Markets</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Explore active prediction markets across sports, politics, weather, and more. Each market shows live odds and trading volume.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-white">Buy Shares</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Purchase Yes or No shares based on your prediction. The price reflects the market&apos;s current estimate of probability.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-white">Collect Winnings</h3>
              <p className="mt-2 text-sm text-zinc-400">
                When the market resolves, winning shares pay out at $1 per share. The more correct you are, the more you earn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <HelpCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-900/50 transition"
              >
                <span className="font-medium text-white text-sm">{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Investors */}
      <section className="border-y border-zinc-800 bg-zinc-950/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <DollarSign className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white">Investor Relations</h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
              Join us in building the future of prediction markets in Canada. SaskPoly is pioneering
              regulated, transparent forecasting platforms.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="rounded-2xl border border-zinc-800 p-8 text-center">
              <Users className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white">Growing User Base</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Early traction across Saskatchewan with month-over-month user growth and increasing market participation.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 p-8 text-center">
              <TrendingUp className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white">Revenue Model</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Sustainable 2.5% vig on all transactions with plans for premium features, data APIs, and white-label solutions.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 p-8 text-center">
              <Shield className="w-8 h-8 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white">Regulatory Ready</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Built with compliance-first architecture. Auditable resolutions, KYC-ready flows, and transparent fee structures.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition"
            >
              <Mail className="w-4 h-4" />
              Contact Investor Relations
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
