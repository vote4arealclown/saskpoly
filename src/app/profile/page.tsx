"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, Trophy, Target, Loader2, Save, Lock, KeyRound, Flame, Ticket } from "lucide-react";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myPicks, setMyPicks] = useState<any[]>([]);

  // Login streak
  const [streak, setStreak] = useState(0);
  const [lastLoginDate, setLastLoginDate] = useState<string | null>(null);
  const [ticketReady, setTicketReady] = useState(false);
  const [loginMsg, setLoginMsg] = useState("");
  const [claiming, setClaiming] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(prof);
      setDisplayName(prof?.display_name || "");
      setStreak(prof?.login_streak || 0);
      setLastLoginDate(prof?.last_login_date || null);
      setTicketReady((prof?.login_streak || 0) >= 10);

      const { data: picks } = await supabase
        .from("picks")
        .select("*, predictions(title, status, resolved_option)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setMyPicks(picks || []);

      setLoading(false);

      // Auto-check daily login
      await checkDailyLogin();
    };
    init();
  }, [router]);

  const checkDailyLogin = async () => {
    try {
      const res = await fetch("/api/user/daily-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      const json = await res.json();
      if (json.success && !json.alreadyChecked && json.awarded > 0) {
        setStreak(json.streak);
        setLastLoginDate(json.last_login_date);
        setTicketReady(json.ticketReady);
        setLoginMsg(json.message);
        // Refresh profile points
        const { data: prof } = await supabase
          .from("profiles")
          .select("total_points")
          .eq("id", user?.id)
          .single();
        if (prof) setProfile((p: any) => ({ ...p, total_points: prof.total_points }));
      }
    } catch {
      // Silent fail - login streak is a nice-to-have
    }
  };

  const handleClaimTicket = async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/user/daily-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });
      const json = await res.json();
      if (json.success) {
        setStreak(json.streak);
        setTicketReady(false);
        setLoginMsg(`Ticket claimed! +${json.awarded} bonus points!`);
        setProfile((p: any) => ({ ...p, total_points: json.total_points }));
      } else {
        setLoginMsg(json.error || "Claim failed");
      }
    } catch {
      setLoginMsg("Network error");
    }
    setClaiming(false);
  };

  // Compute stats live from picks (not cached profiles table)
  const computedStats = {
    total_picks: myPicks.length,
    correct_picks: myPicks.filter((p) => p.is_correct === true).length,
    total_points: myPicks.reduce((sum, p) => sum + (p.points_earned || 0), 0),
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg("");

    if (newPassword.length < 6) {
      setPasswordMsg("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match");
      return;
    }

    setPasswordLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: currentPassword,
    });

    if (signInError) {
      setPasswordLoading(false);
      setPasswordMsg("Current password is incorrect");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPasswordLoading(false);

    if (updateError) {
      setPasswordMsg(updateError.message);
    } else {
      setPasswordMsg("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <User className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile?.display_name || user?.email}</h1>
            <p className="text-sm text-zinc-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-zinc-900 p-4 text-center">
            <Trophy className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-xl font-bold">{profile?.total_points ?? 0}</p>
            <p className="text-xs text-zinc-500">Points</p>
          </div>
          <div className="rounded-xl bg-zinc-900 p-4 text-center">
            <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xl font-bold">{computedStats.correct_picks}/{computedStats.total_picks}</p>
            <p className="text-xs text-zinc-500">Correct</p>
          </div>
          <div className="rounded-xl bg-zinc-900 p-4 text-center">
            <p className="text-xl font-bold">
              {computedStats.total_picks > 0
                ? ((computedStats.correct_picks / computedStats.total_picks) * 100).toFixed(0)
                : 0}
              %
            </p>
            <p className="text-xs text-zinc-500">Accuracy</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display Name"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Login Streak */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          Daily Login Streak
        </h2>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <span className="text-lg font-bold text-orange-400">{streak}</span>
            </div>
            <div>
              <p className="text-sm font-medium">
                {streak === 0 ? "No active streak" : `${streak} day${streak === 1 ? "" : "s"} in a row`}
              </p>
              <p className="text-xs text-zinc-500">
                {lastLoginDate ? `Last login: ${lastLoginDate}` : "Login daily to build your streak"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Next reward</p>
            <p className="text-sm font-medium text-orange-400">
              {streak >= 10 ? "Ticket ready!" : "+1 point tomorrow"}
            </p>
          </div>
        </div>

        {/* Streak progress dots */}
        <div className="flex gap-1.5 mb-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${
                i < streak ? "bg-orange-400" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>

        {/* Login ticket */}
        {ticketReady && (
          <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-center">
            <Ticket className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-400 mb-1">10-Day Login Ticket Ready!</p>
            <p className="text-xs text-zinc-500 mb-3">Claim your bonus 10 points</p>
            <button
              onClick={handleClaimTicket}
              disabled={claiming}
              className="rounded-xl bg-amber-500 px-6 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition flex items-center gap-2 mx-auto"
            >
              {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              {claiming ? "Claiming..." : "Claim 10 Points"}
            </button>
          </div>
        )}

        {loginMsg && (
          <p className={`text-sm text-center mt-3 ${loginMsg.includes("claimed") || loginMsg.includes("Day") ? "text-emerald-400" : "text-red-400"}`}>
            {loginMsg}
          </p>
        )}
      </div>

      {/* Password Change */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-400" />
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <input
            type="password"
            required
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="password"
            required
            placeholder="New Password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="password"
            required
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={passwordLoading}
            className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.includes("successfully") ? "text-emerald-400" : "text-red-400"}`}>
              {passwordMsg}
            </p>
          )}
        </form>
      </div>

      <h2 className="text-lg font-semibold mb-4">My Picks</h2>
      <div className="space-y-3">
        {myPicks.map((pick) => (
          <div
            key={pick.id}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium">{pick.predictions?.title}</p>
              <p className="text-xs text-zinc-500">
                You picked: {pick.selected_option}
              </p>
            </div>
            <div className="text-right">
              {pick.is_correct === null ? (
                <span className="text-xs text-zinc-500">Pending</span>
              ) : pick.is_correct ? (
                <span className="text-xs text-emerald-400 font-medium">+{pick.points_earned} pts</span>
              ) : (
                <span className="text-xs text-red-400">Wrong</span>
              )}
            </div>
          </div>
        ))}
        {myPicks.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-8">No picks yet. Go make some predictions!</p>
        )}
      </div>
    </div>
  );
}
