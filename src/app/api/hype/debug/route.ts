import { NextResponse } from "next/server";

export async function GET() {
  const results: any = {};

  // Test CoinGecko days=7
  try {
    const cg7 = await fetch("https://api.coingecko.com/api/v3/coins/hyperliquid/ohlc?vs_currency=usd&days=7", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    results.cg7 = { status: cg7.status, isArray: Array.isArray(await cg7.clone().json()) };
  } catch (e: any) {
    results.cg7 = { error: e.message };
  }

  // Test CoinGecko days=20
  try {
    const cg20 = await fetch("https://api.coingecko.com/api/v3/coins/hyperliquid/ohlc?vs_currency=usd&days=20", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const text = await cg20.text();
    results.cg20 = { status: cg20.status, isArray: text.startsWith("["), body: text.slice(0, 100) };
  } catch (e: any) {
    results.cg20 = { error: e.message };
  }

  // Test Hyperliquid through helper
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    });
    const data = await res.json();
    results.hl = { status: res.status, isArray: Array.isArray(data), length: data?.length };
  } catch (e: any) {
    results.hl = { error: e.message };
  }

  return NextResponse.json(results);
}
