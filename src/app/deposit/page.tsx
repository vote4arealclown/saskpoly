"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Wallet, AlertCircle, CheckCircle } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const MAX_DEPOSIT = 50;

function DepositForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: (amount: number, newBalance: number) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Payment failed");
      setLoading(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Confirm with backend and update balance
      const res = await fetch("/api/deposit/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      const data = await res.json();

      if (res.ok) {
        onSuccess(data.deposited, data.newBalance);
      } else {
        setError(data.error || "Failed to credit balance");
      }
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
      >
        {loading ? "Processing..." : "Confirm Deposit"}
      </button>
    </form>
  );
}

export default function DepositPage() {
  const { data: session } = useSession();
  const [amount, setAmount] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ deposited: number; newBalance: number } | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((data) => setBalance(data.balance ?? 0))
        .catch(() => {});
    }
  }, [session]);

  const handleInitiate = async () => {
    setLoading(true);
    setError("");
    setClientSecret("");
    setSuccess(null);

    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError("Enter a valid amount");
      setLoading(false);
      return;
    }
    if (val > MAX_DEPOSIT) {
      setError(`Maximum deposit is $${MAX_DEPOSIT}`);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: val }),
    });
    const data = await res.json();

    if (res.ok) {
      setClientSecret(data.clientSecret);
    } else {
      setError(data.error || "Failed to initiate deposit");
    }
    setLoading(false);
  };

  const handleSuccess = (deposited: number, newBalance: number) => {
    setSuccess({ deposited, newBalance });
    setBalance(newBalance);
    setClientSecret("");
    setAmount("");
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
    <div className="mx-auto max-w-md px-4 py-16">
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
          <h2 className="text-lg font-semibold text-white">Deposit Successful!</h2>
          <p className="mt-2 text-zinc-400">
            Deposited: <span className="text-white font-medium">${success.deposited.toFixed(2)}</span>
          </p>
          <p className="text-zinc-400">
            New Balance: <span className="text-emerald-400 font-medium">${success.newBalance.toFixed(2)}</span>
          </p>
          <button
            onClick={() => setSuccess(null)}
            className="mt-4 text-sm text-emerald-400 hover:underline"
          >
            Make another deposit
          </button>
        </div>
      ) : clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night" } }}>
          <DepositForm clientSecret={clientSecret} onSuccess={handleSuccess} />
        </Elements>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Amount (CAD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="1"
                max={MAX_DEPOSIT}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                placeholder={`Max $${MAX_DEPOSIT}`}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">Maximum deposit: ${MAX_DEPOSIT}</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleInitiate}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            {loading ? "Loading..." : "Continue to Payment"}
          </button>
        </div>
      )}
    </div>
  );
}
