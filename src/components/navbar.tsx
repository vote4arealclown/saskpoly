"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X, Shield, ClipboardCheck, PlusCircle, LogIn, UserPlus, Mail } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "staff">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    if (authMode === "signup") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Registration failed");
        setAuthLoading(false);
        return;
      }
    }

    const provider = authMode === "staff" ? "staff-login" : "user-login";
    const result = await signIn(provider, {
      email,
      password,
      redirect: false,
    });

    setAuthLoading(false);
    if (result?.error) {
      setAuthError("Invalid email or password");
    } else {
      setShowAuthModal(false);
      setEmail("");
      setPassword("");
      setName("");
    }
  };

  const openSignIn = () => {
    setAuthMode("signin");
    setAuthError("");
    setEmail("");
    setPassword("");
    setName("");
    setShowAuthModal(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setAuthError("");
    setEmail("");
    setPassword("");
    setName("");
    setShowAuthModal(true);
  };

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
              {session ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{user?.name || user?.email}</span>
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
                  <button
                    onClick={openSignUp}
                    className="text-sm text-black bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
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
            {user?.role === "ADMIN" && <Link href="/admin" className="block text-sm text-emerald-400">Admin</Link>}
            {user?.role === "AUDIT" && <Link href="/audit" className="block text-sm text-amber-400">Audit</Link>}
            <div className="pt-2 flex gap-3">
              {!session && (
                <>
                  <button onClick={openSignIn} className="text-sm text-zinc-300">Sign In</button>
                  <button onClick={openSignUp} className="text-sm text-emerald-400">Sign Up</button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {authMode === "signin" && "Sign In"}
                {authMode === "signup" && "Create Account"}
                {authMode === "staff" && "Staff Login"}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Your name"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <p className="text-sm text-red-400">{authError}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "signup"
                  ? "Create Account"
                  : "Sign In"}
              </button>
            </form>

            <div className="mt-4 flex justify-center gap-4 text-sm text-zinc-500">
              {authMode !== "signin" && (
                <button onClick={() => setAuthMode("signin")} className="text-emerald-400 hover:underline">
                  Sign in
                </button>
              )}
              {authMode !== "signup" && (
                <button onClick={() => setAuthMode("signup")} className="text-emerald-400 hover:underline">
                  Sign up
                </button>
              )}
              {authMode !== "staff" && (
                <button onClick={() => setAuthMode("staff")} className="text-zinc-500 hover:text-zinc-300">
                  Staff login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
