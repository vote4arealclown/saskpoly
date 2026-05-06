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
  Mail,
  Wallet,
  User,
  LogIn,
  TrendingUp,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { trackEvent } from "@/lib/analytics";
import { useAccount } from "wagmi";

export function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const { address, isConnected, connector } = useAccount();
  const walletTracked = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ email: "", password: "" });
  const [staffError, setStaffError] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const prevAddress = useRef<string | undefined>(undefined);

  // Auto-auth on wallet connect / disconnect
  useEffect(() => {
    if (status === "loading") return;

    const isStaff = user?.role === "ADMIN" || user?.role === "AUDIT";

    if (isConnected && address) {
      if (!session) {
        // New connection → auto login
        signIn("wallet-login", {
          walletAddress: address,
          redirect: false,
        });
        if (!walletTracked.current) {
          walletTracked.current = true;
          trackEvent("wallet_connected");
        }
      } else if (!isStaff && prevAddress.current && prevAddress.current !== address) {
        // Wallet switched → sign out old, login new
        signOut({ redirect: false }).then(() => {
          signIn("wallet-login", {
            walletAddress: address,
            redirect: false,
          });
        });
      }
    } else if (!isConnected && session && !isStaff) {
      // Wallet disconnected → sign out
      signOut({ redirect: false });
    }

    prevAddress.current = address;
  }, [isConnected, address, session, status, user?.role]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((data) => setBalance(data.balance ?? 0))
        .catch(() => {});
    }
  }, [session]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");
    setStaffLoading(true);

    const result = await signIn("staff-login", {
      email: staffForm.email,
      password: staffForm.password,
      redirect: false,
    });

    setStaffLoading(false);
    if (result?.error) {
      setStaffError("Invalid credentials");
    } else {
      setShowStaffModal(false);
      setStaffForm({ email: "", password: "" });
      trackEvent("staff_signin");
    }
  };

  const displayName = user?.walletAddress
    ? user.walletAddress.slice(0, 6) + "..." + user.walletAddress.slice(-4)
    : user?.name || user?.email || "User";

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
              {session && (
                <Link href="/bets" className="text-sm text-zinc-300 hover:text-white transition flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  My Bets
                </Link>
              )}
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
                    {displayName}
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowStaffModal(true)}
                  className="text-sm text-zinc-300 hover:text-white flex items-center gap-1"
                >
                  <LogIn className="w-4 h-4" />
                  Staff
                </button>
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
                <Link href="/bets" className="block text-sm text-zinc-300">My Bets</Link>
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
                <button onClick={() => setShowStaffModal(true)} className="text-sm text-zinc-300 text-left">
                  Staff Login
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Staff Login</h2>
              <button
                onClick={() => { setShowStaffModal(false); setStaffError(""); setStaffForm({ email: "", password: "" }); }}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              {staffError && <p className="text-sm text-red-400">{staffError}</p>}
              <button
                type="submit"
                disabled={staffLoading}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
              >
                {staffLoading ? "Please wait..." : "Staff Login"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
