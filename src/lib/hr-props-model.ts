import {
  getNextGame,
  getParkFactor,
  getVsPitcherStats,
  getWeatherForecast,
  teamName,
} from "./mlb-api";
import { JAYS_CONFIG } from "./jays-config";

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

async function getTopBatters(teamId: number, limit = 6) {
  // Get active roster then fetch hitting stats for each
  const roster = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active`
  ).then((r) => (r.ok ? r.json() : null));

  const batters: any[] = [];
  for (const person of roster?.roster || []) {
    const pos = person?.position?.abbreviation || "";
    if (pos === "P") continue; // Skip pitchers
    const pid = person.person?.id;
    const stats = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${pid}?hydrate=stats(group=[hitting],type=[season])`
    ).then((r) => (r.ok ? r.json() : null));
    const stat = stats?.people?.[0]?.stats?.[0]?.splits?.[0]?.stat;
    if (!stat) continue;

    const pa = parseInt(stat.plateAppearances) || 1;
    const hr = parseInt(stat.homeRuns) || 0;
    const avg = parseFloat(stat.avg) || 0;
    const ops = parseFloat(stat.ops) || 0;
    const slg = parseFloat(stat.slg) || 0;
    const iso = slg - avg;

    batters.push({
      id: pid,
      name: person.person?.fullName || "Unknown",
      hr,
      pa,
      hrRate: hr / pa,
      iso,
      ops,
      avg,
      slg,
    });
  }

  // Sort by ISO (isolated power) descending, then by HR rate
  return batters
    .sort((a, b) => b.iso - a.iso || b.hrRate - a.hrRate)
    .slice(0, limit);
}

function hrProbability(
  batter: any,
  pitcherHr9: number,
  parkFactor: number,
  windSpeed: number,
  windDir: string,
  tempF: number | null,
  vsStats: any
): number {
  const baseRate = batter.hrRate || 0.03; // League avg ~3%
  const leagueAvgHr9 = 1.2;

  // Pitcher factor: higher HR/9 = more likely batter hits HR
  const pitchFactor = 0.7 + 0.3 * (pitcherHr9 / leagueAvgHr9);

  // Park factor
  const parkMult = Math.sqrt(parkFactor);

  // Weather bonuses from config
  const cfg = JAYS_CONFIG.hr_tracker;
  let windBonus = 0;
  const wd = String(windDir).toLowerCase();
  if (windSpeed >= 15 && (wd.includes("out") || wd.includes("w") || wd.includes("sw"))) {
    windBonus = cfg.wind_bonus["15mph"] || 20;
  } else if (windSpeed >= 10 && (wd.includes("out") || wd.includes("w") || wd.includes("sw"))) {
    windBonus = cfg.wind_bonus["10mph"] || 12;
  } else if (windSpeed >= 5 && (wd.includes("out") || wd.includes("w") || wd.includes("sw"))) {
    windBonus = cfg.wind_bonus["5mph"] || 4;
  }

  let tempBonus = 0;
  if (tempF !== null) {
    if (tempF >= 85) tempBonus = cfg.temp_bonus["85f"] || 8;
    else if (tempF >= 75) tempBonus = cfg.temp_bonus["75f"] || 4;
    else if (tempF >= 65) tempBonus = cfg.temp_bonus["65f"] || 2;
  }

  // Convert bonus points to multipliers (approximate)
  const windMult = 1 + windBonus / 100;
  const tempMult = 1 + tempBonus / 100;

  // VS pitcher history
  let vsMult = 1.0;
  if (vsStats.vsAb > 5) {
    const vsHrRate = vsStats.vsHr / vsStats.vsAb;
    if (vsHrRate > 0.1) vsMult = 1.3;
    else if (vsHrRate > 0.05) vsMult = 1.15;
  }

  // ISO boost
  const isoMult = 1 + (batter.iso - 0.15) * 0.5; // League avg ISO ~0.15

  let prob = baseRate * pitchFactor * parkMult * windMult * tempMult * vsMult * isoMult;
  return clamp(prob, 0.005, 0.35); // Cap between 0.5% and 35%
}

