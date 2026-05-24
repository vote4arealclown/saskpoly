import { NextRequest, NextResponse } from "next/server";
import { fetchCandles, calculateEma, calculateRsi, calculateAdx } from "@/lib/hype-api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get("hours") || "24");
    const limit = Math.max(hours + 10, 50);

    const candles = await fetchCandles("HYPE", 3600, limit);
    const closes = candles.map((c) => c.close);
    const ema100 = calculateEma(closes, 100);
    const rsi14 = calculateRsi(closes, 14);
    const adxResult = calculateAdx(candles, 14);

    // Slice to requested hours
    const sliceFrom = Math.max(0, candles.length - hours);
    const sliced = candles.slice(sliceFrom);

    const labels = sliced.map((c) => {
      const d = new Date(c.timestamp);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    });

    return NextResponse.json({
      labels,
      price: sliced.map((_, i) => closes[sliceFrom + i]),
      ema100: sliced.map((_, i) => ema100[sliceFrom + i]),
      rsi14: sliced.map((_, i) => rsi14[sliceFrom + i]),
      adx14: sliced.map((_, i) => adxResult.adx[sliceFrom + i]),
      plusDi: sliced.map((_, i) => adxResult.plusDi[sliceFrom + i]),
      minusDi: sliced.map((_, i) => adxResult.minusDi[sliceFrom + i]),
      volume: sliced.map((c) => c.volume),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch chart data" }, { status: 500 });
  }
}
