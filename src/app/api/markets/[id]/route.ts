import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { findMarketByIdOrSlug, clearMarketCache } from "@/lib/market-lookup";

const CACHE_TTL = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cacheKey = `market:${id}`;

  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const market = await findMarketByIdOrSlug(id, {
    bets: { include: { user: { select: { name: true, email: true } } } },
    creator: { select: { name: true, email: true } },
    resolutions: { include: { resolver: { select: { name: true } } } },
  });

  if (!market) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-close if past closesAt
  if (market.status === "OPEN" && market.closesAt && new Date(market.closesAt) < new Date()) {
    await prisma.market.update({ where: { id: market.id }, data: { status: "CLOSED" } });
    market.status = "CLOSED";
    await cacheDel("markets:*");
  }

  await cacheSet(cacheKey, market, CACHE_TTL);
  return NextResponse.json(market);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, category, closesAt, vigPercent } = body;

  const existing = await findMarketByIdOrSlug(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const market = await prisma.market.update({
    where: { id: existing.id },
    data: { title, description, category, closesAt: closesAt ? new Date(closesAt) : null, vigPercent: vigPercent ?? 2.5 },
  });

  await clearMarketCache(id, existing.id);
  return NextResponse.json(market);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await findMarketByIdOrSlug(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.market.delete({ where: { id: existing.id } });

  await clearMarketCache(id, existing.id);
  return NextResponse.json({ success: true });
}
