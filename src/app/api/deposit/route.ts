import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ratelimit } from "@/lib/redis";

const MAX_DEPOSIT = 50;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { amount } = body;
  const depositAmount = parseFloat(amount);

  if (!amount || isNaN(depositAmount) || depositAmount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (depositAmount > MAX_DEPOSIT) {
    return NextResponse.json(
      { error: `Maximum deposit is $${MAX_DEPOSIT}` },
      { status: 400 }
    );
  }

  const userId = (session.user as any).id;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(depositAmount * 100),
    currency: "cad",
    automatic_payment_methods: { enabled: true },
    metadata: {
      type: "deposit",
      userId,
      amount: String(depositAmount),
    },
  });

  await prisma.deposit.create({
    data: {
      paymentIntentId: paymentIntent.id,
      amount: depositAmount,
      userId,
      status: "pending",
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
