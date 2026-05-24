"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useParams } from "next/navigation";
import {
  Trophy,
  Calendar,
  Clock,
  MessageSquare,
  Loader2,
  Send,
  CheckCircle2,
  User,
  Lock,
} from "lucide-react";

export default function PredictionDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const id = params.id as string;

  const [prediction, setPrediction] = useState<any>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [userPick, setUserPick] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(prof);
      }
      await loadData();
    };
    init();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: pred }, { data: pks }, { data: cms }] = await Promise.all([
      supabase.from("predictions").select("*").eq("id", id).single(),
      supabase.from("picks").select("*, profiles(display_name)").eq("prediction_id", id),
      supabase.from("comments").select("*, profiles(display_name)").eq("prediction_id", id).order("created_at", { ascending: false }),
    ]);
    setPrediction(pred);
    setPicks(pks || []);
    setComments(cms || []);
    setLoading(false);
  };

  const hasStarted = prediction ? new Date() >= new Date(prediction.event_date) : false;

  const handlePick = async () => {
    if (!user || !userPick || hasStarted) return;
    setSubmitting(true);
    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId: id, selectedOption: userPick }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.success) {
      setUserPick("");
      loadData();
    } else {
      alert(json.error || "Failed to place pick");
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      prediction_id: id,
      content: commentText.trim(),
    });
    setSubmitting(false);
    if (!error) {
      setCommentText("");
      loadData();
    }
  };

  const myPick = picks.find((p) => p.user_id === user?.id);
  const pickCounts: Record<string, number> = {};
  picks.forEach((p) => {
    pickCounts[p.selected_option] = (pickCounts[p.selected_option] || 0) + 1;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "upcoming": return "text-blue-400 bg-blue-400/10";
      case "live": return "text-amber-400 bg-amber-400/10";
      case "resolved": return "text-emerald-400 bg-emerald-400/10";
      default: return "text-zinc-400 bg-zinc-400/10";
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-zinc-500">
        <p>Prediction not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor(prediction.status)}`}>
            {prediction.status}
          </span>
          <span className="text-xs text-zinc-500 capitalize">{prediction.category}</span>
          <span className="text-xs text-emerald-400 font-medium">{prediction.points} pts</span>
        </div>
        <h1 className="text-2xl font-bold">{prediction.title}</h1>
        <p className="text-zinc-400 mt-2">{prediction.description}</p>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(prediction.event_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {new Date(prediction.event_date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </span>
          {prediction.resolved_option && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Winner: {prediction.resolved_option}
            </span>
          )}
        </div>
      </div>

      {/* Pick Section */}
      {prediction.status === "upcoming" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            Make Your Pick
          </h2>
          {myPick ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <p className="text-emerald-400 font-medium">
                You picked: <span className="font-bold">{myPick.selected_option}</span>
              </p>
              {myPick.is_correct !== null && (
                <p className={`text-sm mt-1 ${myPick.is_correct ? "text-emerald-400" : "text-red-400"}`}>
                  {myPick.is_correct ? `+${myPick.points_earned} points!` : "Better luck next time!"}
                </p>
              )}
            </div>
          ) : hasStarted ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              <p className="text-amber-400 font-medium">
                Picks are closed — this game started at{" "}
                {new Date(prediction.event_date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          ) : user ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {prediction.options?.map((opt: string) => (
                  <button
                    key={opt}
                    onClick={() => setUserPick(opt)}
                    disabled={hasStarted}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                      userPick === opt
                        ? "bg-emerald-500 text-black"
                        : "bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <button
                onClick={handlePick}
                disabled={!userPick || submitting || hasStarted}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
              >
                {submitting ? "Submitting..." : "Lock In Pick"}
              </button>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Sign in to make a pick.</p>
          )}
        </div>
      )}

      {/* Pick Distribution */}
      {picks.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Pick Distribution</h2>
          <div className="space-y-3">
            {prediction.options?.map((opt: string) => {
              const count = pickCounts[opt] || 0;
              const pct = picks.length > 0 ? (count / picks.length) * 100 : 0;
              return (
                <div key={opt}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300">{opt}</span>
                    <span className="text-zinc-500">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          Comments ({comments.length})
        </h2>

        {user && (
          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                rows={2}
              />
            </div>
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || submitting}
              className="self-end rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    {c.profiles?.display_name || "User"}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-zinc-600 text-center py-6">No comments yet. Be the first!</p>
          )}
        </div>
      </div>
    </div>
  );
}
