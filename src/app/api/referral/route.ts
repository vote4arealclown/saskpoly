import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { userId, referralCode } = await req.json();
    const supabase = await createClient();

    // Check if referral code exists
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, total_points")
      .eq("referral_code", referralCode)
      .single();

    if (!referrer || referrer.id === userId) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    // Award points to both users
    await supabase
      .from("profiles")
      .update({ total_points: referrer.total_points + 100 })
      .eq("id", referrer.id);

    const { data: user } = await supabase
      .from("profiles")
      .select("total_points")
      .eq("id", userId)
      .single();

    await supabase
      .from("profiles")
      .update({ total_points: (user?.total_points || 0) + 50 })
      .eq("id", userId);

    return NextResponse.json({ success: true, bonus: 50 });
  } catch (_error) {
    return NextResponse.json({ error: "Referral failed" }, { status: 500 });
  }
}
