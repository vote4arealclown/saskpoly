import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json({ ok: true, hasSession: !!session });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, stack: e.stack }, { status: 500 });
  }
}
