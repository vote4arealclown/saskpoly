import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdminUntyped } from "@/lib/supabase-admin";
import { computeHrProps } from "@/lib/hr-props-model";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { teamId } = await req.json().catch(() => ({}));
    const report = await computeHrProps(teamId || 141);

    if ((report as any).error) {
      return NextResponse.json({ error: (report as any).error }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    const { error: dbError } = await getSupabaseAdminUntyped()
      .from("jays_reports")
      .upsert({
        report_date: today,
        report_type: "hr_props",
        game_date: (report as any).game?.date,
        opponent: (report as any).game?.opponent,
        venue: (report as any).game?.venue,
        focus_prob: (report as any).top_prospects?.[0]?.probability || 0,
        opp_prob: 0,
        recommendation: (report as any).recommendation,
        confidence: 0.5,
        reliability: 0.4,
        details: {
          top_prospects: (report as any).top_prospects,
          park_factor: (report as any).park_factor,
          weather: (report as any).weather,
          game_pk: (report as any).game?.game_pk,
        },
        generated_at: new Date().toISOString(),
      }, { onConflict: "report_date,report_type" });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate HR props report" }, { status: 500 });
  }
}
