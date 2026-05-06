import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/redis";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const { name, email, province, message } = body;

  if (!name || !email || !province) {
    return NextResponse.json(
      { error: "Name, email, and province are required" },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (!["Saskatchewan", "Alberta"].includes(province)) {
    return NextResponse.json(
      { error: "Province must be Saskatchewan or Alberta" },
      { status: 400 }
    );
  }

  const signup = await prisma.betaSignup.create({
    data: { name, email, province, message: message || "" },
  });

  return NextResponse.json({ success: true, id: signup.id });
}
