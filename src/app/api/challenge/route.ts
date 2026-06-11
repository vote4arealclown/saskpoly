import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Get or create today's daily challenge
    const { data: challenge } = await supabase
      .from("daily_challenges")
      .select("*, prediction:predictions(*)")
      .eq("challenge_date", today)
      .single();

    if (!challenge) {
      // Get a random upcoming prediction for today's challenge
      const { data: predictions } = await supabase
        .from("predictions")
        .select("*")
        .eq("status", "upcoming")
        .gte("event_date", new Date().toISOString())
        .limit(1);

      if (predictions && predictions.length > 0) {
        const { data: newChallenge } = await supabase
          .from("daily_challenges")
          .insert({
            challenge_date: today,
            prediction_id: predictions[0].id,
            bonus_points: 50,
            description: "Daily Challenge: Make your pick!",
          })
          .select("*, prediction:predictions(*)")
          .single();

        return NextResponse.json({ challenge: newChallenge });
      }

      return NextResponse.json({ challenge: null });
    }

    return NextResponse.json({ challenge });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch challenge" }, { status: 500 });
  }
}
