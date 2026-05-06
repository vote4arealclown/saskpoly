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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      walletAddress: true,
      name: true,
      fullLegalName: true,
      dateOfBirth: true,
      phone: true,
      addressStreet: true,
      addressCity: true,
      addressProvince: true,
      addressPostalCode: true,
      addressCountry: true,
      termsAccepted: true,
      termsAcceptedAt: true,
      profileComplete: true,
      balance: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();

  const {
    name,
    fullLegalName,
    dateOfBirth,
    phone,
    addressStreet,
    addressCity,
    addressProvince,
    addressPostalCode,
    addressCountry,
    termsAccepted,
  } = body;

  // Validate age if DOB provided
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      return NextResponse.json({ error: "You must be at least 18 years old" }, { status: 400 });
    }
  }

  // Check if profile is now complete
  const isComplete = !!(
    fullLegalName &&
    dateOfBirth &&
    phone &&
    addressStreet &&
    addressCity &&
    addressProvince &&
    addressPostalCode &&
    termsAccepted
  );

  const updateData: any = {
    name: name || undefined,
    fullLegalName: fullLegalName || undefined,
    dateOfBirth: dateOfBirth || undefined,
    phone: phone ? phone.replace(/\D/g, "") : undefined,
    addressStreet: addressStreet || undefined,
    addressCity: addressCity || undefined,
    addressProvince: addressProvince || undefined,
    addressPostalCode: addressPostalCode ? addressPostalCode.toUpperCase() : undefined,
    addressCountry: addressCountry || "Canada",
    termsAccepted: termsAccepted ?? undefined,
    termsAcceptedAt: termsAccepted ? new Date() : undefined,
    profileComplete: isComplete,
  };

  // Remove undefined values
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      email: true,
      walletAddress: true,
      name: true,
      fullLegalName: true,
      dateOfBirth: true,
      phone: true,
      addressStreet: true,
      addressCity: true,
      addressProvince: true,
      addressPostalCode: true,
      addressCountry: true,
      termsAccepted: true,
      termsAcceptedAt: true,
      profileComplete: true,
      balance: true,
    },
  });

  return NextResponse.json(user);
}
