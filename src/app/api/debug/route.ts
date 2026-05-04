import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.stripePayment.count();
    return NextResponse.json({ ok: true, stripePaymentCount: count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
