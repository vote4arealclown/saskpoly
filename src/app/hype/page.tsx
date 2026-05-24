"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Activity,
  Shield,
  Clock,
  Wind,
  Zap,
  Loader2,
  AlertTriangle,
  Globe,
  Newspaper,
  DollarSign,
  BarChart3,
} from "lucide-react";

interface HypeStatus {
  price: number;
  ema: number;
  rsi: number;
  adx: number;
  session: string;
  bias: string;
  biasReason: string;
  ready: boolean;
  checks: {
    priceAboveEma: boolean;
    rsiOversold: boolean;
    adxStrong: boolean;
    asianSession: boolean;
  };
  target: string;
  signal: string;
  utcTime: string;
  sessionStatus: string;
  sessionTimer: string;
  funding: {
    rate: number;
    ratePct: number;
    nextTime: string;
    markPrice: number;
    indexPrice: number;
    premium: string;
    openInterest: string;
  };
}

interface ChartData {
  labels: string[];
  price: number[];
  ema100: number[];
  rsi14: number[];
  adx14: number[];
  volume: number[];
}

interface NewsItem {
  source: string;
  title: string;
  url: string;
  date: string;
}

export default function HypeDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<HypeStatus | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartHours, setChartHours] = useState(24);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      if (data?.role !== "admin") {
        router.push("/");
        return;
      }
      setChecking(false);
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (checking) return;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [checking, chartHours]);

  const loadData = async () => {
    setLoading(true);
    const [statusRes, chartRes, newsRes] = await Promise.all([
      fetch("/api/hype/status"),
      fetch(`/api/hype/chart?hours=${chartHours}`),
      fetch("/api/hype/news"),
    ]);

    if (statusRes.ok) setStatus(await statusRes.json());
    if (chartRes.ok) setChart(await chartRes.json());
    if (newsRes.ok) {
      const n = await newsRes.json();
      setNews(n.news || []);
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 300;
    const h = 80;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    });
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={points.join(" ")} />
      </svg>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            HYPE Long Bot Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            EMA 100 | RSI ≤ 45 | ADX ≥ 20 | Asian Entries
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />}
          <span className="text-xs text-zinc-500">{status?.utcTime}</span>
        </div>
      </div>

      {!status && loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      )}

      {status && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div
              className={`rounded-2xl border p-6 ${
                status.ready
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Entry Status</h2>
              <p className={`text-3xl font-bold ${status.ready ? "text-emerald-400" : "text-red-400"}`}>
                {status.ready ? "READY" : "WAIT"}
              </p>
              <p className="text-xs text-zinc-500 mt-2">{status.sessionStatus}</p>
              <p className="text-xs text-zinc-500">{status.sessionTimer}</p>
              <div className="mt-3 p-2 rounded-lg bg-zinc-900/50 text-xs text-amber-300">
                📍 {status.target}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Price & Time</h2>
              <p className="text-3xl font-bold">${status.price.toFixed(4)}</p>
              <p className="text-xs text-zinc-500 mt-1">EMA100: ${status.ema.toFixed(2)}</p>
              <p className="text-xs text-zinc-500">Session: {status.session}</p>
              <p className="text-xs text-zinc-500">
                Bias:{" "}
                <span
                  className={
                    status.bias.includes("bull")
                      ? "text-emerald-400"
                      : status.bias.includes("bear")
                      ? "text-red-400"
                      : "text-amber-400"
                  }
                >
                  {status.bias.toUpperCase()}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Indicators</h2>
              {[
                { label: "Price > EMA", ok: status.checks.priceAboveEma, val: `$${status.price.toFixed(2)} > $${status.ema.toFixed(2)}` },
                { label: "RSI ≤ 45", ok: status.checks.rsiOversold, val: status.rsi.toFixed(1) },
                { label: "ADX ≥ 20", ok: status.checks.adxStrong, val: status.adx.toFixed(1) },
                { label: "Asian Session", ok: status.checks.asianSession, val: status.session },
              ].map((check) => (
                <div key={check.label} className="flex justify-between items-center py-1.5 border-b border-zinc-900 last:border-0 text-sm">
                  <span className="text-zinc-400">
                    {check.ok ? "✅" : "❌"} {check.label}
                  </span>
                  <span className={check.ok ? "text-emerald-400" : "text-red-400"}>{check.val}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Funding Rate</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  Rate:{" "}
                  <span className={status.funding.ratePct < 0 ? "text-emerald-400" : "text-red-400"}>
                    {(status.funding.ratePct * 100).toFixed(4)}%
                  </span>
                </div>
                <div>Hourly: {status.funding.rate.toFixed(6)}</div>
                <div>Mark: ${status.funding.markPrice.toFixed(2)}</div>
                <div>Index: ${status.funding.indexPrice.toFixed(2)}</div>
                <div className="col-span-2 text-xs text-zinc-500">OI: {parseFloat(status.funding.openInterest).toFixed(0)} HYPE</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
            <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Signal Logic</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">{status.signal}</p>
            <p className="text-xs text-zinc-500 mt-2">{status.biasReason}</p>
          </div>

          {chart && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-wider text-zinc-500">Price Chart</h2>
                <div className="flex gap-2">
                  {[12, 24, 48, 72].map((h) => (
                    <button
                      key={h}
                      onClick={() => setChartHours(h)}
                      className={`text-xs px-2 py-1 rounded-lg transition ${
                        chartHours === h
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-zinc-900 text-zinc-500 hover:text-white"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <Sparkline data={chart.price} color="#00d4ff" />
              <div className="flex justify-between text-xs text-zinc-600 mt-2">
                <span>{chart.labels[0]}</span>
                <span>{chart.labels[Math.floor(chart.labels.length / 2)]}</span>
                <span>{chart.labels[chart.labels.length - 1]}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center text-xs">
                <div className="rounded-xl bg-zinc-900 p-3">
                  <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="font-bold">{chart.price[chart.price.length - 1]?.toFixed(4)}</p>
                  <p className="text-zinc-500">Price</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-3">
                  <Activity className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <p className="font-bold">{chart.rsi14[chart.rsi14.length - 1]?.toFixed(1)}</p>
                  <p className="text-zinc-500">RSI 14</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-3">
                  <BarChart3 className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <p className="font-bold">{chart.adx14[chart.adx14.length - 1]?.toFixed(1)}</p>
                  <p className="text-zinc-500">ADX 14</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              Latest HYPE News & Mentions
            </h2>
            {news.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent news mentions found.</p>
            ) : (
              <div className="space-y-2">
                {news.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between rounded-xl bg-zinc-900 px-4 py-3 hover:bg-zinc-800 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 uppercase">
                        {item.source}
                      </span>
                      <p className="text-sm mt-1 truncate">{item.title}</p>
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap ml-3">
                      {item.date?.slice(0, 16) || ""}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
