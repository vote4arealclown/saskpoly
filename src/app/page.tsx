"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Smartphone,
  MapPin,
  Eye,
  Scale,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

function SaskatchewanFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 400"
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="flagGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#006341" />
          <stop offset="100%" stopColor="#007A33" />
        </linearGradient>
        <linearGradient id="flagGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD100" />
          <stop offset="100%" stopColor="#E6BC00" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Green top half */}
      <rect x="0" y="0" width="600" height="200" fill="url(#flagGreen)" />
      {/* Gold bottom half */}
      <rect x="0" y="200" width="600" height="200" fill="url(#flagGold)" />

      {/* Prairie Lily - stylized */}
      <g transform="translate(80, 100)" filter="url(#glow)">
        <ellipse cx="0" cy="-25" rx="12" ry="28" fill="white" opacity="0.95" />
        <ellipse cx="22" cy="-12" rx="12" ry="28" fill="white" opacity="0.95" transform="rotate(45, 22, -12)" />
        <ellipse cx="22" cy="12" rx="12" ry="28" fill="white" opacity="0.95" transform="rotate(90, 22, 12)" />
        <ellipse cx="0" cy="25" rx="12" ry="28" fill="white" opacity="0.95" transform="rotate(135, 0, 25)" />
        <ellipse cx="-22" cy="12" rx="12" ry="28" fill="white" opacity="0.95" transform="rotate(180, -22, 12)" />
        <ellipse cx="-22" cy="-12" rx="12" ry="28" fill="white" opacity="0.95" transform="rotate(225, -22, -12)" />
        <circle cx="0" cy="0" r="10" fill="#FFD100" />
        <circle cx="0" cy="0" r="5" fill="#E6A800" />
      </g>
    </svg>
  );
}

function FlowingFlag() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            animation: `flagWave ${3 + i * 0.5}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.2}s`,
            opacity: 0.08 + i * 0.02,
            transform: `scale(${1.1 + i * 0.05})`,
          }}
        >
          <SaskatchewanFlag className="w-full h-full" />
        </div>
      ))}
      <div
        className="absolute inset-0"
        style={{ animation: "flagWave 4s ease-in-out infinite alternate" }}
      >
        <SaskatchewanFlag className="w-full h-full opacity-20" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
      <style jsx>{`
        @keyframes flagWave {
          0% { transform: perspective(1000px) rotateY(-3deg) rotateX(1deg) scale(1.05); }
          100% { transform: perspective(1000px) rotateY(3deg) rotateX(-1deg) scale(1.05); }
        }
      `}</style>
    </div>
  );
}