export async function computeHrProps(teamId: number = JAYS_CONFIG.team.id) {
  const game = await getNextGame(teamId);
  if (!game) return { error: "No upcoming game found" };

  const focusSide = game.teams.away.team.id === teamId ? "away" : "home";
  const oppSide = focusSide === "away" ? "home" : "away";
  const focusTeam = game.teams[focusSide].team;
  const opponent = game.teams[oppSide].team;
  const focusId = focusTeam.id;
  const oppId = opponent.id;
  const venueId = game.venue?.id || 0;

  const oppPitcherId = game.teams[oppSide].probablePitcher?.id || null;

  const [focusBatters, oppBatters, forecast] = await Promise.all([
    getTopBatters(focusId, 6),
    getTopBatters(oppId, 6),
    getWeatherForecast(venueId),
  ]);

  // Get opponent pitcher HR/9
  const pitcherStats = oppPitcherId
    ? await fetch(
        `https://statsapi.mlb.com/api/v1/people/${oppPitcherId}?hydrate=stats(group=[pitching],type=[season])`
      ).then((r) => (r.ok ? r.json() : null))
    : null;
  const pitcherHr9 =
    parseFloat(pitcherStats?.people?.[0]?.stats?.[0]?.splits?.[0]?.stat?.homeRunsPer9) || 1.2;

  const pf = getParkFactor(venueId);

  const focusProspects = await Promise.all(
    focusBatters.map(async (b) => {
      const vsStats = await getVsPitcherStats(b.id, oppPitcherId);
      const prob = hrProbability(b, pitcherHr9, pf, forecast.windSpeed || 0, forecast.windDir || "", forecast.temp, vsStats);
      return {
        name: b.name,
        team: focusTeam.name,
        hr: b.hr,
        pa: b.pa,
        iso: Math.round(b.iso * 1000) / 1000,
        ops: b.ops,
        vs_hr: vsStats.vsHr,
        vs_ab: vsStats.vsAb,
        probability: Math.round(prob * 1000) / 1000,
        implied_odds: prob > 0 ? Math.round((1 - prob) / prob * 100) : 0,
      };
    })
  );

  // For opponent batters, get focus pitcher HR/9
  const focusPitcherId = game.teams[focusSide].probablePitcher?.id || null;
  const focusPitcherStats = focusPitcherId
    ? await fetch(
        `https://statsapi.mlb.com/api/v1/people/${focusPitcherId}?hydrate=stats(group=[pitching],type=[season])`
      ).then((r) => (r.ok ? r.json() : null))
    : null;
  const focusPitcherHr9 =
    parseFloat(focusPitcherStats?.people?.[0]?.stats?.[0]?.splits?.[0]?.stat?.homeRunsPer9) || 1.2;

  const oppProspects = await Promise.all(
    oppBatters.map(async (b) => {
      const vsStats = await getVsPitcherStats(b.id, focusPitcherId);
      const prob = hrProbability(b, focusPitcherHr9, pf, forecast.windSpeed || 0, forecast.windDir || "", forecast.temp, vsStats);
      return {
        name: b.name,
        team: opponent.name,
        hr: b.hr,
        pa: b.pa,
        iso: Math.round(b.iso * 1000) / 1000,
        ops: b.ops,
        vs_hr: vsStats.vsHr,
        vs_ab: vsStats.vsAb,
        probability: Math.round(prob * 1000) / 1000,
        implied_odds: prob > 0 ? Math.round((1 - prob) / prob * 100) : 0,
      };
    })
  );

  const allProspects = [...focusProspects, ...oppProspects].sort((a, b) => b.probability - a.probability);
  const top3 = allProspects.slice(0, 3);

  let rec = "PASS";
  if (top3.length > 0 && top3[0].probability >= 0.18) {
    rec = `${top3[0].name} HR — ${(top3[0].probability * 100).toFixed(1)}%`;
  } else if (top3.length > 0 && top3[0].probability >= 0.12) {
    rec = `LEAN ${top3[0].name} HR — ${(top3[0].probability * 100).toFixed(1)}%`;
  }

  return {
    game: {
      game_pk: game.gamePk,
      date: game.officialDate || "",
      focus_team: focusTeam.name,
      opponent: opponent.name,
      venue: game.venue?.name || "",
    },
    top_prospects: top3,
    all_prospects: allProspects,
    park_factor: pf,
    weather: {
      temp: forecast.temp,
      wind_speed: forecast.windSpeed,
      wind_dir: forecast.windDir,
    },
    recommendation: rec,
  };
}
