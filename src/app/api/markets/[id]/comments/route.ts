import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ratelimit, cacheDel } from "@/lib/redis";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const comments = await prisma.comment.findMany({
    where: { marketId: id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
  }

  if (content.trim().length > 2000) {
    return NextResponse.json({ error: "Comment must be 2000 characters or less" }, { status: 400 });
  }

  const market = await prisma.market.findUnique({ where: { id } });
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  const userId = (session.user as any).id;

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId,
      marketId: id,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await cacheDel(`market:${id}`);

  return NextResponse.json(comment, { status: 201 });
}
