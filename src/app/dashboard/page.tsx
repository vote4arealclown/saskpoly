"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Calendar,
  Clock,
  Loader2,
  Filter,
  CheckCircle2,
  Lock,
  Zap,
  PenLine,
} from "lucide-react";

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [myPicks, setMyPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [pickingId, setPickingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const [{ data: prof }, { data: preds }, { data: picks }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("predictions")
          .select("*, picks(count), comments(count)")
          .eq("status", "upcoming")
          .order("event_date", { ascending: true }),
        supabase.from("picks").select("prediction_id, selected_option, is_correct, points_earned").eq("user_id", user.id),
      ]);

      setProfile(prof);
      setPredictions(preds || []);
      setMyPicks(picks || []);
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const pickedIds = new Set(myPicks.map((p) => p.prediction_id));

  const filtered = predictions.filter((p) => {
    if (sportFilter === "all") return true;
    if (sportFilter === "baseball") return p.event_type === "mlb";
    if (sportFilter === "hockey") return p.event_type === "nhl";
    if (sportFilter === "basketball") return p.event_type === "nba";
    if (sportFilter === "football") return p.event_type === "nfl";
    return true;
  });

  const upcomingUnpicked = filtered.filter((p) => !pickedIds.has(p.id));
  const upcomingPicked = filtered.filter((p) => pickedIds.has(p.id));

  const hasStarted = (eventDate: string) => new Date() >= new Date(eventDate);

  const handleQuickPick = async (predictionId: string, option: string) => {
    if (!user) return;
    setPickingId(predictionId);
    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId, selectedOption: option }),
    });
    const json = await res.json();
    setPickingId(null);
    if (json.success) {
      const { data: picks } = await supabase
        .from("picks")
        .select("prediction_id, selected_option, is_correct, points_earned")
        .eq("user_id", user.id);
      setMyPicks(picks || []);
    } else {
      alert(json.error || "Failed to place pick");
    }
  };

  const myPickFor = (predictionId: string) =>
    myPicks.find((p) => p.prediction_id === predictionId);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400" />
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Welcome back, {profile?.display_name || user?.email?.split("@")[0]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["admin@saskpoly.xyz", "jasondspooner@gmail.com"].includes(user?.email || "") && (
            <a
              href="/dashboard/blog"
              className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 transition flex items-center gap-1 mr-2"
            >
              <PenLine className="w-3 h-3" />
              Blog Manager
            </a>
          )}
          <Filter className="w-4 h-4 text-zinc-500" />
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Sports</option>
            <option value="baseball">Baseball (MLB)</option>
            <option value="hockey">Hockey (NHL)</option>
            <option value="basketball">Basketball (NBA)</option>
            <option value="football">Football (NFL)</option>
          </select>
        </div>
      </div>

      {/* Upcoming — Need Your Pick */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          Upcoming — Need Your Pick
          {upcomingUnpicked.length > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              {upcomingUnpicked.length}
            </span>
          )}
        </h2>

        {upcomingUnpicked.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
            <p>You&apos;re all caught up! No upcoming predictions need your pick.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {upcomingUnpicked.map((p) => {
              const started = hasStarted(p.event_date);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 uppercase font-bold">
                          {p.event_type}
                        </span>
                        <span className="text-xs text-emerald-400">{p.points} pts</span>
                        {started && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Started
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                      <p className="text-sm text-zinc-400 mt-1">{p.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(p.event_date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(p.event_date).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>{p.picks?.[0]?.count ?? 0} picks</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {started ? (
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl">
                          Picks Closed
                        </span>
                      ) : (
                        p.options?.map((opt: string) => (
                          <button
                            key={opt}
                            onClick={() => handleQuickPick(p.id, opt)}
                            disabled={pickingId === p.id}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 transition disabled:opacity-50"
                          >
                            {pickingId === p.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              opt
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Already Picked */}
      {upcomingPicked.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Already Picked
          </h2>
          <div className="grid gap-3">
            {upcomingPicked.map((p) => {
              const pick = myPickFor(p.id);
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 uppercase font-bold">
                        {p.event_type}
                      </span>
                      <span className="text-sm font-medium text-white">{p.title}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(p.event_date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      @{" "}
                      {new Date(p.event_date).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                      You picked: {pick?.selected_option}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
