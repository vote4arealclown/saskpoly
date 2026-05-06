import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { generateUniqueSlug } from "@/lib/slug";
import { closeExpiredMarkets } from "@/lib/market-lookup";

const CACHE_KEY = "markets:all";
const CACHE_TTL = 30; // 30 seconds

export async function GET() {
  await closeExpiredMarkets();

  const cached = await cacheGet<unknown>(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached);
  }

  const markets = await prisma.market.findMany({
    include: { bets: true, creator: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  await cacheSet(CACHE_KEY, markets, CACHE_TTL);
  return NextResponse.json(markets);
}

const CREATION_FEE = 20;
const SEED_PER_SIDE = 10;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const userId = user.id;
  const isStaff = user.role === "ADMIN" || user.role === "AUDIT";

  if (!isStaff) {
    // Check user balance for non-staff
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!dbUser || dbUser.balance < CREATION_FEE) {
      return NextResponse.json(
        { error: `Insufficient balance. A $${CREATION_FEE} fee is required to create a market. Please deposit funds.` },
        { status: 402 }
      );
    }

    // Deduct creation fee
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: CREATION_FEE } },
    });
  }

  const body = await req.json();
  const { title, description, category, closesAt, vigPercent } = body;

  const slug = await generateUniqueSlug(title, async (s) => {
    const existing = await prisma.market.findUnique({ where: { slug: s } });
    return !!existing;
  });

  const market = await prisma.market.create({
    data: {
      slug,
      title,
      description,
      category,
      closesAt: closesAt ? new Date(closesAt) : null,
      vigPercent: vigPercent ?? 2.5,
      creatorId: userId,
      // Seed liquidity: $10 YES / $10 NO from the $20 creation fee
      yesPool: SEED_PER_SIDE,
      noPool: SEED_PER_SIDE,
    },
  });

  await cacheDel("markets:*");
  return NextResponse.json({ ...market, feeDeducted: isStaff ? 0 : CREATION_FEE });
}
