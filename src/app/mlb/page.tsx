"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getTeamById } from "@/lib/mlb-api";
import {
  Calendar,
  Clock,
  MapPin,
  Zap,
  Loader2,
  TrendingUp,
  Shield,
  Target,
  X,
  Activity,
} from "lucide-react";

interface Game {
  gamePk: number;
  officialDate: string;
  gameDate: string;
  status: { detailedState: string };
  teams: {
    away: { team: { id: number; name: string }; probablePitcher?: { fullName: string } };
    home: { team: { id: number; name: string }; probablePitcher?: { fullName: string } };
  };
  venue: { name: string; id: number };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function MlbSchedulePage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [analyzeGame, setAnalyzeGame] = useState<Game | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

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

  const loadGames = async () => {
    setLoading(true);
    const res = await fetch(`/api/mlb/schedule?date=${date}`);
    const json = await res.json();
    setGames(json.games || []);
    setLoading(false);
  };

  useEffect(() => {
    if (checking) return;
    loadGames();
  }, [date, checking]);

  const runAnalysis = async (teamId: number) => {
    setAnalyzing(true);
    const res = await fetch("/api/jays/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    const json = await res.json();
    setAnalyzing(false);
    if (json.error) {
      alert(json.error);
    } else {
      setAnalysis(json.report);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-400" />
          MLB Schedule
        </h1>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setDate(today);
            }}
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            Today
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && games.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No games found for {date}.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!loading &&
          games.map((game) => {
            const away = game.teams.away;
            const home = game.teams.home;
            const awayAbbr = getTeamById(away.team.id)?.abbr || away.team.name.slice(0, 3).toUpperCase();
            const homeAbbr = getTeamById(home.team.id)?.abbr || home.team.name.slice(0, 3).toUpperCase();

            return (
              <div
                key={game.gamePk}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {formatTime(game.gameDate)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-600">
                    <MapPin className="w-3 h-3" />
                    {game.venue?.name || "TBD"}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {/* Away Team */}
                  <div className="flex-1">
                    <p className="text-lg font-bold">{awayAbbr}</p>
                    <p className="text-xs text-zinc-500">{away.team.name}</p>
                    {away.probablePitcher && (
                      <p className="text-xs text-zinc-600 mt-1">{away.probablePitcher.fullName}</p>
                    )}
                    <button
                      onClick={() => {
                        setAnalyzeGame(game);
                        setAnalysis(null);
                        runAnalysis(away.team.id);
                      }}
                      className="mt-3 w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-blue-500 hover:text-blue-400 transition flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Analyze {awayAbbr}
                    </button>
                  </div>

                  <div className="px-4 text-sm font-mono text-zinc-500">@</div>

                  {/* Home Team */}
                  <div className="flex-1 text-right">
                    <p className="text-lg font-bold">{homeAbbr}</p>
                    <p className="text-xs text-zinc-500">{home.team.name}</p>
                    {home.probablePitcher && (
                      <p className="text-xs text-zinc-600 mt-1">{home.probablePitcher.fullName}</p>
                    )}
                    <button
                      onClick={() => {
                        setAnalyzeGame(game);
                        setAnalysis(null);
                        runAnalysis(home.team.id);
                      }}
                      className="mt-3 w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-blue-500 hover:text-blue-400 transition flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Analyze {homeAbbr}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Analysis Modal */}
      {analyzeGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Game Analysis</h3>
              <button
                onClick={() => {
                  setAnalyzeGame(null);
                  setAnalysis(null);
                }}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-400 mb-4">
              {getTeamById(analyzeGame.teams.away.team.id)?.abbr} @ {getTeamById(analyzeGame.teams.home.team.id)?.abbr}
              {" "}— {analyzeGame.venue.name}
            </p>

            {analyzing && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-zinc-400">Running 8-factor model...</span>
              </div>
            )}

            {!analyzing && analysis && (
              <div className="space-y-4">
                <div className="rounded-xl bg-zinc-900 p-4">
                  <p className="text-xs text-zinc-500 uppercase mb-1">Recommendation</p>
                  <p className="text-lg font-bold text-blue-400">{analysis.recommendation}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-zinc-900 p-3 text-center">
                    <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{(analysis.focus_prob * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-zinc-500">Win Prob</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 p-3 text-center">
                    <Shield className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{(analysis.confidence * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-zinc-500">Confidence</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 p-3 text-center">
                    <Target className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{(analysis.reliability * 100).toFixed(0)}%</p>
                    <p className="text-[10px] text-zinc-500">Reliability</p>
                  </div>
                </div>

                {analysis.details && (
                  <div className="rounded-xl bg-zinc-900 p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-2">Factor Breakdown</p>
                    <div className="space-y-1.5">
                      {Object.entries(analysis.details)
                        .filter(([key]) => [
                          "home_field", "record", "pitching", "bullpen",
                          "momentum", "park", "weather", "head_to_head"
                        ].includes(key))
                        .slice(0, 6)
                        .map(([key, val]: [string, any]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-zinc-400 capitalize">{key.replace(/_/g, " ")}</span>
                            <span className={val >= 0 ? "text-blue-400" : "text-red-400"}>
                              {val > 0 ? "+" : ""}{(val * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {analysis.pitchers && (
                  <div className="rounded-xl bg-zinc-900 p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-2">Pitching</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-400">{analysis.game?.focus_team}</span>
                        <p className="text-white">ERA {(analysis.pitchers.focus?.era ?? "N/A")}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Opponent</span>
                        <p className="text-white">ERA {(analysis.pitchers.opp?.era ?? "N/A")}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
