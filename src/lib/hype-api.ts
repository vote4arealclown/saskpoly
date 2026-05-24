// Hyperliquid API client + indicator calculations for HYPE Long Bot Dashboard
// Ported from hypelong Python project

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FundingData {
  rate: number;
  ratePct: number;
  nextTime: string;
  markPrice: number;
  indexPrice: number;
  premium: string;
  openInterest: string;
}

export interface SessionProfile {
  name: string;
  startHour: number;
  endHour: number;
  openPrice: number;
  closePrice: number;
  high: number;
  low: number;
  changePct: number;
  direction: string;
}

export interface SessionTrend {
  bias: string;
  reason: string;
  asian: SessionProfile | null;
  nyc: SessionProfile | null;
  london: SessionProfile | null;
}

export interface SignalCheck {
  priceAboveEma: boolean;
  rsiOversold: boolean;
  adxStrong: boolean;
  asianSession: boolean;
}

export interface HypeStatus {
  price: number;
  ema: number;
  rsi: number;
  adx: number;
  session: string;
  bias: string;
  biasReason: string;
  ready: boolean;
  checks: SignalCheck;
  target: string;
  signal: string;
  utcTime: string;
  sessionStatus: string;
  sessionTimer: string;
  funding: FundingData;
}

// ─── Hyperliquid API ───

async function hlPost(body: any): Promise<any> {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchCandles(coin: string, granularity: number, limit: number): Promise<Candle[]> {
  // Use CoinGecko OHLC. Valid days: 1, 7, 14, 30, 90, 180, 365
  // 7 days gives ~42 candles (4h granularity)
  const url = `https://api.coingecko.com/api/v3/coins/hyperliquid/ohlc?vs_currency=usd&days=7`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("CoinGecko error:", res.status, text.slice(0, 200));
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error("CoinGecko invalid response:", JSON.stringify(data).slice(0, 200));
      return [];
    }
    const candles: Candle[] = data.map((d: any) => ({
      timestamp: d[0],
      open: parseFloat(d[1]) || 0,
      high: parseFloat(d[2]) || 0,
      low: parseFloat(d[3]) || 0,
      close: parseFloat(d[4]) || 0,
      volume: 0,
    }));
    return candles;
  } catch (e: any) {
    console.error("CoinGecko fetch error:", e.message);
    return [];
  }
}

export async function fetchFunding(coin: string): Promise<FundingData> {
  const data = await hlPost({ type: "metaAndAssetCtxs" });
  if (!data || !Array.isArray(data) || data.length < 2) {
    console.error("Hyperliquid funding: no data");
    return { rate: 0, ratePct: 0, nextTime: "", markPrice: 0, indexPrice: 0, premium: "0", openInterest: "0" };
  }
  // data[0] = meta with universe array, data[1] = asset contexts array (same order)
  const universe = data[0]?.universe;
  const ctxs = data[1];
  if (!Array.isArray(universe) || !Array.isArray(ctxs)) {
    console.error("Hyperliquid funding: invalid structure");
    return { rate: 0, ratePct: 0, nextTime: "", markPrice: 0, indexPrice: 0, premium: "0", openInterest: "0" };
  }
  const idx = universe.findIndex((u: any) => u.name === coin);
  if (idx === -1 || idx >= ctxs.length) {
    console.error("Hyperliquid funding: coin not found", coin);
    return { rate: 0, ratePct: 0, nextTime: "", markPrice: 0, indexPrice: 0, premium: "0", openInterest: "0" };
  }
  const ctx = ctxs[idx];
  const rate = parseFloat(ctx.funding) || 0;
  return {
    rate,
    ratePct: rate * 100,
    nextTime: ctx.nextFundingTime || "",
    markPrice: parseFloat(ctx.markPx) || 0,
    indexPrice: parseFloat(ctx.indexPx) || 0,
    premium: String(ctx.premium || "0"),
    openInterest: String(ctx.openInterest || "0"),
  };
}

// ─── Indicators ───

export function calculateEma(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      ema.push(closes[0]);
    } else {
      ema.push(closes[i] * k + ema[i - 1] * (1 - k));
    }
  }
  return ema;
}

export function calculateRsi(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsi.push(50);
      continue;
    }
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
      }
      rsi.push(50);
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  return rsi;
}

