import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin, getSupabaseAdminUntyped } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { predictionId, resolvedOption } = await req.json();

    if (!predictionId || !resolvedOption) {
      return NextResponse.json({ error: "Prediction ID and resolved option required" }, { status: 400 });
    }

    // Get prediction
    const { data: prediction } = await supabase
      .from("predictions")
      .select("*")
      .eq("id", predictionId)
      .single();

    if (!prediction) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    // Get all picks for this prediction
    const { data: picks } = await supabase
      .from("picks")
      .select("*")
      .eq("prediction_id", predictionId);

    // Update each pick
    for (const pick of picks || []) {
      const isCorrect = pick.selected_option === resolvedOption;
      await getSupabaseAdminUntyped()
        .from("picks")
        .update({
          is_correct: isCorrect,
          points_earned: isCorrect ? prediction.points : 0,
        })
        .eq("id", pick.id);
    }

    // Update prediction status
    await getSupabaseAdminUntyped()
      .from("predictions")
      .update({
        status: "resolved",
        resolved_option: resolvedOption,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", predictionId);

    // Recalculate leaderboard
    await getSupabaseAdmin().rpc("calculate_leaderboard");

    // Create notification
    await getSupabaseAdminUntyped().from("notifications").insert({
      type: "prediction_resolved",
      title: `Resolved: ${prediction.title}`,
      message: `Winning option: ${resolvedOption}`,
      prediction_id: predictionId,
      prediction_title: prediction.title,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to resolve" }, { status: 500 });
  }
}
