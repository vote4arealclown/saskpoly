"use client";

import { useState, useCallback } from "react";
import { Calculator, ArrowRight, Percent, TrendingUp, DollarSign } from "lucide-react";

function americanToProb(american: number): number {
  if (american > 0) {
    return 100 / (american + 100);
  }
  return Math.abs(american) / (Math.abs(american) + 100);
}

function probToAmerican(prob: number): number {
  if (prob >= 0.5) {
    return Math.round(-100 * prob / (1 - prob));
  }
  return Math.round(100 * (1 - prob) / prob);
}

function formatAmerican(val: number): string {
  if (val > 0) return `+${val}`;
  return `${val}`;
}

export default function VigCalculatorPage() {
  const [oddsA, setOddsA] = useState<string>("-110");
  const [oddsB, setOddsB] = useState<string>("-110");

  const a = parseInt(oddsA) || 0;
  const b = parseInt(oddsB) || 0;

  const probA = americanToProb(a);
  const probB = americanToProb(b);
  const totalImplied = probA + probB;
  const vig = totalImplied > 0 ? ((totalImplied - 1) / totalImplied) * 100 : 0;

  const fairA = probA / totalImplied;
  const fairB = probB / totalImplied;

  const fairOddsA = probToAmerican(fairA);
  const fairOddsB = probToAmerican(fairB);

  const handleQuickVig = useCallback((vigPct: number) => {
    // Set standard -110/-110 which has ~4.55% vig
    if (vigPct === 4.55) {
      setOddsA("-110");
      setOddsB("-110");
    } else if (vigPct === 2.38) {
      setOddsA("-105");
      setOddsB("-105");
    } else if (vigPct === 10) {
      setOddsA("-140");
      setOddsB("+120");
    } else if (vigPct === 20) {
      setOddsA("-180");
      setOddsB("+160");
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-emerald-400" />
          Vig & Implied Probability Calculator
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Enter American odds for both sides to see implied probabilities, vig, and fair odds.
        </p>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: "Standard (-110/-110)", vig: 4.55 },
          { label: "Reduced (-105/-105)", vig: 2.38 },
          { label: "Heavy Vig", vig: 10 },
          { label: "Extreme Vig", vig: 20 },
        ].map((preset) => (
          <button
            key={preset.vig}
            onClick={() => handleQuickVig(preset.vig)}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 transition"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Team A Odds</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                inputMode="numeric"
                value={oddsA}
                onChange={(e) => setOddsA(e.target.value.replace(/[^0-9\-+]/g, ""))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-3 text-white focus:border-emerald-500 focus:outline-none font-mono"
                placeholder="-110"
              />
            </div>
            <p className="text-xs text-zinc-600 mt-1">American odds (e.g. -150 or +200)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Team B Odds</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                inputMode="numeric"
                value={oddsB}
                onChange={(e) => setOddsB(e.target.value.replace(/[^0-9\-+]/g, ""))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-3 text-white focus:border-emerald-500 focus:outline-none font-mono"
                placeholder="-110"
              />
            </div>
            <p className="text-xs text-zinc-600 mt-1">American odds (e.g. -150 or +200)</p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold">Implied Probabilities</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Team A</span>
              <span className="font-mono">{(probA * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Team B</span>
              <span className="font-mono">{(probB * 100).toFixed(2)}%</span>
            </div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between text-sm">
              <span className="text-zinc-400">Total</span>
              <span className="font-mono">{(totalImplied * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold">Vig (Hold)</h3>
          </div>
          <div className="text-3xl font-bold text-amber-400">{vig.toFixed(2)}%</div>
          <p className="text-xs text-zinc-500 mt-1">
            {vig > 5 ? "High vig — shop around for better lines." : vig > 2 ? "Average vig." : "Low vig — sharp line."}
          </p>
        </div>
      </div>

      {/* Fair odds */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-emerald-400" />
          Fair Odds (No Vig)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500 mb-1">Team A</p>
            <p className="text-2xl font-bold font-mono">{formatAmerican(fairOddsA)}</p>
            <p className="text-xs text-zinc-500 mt-1">{(fairA * 100).toFixed(2)}% true prob</p>
          </div>
          <div className="rounded-xl bg-zinc-900 p-4 text-center">
            <p className="text-xs text-zinc-500 mb-1">Team B</p>
            <p className="text-2xl font-bold font-mono">{formatAmerican(fairOddsB)}</p>
            <p className="text-xs text-zinc-500 mt-1">{(fairB * 100).toFixed(2)}% true prob</p>
          </div>
        </div>
        <p className="text-xs text-zinc-600 mt-4">
          Fair odds remove the sportsbook&apos;s built-in margin. If your own model gives a team a higher true probability than the fair odds suggest, that&apos;s potential value.
        </p>
      </div>
    </div>
  );
}
