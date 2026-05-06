"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { User, Shield, AlertCircle, Wallet, Pencil, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
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
      fetch("/api/user/profile")
        .then((r) => r.json())
        .then((data) => {
          setProfile(data);
          setForm({
            name: data.name || "",
            fullLegalName: data.fullLegalName || "",
            dateOfBirth: data.dateOfBirth || "",
            phone: data.phone || "",
            addressStreet: data.addressStreet || "",
            addressCity: data.addressCity || "",
            addressProvince: data.addressProvince || "",
            addressPostalCode: data.addressPostalCode || "",
            addressCountry: data.addressCountry || "Canada",
            termsAccepted: data.termsAccepted || false,
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to save");
    } else {
      setProfile(data);
      setEditing(false);
      setStep(1);
    }
  };

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Wallet className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white">Connect Wallet</h1>
        <p className="mt-2 text-zinc-400">Connect your wallet to view your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-zinc-400">Loading profile...</p>
      </div>
    );
  }

  const field = (label: string, value: string | null) => (
    <div className="py-3 border-b border-zinc-800 last:border-0">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white mt-0.5">{value || <span className="text-zinc-600 italic">Not provided</span>}</p>
    </div>
  );

  const canProceedStep1 = form.fullLegalName && form.dateOfBirth && form.phone && form.phone.replace(/\D/g, "").length >= 10;
  const canProceedStep2 = form.addressStreet && form.addressCity && form.addressProvince && form.addressPostalCode;
  const canSubmit = canProceedStep1 && canProceedStep2 && form.termsAccepted;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Your Profile</h1>
            <p className="text-sm text-zinc-400">
              {profile?.walletAddress ? "Wallet account" : "Tax compliance information"}
            </p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      {profile?.profileComplete ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400 mb-6">
          <Shield className="w-4 h-4" />
          Profile complete — verified for tax compliance
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-400 mb-6">
          <AlertCircle className="w-4 h-4" />
          Profile incomplete — please fill in your details below
        </div>
      )}

      {!editing ? (
        <>
          <div className="rounded-2xl border border-zinc-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
            {profile?.walletAddress && field("Wallet", profile.walletAddress)}
            {field("Email", profile?.email)}
            {field("Display Name", profile?.name)}
            {field("Balance", profile?.balance !== undefined ? `$${profile.balance.toFixed(2)}` : null)}
          </div>

          <div className="rounded-2xl border border-zinc-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Legal Identity</h2>
            {field("Full Legal Name", profile?.fullLegalName)}
            {field("Date of Birth", profile?.dateOfBirth)}
            {field("Phone", profile?.phone)}
          </div>

          <div className="rounded-2xl border border-zinc-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Address</h2>
            {field("Street", profile?.addressStreet)}
            {field("City", profile?.addressCity)}
            {field("Province", profile?.addressProvince)}
            {field("Postal Code", profile?.addressPostalCode)}
            {field("Country", profile?.addressCountry)}
          </div>

          <div className="rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Compliance</h2>
            {field("Terms Accepted", profile?.termsAccepted ? "Yes" : "No")}
            {field("Terms Accepted At", profile?.termsAcceptedAt ? new Date(profile.termsAcceptedAt).toLocaleDateString() : null)}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-2 mb-6">
            {["Identity", "Address", "Consent"].map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  step === i + 1 ? "bg-emerald-500 text-black" : step > i + 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${step === i + 1 ? "text-white" : "text-zinc-600"}`}>{label}</span>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Display Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm" placeholder="How others see you" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Full Legal Name *</label>
                <input value={form.fullLegalName} onChange={(e) => setForm({ ...form, fullLegalName: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm" placeholder="As shown on government ID" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Date of Birth *</label>
                <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Phone Number *</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm" placeholder="(306) 555-0123" />
              </div>
              <button type="button" onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Street Address *</label>
                <input value={form.addressStreet} onChange={(e) => setForm({ ...form, addressStreet: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm" placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">City *</label>
                  <input value={form.addressCity} onChange={(e) => setForm({ ...form, addressCity: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm" placeholder="Saskatoon" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Province *</label>
                  <select value={form.addressProvince} onChange={(e) => setForm({ ...form, addressProvince: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm">
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
                  <input value={form.addressPostalCode} onChange={(e) => setForm({ ...form, addressPostalCode: e.target.value.toUpperCase() })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm" placeholder="S7K 0A1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Country</label>
                  <input value={form.addressCountry} onChange={(e) => setForm({ ...form, addressCountry: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none text-sm" placeholder="Canada" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition">
                  <ChevronLeft className="w-4 h-4 inline" /> Back
                </button>
                <button type="button" onClick={() => setStep(3)} disabled={!canProceedStep2} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400 space-y-3 max-h-48 overflow-y-auto">
                <p className="font-medium text-white">Terms of Service & Privacy Policy</p>
                <p>By using this platform, you agree to:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Be at least 18 years of age</li>
                  <li>Provide accurate and truthful personal information</li>
                  <li>Comply with all applicable Canadian tax laws</li>
                  <li>Accept that winnings may be reported to CRA</li>
                  <li>Not use the platform for illegal activities</li>
                  <li>Accept our platform fee on all transactions</li>
                </ul>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })} className="mt-0.5 w-4 h-4 accent-emerald-500" />
                <span className="text-sm text-zinc-300">
                  I agree to the <a href="/terms" target="_blank" className="text-emerald-400 hover:underline">Terms of Service</a> and{" "}
                  <a href="/privacy" target="_blank" className="text-emerald-400 hover:underline">Privacy Policy</a>. I confirm I am 18+ and all information provided is accurate.
                </span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition">
                  <ChevronLeft className="w-4 h-4 inline" /> Back
                </button>
                <button onClick={save} disabled={!canSubmit || saving} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {saving ? "Saving..." : <><CheckCircle className="w-4 h-4" /> Save Profile</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
