"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Clock, CheckCircle, XCircle, ArrowLeft, Pencil, Trash2, Wallet, MessageSquare, Send, TrendingUp } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export default function MarketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [market, setMarket] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "", closesAt: "", vigPercent: 2.5 });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/markets/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setMarket(data);
        if (data.id) {
          setEditForm({
            title: data.title || "",
            description: data.description || "",
            category: data.category || "",
            closesAt: data.closesAt ? new Date(data.closesAt).toISOString().slice(0, 16) : "",
            vigPercent: data.vigPercent ?? 2.5,
          });
        }
      })
      .catch(() => {});

    fetch(`/api/markets/${id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((data) => setBalance(data.balance ?? 0))
        .catch(() => {});
    }
  }, [session]);

  const placeBet = async () => {
    if (!outcome || !amount) return;
    const val = parseFloat(amount);
    if (val <= 0) { alert("Enter a valid amount"); return; }
    if (val > balance) { alert("Insufficient balance. Deposit funds first."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId: id, amount: val, outcome }),
      });
      if (res.ok) {
        const updated = await fetch(`/api/markets/${id}`).then((r) => r.json());
        setMarket(updated);
        setAmount("");
        setOutcome(null);
        const bal = await fetch("/api/user/balance").then((r) => r.json());
        setBalance(bal.balance ?? 0);
        trackEvent("bet_placed", { outcome: outcome ? "yes" : "no", amount: val });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to place bet");
      }
    } finally { setLoading(false); }
  };

  const resolveMarket = async (resolution: boolean) => {
    const res = await fetch(`/api/markets/${id}/resolve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: resolution }),
    });
    if (res.ok) { const updated = await fetch(`/api/markets/${id}`).then((r) => r.json()); setMarket(updated); }
  };

  const saveEdit = async () => {
    setLoading(true);
    const res = await fetch(`/api/markets/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) { const updated = await fetch(`/api/markets/${id}`).then((r) => r.json()); setMarket(updated); setIsEditing(false); }
    else { const err = await res.json(); alert(err.error || "Failed to update"); }
    setLoading(false);
  };

  const deleteMarket = async () => {
    setLoading(true);
    const res = await fetch(`/api/markets/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/markets");
    else { const err = await res.json(); alert(err.error || "Failed to delete"); }
    setLoading(false);
  };

  if (!market?.id) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">Loading...</div>;

  const totalPool = market.yesPool + market.noPool;
  const yesProb = totalPool > 0 ? (market.yesPool / totalPool) * 100 : 50;
  const noProb = 100 - yesProb;

  // Estimated return for current bet
  const betVal = parseFloat(amount) || 0;
  const vig = betVal * (market.vigPercent / 100);
  const netAmount = betVal - vig;
  let estimatedShares = 0;
  let estimatedPayout = 0;
  if (betVal > 0 && outcome !== null) {
    const currentPool = outcome ? market.yesPool : market.noPool;
    const oppositePool = outcome ? market.noPool : market.yesPool;
    estimatedShares = currentPool === 0 || oppositePool === 0
      ? netAmount
      : (netAmount * oppositePool) / currentPool;
    estimatedShares = Math.max(estimatedShares, 0.01);
    const currentWinningShares = (market.bets || []).filter((b: any) => b.outcome === outcome).reduce((s: number, b: any) => s + (b.shares || 0), 0);
    const newPool = totalPool + netAmount;
    const newWinningShares = currentWinningShares + estimatedShares;
    estimatedPayout = newWinningShares > 0 ? estimatedShares * (newPool / newWinningShares) : 0;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/markets" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to markets
      </Link>

      {user?.role === "ADMIN" && !isEditing && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 transition">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="inline-flex items-center gap-1 rounded-lg border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950 transition">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-400">Are you sure?</span>
              <button onClick={deleteMarket} disabled={loading} className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-red-400 disabled:opacity-50">Yes, delete</button>
              <button onClick={() => setDeleteConfirm(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900">Cancel</button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
        {isEditing ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Edit Market</h3>
            <div><label className="block text-sm text-zinc-400 mb-1">Title</label><input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-zinc-400 mb-1">Description</label><textarea rows={4} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-zinc-400 mb-1">Category</label>
                <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none">
                  <option>Sports</option><option>Politics</option><option>Weather</option><option>Entertainment</option><option>Other</option>
                </select>
              </div>
              <div><label className="block text-sm text-zinc-400 mb-1">Closes At</label><input type="datetime-local" value={editForm.closesAt} onChange={(e) => setEditForm({ ...editForm, closesAt: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-zinc-400 mb-1">Vig %</label><input type="number" step="0.1" value={editForm.vigPercent} onChange={(e) => setEditForm({ ...editForm, vigPercent: parseFloat(e.target.value) })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none" /></div>
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={loading} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              {market.status === "OPEN" && <Clock className="w-5 h-5 text-emerald-400" />}
              {market.status === "RESOLVED" && <CheckCircle className="w-5 h-5 text-cyan-400" />}
              {market.status === "CANCELLED" && <XCircle className="w-5 h-5 text-red-400" />}
              <span className="text-sm font-medium text-zinc-400 uppercase">{market.status}</span>
              <span className="text-xs text-zinc-600">|</span>
              <span className="text-sm text-zinc-500">{market.category}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{market.title}</h1>
            <p className="mt-4 text-zinc-300 leading-relaxed">{market.description}</p>
            <div className="mt-8">
              <div className="flex justify-between text-sm text-zinc-300 mb-2">
                <span>Yes {yesProb.toFixed(1)}% — Pool: ${market.yesPool.toLocaleString()}</span>
                <span>No {noProb.toFixed(1)}% — Pool: ${market.noPool.toLocaleString()}</span>
              </div>
              <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${yesProb}%` }} />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Prices self-level: more money on one side = worse odds for that side, better odds for the other.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl border border-zinc-800 p-4"><div className="text-lg font-bold text-white">${market.totalVolume.toLocaleString()}</div><div className="text-xs text-zinc-500">Total Volume</div></div>
              <div className="rounded-xl border border-zinc-800 p-4"><div className="text-lg font-bold text-white">{market.bets?.length || 0}</div><div className="text-xs text-zinc-500">Bets</div></div>
              <div className="rounded-xl border border-zinc-800 p-4"><div className="text-lg font-bold text-white">{market.vigPercent}%</div><div className="text-xs text-zinc-500">Vig</div></div>
            </div>
            {market.status === "OPEN" && (
              <div className="mt-8 border-t border-zinc-800 pt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Place Bet</h3>
                {!session?.user ? (
                  <p className="text-sm text-zinc-500">Sign in to place bets.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      Your balance: <span className="text-emerald-400 font-semibold">${balance.toFixed(2)}</span>
                      <Link href="/deposit" className="text-xs text-emerald-500 hover:underline ml-2">Deposit</Link>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setOutcome(true)} className={`flex-1 py-3 rounded-xl border font-semibold transition ${outcome === true ? "bg-emerald-500 border-emerald-500 text-black" : "border-zinc-700 text-zinc-300 hover:border-emerald-500"}`}>Yes</button>
                      <button onClick={() => setOutcome(false)} className={`flex-1 py-3 rounded-xl border font-semibold transition ${outcome === false ? "bg-red-500 border-red-500 text-black" : "border-zinc-700 text-zinc-300 hover:border-red-500"}`}>No</button>
                    </div>
                    <input type="number" placeholder="Amount (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none" />
                    {betVal > 0 && outcome !== null && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm space-y-1">
                        <div className="flex justify-between text-zinc-400">
                          <span>Vig ({market.vigPercent}%)</span>
                          <span>-${vig.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Net to pool</span>
                          <span>${netAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span>Estimated shares</span>
                          <span>{estimatedShares.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-medium">
                          <span>Est. payout if {outcome ? "Yes" : "No"} wins</span>
                          <span>${estimatedPayout.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Return</span>
                          <span>{betVal > 0 ? ((estimatedPayout / betVal) * 100).toFixed(0) : 0}% of bet</span>
                        </div>
                      </div>
                    )}
                    <button onClick={placeBet} disabled={loading || outcome === null || !amount || parseFloat(amount) <= 0} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition">{loading ? "Placing..." : "Place Bet"}</button>
                  </div>
                )}
              </div>
            )}
            {(user?.role === "ADMIN" || user?.role === "AUDIT") && market.status === "OPEN" && (
              <div className="mt-8 border-t border-zinc-800 pt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Resolve Market</h3>
                <div className="flex gap-3">
                  <button onClick={() => resolveMarket(true)} className="flex-1 py-3 rounded-xl border border-emerald-700 text-emerald-400 hover:bg-emerald-950 transition">Resolve Yes</button>
                  <button onClick={() => resolveMarket(false)} className="flex-1 py-3 rounded-xl border border-red-700 text-red-400 hover:bg-red-950 transition">Resolve No</button>
                </div>
              </div>
            )}
            {market.bets?.length > 0 && (
              <div className="mt-8 border-t border-zinc-800 pt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Bets</h3>
                <div className="space-y-2">
                  {market.bets.slice(-10).reverse().map((bet: any) => (
                    <div key={bet.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3 text-sm">
                      <span className="text-zinc-400">{bet.user?.name || bet.user?.email || "Anonymous"}</span>
                      <span className={`font-medium ${bet.outcome ? "text-emerald-400" : "text-red-400"}`}>{bet.outcome ? "Yes" : "No"}</span>
                      <span className="text-white">${bet.amount.toLocaleString()}</span>
                      <span className="text-zinc-500">{bet.shares?.toFixed(1)} sh</span>
                      <span className={`text-xs ${bet.status === "WON" ? "text-emerald-400" : bet.status === "LOST" ? "text-red-400" : "text-zinc-500"}`}>{bet.status}{bet.payout ? ` ($${bet.payout.toFixed(0)})` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="mt-8 border-t border-zinc-800 pt-8">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-zinc-400" />
                <h3 className="text-lg font-semibold text-white">Comments ({comments.length})</h3>
              </div>

              {session?.user ? (
                <div className="mb-6">
                  <div className="flex gap-3">
                    <textarea
                      rows={3}
                      placeholder="Share your thoughts on this market..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      maxLength={2000}
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-zinc-500">{commentText.length}/2000</span>
                    <button
                      onClick={async () => {
                        if (!commentText.trim()) return;
                        setCommentLoading(true);
                        try {
                          const res = await fetch(`/api/markets/${id}/comments`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ content: commentText.trim() }),
                          });
                          if (res.ok) {
                            const newComment = await res.json();
                            setComments((prev) => [newComment, ...prev]);
                            setCommentText("");
                          } else {
                            const err = await res.json();
                            alert(err.error || "Failed to post comment");
                          }
                        } finally {
                          setCommentLoading(false);
                        }
                      }}
                      disabled={commentLoading || !commentText.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
                    >
                      <Send className="w-4 h-4" />
                      {commentLoading ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 mb-6">Sign in to join the discussion.</p>
              )}

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-zinc-500">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-zinc-300">
                          {comment.user?.name || comment.user?.email || "Anonymous"}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
