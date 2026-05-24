import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdminUntyped } from "@/lib/supabase-admin";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "check"; // "check" or "claim"

    const admin = getSupabaseAdminUntyped();

    // Fetch profile with streak columns
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, total_points, login_streak, last_login_date")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const today = getToday();
    const yesterday = getYesterday();
    let streak = profile.login_streak || 0;
    let points = profile.total_points || 0;
    let lastDate = profile.last_login_date;
    let awarded = 0;
    let message = "";

    if (action === "claim") {
      // Claim the day-10 ticket bonus
      if (streak < 10) {
        return NextResponse.json({ error: "Streak must be 10 to claim ticket" }, { status: 400 });
      }
      points += 10;
      streak = 0; // Reset after claim
      await admin
        .from("profiles")
        .update({ total_points: points, login_streak: streak })
        .eq("id", user.id);
      return NextResponse.json({
        success: true,
        action: "claim",
        awarded: 10,
        streak,
        total_points: points,
      });
    }

    // Daily check action
    if (lastDate === today) {
      // Already checked in today
      return NextResponse.json({
        success: true,
        action: "check",
        alreadyChecked: true,
        streak,
        last_login_date: lastDate,
        total_points: points,
      });
    }

    if (lastDate === yesterday) {
      // Consecutive day
      streak += 1;
      awarded = 1;
      points += 1;
      message = `Day ${streak} login! +1 point`;
    } else {
      // Streak broken or first time
      streak = 1;
      awarded = 1;
      points += 1;
      message = "Login streak started! +1 point";
    }

    await admin
      .from("profiles")
      .update({
        total_points: points,
        login_streak: streak,
        last_login_date: today,
      })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      action: "check",
      awarded,
      streak,
      last_login_date: today,
      total_points: points,
      message,
      ticketReady: streak >= 10,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Daily login failed" }, { status: 500 });
  }
}
