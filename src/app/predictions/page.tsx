"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { Trophy, Calendar, Clock, MessageSquare, Filter, Loader2 } from "lucide-react";

export default function PredictionsPage() {
  const supabase = createClient();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sport, setSport] = useState<string>("all");

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    setLoading(true);
    let query = supabase
      .from("predictions")
      .select("*, picks(count), comments(count)")
      .order("event_date", { ascending: true });

    const { data, error } = await query;
    if (!error) {
      setPredictions(data || []);
    }
    setLoading(false);
  };

  const filtered = predictions.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (status !== "all" && p.status !== status) return false;
    if (sport !== "all") {
      if (sport === "baseball" && p.event_type !== "mlb") return false;
      if (sport === "hockey" && p.event_type !== "nhl") return false;
      if (sport === "basketball" && p.event_type !== "nba") return false;
      if (sport === "football" && p.event_type !== "nfl") return false;
    }
    return true;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "upcoming": return "text-blue-400 bg-blue-400/10";
      case "live": return "text-amber-400 bg-amber-400/10";
      case "resolved": return "text-emerald-400 bg-emerald-400/10";
      default: return "text-zinc-400 bg-zinc-400/10";
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-emerald-400" />
          Predictions
        </h1>
        <div className="flex flex-wrap gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="sports">Sports</option>
            <option value="stocks">Stocks</option>
          </select>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Sports</option>
            <option value="baseball">Baseball (MLB)</option>
            <option value="hockey">Hockey (NHL)</option>
            <option value="basketball">Basketball (NBA)</option>
            <option value="football">Football (NFL)</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No predictions match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/predictions/${p.id}`}
              className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-700 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                    <span className="text-xs text-zinc-500 capitalize">{p.category}</span>
                    <span className="text-xs text-emerald-400">{p.points} pts</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                    {p.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(p.event_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(p.event_date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {p.comments?.[0]?.count ?? 0} comments
                    </span>
                    <span>{p.picks?.[0]?.count ?? 0} picks</span>
                  </div>
                </div>
                {p.image_url && (
                  <img src={p.image_url} alt="" className="w-20 h-20 rounded-xl object-cover hidden sm:block" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
