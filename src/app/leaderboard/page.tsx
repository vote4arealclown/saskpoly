"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Trophy, Medal, Loader2, User, Target, Zap } from "lucide-react";

export default function LeaderboardPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    const [{ data: profilesData }, { data: picksData }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("picks").select("user_id, points_earned, is_correct"),
    ]);

    const picks = picksData || [];
    const merged = (profilesData || []).map((p: any) => {
      const userPicks = picks.filter((pk: any) => pk.user_id === p.id);
      const total_picks = userPicks.length;
      const correct_picks = userPicks.filter((pk: any) => pk.is_correct === true).length;
      const total_points = userPicks.reduce((sum: number, pk: any) => sum + (pk.points_earned || 0), 0);
      return { ...p, total_picks, correct_picks, total_points };
    });

    merged.sort((a: any, b: any) => b.total_points - a.total_points);
    setProfiles(merged);
    setLoading(false);
  };

  const rankIcon = (i: number) => {
    if (i === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (i === 1) return <Medal className="w-5 h-5 text-zinc-300" />;
    if (i === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-zinc-500">{i + 1}</span>;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Leaderboard
        </h1>
        <p className="text-zinc-400 mt-2">Who&apos;s the best predictor?</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p>No players yet. Start making predictions!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition ${
                i === 0
                  ? "border-yellow-500/20 bg-yellow-500/5"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
              }`}
            >
              <div className="shrink-0">{rankIcon(i)}</div>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{p.display_name || p.email}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {p.correct_picks}/{p.total_picks} correct
                  </span>
                  {p.total_picks > 0 && (
                    <span>{((p.correct_picks / p.total_picks) * 100).toFixed(0)}% accuracy</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Zap className="w-4 h-4" />
                  {p.total_points}
                </div>
                <p className="text-xs text-zinc-500">points</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
