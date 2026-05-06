"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shield, Users, DollarSign, Activity, Mail, MessageSquare, TrendingUp, Trash2, X } from "lucide-react";

type Tab = "markets" | "contacts" | "comments" | "beta";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const [markets, setMarkets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [betaSignups, setBetaSignups] = useState<any[]>([]);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("markets");

  useEffect(() => {
    if (status === "loading") return;
    if (!user || user.role !== "ADMIN") {
      router.push("/");
      return;
    }

    fetch("/api/markets")
      .then((r) => r.json())
      .then((data) => setMarkets(Array.isArray(data) ? data : []));

    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));

    fetch("/api/admin/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []));

    fetch("/api/admin/beta")
      .then((r) => r.json())
      .then((data) => setBetaSignups(Array.isArray(data) ? data : []));

    fetch("/api/admin/comments")
      .then((r) => r.json())
      .then((data) => setAllComments(Array.isArray(data) ? data : []));
  }, [status, user, router]);

  if (status === "loading") {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">Loading...</div>;
  }

  if (!user || user.role !== "ADMIN") return null;

  const totalVolume = markets.reduce((a, m) => a + m.totalVolume, 0);
  const openMarkets = markets.filter((m) => m.status === "OPEN").length;
  const resolvedMarkets = markets.filter((m) => m.status === "RESOLVED").length;

  const tabBtn = (key: Tab, label: string, icon: React.ReactNode) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
        tab === key
          ? "bg-emerald-500 text-black"
          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
        <Shield className="w-6 h-6 text-emerald-400" />
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-zinc-400">Total Markets</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{markets.length}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-zinc-400">Total Volume</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">${totalVolume.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-zinc-400">Open</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{openMarkets}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-zinc-400">Users</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{users.length}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabBtn("markets", "Markets", <Activity className="w-4 h-4" />)}
        {tabBtn("contacts", `Contact Forms (${contacts.length})`, <Mail className="w-4 h-4" />)}
        {tabBtn("comments", `Comments (${allComments.length})`, <MessageSquare className="w-4 h-4" />)}
        {tabBtn("beta", `Beta Signups (${betaSignups.length})`, <TrendingUp className="w-4 h-4" />)}
      </div>

      {tab === "markets" && (
        <>
        <div className="flex justify-end mb-4">
          <button
            onClick={async () => {
              if (!confirm("Delete all sports/football/hockey/darts markets? This cannot be undone.")) return;
              const res = await fetch("/api/admin/purge-sports", { method: "POST" });
              const data = await res.json();
              if (res.ok) {
                alert(`Deleted ${data.deleted} sports market(s).`);
                window.location.reload();
              } else {
                alert(data.error || "Failed to purge markets");
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950 transition"
          >
            <Trash2 className="w-4 h-4" />
            Purge Sports Markets
          </button>
        </div>
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Bets</th>
                <th className="px-4 py-3">Vig</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {markets.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-white font-medium">{m.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === "OPEN"
                          ? "bg-emerald-950 text-emerald-400"
                          : m.status === "RESOLVED"
                          ? "bg-cyan-950 text-cyan-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">${m.totalVolume.toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-300">{m.bets?.length || 0}</td>
                  <td className="px-4 py-3 text-zinc-300">{m.vigPercent}%</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${m.title}"? This cannot be undone.`)) return;
                        const res = await fetch(`/api/markets/${m.id}`, { method: "DELETE" });
                        if (res.ok) {
                          setMarkets((prev) => prev.filter((x) => x.id !== m.id));
                        } else {
                          alert("Failed to delete market");
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-950 text-zinc-500 hover:text-red-400 transition"
                      title="Delete market"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {tab === "contacts" && (
        <div className="space-y-4">
          {contacts.length === 0 ? (
            <p className="text-zinc-500 text-sm">No contact submissions yet.</p>
          ) : (
            contacts.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span className="text-white font-medium">{c.name}</span>
                    <span className="text-zinc-500 text-sm">{c.email}</span>
                  </div>
                  <span className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="mb-2">
                  <span className="inline-flex rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-800">
                    {c.subject}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{c.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "comments" && (
        <div className="space-y-4">
          {allComments.length === 0 ? (
            <p className="text-zinc-500 text-sm">No comments yet.</p>
          ) : (
            allComments.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="text-white font-medium">{c.user?.name || c.user?.email || "Anonymous"}</span>
                    <span className="text-xs text-zinc-500">on</span>
                    <a href={`/markets/${c.market?.id}`} className="text-sm text-emerald-400 hover:underline">
                      {c.market?.title || "Unknown market"}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleString()}</span>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this comment?")) return;
                        const res = await fetch(`/api/markets/${c.marketId}/comments/${c.id}`, { method: "DELETE" });
                        if (res.ok) {
                          setAllComments((prev) => prev.filter((x) => x.id !== c.id));
                        } else {
                          alert("Failed to delete comment");
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-950 text-zinc-500 hover:text-red-400 transition"
                      title="Delete comment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "beta" && (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Province</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {betaSignups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500 text-sm">
                    No beta signups yet.
                  </td>
                </tr>
              ) : (
                betaSignups.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-white font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-zinc-300">{b.email}</td>
                    <td className="px-4 py-3 text-zinc-300">{b.province}</td>
                    <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{b.message || "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
