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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // Fetch unresolved moneyline reports from last 14 days
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const { data: reports, error } = await getSupabaseAdminUntyped()
      .from("jays_reports")
      .select("*")
      .eq("report_type", "moneyline")
      .gte("report_date", since.toISOString().split("T")[0])
      .order("report_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resolved: any[] = [];
    const skipped: any[] = [];

    for (const report of reports || []) {
      const gamePk = report.details?.game_pk;
      const gameDate = report.game_date;
      const focusTeam = report.details?.focus_team || "";
      const opponent = report.opponent || "";

      if (!gameDate) {
        skipped.push({ id: report.id, reason: "No game_date" });
        continue;
      }

      let gameResult: any = null;

      // Try by gamePk first
      if (gamePk) {
        const live = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        }).then((r) => (r.ok ? r.json() : null));
        if (live?.gameData?.status?.abstractGameState === "Final") {
          gameResult = live;
        }
      }

      // Fallback: search by date + teams
      if (!gameResult) {
        const schedule = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&startDate=${gameDate}&endDate=${gameDate}&hydrate=team`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        ).then((r) => (r.ok ? r.json() : null));

        for (const d of schedule?.dates || []) {
          for (const g of d.games || []) {
            const away = g.teams?.away?.team?.name || "";
            const home = g.teams?.home?.team?.name || "";
            const teams = [away, home];
            if (
              g.status?.detailedState === "Final" &&
              (teams.includes(focusTeam) || teams.includes(opponent))
            ) {
              gameResult = g;
              break;
            }
          }
          if (gameResult) break;
        }
      }

      if (!gameResult) {
        skipped.push({ id: report.id, reason: "Game not final or not found" });
        continue;
      }

      // Determine winner
      let winner = "";
      if (gameResult.liveData) {
        const away = gameResult.liveData.linescore?.teams?.away?.runs || 0;
        const home = gameResult.liveData.linescore?.teams?.home?.runs || 0;
        winner = away > home ? gameResult.gameData.teams.away.name : gameResult.gameData.teams.home.name;
      } else if (gameResult.teams) {
        const awayW = gameResult.teams.away.isWinner;
        winner = awayW ? gameResult.teams.away.team.name : gameResult.teams.home.team.name;
      }

      // Did we recommend the focus team or opponent?
      const rec = report.recommendation || "";
      const recFocus = rec.includes(focusTeam.toUpperCase());
      const recOpp = rec.includes(opponent.toUpperCase());

      let isCorrect: boolean | null = null;
      if (recFocus) {
        isCorrect = winner === focusTeam;
      } else if (recOpp) {
        isCorrect = winner === opponent;
      }

      // Update report with resolution
      const newDetails = {
        ...report.details,
        resolved: true,
        actual_winner: winner,
        is_correct: isCorrect,
        resolved_at: new Date().toISOString(),
      };

      await getSupabaseAdminUntyped()
        .from("jays_reports")
        .update({ details: newDetails })
        .eq("id", report.id);

      resolved.push({
        id: report.id,
        date: report.report_date,
        recommendation: rec,
        winner,
        is_correct: isCorrect,
      });
    }

    return NextResponse.json({ resolved, skipped, total: (reports || []).length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Resolve failed" }, { status: 500 });
  }
}
