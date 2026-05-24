import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdminUntyped } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { predictionId, selectedOption } = await req.json();

    if (!predictionId || !selectedOption) {
      return NextResponse.json({ error: "Prediction ID and selected option required" }, { status: 400 });
    }

    // Get prediction
    const { data: prediction } = await supabase
      .from("predictions")
      .select("event_date, status, options")
      .eq("id", predictionId)
      .single();

    if (!prediction) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    // Check if game already started
    const now = new Date();
    const eventDate = new Date(prediction.event_date);
    if (now >= eventDate) {
      return NextResponse.json({ error: "This game has already started. Picks are closed." }, { status: 403 });
    }

    // Check if prediction is still upcoming
    if (prediction.status !== "upcoming") {
      return NextResponse.json({ error: "This prediction is no longer open for picks" }, { status: 403 });
    }

    // Check if option is valid
    const validOptions: string[] = prediction.options || [];
    if (!validOptions.includes(selectedOption)) {
      return NextResponse.json({ error: "Invalid option" }, { status: 400 });
    }

    // Check for existing pick
    const { data: existingPick } = await supabase
      .from("picks")
      .select("id")
      .eq("user_id", user.id)
      .eq("prediction_id", predictionId)
      .maybeSingle();

    if (existingPick) {
      return NextResponse.json({ error: "You already picked this prediction" }, { status: 409 });
    }

    // Insert pick
    const { error: insertError } = await getSupabaseAdminUntyped()
      .from("picks")
      .insert({
        user_id: user.id,
        prediction_id: predictionId,
        selected_option: selectedOption,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Increment total_picks on profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_picks")
      .eq("id", user.id)
      .single();

    await getSupabaseAdminUntyped()
      .from("profiles")
      .update({ total_picks: (profile?.total_picks || 0) + 1 })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to place pick" },
      { status: 500 }
    );
  }
}
