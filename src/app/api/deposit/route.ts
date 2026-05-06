import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ratelimit } from "@/lib/redis";
import { verifyDepositOnChain } from "@/lib/verify-deposit";

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
  const { txHash, amount, chain, fromAddress } = body;

  if (!txHash || typeof txHash !== "string" || txHash.length < 10) {
    return NextResponse.json({ error: "Valid transaction hash required" }, { status: 400 });
  }

  const depositAmount = parseFloat(amount);
  if (!amount || isNaN(depositAmount) || depositAmount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (!chain || !["polygon", "ethereum"].includes(chain.toLowerCase())) {
    return NextResponse.json({ error: "Chain must be polygon or ethereum" }, { status: 400 });
  }

  if (!fromAddress || typeof fromAddress !== "string" || !fromAddress.startsWith("0x")) {
    return NextResponse.json({ error: "Valid from address required" }, { status: 400 });
  }

  const userId = (session.user as any).id;

  // Verify the transaction sender matches the logged-in user's wallet
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  if (dbUser?.walletAddress) {
    if (dbUser.walletAddress.toLowerCase() !== fromAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Transaction sender does not match your connected wallet" },
        { status: 403 }
      );
    }
  }

  // Check for duplicate tx hash
  const existing = await prisma.deposit.findFirst({
    where: { paymentIntentId: txHash },
  });
  if (existing) {
    return NextResponse.json({ error: "Transaction already submitted" }, { status: 409 });
  }

  // Verify on-chain
  const verification = await verifyDepositOnChain(txHash, chain, depositAmount, fromAddress);

  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.error || "Transaction verification failed" },
      { status: 400 }
    );
  }

  // Auto-credit the user's balance
  const actualAmount = verification.actualAmount ?? depositAmount;

  await prisma.$transaction([
    prisma.deposit.create({
      data: {
        paymentIntentId: txHash,
        amount: actualAmount,
        userId,
        status: "completed",
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: actualAmount } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: `Deposit verified and $${actualAmount.toFixed(2)} credited to your balance.`,
    txHash,
    amount: actualAmount,
  });
}
