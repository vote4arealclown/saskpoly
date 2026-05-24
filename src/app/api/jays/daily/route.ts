import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdminUntyped } from "@/lib/supabase-admin";
import { computeMoneyline } from "@/lib/jays-model";
import { computeRunline } from "@/lib/runline-model";
import { computeHrProps } from "@/lib/hr-props-model";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Allow cron (no user) or admin
    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      isAdmin = profile?.role === "admin";
    }

    const isCron = !user;
    if (!isCron && !isAdmin) {
      return NextResponse.json({ error: "Admin or cron only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const teamId = body.teamId || 141;
    const today = new Date().toISOString().split("T")[0];
    const results: any = {};

    // 1. Moneyline
    try {
      const report = await computeMoneyline(teamId);
      if (!(report as any).error) {
        await getSupabaseAdminUntyped().from("jays_reports").upsert({
          report_date: today,
          report_type: "moneyline",
          game_date: (report as any).game?.date,
          opponent: (report as any).game?.opponent,
          venue: (report as any).game?.venue,
          focus_prob: report.focus_prob,
          opp_prob: report.opp_prob,
          recommendation: report.recommendation,
          confidence: report.confidence,
          reliability: report.reliability,
          details: { ...report.details, game_pk: (report as any).game?.game_pk },
          weather: (report as any).weather,
          pitchers: (report as any).pitchers,
          bullpens: (report as any).bullpens,
          records: (report as any).records,
          generated_at: new Date().toISOString(),
        }, { onConflict: "report_date,report_type" });
        results.moneyline = { success: true, recommendation: report.recommendation };
      } else {
        results.moneyline = { success: false, error: (report as any).error };
      }
    } catch (e: any) {
      results.moneyline = { success: false, error: e.message };
    }

    // 2. Runline
    try {
      const report = await computeRunline(teamId);
      if (!(report as any).error) {
        await getSupabaseAdminUntyped().from("jays_reports").upsert({
          report_date: today,
          report_type: "runline",
          game_date: (report as any).game?.date,
          opponent: (report as any).game?.opponent,
          venue: (report as any).game?.venue,
          focus_prob: (report as any).focus_prob,
          opp_prob: (report as any).opp_prob,
          recommendation: (report as any).recommendation,
          confidence: (report as any).confidence,
          reliability: (report as any).reliability,
          details: { ...(report as any).details, game_pk: (report as any).game?.game_pk },
          generated_at: new Date().toISOString(),
        }, { onConflict: "report_date,report_type" });
        results.runline = { success: true, recommendation: (report as any).recommendation };
      } else {
        results.runline = { success: false, error: (report as any).error };
      }
    } catch (e: any) {
      results.runline = { success: false, error: e.message };
    }

    // 3. HR Props
    try {
      const report = await computeHrProps(teamId);
      if (!(report as any).error) {
        await getSupabaseAdminUntyped().from("jays_reports").upsert({
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
        results.hr_props = { success: true, recommendation: (report as any).recommendation };
      } else {
        results.hr_props = { success: false, error: (report as any).error };
      }
    } catch (e: any) {
      results.hr_props = { success: false, error: e.message };
    }

    return NextResponse.json({ success: true, date: today, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Daily run failed" }, { status: 500 });
  }
}