function ScrollIndicator() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
      <span className="text-xs text-zinc-500 uppercase tracking-widest">Scroll</span>
      <ChevronDown className="w-5 h-5 text-zinc-500" />
    </div>
  );
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [markets, setMarkets] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => setMarkets(Array.isArray(data) ? data : []))
      .catch(() => setMarkets([]));
  }, []);

  const faqs = [
    {
      q: "Is this gambling?",
      a: "SaskPoly is a prediction market — participants trade shares in the outcome of real-world events. It's different from traditional sports betting in that prices are set by market demand, not by a bookmaker. However, participation involves financial risk and the possibility of loss. Only participate with funds you can afford to lose.",
    },
    {
      q: "How do I know markets resolve fairly?",
      a: "Every market has clear, public resolution criteria before it opens. Resolutions are based on publicly verifiable sources — official game scores, government weather data, election results. No black boxes, no secret decisions.",
    },
    {
      q: "What happens if an event is canceled?",
      a: "Each market includes cancellation clauses. If an event is canceled and the market criteria can't be met, all positions are refunded at the price paid. No one wins, no one loses.",
    },
    {
      q: "Who can participate?",
      a: "Currently, SaskPoly is open to Saskatchewan and Alberta residents aged 18 and older. We're working to expand to other provinces. Identity verification is required.",
    },
    {
      q: "How does the 2.5% vig work?",
      a: "The vig (vigorish) is a small fee on transactions that keeps the platform operating. If you buy $100 in shares, you pay $102.50. This is lower than most traditional betting platforms and is displayed transparently before you confirm any trade.",
    },
    {
      q: "How do I get my money out?",
      a: "Withdrawals are processed to your linked bank account within 3-5 business days. Minimum withdrawal is $25. First withdrawal may require additional verification.",
    },
    {
      q: "Is my money safe?",
      a: "Participant funds are held in segregated accounts, separate from operating funds. We don't touch your balance except to process trades you've authorized.",
    },
    {
      q: "Can I change my prediction?",
      a: "Yes — you can sell your shares at any time before market close. The price may be higher or lower than what you paid, depending on how the market has moved.",
    },
    {
      q: "What if I have a problem?",
      a: "Email support@saskpoly.xyz. We aim to respond within 24 hours during business days.",
    },
  ];

  const features = [
    {
      icon: <MapPin className="w-8 h-8 text-emerald-400" />,
      title: "Local Markets",
      desc: "Saskatchewan and prairie-focused outcomes you actually care about — Riders playoffs, prairie weather, Alberta politics.",
    },
    {
      icon: <Eye className="w-8 h-8 text-cyan-400" />,
      title: "Transparent Resolutions",
      desc: "Clear criteria, public resolution, no black boxes. Every market shows exactly how it resolves before you trade.",
    },
    {
      icon: <Scale className="w-8 h-8 text-amber-400" />,
      title: "Simple Participation",
      desc: "Buy Yes or No. Price = probability. Win if you're right. No complicated options, no confusing spreads.",
    },
    {
      icon: <Smartphone className="w-8 h-8 text-purple-400" />,
      title: "Mobile Ready",
      desc: "Trade from your phone, because that's where you live. Clean, fast, and built for thumbs.",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <FlowingFlag />
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-emerald-400">Saskatchewan&apos;s Prediction Market</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white">
            Sask<span className="text-emerald-400">Poly</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Trade on local outcomes — Riders playoffs, prairie weather, Alberta politics, and more. 
            Transparent odds. Real resolutions. Built where Polymarket won&apos;t go.
          </p>

          <p className="mt-4 text-sm text-emerald-400/80 font-medium">
            First markets launching soon.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/markets"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-sm font-semibold text-black hover:bg-emerald-400 transition"
            >
              Explore Markets
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 px-8 py-4 text-sm font-semibold text-white hover:border-zinc-500 transition"
            >
              Create Market
            </Link>
          </div>
        </div>
        <ScrollIndicator />
      </section>

      {/* Active Markets Preview */}
      {markets.length > 0 && (
        <section className="border-y border-zinc-800 bg-zinc-950/50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Active Markets</h2>
              <Link
                href="/markets"
                className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.slice(0, 6).map((market) => {
                const totalPool = market.yesPool + market.noPool;
                const yesProb = totalPool > 0 ? (market.yesPool / totalPool) * 100 : 50;
                const statusIcon = (status: string) => {
                  if (status === "OPEN") return <Clock className="w-3.5 h-3.5 text-emerald-400" />;
                  if (status === "RESOLVED") return <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />;
                  return <XCircle className="w-3.5 h-3.5 text-red-400" />;
                };
                return (
                  <Link
                    key={market.id}
                    href={`/markets/${market.id}`}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-600 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-800">
                        {statusIcon(market.status)}
                        {market.status}
                      </span>
                      <span className="text-xs text-zinc-500">{market.category}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition line-clamp-2">
                      {market.title}
                    </h3>
                    <div className="mt-4">
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
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
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
        </section>
      )}

      {/* Features */}
      <section className="border-y border-zinc-800 bg-zinc-950/50">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Features</h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Everything you need to trade with confidence on outcomes that matter to you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 transition"
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-zinc-800 bg-zinc-950/50">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Prediction markets let you turn your knowledge into profit. Three simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold mb-6 border border-emerald-500/20">
                1
              </div>
              <h3 className="text-lg font-semibold text-white">Browse Markets</h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Explore active prediction markets across sports, politics, weather, and more. Each market shows live odds and trading volume.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto text-2xl font-bold mb-6 border border-cyan-500/20">
                2
              </div>
              <h3 className="text-lg font-semibold text-white">Buy Shares</h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Purchase Yes or No shares based on your prediction. The price reflects the market&apos;s current estimate of probability.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold mb-6 border border-amber-500/20">
                3
              </div>
              <h3 className="text-lg font-semibold text-white">Collect Winnings</h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                When the market resolves, winning shares pay out at $1 per share. The more correct you are, the more you earn.
              </p>
            </div>
          </div>
          <p className="mt-16 text-center text-sm text-zinc-500 max-w-2xl mx-auto">
            Markets resolve based on publicly verifiable outcomes — game scores, weather records, election results. 
            No ambiguity, no disputes.
          </p>
        </div>
      </section>

      {/* Join the Beta */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Join the Beta</h2>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              First 500 participants get early access and reduced vig (1.5%) for the first month. 
              Saskatchewan and Alberta residents prioritized.
            </p>
            <div className="mt-8">
              <Link
                href="/beta"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-sm font-semibold text-black hover:bg-emerald-400 transition"
              >
                <TrendingUp className="w-4 h-4" />
                Get Early Access
              </Link>
            </div>
            <p className="mt-6 text-xs text-zinc-600">
              Must be 18 or older. Saskatchewan and Alberta residents only (initially).
            </p>
          </div>
        </div>
      </section>

      {/* Risk Disclosure Banner */}
      <section className="border-y border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Must be 18 or older to participate. Predictions involve risk of loss. 
            Only participate with funds you can afford to lose. Not investment advice. 
            Currently open to Saskatchewan and Alberta residents only.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <HelpCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-xl border transition overflow-hidden ${
                openFaq === i
                  ? "border-emerald-500/30 bg-zinc-900"
                  : "border-zinc-700 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-900"
              }`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-semibold text-white text-base">{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="w-5 h-5 text-emerald-400 shrink-0 ml-4" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0 ml-4" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-base text-zinc-300 leading-relaxed border-t border-zinc-800 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
