import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin, getSupabaseAdminUntyped } from "@/lib/supabase-admin";
import { fetchESPNGameResult } from "@/lib/espn";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all unresolved ESPN predictions that are past their event date
    const { data: predictions } = await supabase
      .from("predictions")
      .select("*")
      .eq("source_api", "espn")
      .not("source_id", "is", null)
      .not("status", "in", "(resolved,cancelled)")
      .lte("event_date", new Date().toISOString());

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ resolved: 0, message: "No pending ESPN predictions to resolve" });
    }

    let resolvedCount = 0;
    const errors: string[] = [];

    for (const prediction of predictions) {
      try {
        const game = await fetchESPNGameResult(prediction.event_type, prediction.source_id);

        if (!game) {
          errors.push(`${prediction.title}: Game not found on ESPN`);
          continue;
        }

        // Skip if game hasn't finished yet
        if (game.status !== "Final" && game.status !== "Finished" && !game.status?.toLowerCase().includes("final")) {
          continue;
        }

        // Skip if no winner determined
        if (!game.winner) {
          errors.push(`${prediction.title}: Game finished but no winner reported`);
          continue;
        }

        // Check that winner matches one of the options
        const options: string[] = prediction.options || [];
        if (!options.includes(game.winner)) {
          // Try to find a close match (e.g. "Boston Celtics" vs "Celtics")
          const matchedOption = options.find((opt) =>
            game.winner?.toLowerCase().includes(opt.toLowerCase()) ||
            opt.toLowerCase().includes(game.winner?.toLowerCase() || "")
          );
          if (!matchedOption) {
            errors.push(`${prediction.title}: Winner "${game.winner}" doesn't match options [${options.join(", ")}]`);
            continue;
          }
        }

        const resolvedOption = options.includes(game.winner) ? game.winner : options.find((opt) =>
          game.winner?.toLowerCase().includes(opt.toLowerCase()) ||
          opt.toLowerCase().includes(game.winner?.toLowerCase() || "")
        );

        if (!resolvedOption) continue;

        // Get all picks for this prediction
        const { data: picks } = await supabase
          .from("picks")
          .select("*")
          .eq("prediction_id", prediction.id);

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
          .eq("id", prediction.id);

        resolvedCount++;
      } catch (err: any) {
        errors.push(`${prediction.title}: ${err.message}`);
      }
    }

    // Recalculate leaderboard if anything was resolved
    if (resolvedCount > 0) {
      await getSupabaseAdmin().rpc("calculate_leaderboard");

      // Create notification
      await getSupabaseAdminUntyped().from("notifications").insert({
        type: "auto_resolve",
        title: "Auto-resolve completed",
        message: `${resolvedCount} prediction(s) auto-resolved this morning`,
      });
    }

    return NextResponse.json({
      resolved: resolvedCount,
      checked: predictions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Auto-resolve failed" },
      { status: 500 }
    );
  }
}
