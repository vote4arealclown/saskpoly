import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const supabase = await createClient();

    // Get user's picks from last week
    const { data: picks } = await supabase
      .from("picks")
      .select("*, prediction:predictions(title, status, resolved_option)")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    const correctPicks = picks?.filter((p) => p.is_correct) || [];
    const totalPoints = correctPicks.reduce((sum, p) => sum + (p.points_earned || 0), 0);

    // Get top leaderboard users
    const { data: leaders } = await supabase
      .from("profiles")
      .select("display_name, total_points")
      .order("total_points", { ascending: false })
      .limit(5);

    return NextResponse.json({
      picks: picks?.length || 0,
      correct: correctPicks.length,
      points: totalPoints,
      leaders: leaders || [],
    });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}
