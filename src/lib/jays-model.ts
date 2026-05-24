import {
  getNextGame,
  getTeamRecord,
  getHeadToHead,
  getLastNGames,
  getPitcherMetrics,
  getTrueBullpenStats,
  getVenueLocation,
  getWeatherForecast,
  getParkFactor,
  teamName,
} from "./mlb-api";
import { JAYS_CONFIG } from "./jays-config";

function safeFloat(val: any, def = 0.0): number {
  try {
    const n = parseFloat(val);
    return isNaN(n) ? def : n;
  } catch {
    return def;
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function reliabilityFactor(gamesPlayed: number, pitcherIp: number) {
  const c = JAYS_CONFIG.model.reliability;
  const gRel = Math.min(1.0, gamesPlayed / c.games_denominator);
  const pRel = Math.min(1.0, pitcherIp / c.ip_denominator);
  return gRel * c.games_weight + pRel * c.ip_weight;
}

export async function computeMoneyline(teamId: number = JAYS_CONFIG.team.id) {
  const game = await getNextGame(teamId);
  if (!game) return { error: "No upcoming game found" };

  const focusSide = game.teams.away.team.id === teamId ? "away" : "home";
  const oppSide = focusSide === "away" ? "home" : "away";
  const focusTeam = game.teams[focusSide].team;
  const opponent = game.teams[oppSide].team;
  const focusId = focusTeam.id;
  const oppId = opponent.id;
  const venueId = game.venue?.id || 0;

  let focusProb = 0.5;
  const details: Record<string, number> = {};

  // 1. Home Field
  const hfa =
    focusSide === "home"
      ? JAYS_CONFIG.model.home_field_advantage
      : -JAYS_CONFIG.model.home_field_advantage;
  focusProb += hfa;
  details.home_field = hfa;

  // 2. Season Record
  const focusRec = await getTeamRecord(focusId);
  const oppRec = await getTeamRecord(oppId);
  const recordDiff = focusRec.pct - oppRec.pct;
  const recordAdj = clamp(
    recordDiff * JAYS_CONFIG.model.record.scale_factor,
    -JAYS_CONFIG.model.record.max_adjustment,
    JAYS_CONFIG.model.record.max_adjustment
  );
  focusProb += recordAdj;
  details.record = recordAdj;

  // 3. Pitching
  const focusPitcherId = game.teams[focusSide].probablePitcher?.id;
  const oppPitcherId = game.teams[oppSide].probablePitcher?.id;
  const focusPitch = focusPitcherId ? await getPitcherMetrics(focusPitcherId) : null;
  const oppPitch = oppPitcherId ? await getPitcherMetrics(oppPitcherId) : null;

  let pitchAdj = 0;
  if (focusPitch && oppPitch) {
    const pw = JAYS_CONFIG.model.pitching.weights;
    pitchAdj =
      (oppPitch.era - focusPitch.era) * pw.era +
      (oppPitch.whip - focusPitch.whip) * pw.whip +
      (focusPitch.k9 - oppPitch.k9) * pw.k9 +
      (oppPitch.bb9 - focusPitch.bb9) * pw.bb9 +
      (oppPitch.hr9 - focusPitch.hr9) * pw.hr9;
    pitchAdj = clamp(
      pitchAdj,
      -JAYS_CONFIG.model.pitching.max_adjustment,
      JAYS_CONFIG.model.pitching.max_adjustment
    );
  }
  details.pitching = pitchAdj;
  focusProb += pitchAdj;

  // 4. True Bullpen (weighted reliever stats)
  const focusBull = await getTrueBullpenStats(focusId);
  const oppBull = await getTrueBullpenStats(oppId);
  let bullAdj = 0;
  if (focusBull && oppBull) {
    bullAdj =
      ((oppBull.era || 4.0) - (focusBull.era || 4.0)) * JAYS_CONFIG.model.bullpen.era_weight +
      ((oppBull.whip || 1.35) - (focusBull.whip || 1.35)) * JAYS_CONFIG.model.bullpen.whip_weight;
    bullAdj = clamp(
      bullAdj,
      -JAYS_CONFIG.model.bullpen.max_adjustment,
      JAYS_CONFIG.model.bullpen.max_adjustment
    );
  }
  details.bullpen = bullAdj;
  focusProb += bullAdj;

  // 5. Momentum
  const lastGames = await getLastNGames(5, teamId);
  let focusWins = 0;
  for (const g of lastGames) {
    const side = g.teams.away.team.id === teamId ? "away" : "home";
    if (g.teams[side].isWinner) focusWins++;
  }
  const momGames = JAYS_CONFIG.model.momentum.games_lookback;
  const focusMom = lastGames.length ? focusWins / momGames : 0.5;
  const momAdj = clamp(
    (focusMom - 0.5) * JAYS_CONFIG.model.momentum.max_adjustment * momGames,
    -JAYS_CONFIG.model.momentum.max_adjustment,
    JAYS_CONFIG.model.momentum.max_adjustment
  );
  details.momentum = momAdj;
  focusProb += momAdj;

  // 6. Park Factor (uses real 3-year rolling data)
  const pf = getParkFactor(venueId);
  let parkAdj = 0;
  if (pf > JAYS_CONFIG.model.park_factor.high_threshold) {
    parkAdj = focusSide === "home" ? JAYS_CONFIG.model.park_factor.max_adjustment : -JAYS_CONFIG.model.park_factor.max_adjustment;
  } else if (pf < JAYS_CONFIG.model.park_factor.low_threshold) {
    parkAdj = focusSide === "home" ? -JAYS_CONFIG.model.park_factor.max_adjustment : JAYS_CONFIG.model.park_factor.max_adjustment;
  }
  details.park = parkAdj;
  focusProb += parkAdj;

  // 7. Weather (Open-Meteo with wind direction, humidity)
  const forecast = await getWeatherForecast(venueId);
  let weatherAdj = 0;
  const wmax = JAYS_CONFIG.model.weather.max_adjustment;
  const windDir = String(forecast.windDir || "").toLowerCase();
  if (
    forecast.windSpeed > JAYS_CONFIG.model.weather.wind_speed_threshold &&
    (windDir.includes("out") || windDir.includes("w") || windDir.includes("sw") || windDir.includes("s"))
  ) {
    weatherAdj += focusSide === "home" ? wmax : -wmax;
  } else if (
    forecast.windSpeed > JAYS_CONFIG.model.weather.wind_speed_threshold &&
    (windDir.includes("in") || windDir.includes("e") || windDir.includes("ne") || windDir.includes("n"))
  ) {
    weatherAdj -= focusSide === "home" ? wmax : -wmax;
  }
  if (forecast.temp !== null && forecast.temp < JAYS_CONFIG.model.weather.cold_temp_threshold) {
    weatherAdj += focusSide === "home" ? JAYS_CONFIG.model.park_factor.max_adjustment : -JAYS_CONFIG.model.park_factor.max_adjustment;
  }
  weatherAdj = clamp(weatherAdj, -wmax, wmax);
  details.weather = weatherAdj;
  focusProb += weatherAdj;

  // 8. Head-to-Head
  const h2h = await getHeadToHead(oppId, teamId);
  let h2hAdj = 0;
  if (h2h.total > 0) {
    const focusH2hPct = h2h.wins / h2h.total;
    h2hAdj = clamp(
      (focusH2hPct - 0.5) * JAYS_CONFIG.model.head_to_head.scale_factor * 5,
      -JAYS_CONFIG.model.head_to_head.max_adjustment,
      JAYS_CONFIG.model.head_to_head.max_adjustment
    );
  }
  details.head_to_head = h2hAdj;
  focusProb += h2hAdj;

  // Normalize
  focusProb = clamp(
    focusProb,
    JAYS_CONFIG.model.probability_bounds.min,
    JAYS_CONFIG.model.probability_bounds.max
  );
  const oppProb = 1.0 - focusProb;

  // Reliability
  const gamesPlayed = focusRec.w + focusRec.l;
  const pitcherIp = focusPitch?.ip || 0;
  const rel = reliabilityFactor(gamesPlayed, pitcherIp);
  const rawEdge = Math.abs(focusProb - 0.5);
  const confidence = rawEdge * rel;

  // Recommendation
  const t = JAYS_CONFIG.thresholds;
  let rec = "PASS";
  if (focusProb > t.bet_jays && rel > t.reliability_min) {
    rec = `BET ${focusTeam.name.toUpperCase()}`;
  } else if (oppProb > t.bet_opp && rel > t.reliability_min) {
    rec = `BET ${opponent.name.toUpperCase()}`;
  } else if (focusProb > t.lean_jays) {
    rec = `LEAN ${focusTeam.name.toUpperCase()}`;
  } else if (oppProb > t.lean_opp) {
    rec = `LEAN ${opponent.name.toUpperCase()}`;
  }

  return {
    game: {
      game_pk: game.gamePk,
      date: game.officialDate || "",
      focus_side: focusSide,
      focus_team: focusTeam.name,
      opponent: opponent.name,
      venue: game.venue?.name || "",
      venue_id: venueId,
    },
    focus_prob: Math.round(focusProb * 1000) / 1000,
    opp_prob: Math.round(oppProb * 1000) / 1000,
    details: Object.fromEntries(Object.entries(details).map(([k, v]) => [k, Math.round(v * 10000) / 10000])),
    reliability: Math.round(rel * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
    contrarian: "NONE",
    recommendation: rec,
    pitchers: { focus: focusPitch, opp: oppPitch },
    bullpens: {
      focus: focusBull ? { ...focusBull, total_ip: (focusBull as any).totalIp, totalIp: undefined } : null,
      opp: oppBull ? { ...oppBull, total_ip: (oppBull as any).totalIp, totalIp: undefined } : null,
    },
    weather: {
      temp: forecast.temp,
      humidity: forecast.humidity,
      wind_speed: forecast.windSpeed,
      wind_dir: forecast.windDir,
      condition: forecast.condition,
    },
    records: { focus: focusRec, opp: oppRec },
    h2h,
    momentum: `${focusWins}-${momGames - focusWins}`,
    park_factor: pf,
  };
}
