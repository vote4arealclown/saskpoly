"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import {
  Target,
  Loader2,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  BarChart3,
} from "lucide-react";

interface Report {
  id: string;
  report_date: string;
  recommendation: string;
  details: any;
}

export default function BacktestPage() {
  const supabase = createClient();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadReports();
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);
      }
    };
    init();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("jays_reports")
      .select("*")
      .eq("report_type", "moneyline")
      .order("report_date", { ascending: false })
      .limit(60);
    setReports(data || []);
    setLoading(false);
  };

  const runResolve = async () => {
    setResolving(true);
    const res = await fetch("/api/jays/resolve", { method: "POST" });
    const json = await res.json();
    setResolving(false);
    if (json.error) {
      alert(json.error);
    } else {
      alert(`Resolved ${json.resolved?.length || 0} reports, skipped ${json.skipped?.length || 0}`);
      loadReports();
    }
  };

  const resolved = reports.filter((r) => r.details?.resolved);
  const correct = resolved.filter((r) => r.details?.is_correct === true);
  const wrong = resolved.filter((r) => r.details?.is_correct === false);
  const pass = resolved.filter((r) => r.details?.is_correct === null);
  const accuracy = correct.length + wrong.length > 0 ? correct.length / (correct.length + wrong.length) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          Model Backtest
        </h1>
        {profile?.role === "admin" && (
          <button
            onClick={runResolve}
            disabled={resolving}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center gap-2"
          >
            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {resolving ? "Resolving..." : "Resolve vs Actuals"}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{resolved.length}</p>
          <p className="text-xs text-zinc-500">Resolved</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{correct.length}</p>
          <p className="text-xs text-zinc-500">Correct</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{wrong.length}</p>
          <p className="text-xs text-zinc-500">Wrong</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <Shield className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{(accuracy * 100).toFixed(1)}%</p>
          <p className="text-xs text-zinc-500">Accuracy</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && resolved.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No resolved reports yet.</p>
          {profile?.role === "admin" && (
            <p className="text-sm mt-1">Click "Resolve vs Actuals" to fetch results and calculate accuracy.</p>
          )}
        </div>
      )}

      {!loading && resolved.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h3 className="text-lg font-semibold mb-4">Resolved Reports</h3>
          <div className="space-y-2">
            {resolved.map((r) => {
              const isCorrect = r.details?.is_correct;
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    isCorrect === true
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : isCorrect === false
                      ? "bg-red-500/10 border border-red-500/20"
                      : "bg-zinc-900"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{r.report_date}</p>
                    <p className="text-xs text-zinc-500">{r.recommendation}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">Winner: {r.details?.actual_winner || "?"}</span>
                    {isCorrect === true && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {isCorrect === false && <XCircle className="w-4 h-4 text-red-400" />}
                    {isCorrect === null && <Target className="w-4 h-4 text-zinc-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unresolved count */}
      {!loading && reports.length > resolved.length && (
        <p className="text-center text-sm text-zinc-500 mt-4">
          {reports.length - resolved.length} reports pending resolution.
        </p>
      )}
    </div>
  );
}
