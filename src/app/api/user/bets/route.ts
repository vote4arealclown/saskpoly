import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const bets = await prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      market: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          resolution: true,
          yesPool: true,
          noPool: true,
          totalVolume: true,
        },
      },
    },
  });

  return NextResponse.json(bets);
}
