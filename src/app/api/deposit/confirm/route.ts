import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { paymentIntentId } = body;

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "Payment intent ID required" },
      { status: 400 }
    );
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: "Payment not completed" },
      { status: 400 }
    );
  }

  const userId = (session.user as any).id;

  // Verify this deposit belongs to the current user
  const deposit = await prisma.deposit.findUnique({
    where: { paymentIntentId },
  });

  if (!deposit || deposit.userId !== userId) {
    return NextResponse.json({ error: "Invalid deposit" }, { status: 403 });
  }

  if (deposit.status === "completed") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }

  // Update deposit status
  await prisma.deposit.update({
    where: { paymentIntentId },
    data: { status: "completed" },
  });

  // Add to user balance
  await prisma.user.update({
    where: { id: userId },
    data: {
      balance: { increment: deposit.amount },
    },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  return NextResponse.json({
    success: true,
    deposited: deposit.amount,
    newBalance: updatedUser?.balance ?? 0,
  });
}