export function calculateAdx(candles: Candle[], period: number = 14): { adx: number[]; plusDi: number[]; minusDi: number[] } {
  const n = candles.length;
  const adx: number[] = new Array(n).fill(0);
  const plusDi: number[] = new Array(n).fill(0);
  const minusDi: number[] = new Array(n).fill(0);

  let smoothedPlusDm = 0;
  let smoothedMinusDm = 0;
  let smoothedTr = 0;

  for (let i = 1; i < n; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    const plusDm = Math.max(high - prevHigh, 0);
    const minusDm = Math.max(prevLow - low, 0);
    const dmPlus = plusDm > minusDm ? plusDm : 0;
    const dmMinus = minusDm > plusDm ? minusDm : 0;

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));

    if (i <= period) {
      smoothedPlusDm += dmPlus;
      smoothedMinusDm += dmMinus;
      smoothedTr += tr;
      if (i === period) {
        smoothedPlusDm /= period;
        smoothedMinusDm /= period;
        smoothedTr /= period;
      }
    } else {
      smoothedPlusDm = (smoothedPlusDm * (period - 1) + dmPlus) / period;
      smoothedMinusDm = (smoothedMinusDm * (period - 1) + dmMinus) / period;
      smoothedTr = (smoothedTr * (period - 1) + tr) / period;
    }

    if (i >= period) {
      const pdi = smoothedTr === 0 ? 0 : 100 * (smoothedPlusDm / smoothedTr);
      const mdi = smoothedTr === 0 ? 0 : 100 * (smoothedMinusDm / smoothedTr);
      const dx = pdi + mdi === 0 ? 0 : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;

      plusDi[i] = pdi;
      minusDi[i] = mdi;

      if (i === period) {
        adx[i] = dx;
      } else {
        adx[i] = (adx[i - 1] * (period - 1) + dx) / period;
      }
    }
  }

  return { adx, plusDi, minusDi };
}

// ─── Sessions ───

export function getSessionName(hour: number): string {
  if (0 <= hour && hour < 8) return "asian";
  if (8 <= hour && hour < 16) return "london";
  return "nyc";
}

function getSessionProfile(candles: Candle[], sessionName: string): SessionProfile | null {
  const groups = new Map<string, Candle[]>();
  for (const c of candles) {
    const date = new Date(c.timestamp).toISOString().split("T")[0];
    const hour = new Date(c.timestamp).getUTCHours();
    const s = getSessionName(hour);
    if (s === sessionName) {
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(c);
    }
  }

  const dates = Array.from(groups.keys()).sort();
  if (dates.length === 0) return null;

  const latestDate = dates[dates.length - 1];
  const sessionCandles = groups.get(latestDate) || [];
  if (sessionCandles.length === 0) return null;

  const openPrice = sessionCandles[0].open;
  const closePrice = sessionCandles[sessionCandles.length - 1].close;
  const high = Math.max(...sessionCandles.map((c) => c.high));
  const low = Math.min(...sessionCandles.map((c) => c.low));
  const change = (closePrice - openPrice) / openPrice * 100;

  return {
    name: sessionName,
    startHour: new Date(sessionCandles[0].timestamp).getUTCHours(),
    endHour: new Date(sessionCandles[sessionCandles.length - 1].timestamp).getUTCHours(),
    openPrice,
    closePrice,
    high,
    low,
    changePct: change,
    direction: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
  };
}

export function analyzeSessionTrend(candles: Candle[]): SessionTrend {
  const asian = getSessionProfile(candles, "asian");
  const nyc = getSessionProfile(candles, "nyc");
  const london = getSessionProfile(candles, "london");

  if (!asian || !nyc) {
    return { bias: "unknown", reason: "Not enough session data", asian, nyc, london };
  }

  const asianSoldOff = asian.direction === "down";
  const nycRallied = nyc.direction === "up";
  const asianRallied = asian.direction === "up";
  const nycSoldOff = nyc.direction === "down";

  let bias: string;
  let reason: string;

  if (asianSoldOff && nycRallied) {
    bias = "bullish";
    reason = `Asian sold off (${asian.changePct.toFixed(1)}%), NYC bid (${nyc.changePct.toFixed(1)}%)`;
  } else if (asianRallied && nycSoldOff) {
    bias = "bearish";
    reason = `Asian rallied (${asian.changePct.toFixed(1)}%), NYC sold (${nyc.changePct.toFixed(1)}%)`;
  } else if (asianRallied && nycRallied) {
    bias = "strong_bullish";
    reason = `Both sessions bid: Asian (${asian.changePct.toFixed(1)}%), NYC (${nyc.changePct.toFixed(1)}%)`;
  } else if (asianSoldOff && nycSoldOff) {
    bias = "strong_bearish";
    reason = `Both sessions offered: Asian (${asian.changePct.toFixed(1)}%), NYC (${nyc.changePct.toFixed(1)}%)`;
  } else {
    bias = "neutral";
    reason = `Mixed: Asian (${asian.changePct.toFixed(1)}%), NYC (${nyc.changePct.toFixed(1)}%)`;
  }

  return { bias, reason, asian, nyc, london };
}

// ─── Signal Logic ───

