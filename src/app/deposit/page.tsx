"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, AlertCircle, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";

export default function DepositPage() {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [balance, setBalance] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("polygon");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((data) => setBalance(data.balance ?? 0))
        .catch(() => {});
    }
  }, [session]);

  const copyAddress = () => {
    navigator.clipboard.writeText(TREASURY_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    const val = parseFloat(amount);
    if (!txHash || txHash.length < 10) {
      setError("Enter a valid transaction hash");
      setLoading(false);
      return;
    }
    if (!val || val <= 0) {
      setError("Enter a valid amount");
      setLoading(false);
      return;
    }
    if (!address) {
      setError("Wallet not connected");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, amount: val, chain, fromAddress: address }),
    });
    const data = await res.json();

    if (res.ok) {
      setSuccess(data.message);
      setTxHash("");
      setAmount("");
      trackEvent("deposit_submitted", { amount: parseFloat(amount), chain });
    } else {
      setError(data.error || "Failed to submit deposit");
    }
    setLoading(false);
  };

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Wallet className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white">Sign In Required</h1>
        <p className="mt-2 text-zinc-400">Please sign in to deposit funds.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center mb-8">
        <Wallet className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">Deposit Funds</h1>
        <p className="mt-1 text-zinc-400 text-sm">
          Current Balance: <span className="text-emerald-400 font-semibold">${balance.toFixed(2)}</span>
        </p>
      </div>

      {success ? (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-6 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white">Deposit Submitted!</h2>
          <p className="mt-2 text-zinc-400 text-sm">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="mt-4 text-sm text-emerald-400 hover:underline"
          >
            Submit another deposit
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Wallet Connection */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <label className="block text-sm font-medium text-zinc-300 mb-3">Wallet</label>
            {isConnected && address ? (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="text-zinc-400">Connected</p>
                  <p className="text-white font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-red-400 hover:text-red-300 transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <ConnectButton chainStatus="icon" showBalance={false} />
            )}
          </div>

          {/* Treasury Address */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <label className="block text-sm font-medium text-zinc-300 mb-3">Send to Address</label>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-xs sm:text-sm font-mono text-emerald-400 bg-zinc-950 rounded-lg px-3 py-2 truncate">
                {TREASURY_ADDRESS}
              </code>
              <button
                onClick={copyAddress}
                className="p-2 rounded-lg border border-zinc-700 hover:border-zinc-500 transition"
                title="Copy address"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
              </button>
            </div>
            <div className="mt-3 space-y-1 text-xs text-zinc-500">
              <p>Send USDC on Polygon (recommended) or USDC on Ethereum.</p>
              <p>Minimum deposit: $10. No maximum.</p>
            </div>
          </div>

          {/* Submit Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Chain</label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
              >
                <option value="polygon">Polygon (recommended)</option>
                <option value="ethereum">Ethereum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Transaction Hash</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm font-mono"
                placeholder="0x..."
                required
              />
              <p className="mt-1 text-xs text-zinc-500">
                Paste the transaction hash after sending USDC to the address above.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isConnected}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {loading ? "Submitting..." : "Submit Deposit"}
            </button>

            {!isConnected && (
              <p className="text-xs text-zinc-500 text-center">Connect your wallet above to submit a deposit.</p>
            )}
          </form>

          {/* Help link */}
          <div className="text-center">
            <a
              href="/contact"
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              Need help? Contact support
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
