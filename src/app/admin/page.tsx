"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Shield,
  UserPlus,
  Trophy,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Gamepad2,
  Mail,
  Copy,
  Trash2,
  KeyRound,
  Users,
  MessageSquare,
  Search,
  Bell,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add friend form
  const [friendEmail, setFriendEmail] = useState("");
  const [friendName, setFriendName] = useState("");
  const [friendPassword, setFriendPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userMsg, setUserMsg] = useState("");

  // Create prediction form
  const [predTitle, setPredTitle] = useState("");
  const [predDesc, setPredDesc] = useState("");
  const [predCategory, setPredCategory] = useState<"sports" | "stocks">("sports");
  const [predType, setPredType] = useState("nba_game");
  const [predDate, setPredDate] = useState("");
  const [predOptions, setPredOptions] = useState("");
  const [predPoints, setPredPoints] = useState(10);
  const [creatingPred, setCreatingPred] = useState(false);
  const [predMsg, setPredMsg] = useState("");

  // ESPN import
  const [espnSport, setEspoSport] = useState("nba");
  const [espnDays, setEspoDays] = useState(3);
  const [fetchingEspo, setFetchingEspo] = useState(false);
  const [espnGames, setEspoGames] = useState<any[]>([]);

  // Resolve
  const [predictions, setPredictions] = useState<any[]>([]);
  const [resolveId, setResolveId] = useState("");
  const [resolveOption, setResolveOption] = useState("");
  const [resolving, setResolving] = useState(false);

  // Invites
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  // Control panel
  const [users, setUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [predSearch, setPredSearch] = useState("");
  const [commentSearch, setCommentSearch] = useState("");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deletingPred, setDeletingPred] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifFilter, setNotifFilter] = useState<string>("all");
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data?.role !== "admin") {
        router.push("/predictions");
        return;
      }
      setProfile(data);
      setLoading(false);
      loadPredictions();
      loadInvites();
      loadUsers();
      loadComments();
      loadNotifications();
    };
    checkAdmin();
  }, [router]);

  const loadPredictions = async () => {
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false });
    setPredictions(data || []);
  };

  const loadInvites = async () => {
    const { data } = await supabase
      .from("invites")
      .select("*, used_by_profile:profiles!invites_used_by_fkey(display_name)")
      .order("created_at", { ascending: false });
    setInvites(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(display_name), predictions(title)")
      .order("created_at", { ascending: false })
      .limit(200);
    setComments(data || []);
  };

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setNotifications(data || []);
  };

  const markNotificationRead = async (id: string, read: boolean) => {
    setMarkingRead(id);
    await supabase.from("notifications").update({ read }).eq("id", id);
    setMarkingRead(null);
    loadNotifications();
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    loadNotifications();
  };

  const clearAllNotifications = async () => {
    if (!confirm("Delete all notifications? This cannot be undone.")) return;
    await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    loadNotifications();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg("");
    setCreatingUser(true);
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: friendEmail, password: friendPassword, displayName: friendName }),
    });
    const json = await res.json();
    setCreatingUser(false);
    if (json.error) {
      setUserMsg(json.error);
    } else {
      setUserMsg("Friend added successfully!");
      setFriendEmail("");
      setFriendName("");
      setFriendPassword("");
    }
  };

  const handleCreatePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setPredMsg("");
    setCreatingPred(true);
    const { error } = await supabase.from("predictions").insert({
      title: predTitle,
      description: predDesc,
      category: predCategory,
      event_type: predType,
      event_date: new Date(predDate).toISOString(),
      options: predOptions.split(",").map((o) => o.trim()),
      points: predPoints,
      created_by: profile.id,
    });
    setCreatingPred(false);
    if (error) {
      setPredMsg(error.message);
    } else {
      setPredMsg("Prediction created!");
      setPredTitle("");
      setPredDesc("");
      setPredOptions("");
      loadPredictions();
    }
  };

  const handleFetchESPN = async () => {
    setFetchingEspo(true);
    const res = await fetch("/api/admin/fetch-espn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sport: espnSport, days: espnDays }),
    });
    const json = await res.json();
    setFetchingEspo(false);
    setEspoGames(json.games || []);
  };

  const handleImportGame = async (game: any) => {
    const { error } = await supabase.from("predictions").insert({
      title: `${game.awayTeam} @ ${game.homeTeam}`,
      description: `${game.name} — ${game.status}`,
      category: "sports",
      event_type: espnSport,
      source_api: "espn",
      source_id: game.id,
      event_date: game.date,
      options: [game.awayTeam, game.homeTeam, "Draw"],
      points: 10,
      created_by: profile.id,
    });
    if (error) {
      alert(error.message);
    } else {
      loadPredictions();
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolving(true);
    const res = await fetch("/api/admin/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId: resolveId, resolvedOption: resolveOption }),
    });
    const json = await res.json();
    setResolving(false);
    if (json.error) {
      alert(json.error);
    } else {
      alert("Resolved! Points awarded.");
      loadPredictions();
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg("");
    setGeneratingInvite(true);

    const code = generateCode();
    const { error } = await supabase.from("invites").insert({
      code,
      email: inviteEmail || null,
      note: inviteNote || null,
      created_by: profile.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    setGeneratingInvite(false);
    if (error) {
      setInviteMsg(error.message);
    } else {
      setInviteMsg(`Invite code created: ${code}`);
      setInviteEmail("");
      setInviteNote("");
      loadInvites();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const deleteInvite = async (id: string) => {
    await supabase.from("invites").delete().eq("id", id);
    loadInvites();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user and all their picks/comments? This cannot be undone.")) return;
    setDeletingUser(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setDeletingUser(null);
    if (res.ok) {
      loadUsers();
      loadPredictions();
      loadComments();
      loadInvites();
    } else {
      const json = await res.json();
      alert(json.error || "Failed to delete user");
    }
  };

  const handleDeletePrediction = async (id: string) => {
    if (!confirm("Delete this prediction and all its picks/comments? This cannot be undone.")) return;
    setDeletingPred(id);
    await supabase.from("predictions").delete().eq("id", id);
    setDeletingPred(null);
    loadPredictions();
    loadComments();
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    setDeletingComment(id);
    const res = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
    setDeletingComment(null);
    if (res.ok) {
      loadComments();
    } else {
      const json = await res.json();
      alert(json.error || "Failed to delete comment");
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
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-emerald-400" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Invites */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-400" />
          Send Invites
        </h2>

        <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="email"
            placeholder="Friend's email (optional)"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={inviteNote}
            onChange={(e) => setInviteNote(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={generatingInvite}
            className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {generatingInvite ? "Creating..." : "Generate Invite Code"}
          </button>
        </form>

        {inviteMsg && (
          <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center justify-between">
            <p className="text-emerald-400 font-mono text-lg font-bold">{inviteMsg.replace("Invite code created: ", "")}</p>
            <button
              onClick={() => copyToClipboard(inviteMsg.replace("Invite code created: ", ""))}
              className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              {copiedCode === inviteMsg.replace("Invite code created: ", "") ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">{inv.code}</span>
                  {inv.used_by ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">Used</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {inv.email && <span className="mr-2">{inv.email}</span>}
                  {inv.note && <span className="mr-2">{inv.note}</span>}
                  {inv.used_by_profile?.display_name && (
                    <span>Used by {inv.used_by_profile.display_name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!inv.used_by && (
                  <button
                    onClick={() => copyToClipboard(inv.code)}
                    className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedCode === inv.code ? "Copied!" : "Copy"}
                  </button>
                )}
                <button
                  onClick={() => deleteInvite(inv.id)}
                  className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {invites.length === 0 && (
            <p className="text-sm text-zinc-600 text-center py-4">No invites yet. Generate one above!</p>
          )}
        </div>
      </section>

      {/* Add Friend (direct) */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-400" />
          Add a Friend (Direct)
        </h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Display Name"
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="text"
            required
            placeholder="Temporary Password"
            value={friendPassword}
            onChange={(e) => setFriendPassword(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none md:col-span-2"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creatingUser}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {creatingUser ? "Adding..." : "Add Friend"}
            </button>
            {userMsg && (
              <p className={`mt-2 text-sm flex items-center gap-1 ${userMsg.includes("success") ? "text-emerald-400" : "text-red-400"}`}>
                {userMsg.includes("success") ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {userMsg}
              </p>
            )}
          </div>
        </form>
      </section>

      {/* Create Prediction */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          Create Prediction
        </h2>
        <form onSubmit={handleCreatePrediction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              required
              placeholder="Title"
              value={predTitle}
              onChange={(e) => setPredTitle(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
            <select
              value={predCategory}
              onChange={(e) => setPredCategory(e.target.value as any)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="sports">Sports</option>
              <option value="stocks">Stocks</option>
            </select>
          </div>
          <textarea
            placeholder="Description"
            value={predDesc}
            onChange={(e) => setPredDesc(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Event type (e.g. nba_game)"
              value={predType}
              onChange={(e) => setPredType(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="datetime-local"
              required
              value={predDate}
              onChange={(e) => setPredDate(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="number"
              min={1}
              value={predPoints}
              onChange={(e) => setPredPoints(Number(e.target.value))}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <input
            type="text"
            required
            placeholder="Options (comma separated, e.g. Lakers, Celtics, Draw)"
            value={predOptions}
            onChange={(e) => setPredOptions(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={creatingPred}
            className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            {creatingPred ? "Creating..." : "Create Prediction"}
          </button>
          {predMsg && (
            <p className={`text-sm flex items-center gap-1 ${predMsg.includes("!") ? "text-emerald-400" : "text-red-400"}`}>
              {predMsg.includes("!") ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {predMsg}
            </p>
          )}
        </form>
      </section>

      {/* ESPN Import */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-emerald-400" />
          Import from ESPN
        </h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={espnSport}
            onChange={(e) => setEspoSport(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="nba">NBA</option>
            <option value="nfl">NFL</option>
            <option value="nhl">NHL</option>
            <option value="mlb">MLB</option>
            <option value="mls">MLS</option>
            <option value="epl">EPL</option>
          </select>
          <input
            type="number"
            min={1}
            max={7}
            value={espnDays}
            onChange={(e) => setEspoDays(Number(e.target.value))}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none w-24"
          />
          <button
            onClick={handleFetchESPN}
            disabled={fetchingEspo}
            className="rounded-xl bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition"
          >
            {fetchingEspo ? "Fetching..." : "Fetch Games"}
          </button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {espnGames.map((game) => (
            <div key={game.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{game.awayTeam} @ {game.homeTeam}</p>
                <p className="text-xs text-zinc-500">{new Date(game.date).toLocaleString()} — {game.status}</p>
              </div>
              <button
                onClick={() => handleImportGame(game)}
                className="text-xs rounded-lg bg-emerald-500/20 text-emerald-400 px-3 py-1.5 hover:bg-emerald-500/30 transition"
              >
                Import
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Resolve Predictions */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          Resolve Predictions
        </h2>
        <form onSubmit={handleResolve} className="space-y-4">
          <select
            value={resolveId}
            onChange={(e) => {
              setResolveId(e.target.value);
              setResolveOption("");
            }}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Select a prediction to resolve</option>
            {predictions
              .filter((p) => p.status !== "resolved" && p.status !== "cancelled")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {new Date(p.event_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} @ {new Date(p.event_date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} ({p.category})
                </option>
              ))}
          </select>
          {resolveId && (
            <select
              value={resolveOption}
              onChange={(e) => setResolveOption(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select winning option</option>
              {predictions
                .find((p) => p.id === resolveId)
                ?.options?.map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
          )}
          <button
            type="submit"
            disabled={resolving || !resolveId || !resolveOption}
            className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            {resolving ? "Resolving..." : "Resolve & Award Points"}
          </button>
        </form>
      </section>

      {/* Control Panel */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          Control Panel
        </h2>

        {/* Users */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users
              .filter((u) =>
                !userSearch ||
                u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email?.toLowerCase().includes(userSearch.toLowerCase())
              )
              .map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{u.display_name || u.email?.split("@")[0]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-700 text-zinc-400"}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {u.email} · {u.total_points} pts · {u.correct_picks}/{u.total_picks} correct
                    </div>
                  </div>
                  {u.role !== "admin" && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={deletingUser === u.id}
                      className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {deletingUser === u.id ? "..." : "Delete"}
                    </button>
                  )}
                </div>
              ))}
            {users.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-4">No users found.</p>
            )}
          </div>
        </div>

        {/* Predictions */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Predictions ({predictions.length})
          </h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search predictions..."
              value={predSearch}
              onChange={(e) => setPredSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {predictions
              .filter((p) =>
                !predSearch ||
                p.title?.toLowerCase().includes(predSearch.toLowerCase()) ||
                p.description?.toLowerCase().includes(predSearch.toLowerCase())
              )
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{p.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "resolved" ? "bg-emerald-500/20 text-emerald-400" : p.status === "cancelled" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {p.category} · {p.points} pts · {new Date(p.event_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} @ {new Date(p.event_date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePrediction(p.id)}
                    disabled={deletingPred === p.id}
                    className="ml-3 text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    {deletingPred === p.id ? "..." : "Delete"}
                  </button>
                </div>
              ))}
            {predictions.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-4">No predictions found.</p>
            )}
          </div>
        </div>

        {/* Comments */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comments ({comments.length})
          </h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search comments..."
              value={commentSearch}
              onChange={(e) => setCommentSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comments
              .filter((c) =>
                !commentSearch ||
                c.content?.toLowerCase().includes(commentSearch.toLowerCase()) ||
                c.profiles?.display_name?.toLowerCase().includes(commentSearch.toLowerCase()) ||
                c.predictions?.title?.toLowerCase().includes(commentSearch.toLowerCase())
              )
              .map((c) => (
                <div key={c.id} className="flex items-start justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="text-zinc-300 font-medium">{c.profiles?.display_name || "Unknown"}</span>
                      <span>on</span>
                      <span className="text-zinc-300 truncate">{c.predictions?.title || "Unknown"}</span>
                    </div>
                    <p className="text-sm text-white mt-1 break-words">{c.content}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    disabled={deletingComment === c.id}
                    className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition flex items-center gap-1 disabled:opacity-50 shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                    {deletingComment === c.id ? "..." : "Delete"}
                  </button>
                </div>
              ))}
            {comments.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-4">No comments found.</p>
            )}
          </div>
        </div>
      </section>

      {/* Notification Center */}
      <section id="notifications" className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Notification Center
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                {notifications.filter((n) => !n.read).length} unread
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={notifFilter}
              onChange={(e) => setNotifFilter(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="pick">Picks</option>
              <option value="comment">Comments</option>
              <option value="user_joined">Joins</option>
              <option value="prediction_resolved">Resolutions</option>
              <option value="auto_resolve">Auto-Resolve</option>
            </select>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={markAllRead}
                className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications
            .filter((n) => notifFilter === "all" || n.type === notifFilter)
            .map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between rounded-xl border px-4 py-3 gap-3 ${
                  n.read ? "border-zinc-800 bg-zinc-900 opacity-60" : "border-zinc-700 bg-zinc-800"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      n.type === "pick" ? "bg-blue-500/20 text-blue-400" :
                      n.type === "comment" ? "bg-purple-500/20 text-purple-400" :
                      n.type === "user_joined" ? "bg-emerald-500/20 text-emerald-400" :
                      n.type === "prediction_resolved" ? "bg-amber-500/20 text-amber-400" :
                      "bg-zinc-700 text-zinc-400"
                    }`}>
                      {n.type}
                    </span>
                    <span className="text-zinc-300 font-medium">{n.title}</span>
                    <span>·</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-white mt-1">{n.message}</p>
                  {(n.user_name || n.prediction_title) && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {n.user_name && <span>User: {n.user_name}</span>}
                      {n.user_name && n.prediction_title && <span> · </span>}
                      {n.prediction_title && <span>Prediction: {n.prediction_title}</span>}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => markNotificationRead(n.id, !n.read)}
                  disabled={markingRead === n.id}
                  className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg hover:bg-zinc-600 transition shrink-0"
                  title={n.read ? "Mark unread" : "Mark read"}
                >
                  {markingRead === n.id ? "..." : n.read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            ))}
          {notifications.length === 0 && (
            <p className="text-sm text-zinc-600 text-center py-8">No notifications yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
