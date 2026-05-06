import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { cacheDel } from "@/lib/redis";

export async function findMarketByIdOrSlug(
  identifier: string,
  include?: Prisma.MarketInclude
) {
  // Try slug first
  const bySlug = await prisma.market.findUnique({
    where: { slug: identifier },
    include,
  });
  if (bySlug) return bySlug;

  // Fall back to id
  return prisma.market.findUnique({
    where: { id: identifier },
    include,
  });
}

export async function clearMarketCache(identifier: string, marketId: string) {
  await cacheDel(`market:${identifier}`);
  await cacheDel(`market:${marketId}`);
  await cacheDel(`market:meta:${identifier}`);
  await cacheDel(`market:meta:${marketId}`);
  await cacheDel("markets:*");
}

export async function closeExpiredMarkets() {
  const now = new Date();
  const result = await prisma.market.updateMany({
    where: {
      status: "OPEN",
      closesAt: { lt: now },
    },
    data: {
      status: "CLOSED",
    },
  });
  if (result.count > 0) {
    await cacheDel("markets:*");
  }
  return result.count;
}
