import { NextResponse } from "next/server";
import { ratelimit } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await ratelimit.limit(ip);
    return NextResponse.json({ ok: true, rateLimitSuccess: success });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, stack: e.stack }, { status: 500 });
  }
}
