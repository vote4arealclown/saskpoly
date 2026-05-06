"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  Shield,
  ClipboardCheck,
  PlusCircle,
  LogIn,
  Mail,
  Wallet,
  User,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { trackEvent } from "@/lib/analytics";

import { useAccount } from "wagmi";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { address, isConnected } = useAccount();
  const walletTracked = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "staff">("signin");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    fullLegalName: "",
    dateOfBirth: "",
    phone: "",

    addressStreet: "",
    addressCity: "",
    addressProvince: "",
    addressPostalCode: "",
    addressCountry: "Canada",
    termsAccepted: false,
  });

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((data) => setBalance(data.balance ?? 0))
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    if (isConnected && address && !walletTracked.current) {
      walletTracked.current = true;
      trackEvent("wallet_connected");
    }
  }, [isConnected, address]);

  const resetForm = () => {
    setForm({
      email: "",
      password: "",
      name: "",
      fullLegalName: "",
      dateOfBirth: "",
      phone: "",
      addressStreet: "",
      addressCity: "",
      addressProvince: "",
      addressPostalCode: "",
      addressCountry: "Canada",
      termsAccepted: false,
    });
    setSignupStep(1);
    setSignupSuccess(false);
    setAuthError("");
  };

  const openSignIn = () => {
    setAuthMode("signin");
    resetForm();
    setShowAuthModal(true);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    if (authMode === "signup") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Registration failed");
        setAuthLoading(false);
        return;
      }
      setSignupSuccess(true);
      setAuthLoading(false);
      trackEvent("user_signup");
      return;
    }

    const provider = authMode === "staff" ? "staff-login" : "user-login";
    const result = await signIn(provider, {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setAuthLoading(false);
    if (result?.error) {
      setAuthError("Invalid email or password");
    } else {
      setShowAuthModal(false);
      resetForm();
      trackEvent(authMode === "staff" ? "staff_signin" : "user_signin");
    }
  };

  const canProceedStep1 = form.email && form.password && form.password.length >= 8;
  const canProceedStep2 = form.fullLegalName && form.dateOfBirth && form.phone && form.phone.replace(/\D/g, "").length >= 10;
  const canProceedStep3 = form.addressStreet && form.addressCity && form.addressProvince && form.addressPostalCode;
  const canSubmit = canProceedStep1 && canProceedStep2 && canProceedStep3 && form.termsAccepted;

  const stepLabels = ["Account", "Identity", "Address", "Consent"];

  return (
    <>
      <nav className="border-b border-zinc-800 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">SaskPoly</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/markets" className="text-sm text-zinc-300 hover:text-white transition">
                Markets
              </Link>
              <Link href="/create" className="text-sm text-zinc-300 hover:text-white transition flex items-center gap-1">
                <PlusCircle className="w-4 h-4" />
                Create Market
              </Link>
              <Link href="/contact" className="text-sm text-zinc-300 hover:text-white transition flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Contact
              </Link>
              {user?.role === "ADMIN" && (
                <Link href="/admin" className="text-sm text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
              {user?.role === "AUDIT" && (
                <Link href="/audit" className="text-sm text-amber-400 hover:text-amber-300 transition flex items-center gap-1">
                  <ClipboardCheck className="w-4 h-4" />
                  Audit
                </Link>
              )}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <ConnectButton chainStatus="none" showBalance={false} accountStatus="address" />
              {session ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/deposit"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Wallet className="w-3 h-3" />
                    ${balance.toFixed(2)}
                  </Link>
                  <Link href="/profile" className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {user?.name || user?.email}
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={openSignIn}
                    className="text-sm text-zinc-300 hover:text-white flex items-center gap-1"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                </>
              )}
            </div>

            <button
              className="md:hidden text-zinc-300"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-800 px-4 py-4 space-y-3">
            <Link href="/markets" className="block text-sm text-zinc-300">Markets</Link>
            <Link href="/create" className="block text-sm text-zinc-300">Create Market</Link>
            <Link href="/contact" className="block text-sm text-zinc-300">Contact</Link>
            {session && (
              <>
                <Link href="/deposit" className="block text-sm text-emerald-400">
                  Deposit (${balance.toFixed(2)})
                </Link>
                <Link href="/profile" className="block text-sm text-zinc-300">Profile</Link>
              </>
            )}
            {user?.role === "ADMIN" && <Link href="/admin" className="block text-sm text-emerald-400">Admin</Link>}
            {user?.role === "AUDIT" && <Link href="/audit" className="block text-sm text-amber-400">Audit</Link>}
            <div className="pt-2 flex flex-col gap-3">
              <div className="flex justify-start">
                <ConnectButton chainStatus="none" showBalance={false} accountStatus="address" />
              </div>
              {!session && (
                <>
                  <button onClick={openSignIn} className="text-sm text-zinc-300 text-left">Sign In</button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {authMode === "signin" && "Sign In"}
                {authMode === "signup" && !signupSuccess && "Create Account"}
                {authMode === "staff" && "Staff Login"}
              </h2>
              <button
                onClick={() => { setShowAuthModal(false); resetForm(); }}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authMode === "signup" && !signupSuccess && (
              <div className="flex items-center gap-2 mb-4">
                {stepLabels.map((label, i) => (
                  <div key={label} className="flex items-center gap-1">
                    <div
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        signupStep === i + 1
                          ? "bg-emerald-500 text-black"
                          : signupStep > i + 1
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className={`text-xs hidden sm:inline ${signupStep === i + 1 ? "text-white" : "text-zinc-600"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {signupSuccess ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white">Account Created!</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Your profile is complete and verified for tax compliance. You can now sign in.
                </p>
                <button
                  onClick={() => { setAuthMode("signin"); setSignupSuccess(false); resetForm(); }}
                  className="mt-4 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === "signup" && signupStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Password * (min 8 chars)</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                        placeholder="How others see you"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignupStep(2)}
                      disabled={!canProceedStep1}
                      className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {authMode === "signup" && signupStep === 2 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Full Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={form.fullLegalName}
                        onChange={(e) => setForm({ ...form, fullLegalName: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                        placeholder="As shown on government ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        required
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                        placeholder="(306) 555-0123"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSignupStep(1)}
                        className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition"
                      >
                        <ChevronLeft className="w-4 h-4 inline" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupStep(3)}
                        disabled={!canProceedStep2}
                        className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {authMode === "signup" && signupStep === 3 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={form.addressStreet}
                        onChange={(e) => setForm({ ...form, addressStreet: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={form.addressCity}
                          onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                          placeholder="Saskatoon"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Province *</label>
                        <select
                          required
                          value={form.addressProvince}
                          onChange={(e) => setForm({ ...form, addressProvince: e.target.value })}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Alberta">Alberta</option>
                          <option value="British Columbia">British Columbia</option>
                          <option value="Manitoba">Manitoba</option>
                          <option value="New Brunswick">New Brunswick</option>
                          <option value="Newfoundland and Labrador">Newfoundland and Labrador</option>
                          <option value="Nova Scotia">Nova Scotia</option>
                          <option value="Ontario">Ontario</option>
                          <option value="Prince Edward Island">Prince Edward Island</option>
                          <option value="Quebec">Quebec</option>
                          <option value="Saskatchewan">Saskatchewan</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Postal Code *</label>
                        <input
                          type="text"
                          required
                          value={form.addressPostalCode}
                          onChange={(e) => setForm({ ...form, addressPostalCode: e.target.value.toUpperCase() })}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                          placeholder="S7K 0A1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Country</label>
                        <input
                          type="text"
                          value={form.addressCountry}
                          onChange={(e) => setForm({ ...form, addressCountry: e.target.value })}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm"
                          placeholder="Canada"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSignupStep(2)}
                        className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition"
                      >
                        <ChevronLeft className="w-4 h-4 inline" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupStep(4)}
                        disabled={!canProceedStep3}
                        className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {authMode === "signup" && signupStep === 4 && (
                  <>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400 space-y-3 max-h-48 overflow-y-auto">
                      <p className="font-medium text-white">Terms of Service & Privacy Policy</p>
                      <p>By creating an account, you agree to:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Be at least 18 years of age</li>
                        <li>Provide accurate and truthful personal information</li>
                        <li>Comply with all applicable Canadian tax laws</li>
                        <li>Accept that winnings may be reported to CRA</li>
                        <li>Not use the platform for illegal activities</li>
                        <li>Accept our 2.5% platform fee on all transactions</li>
                      </ul>
                      <p>We collect your personal information for tax compliance, fraud prevention, and regulatory reporting.</p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={form.termsAccepted}
                        onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-emerald-500"
                      />
                      <span className="text-sm text-zinc-300">
                        I agree to the <a href="/terms" target="_blank" className="text-emerald-400 hover:underline">Terms of Service</a> and{" "}
                        <a href="/privacy" target="_blank" className="text-emerald-400 hover:underline">Privacy Policy</a>. I confirm I am 18+ and all information provided is accurate.
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSignupStep(3)}
                        className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition"
                      >
                        <ChevronLeft className="w-4 h-4 inline" /> Back
                      </button>
                      <button
                        type="submit"
                        disabled={!canSubmit || authLoading}
                        className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
                      >
                        {authLoading ? "Creating..." : "Create Account"}
                      </button>
                    </div>
                  </>
                )}

                {(authMode === "signin" || authMode === "staff") && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                    {authError && <p className="text-sm text-red-400">{authError}</p>}
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
                    >
                      {authLoading ? "Please wait..." : authMode === "signin" ? "Sign In" : "Staff Login"}
                    </button>
                  </>
                )}
              </form>
            )}

            {!signupSuccess && (
              <div className="mt-4 flex justify-center gap-4 text-sm text-zinc-500">
                {authMode !== "signin" && (
                  <button onClick={() => { setAuthMode("signin"); resetForm(); }} className="text-emerald-400 hover:underline">
                    Sign in
                  </button>
                )}
                {authMode !== "signup" && (
                  <button onClick={() => { setAuthMode("signup"); resetForm(); }} className="text-emerald-400 hover:underline">
                    Sign up
                  </button>
                )}
                {authMode !== "staff" && (
                  <button onClick={() => { setAuthMode("staff"); resetForm(); }} className="text-zinc-500 hover:text-zinc-300">
                    Staff login
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
