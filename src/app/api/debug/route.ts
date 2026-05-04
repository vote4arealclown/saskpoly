import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { stripe } = await import("@/lib/stripe");
    const test = await stripe.paymentMethods.list({ limit: 1 });
    return NextResponse.json({ ok: true, stripeWorks: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, type: e.type }, { status: 500 });
  }
}
