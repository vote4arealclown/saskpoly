"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { MLB_TEAMS } from "@/lib/mlb-api";
import {
  Trophy,
  Loader2,
  TrendingUp,
  Wind,
  Thermometer,
  Calendar,
  Target,
  Shield,
  Zap,
  Users,
  Droplets,
  MapPin,
  BarChart3,
  Activity,
} from "lucide-react";

type ReportType = "moneyline" | "runline" | "hr_props" | "pitcher_props";

const REPORT_TYPES: { value: ReportType; label: string; icon: any }[] = [
  { value: "moneyline", label: "Moneyline", icon: Trophy },
  { value: "runline", label: "Runline", icon: BarChart3 },
  { value: "hr_props", label: "HR Props", icon: Activity },
  { value: "pitcher_props", label: "Pitcher", icon: Target },
];

export default function JaysPage() {
  const supabase = createClient();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [teamId, setTeamId] = useState<number>(141);
  const [reportType, setReportType] = useState<ReportType>("moneyline");

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
  }, [reportType]);

  const loadReports = async () => {
    setLoading(true);
    const res = await fetch("/api/jays/latest");
    const json = await res.json();
    // Filter by report type on client side
    const filtered = (json.reports || []).filter((r: any) => r.report_type === reportType);
    setReports(filtered);
    setLoading(false);
  };

  const generateReport = async () => {
    setLoading(true);
    const endpoint =
    reportType === "moneyline"
      ? "/api/jays/run"
      : reportType === "runline"
      ? "/api/jays/runline"
      : reportType === "hr_props"
      ? "/api/jays/hr-props"
      : "/api/jays/pitcher-props";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.error) {
      alert(json.error);
    } else {
      loadReports();
    }
  };

  const latest = reports[0];
  const teamName = MLB_TEAMS.find((t) => t.id === teamId)?.name || "Blue Jays";
  const teamAbbr = MLB_TEAMS.find((t) => t.id === teamId)?.abbr || "TOR";

  const factorLabel = (key: string) => {
    const labels: Record<string, string> = {
      home_field: "Home Field",
      record: "Season Record",
      pitching: "Starting Pitching",
      bullpen: "Bullpen Quality",
      momentum: "Recent Momentum",
      park: "Park Factor",
      weather: "Weather",
      head_to_head: "Head-to-Head",
    };
    return labels[key] || key;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-400" />
            {teamName} Smart Bet
          </h1>
          <a href="/jays/daily-report" className="text-xs px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition">
            Daily Report
          </a>
          <a href="/jays/backtest" className="text-xs px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition">
            Backtest
          </a>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={teamId}
            onChange={(e) => setTeamId(Number(e.target.value))}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {MLB_TEAMS.map((t) => (
              <option key={t.id} value={t.id}>{t.abbr} — {t.name}</option>
            ))}
          </select>
          {profile?.role === "admin" && (
            <button
              onClick={generateReport}
              disabled={loading}
              className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-blue-400 disabled:opacity-50 transition flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? "Running..." : "Run Model"}
            </button>
          )}
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 mb-6">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const active = reportType === rt.value;
          return (
            <button
              key={rt.value}
              onClick={() => setReportType(rt.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                active
                  ? "bg-blue-500 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {rt.label}
            </button>
          );
        })}
      </div>

      {loading && !latest && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No {reportType} reports yet.</p>
          {profile?.role === "admin" && <p className="text-sm mt-1">Select a team and click "Run Model" to generate the first report.</p>}
        </div>
      )}

      {latest && reportType === "moneyline" && (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">{latest.report_date}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 uppercase">{latest.report_type}</span>
            </div>
            <h2 className="text-xl font-bold mb-1">{latest.recommendation}</h2>
            <p className="text-zinc-400 text-sm">vs {latest.opponent} @ {latest.venue}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="rounded-xl bg-zinc-900 p-4 text-center">
                <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{(latest.focus_prob * 100).toFixed(1)}%</p>
                <p className="text-xs text-zinc-500">{teamAbbr} Win Prob</p>
              </div>
              <div className="rounded-xl bg-zinc-900 p-4 text-center">
                <Target className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{(latest.opp_prob * 100).toFixed(1)}%</p>
                <p className="text-xs text-zinc-500">Opp Win Prob</p>
              </div>
              <div className="rounded-xl bg-zinc-900 p-4 text-center">
                <Shield className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{(latest.confidence * 100).toFixed(1)}%</p>
                <p className="text-xs text-zinc-500">Confidence</p>
              </div>
              <div className="rounded-xl bg-zinc-900 p-4 text-center">
                <Users className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{(latest.reliability * 100).toFixed(0)}%</p>
                <p className="text-xs text-zinc-500">Reliability</p>
              </div>
            </div>
          </div>

          {latest.details && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">8-Factor Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(latest.details as Record<string, number>)
                  .filter(([key]) => [
                    "home_field", "record", "pitching", "bullpen",
                    "momentum", "park", "weather", "head_to_head"
                  ].includes(key))
                  .map(([key, val]) => {
                    const pct = Math.abs(val) * 100;
                    const isPositive = val >= 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400 w-32 shrink-0">{factorLabel(key)}</span>
                        <div className="flex-1 h-2 rounded-full bg-zinc-900 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isPositive ? "bg-blue-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(pct * 5, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-mono w-16 text-right ${isPositive ? "text-blue-400" : "text-red-400"}`}>
                          {val > 0 ? "+" : ""}{(val * 100).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {latest.weather && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Weather</h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-amber-400" />
                  <span className="text-sm">{(latest.weather as any).temp}°F</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-blue-400" />
                  <span className="text-sm">{(latest.weather as any).wind_speed} mph {(latest.weather as any).wind_dir}</span>
                </div>
                {(latest.weather as any).humidity !== null && (
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm">{(latest.weather as any).humidity}% humidity</span>
                  </div>
                )}
                {latest.park_factor && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Park Factor: {latest.park_factor}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {latest.pitchers && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Pitching Matchup</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["focus", "opp"].map((side) => {
                  const p = (latest.pitchers as any)?.[side];
                  if (!p) return null;
                  return (
                    <div key={side} className="rounded-xl bg-zinc-900 p-4">
                      <p className="text-xs text-zinc-500 uppercase mb-1">{side === "focus" ? teamAbbr : "Opponent"}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>ERA: <span className="text-white">{p.era}</span></div>
                        <div>WHIP: <span className="text-white">{p.whip}</span></div>
                        <div>K/9: <span className="text-white">{p.k9}</span></div>
                        <div>BB/9: <span className="text-white">{p.bb9}</span></div>
                        <div>HR/9: <span className="text-white">{p.hr9}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {latest.bullpens && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Bullpen Quality (Weighted by IP)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["focus", "opp"].map((side) => {
                  const b = (latest.bullpens as any)?.[side];
                  if (!b) return null;
                  return (
                    <div key={side} className="rounded-xl bg-zinc-900 p-4">
                      <p className="text-xs text-zinc-500 uppercase mb-1">{side === "focus" ? teamAbbr : "Opponent"}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>ERA: <span className="text-white">{typeof b.era === 'number' ? b.era.toFixed(2) : b.era}</span></div>
                        <div>WHIP: <span className="text-white">{typeof b.whip === 'number' ? b.whip.toFixed(2) : b.whip}</span></div>
                        <div>K/9: <span className="text-white">{typeof b.k9 === 'number' ? b.k9.toFixed(2) : b.k9}</span></div>
                        {b.relievers && <div className="col-span-2 text-xs text-zinc-500">{b.relievers} relievers · {b.total_ip} IP</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {latest && reportType === "runline" && (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">{latest.report_date}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 uppercase">{latest.report_type}</span>
            </div>
            <h2 className="text-xl font-bold mb-1">{latest.recommendation}</h2>
            <p className="text-zinc-400 text-sm">vs {latest.opponent} @ {latest.venue}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              <div className="rounded-xl bg-zinc-900 p-4 text-center">
                <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{(latest.focus_prob * 100).toFixed(1)}%</p>
                <p className="text-xs text-zinc-500">{teamAbbr} Cover -1.5</p>
              </div>
              <div className="rounded-xl bg-zinc-900 p-4 text-center">
                <Target className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{(latest.opp_prob * 100).toFixed(1)}%</p>
                <p className="text-xs text-zinc-500">Opp Cover +1.5</p>
              </div>
              <div className="rounded-xl bg-zinc-900 p-4 text-center">
                <Shield className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{(latest.confidence * 100).toFixed(1)}%</p>
                <p className="text-xs text-zinc-500">Confidence</p>
              </div>
            </div>
          </div>

          {latest.details && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Runline Model Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-zinc-900 p-4">
                  <p className="text-xs text-zinc-500 mb-2">{teamAbbr}</p>
                  <div>Win %: <span className="text-white">{((latest.details as any).focus_record * 100).toFixed(1)}%</span></div>
                  <div>SP ERA: <span className="text-white">{(latest.details as any).focus_pitch_era ?? "N/A"}</span></div>
                </div>
                <div className="rounded-xl bg-zinc-900 p-4">
                  <p className="text-xs text-zinc-500 mb-2">Opponent</p>
                  <div>Win %: <span className="text-white">{((latest.details as any).opp_record * 100).toFixed(1)}%</span></div>
                  <div>SP ERA: <span className="text-white">{(latest.details as any).opp_pitch_era ?? "N/A"}</span></div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {latest.details.park_factor && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Park Factor: {latest.details.park_factor}</span>
                  </div>
                )}
                {latest.details.wind_speed > 0 && (
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-blue-400" />
                    <span>Wind: {latest.details.wind_speed} mph</span>
                  </div>
                )}
                {latest.details.temp !== null && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-400" />
                    <span>Temp: {latest.details.temp}°F</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {latest && reportType === "hr_props" && (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">{latest.report_date}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 uppercase">{latest.report_type}</span>
            </div>
            <h2 className="text-xl font-bold mb-1">{latest.recommendation}</h2>
            <p className="text-zinc-400 text-sm">vs {latest.opponent} @ {latest.venue}</p>
          </div>

          {latest.details?.top_prospects && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Top HR Prospects</h3>
              <div className="space-y-3">
                {(latest.details.top_prospects as any[]).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-zinc-500 w-6">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{p.name} <span className="text-zinc-500">({p.team})</span></p>
                        <p className="text-xs text-zinc-500">{p.hr} HR · {p.pa} PA · ISO {p.iso}</p>
                        {p.vs_ab > 0 && (
                          <p className="text-xs text-zinc-600">vs SP: {p.vs_hr} HR in {p.vs_ab} AB</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-400">{(p.probability * 100).toFixed(1)}%</p>
                      <p className="text-xs text-zinc-500">Implied +{p.implied_odds}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {latest.details?.weather && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Weather & Park</h3>
              <div className="flex flex-wrap gap-6 text-sm">
                {(latest.details.weather as any).temp !== null && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-amber-400" />
                    <span>{(latest.details.weather as any).temp}°F</span>
                  </div>
                )}
                {(latest.details.weather as any).wind_speed > 0 && (
                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-blue-400" />
                    <span>{(latest.details.weather as any).wind_speed} mph {(latest.details.weather as any).wind_dir}</span>
                  </div>
                )}
                {latest.details.park_factor && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <span>Park Factor: {latest.details.park_factor}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {latest && reportType === "pitcher_props" && (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">{latest.report_date}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 uppercase">{latest.report_type}</span>
            </div>
            <h2 className="text-xl font-bold mb-1">{latest.recommendation}</h2>
            <p className="text-zinc-400 text-sm">vs {latest.opponent} @ {latest.venue}</p>
          </div>

          {latest.details?.props && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Pitcher Prop Lines</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Strikeouts", key: "strikeouts", color: "text-cyan-400" },
                  { label: "Innings Pitched", key: "innings_pitched", color: "text-emerald-400" },
                  { label: "Earned Runs", key: "earned_runs", color: "text-amber-400" },
                  { label: "Walks", key: "walks", color: "text-purple-400" },
                ].map((prop) => {
                  const data = (latest.details.props as any)?.[prop.key];
                  if (!data) return null;
                  return (
                    <div key={prop.key} className="rounded-xl bg-zinc-900 p-4 text-center">
                      <p className="text-xs text-zinc-500 uppercase mb-1">{prop.label}</p>
                      <p className={`text-2xl font-bold ${prop.color}`}>{data.expected}</p>
                      {data.over_prob !== undefined && (
                        <p className="text-xs text-zinc-500 mt-1">O{data.line}: {(data.over_prob * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {latest.details?.pitcher && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Starting Pitcher</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                <div className="rounded-xl bg-zinc-900 p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">Name</p>
                  <p className="font-medium">{latest.details.pitcher.name}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">ERA</p>
                  <p className="font-medium">{latest.details.pitcher.era}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">K/9</p>
                  <p className="font-medium">{latest.details.pitcher.k9}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">BB/9</p>
                  <p className="font-medium">{latest.details.pitcher.bb9}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">WHIP</p>
                  <p className="font-medium">{latest.details.pitcher.whip}</p>
                </div>
              </div>
            </div>
          )}

          {latest.details?.opponent_batting && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Opponent Batting</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl bg-zinc-900 p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">OPS</p>
                  <p className="font-medium">{latest.details.opponent_batting.ops}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">K Rate</p>
                  <p className="font-medium">{(latest.details.opponent_batting.strikeout_rate * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-xl bg-zinc-900 p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-1">Runs/Game</p>
                  <p className="font-medium">{latest.details.opponent_batting.runs_per_game}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {reports.length > 1 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h3 className="text-lg font-semibold mb-4">Report History</h3>
          <div className="space-y-2">
            {reports.slice(1).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.report_date}</p>
                  <p className="text-xs text-zinc-500">{r.recommendation}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">{(r.focus_prob * 100).toFixed(1)}%</p>
                  <p className="text-xs text-zinc-500">{reportType === "moneyline" ? teamAbbr : "Cover"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
