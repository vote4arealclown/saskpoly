import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";

const CACHE_TTL = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cacheKey = `market:${id}`;

  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const market = await prisma.market.findUnique({
    where: { id },
    include: {
      bets: { include: { user: { select: { name: true, email: true } } } },
      creator: { select: { name: true, email: true } },
      resolutions: { include: { resolver: { select: { name: true } } } },
    },
  });

  if (!market) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const market = await prisma.market.update({
    where: { id },
    data: { title, description, category, closesAt: closesAt ? new Date(closesAt) : null, vigPercent: vigPercent ?? 2.5 },
  });

  await cacheDel(`market:${id}`);
  await cacheDel("markets:*");
  return NextResponse.json(market);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.market.delete({ where: { id } });

  await cacheDel(`market:${id}`);
  await cacheDel("markets:*");
  return NextResponse.json({ success: true });
}
