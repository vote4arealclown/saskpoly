"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, MapPin, Mail, User, MessageSquare, Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function BetaPage() {
  const [form, setForm] = useState({ name: "", email: "", province: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    setLoading(false);
    if (res.ok) {
      setSuccess(true);
      setForm({ name: "", email: "", province: "", message: "" });
      trackEvent("beta_signup", { province: form.province });
    } else {
      setError(data.error || "Something went wrong");
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white">You&apos;re on the List!</h1>
        <p className="mt-4 text-zinc-400">
          Thanks for signing up. We&apos;ll email you when early access opens.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          First 500 participants get reduced vig (1.5%) for the first month.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-8 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white">Join the Beta</h1>
        <p className="mt-3 text-zinc-400">
          First 500 participants get early access and reduced vig (1.5%) for the first month.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full Name *</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email *</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Province *</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              required
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-3 text-white focus:border-emerald-500 focus:outline-none appearance-none"
            >
              <option value="">Select your province</option>
              <option value="Saskatchewan">Saskatchewan</option>
              <option value="Alberta">Alberta</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Why are you interested? <span className="text-zinc-500">(optional)</span>
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
              placeholder="Tell us what markets you'd like to see..."
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? "Submitting..." : "Join the Beta"}
        </button>

        <p className="text-xs text-zinc-600 text-center">
          Must be 18 or older. Saskatchewan and Alberta residents only (initially).
        </p>
      </form>
    </div>
  );
}
