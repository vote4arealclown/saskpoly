import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ratelimit, cacheDel } from "@/lib/redis";
import { findMarketByIdOrSlug } from "@/lib/market-lookup";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { marketId, amount, outcome } = body;

  const betAmount = parseFloat(amount);
  if (!amount || isNaN(betAmount) || betAmount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const userId = (session.user as any).id;

  // Check user balance
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  if (!user || user.balance < betAmount) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 403 });
  }

  const market = await findMarketByIdOrSlug(marketId);
  if (!market || market.status !== "OPEN") {
    return NextResponse.json({ error: "Market not open" }, { status: 400 });
  }

  // Check for duplicate bet (same user, market, amount, outcome)
  const existingBet = await prisma.bet.findFirst({
    where: { marketId: market.id, userId, amount: betAmount, outcome: Boolean(outcome) },
  });
  if (existingBet) {
    return NextResponse.json({ error: "Identical bet already placed" }, { status: 400 });
  }

  // Self-leveling share calculation
  const vig = betAmount * (market.vigPercent / 100);
  const netAmount = betAmount - vig;

  let shares: number;
  if (outcome) {
    // Buying YES: shares = netAmount * (noPool / yesPool)
    // If either pool is empty, fallback to 1:1 (netAmount shares)
    shares = market.yesPool === 0 || market.noPool === 0
      ? netAmount
      : (netAmount * market.noPool) / market.yesPool;
  } else {
    // Buying NO: shares = netAmount * (yesPool / noPool)
    shares = market.noPool === 0 || market.yesPool === 0
      ? netAmount
      : (netAmount * market.yesPool) / market.noPool;
  }

  // Ensure shares are never zero (minimum 0.01)
  shares = Math.max(shares, 0.01);

  // Execute bet in transaction: deduct balance, create bet, update market
  const [bet] = await prisma.$transaction([
    prisma.bet.create({
      data: {
        userId,
        marketId: market.id,
        amount: betAmount,
        outcome: Boolean(outcome),
        shares,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: betAmount } },
    }),
    prisma.market.update({
      where: { id: market.id },
      data: {
        yesPool: outcome ? market.yesPool + netAmount : market.yesPool,
        noPool: !outcome ? market.noPool + netAmount : market.noPool,
        totalVolume: market.totalVolume + betAmount,
      },
    }),
  ]);

  await cacheDel("markets:*");
  return NextResponse.json(bet);
}
