"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Loader2,
  Trophy,
  BarChart3,
  Activity,
  Target,
  Zap,
  TrendingUp,
  Shield,
  Wind,
  Thermometer,
  Droplets,
  MapPin,
} from "lucide-react";

export default function DailyReportPage() {
  const supabase = createClient();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      loadReports();
    };
    init();
  }, [date]);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("jays_reports")
      .select("*")
      .eq("report_date", date)
      .order("report_type", { ascending: true });
    setReports(data || []);
    setLoading(false);
  };

  const runDaily = async () => {
    setLoading(true);
    const res = await fetch("/api/jays/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    setLoading(false);
    if (json.error) {
      alert(json.error);
    } else {
      loadReports();
    }
  };

  const moneyline = reports.find((r) => r.report_type === "moneyline");
  const runline = reports.find((r) => r.report_type === "runline");
  const hrProps = reports.find((r) => r.report_type === "hr_props");
  const pitcherProps = reports.find((r) => r.report_type === "pitcher_props");

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-400" />
          Daily Report
        </h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
          {profile?.role === "admin" && (
            <button
              onClick={runDaily}
              disabled={loading}
              className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-blue-400 disabled:opacity-50 transition flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? "Running..." : "Run Daily"}
            </button>
          )}
        </div>
      </div>

      {loading && reports.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No reports for {date}.</p>
          {profile?.role === "admin" && <p className="text-sm mt-1">Click "Run Daily" to generate all models.</p>}
        </div>
      )}

      {/* Moneyline Card */}
      {moneyline && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Moneyline</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{moneyline.recommendation}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-zinc-900 p-3 text-center">
              <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{(moneyline.focus_prob * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-zinc-500">Win Prob</p>
            </div>
            <div className="rounded-xl bg-zinc-900 p-3 text-center">
              <Shield className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{(moneyline.confidence * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-zinc-500">Confidence</p>
            </div>
            <div className="rounded-xl bg-zinc-900 p-3 text-center">
              <Target className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{(moneyline.reliability * 100).toFixed(0)}%</p>
              <p className="text-[10px] text-zinc-500">Reliability</p>
            </div>
          </div>
        </div>
      )}

      {/* Runline Card */}
      {runline && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">Runline</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">{runline.recommendation}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-zinc-900 p-3 text-center">
              <TrendingUp className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{(runline.focus_prob * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-zinc-500">Cover -1.5</p>
            </div>
            <div className="rounded-xl bg-zinc-900 p-3 text-center">
              <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{(runline.opp_prob * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-zinc-500">Cover +1.5</p>
            </div>
            <div className="rounded-xl bg-zinc-900 p-3 text-center">
              <Shield className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{(runline.confidence * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-zinc-500">Confidence</p>
            </div>
          </div>
          {runline.details?.focus_expected_runs && (
            <p className="text-xs text-zinc-500 mt-3 text-center">
              Expected Runs: {runline.details.focus_expected_runs} vs {runline.details.opp_expected_runs}
            </p>
          )}
        </div>
      )}

      {/* HR Props Card */}
      {hrProps && hrProps.details?.top_prospects && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold">HR Props</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{hrProps.recommendation}</span>
          </div>
          <div className="space-y-2">
            {(hrProps.details.top_prospects as any[]).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-zinc-500 w-6">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{p.name} <span className="text-zinc-500">({p.team})</span></p>
                    <p className="text-xs text-zinc-500">{p.hr} HR · ISO {p.iso}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-orange-400">{(p.probability * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pitcher Props Card */}
      {pitcherProps && pitcherProps.details?.props && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold">Pitcher Props</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">{pitcherProps.recommendation}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Strikeouts", key: "strikeouts", color: "text-cyan-400" },
              { label: "Innings", key: "innings_pitched", color: "text-emerald-400" },
              { label: "Earned Runs", key: "earned_runs", color: "text-amber-400" },
              { label: "Walks", key: "walks", color: "text-purple-400" },
            ].map((prop) => {
              const data = pitcherProps.details.props[prop.key];
              if (!data) return null;
              return (
                <div key={prop.key} className="rounded-xl bg-zinc-900 p-3 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase mb-1">{prop.label}</p>
                  <p className={`text-xl font-bold ${prop.color}`}>{data.expected}</p>
                  {data.over_prob !== undefined && (
                    <p className="text-[10px] text-zinc-500">O{data.line}: {(data.over_prob * 100).toFixed(0)}%</p>
                  )}
                </div>
              );
            })}
          </div>
          {pitcherProps.details.pitcher && (
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
              <span>SP: {pitcherProps.details.pitcher.name}</span>
              <span>ERA: {pitcherProps.details.pitcher.era}</span>
              <span>K/9: {pitcherProps.details.pitcher.k9}</span>
              <span>WHIP: {pitcherProps.details.pitcher.whip}</span>
            </div>
          )}
        </div>
      )}

      {/* Shared Weather */}
      {(moneyline?.weather || hrProps?.details?.weather) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h3 className="text-lg font-semibold mb-4">Weather & Park</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            {(moneyline?.weather?.temp ?? hrProps?.details?.weather?.temp) !== null && (
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-amber-400" />
                <span>{moneyline?.weather?.temp ?? hrProps?.details?.weather?.temp}°F</span>
              </div>
            )}
            {(moneyline?.weather?.wind_speed ?? hrProps?.details?.weather?.wind_speed) > 0 && (
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-blue-400" />
                <span>{moneyline?.weather?.wind_speed ?? hrProps?.details?.weather?.wind_speed} mph {moneyline?.weather?.wind_dir ?? hrProps?.details?.weather?.wind_dir}</span>
              </div>
            )}
            {(moneyline?.weather?.humidity ?? null) !== null && (
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-cyan-400" />
                <span>{moneyline?.weather?.humidity}% humidity</span>
              </div>
            )}
            {(moneyline?.park_factor ?? hrProps?.details?.park_factor) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span>Park Factor: {moneyline?.park_factor ?? hrProps?.details?.park_factor}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