export function analyzeSignal(
  candles: Candle[],
  emaPeriod: number = 100,
  rsiOversold: number = 45,
  adxThreshold: number = 20
): { ready: boolean; checks: SignalCheck; signal: string; target: string } {
  const closes = candles.map((c) => c.close);
  const ema = calculateEma(closes, emaPeriod);
  const rsi = calculateRsi(closes, 14);
  const adxResult = calculateAdx(candles, 14);

  const price = closes[closes.length - 1];
  const emaVal = ema[ema.length - 1];
  const rsiVal = rsi[rsi.length - 1];
  const adxVal = adxResult.adx[adxResult.adx.length - 1];

  const now = new Date();
  const hour = now.getUTCHours();
  const session = getSessionName(hour);

  const priceAboveEma = price > emaVal;
  const rsiOversoldCheck = rsiVal <= rsiOversold;
  const adxStrong = adxVal >= adxThreshold;
  const asianSession = session === "asian";

  const ready = priceAboveEma && rsiOversoldCheck && adxStrong && asianSession;

  let target = "";
  if (!priceAboveEma) {
    target = `Price needs to hold above EMA $${emaVal.toFixed(2)}`;
  } else if (!rsiOversoldCheck) {
    target = `RSI needs to drop from ${rsiVal.toFixed(1)} to ≤ ${rsiOversold}`;
  } else if (!adxStrong) {
    target = `ADX needs to rise to ≥ ${adxThreshold}`;
  } else if (!asianSession) {
    const nextAsian = hour >= 8 ? new Date(now.getTime() + (24 - hour) * 3600 * 1000).setUTCHours(0, 0, 0, 0) : now.setUTCHours(0, 0, 0, 0);
    const diff = nextAsian - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    target = `Wait for Asian session (starts in ${h}h ${m}m)`;
  } else {
    target = `ALL CONDITIONS MET — ENTER NOW`;
  }

  const trend = analyzeSessionTrend(candles);
  const signal = [
    `Price ${priceAboveEma ? ">" : "<="} EMA${emaPeriod} ($${price.toFixed(4)} vs $${emaVal.toFixed(4)})`,
    `RSI=${rsiVal.toFixed(1)} (${rsiOversoldCheck ? "oversold" : "not oversold"} <= ${rsiOversold})`,
    `ADX=${adxVal.toFixed(1)} (threshold=${adxThreshold})`,
    `Session: ${session.toUpperCase()}`,
    `Bias: ${trend.bias}`,
  ].join(" | ");

  return {
    ready,
    checks: {
      priceAboveEma,
      rsiOversold: rsiOversoldCheck,
      adxStrong,
      asianSession,
    },
    signal,
    target,
  };
}

// ─── Full Status ───

export async function getHypeStatus(): Promise<HypeStatus> {
  const candles = await fetchCandles("HYPE", 3600, 120);
  const funding = await fetchFunding("HYPE");

  const now = new Date();
  const hour = now.getUTCHours();

  // Default fallback if no candles
  if (!candles || candles.length < 20) {
    return {
      price: 0,
      ema: 0,
      rsi: 0,
      adx: 0,
      session: getSessionName(hour).toUpperCase(),
      bias: "unknown",
      biasReason: "No market data available",
      ready: false,
      checks: { priceAboveEma: false, rsiOversold: false, adxStrong: false, asianSession: false },
      target: "Waiting for market data...",
      signal: "No candle data from CoinGecko",
      utcTime: now.toISOString().replace("T", " ").slice(0, 19) + " UTC",
      sessionStatus: (0 <= hour && hour < 8) ? "IN ASIAN SESSION" : "OUTSIDE ASIAN SESSION",
      sessionTimer: "",
      funding,
    };
  }

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1] || 0;
  const emaArr = calculateEma(closes, 100);
  const rsiArr = calculateRsi(closes, 14);
  const adxResult = calculateAdx(candles, 14);

  const ema = emaArr[emaArr.length - 1] || 0;
  const rsi = rsiArr[rsiArr.length - 1] || 0;
  const adx = adxResult.adx[adxResult.adx.length - 1] || 0;

  const signalResult = analyzeSignal(candles, 100, 45, 20);
  const trend = analyzeSessionTrend(candles);

  let sessionStatus: string;
  let sessionTimer: string;

  if (0 <= hour && hour < 8) {
    sessionStatus = "IN ASIAN SESSION";
    const sessionEnds = new Date(now);
    sessionEnds.setUTCHours(8, 0, 0, 0);
    const minsRemaining = Math.floor((sessionEnds.getTime() - now.getTime()) / 60000);
    sessionTimer = `Asian ends in ${minsRemaining}m`;
  } else {
    sessionStatus = "OUTSIDE ASIAN SESSION";
    const nextAsian = new Date(now);
    nextAsian.setUTCHours(0, 0, 0, 0);
    if (hour >= 8) {
      nextAsian.setUTCDate(nextAsian.getUTCDate() + 1);
    }
    const diff = nextAsian.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    sessionTimer = `Asian starts in ${h}h ${m}m`;
  }

  return {
    price,
    ema,
    rsi,
    adx,
    session: getSessionName(hour).toUpperCase(),
    bias: trend.bias,
    biasReason: trend.reason,
    ready: signalResult.ready,
    checks: signalResult.checks,
    target: signalResult.target,
    signal: signalResult.signal,
    utcTime: now.toISOString().replace("T", " ").slice(0, 19) + " UTC",
    sessionStatus,
    sessionTimer,
    funding,
  };
}
