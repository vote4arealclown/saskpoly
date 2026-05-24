import {
  getNextGame,
  getTeamRecord,
  getPitcherMetrics,
  getTrueBullpenStats,
  getParkFactor,
  getWeatherForecast,
  teamName,
  getTeamById,
} from "./mlb-api";
import { JAYS_CONFIG } from "./jays-config";

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// Skellam distribution: difference of two Poisson variables
// P(X - Y >= k) where X ~ Pois(λ1), Y ~ Pois(λ2)
function skellamCdf(k: number, lambda1: number, lambda2: number): number {
  // For small lambdas, compute directly
  const maxN = Math.ceil(Math.max(lambda1, lambda2) * 3 + 10);
  let prob = 0;
  for (let x = 0; x <= maxN; x++) {
    const pois1 = (Math.exp(-lambda1) * Math.pow(lambda1, x)) / factorial(x);
    for (let y = 0; y <= maxN; y++) {
      if (x - y >= k) {
        const pois2 = (Math.exp(-lambda2) * Math.pow(lambda2, y)) / factorial(y);
        prob += pois1 * pois2;
      }
    }
  }
  return prob;
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

async function getTeamBattingStats(teamId: number) {
  const data = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?group=hitting&season=${new Date().getFullYear()}&stats=season`
  ).then((r) => (r.ok ? r.json() : null));
  const stat = data?.stats?.[0]?.splits?.[0]?.stat;
  if (!stat) return null;
  const games = parseInt(stat.gamesPlayed) || 1;
  return {
    runsPerGame: parseFloat(stat.runs) / games,
    hrPerGame: parseFloat(stat.homeRuns) / games,
    avg: parseFloat(stat.avg) || 0.25,
    ops: parseFloat(stat.ops) || 0.75,
    games,
  };
}

function estimateRuns(
  battingStats: any,
  opponentPitching: any,
  opponentBullpen: any,
  parkFactor: number,
  isHome: boolean
): number {
  const leagueAvgRuns = 4.4;
  let expectedRuns = battingStats?.runsPerGame || leagueAvgRuns;

  // Pitching adjustment: better pitching suppresses runs
  const oppEra = opponentPitching?.era || 4.0;
  const oppBullEra = opponentBullpen?.era || 4.0;
  const avgEra = (oppEra + oppBullEra) / 2;
  const pitchFactor = leagueAvgRuns / (avgEra * 0.9 + 1.0); // rough scaling
  expectedRuns *= pitchFactor;

  // Park factor
  expectedRuns *= Math.sqrt(parkFactor);

  // Home field
  if (isHome) expectedRuns *= 1.03;
  else expectedRuns *= 0.97;

  return Math.max(2.0, Math.min(8.0, expectedRuns));
}

export async function computeRunline(teamId: number = JAYS_CONFIG.team.id) {
  const game = await getNextGame(teamId);
  if (!game) return { error: "No upcoming game found" };

  const focusSide = game.teams.away.team.id === teamId ? "away" : "home";
  const oppSide = focusSide === "away" ? "home" : "away";
  const focusTeam = game.teams[focusSide].team;
  const opponent = game.teams[oppSide].team;
  const focusId = focusTeam.id;
  const oppId = opponent.id;
  const venueId = game.venue?.id || 0;

  // Gather data in parallel
  const [
    focusRec,
    oppRec,
    focusPitch,
    oppPitch,
    focusBull,
    oppBull,
    focusBatting,
    oppBatting,
    forecast,
  ] = await Promise.all([
    getTeamRecord(focusId),
    getTeamRecord(oppId),
    game.teams[focusSide].probablePitcher?.id
      ? getPitcherMetrics(game.teams[focusSide].probablePitcher.id)
      : Promise.resolve(null),
    game.teams[oppSide].probablePitcher?.id
      ? getPitcherMetrics(game.teams[oppSide].probablePitcher.id)
      : Promise.resolve(null),
    getTrueBullpenStats(focusId),
    getTrueBullpenStats(oppId),
    getTeamBattingStats(focusId),
    getTeamBattingStats(oppId),
    getWeatherForecast(venueId),
  ]);

  const pf = getParkFactor(venueId);

  // Expected runs for each team
  const focusExpRuns = estimateRuns(focusBatting, oppPitch, oppBull, pf, focusSide === "home");
  const oppExpRuns = estimateRuns(oppBatting, focusPitch, focusBull, pf, oppSide === "home");

  // Skellam: run differential distribution
  // P(focus wins by >= 2) = P(X - Y >= 2)
  // P(opp keeps it within 1) = P(Y - X <= 1) = 1 - P(Y - X >= 2)
  const focusWinBy2 = skellamCdf(2, focusExpRuns, oppExpRuns);
  const oppKeepClose = 1 - skellamCdf(2, oppExpRuns, focusExpRuns);

  // Normalize to sum to ~1 (they won't perfectly because of push/exact-1-run games)
  const total = focusWinBy2 + oppKeepClose;
  const focusCover = total > 0 ? focusWinBy2 / total : 0.5;
  const oppCover = total > 0 ? oppKeepClose / total : 0.5;

  // Determine favorite from moneyline context
  const focusBetter = focusRec.pct > oppRec.pct || (focusPitch?.era || 4.5) < (oppPitch?.era || 4.5);
  const isFocusFavorite = focusBetter;

  // Recommendation
  const t = JAYS_CONFIG.thresholds;
  let rec = "PASS";
  if (isFocusFavorite && focusCover > t.bet_jays) {
    rec = `${focusTeam.name.toUpperCase()} -1.5`;
  } else if (!isFocusFavorite && oppCover > t.bet_opp) {
    rec = `${opponent.name.toUpperCase()} +1.5`;
  } else if (isFocusFavorite && focusCover > t.lean_jays) {
    rec = `LEAN ${focusTeam.name.toUpperCase()} -1.5`;
  } else if (!isFocusFavorite && oppCover > t.lean_opp) {
    rec = `LEAN ${opponent.name.toUpperCase()} +1.5`;
  }

  const rawEdge = Math.abs(focusCover - 0.5);
  const rel = Math.min(1.0, (focusRec.w + focusRec.l) / 60);
  const confidence = rawEdge * rel;

  return {
    game: {
      game_pk: game.gamePk,
      date: game.officialDate || "",
      focus_side: focusSide,
      focus_team: focusTeam.name,
      opponent: opponent.name,
      venue: game.venue?.name || "",
    },
    focus_prob: Math.round(focusCover * 1000) / 1000,
    opp_prob: Math.round(oppCover * 1000) / 1000,
    focus_expected_runs: Math.round(focusExpRuns * 100) / 100,
    opp_expected_runs: Math.round(oppExpRuns * 100) / 100,
    is_focus_favorite: isFocusFavorite,
    recommendation: rec,
    confidence: Math.round(confidence * 1000) / 1000,
    reliability: Math.round(rel * 1000) / 1000,
    details: {
      focus_record: focusRec.pct,
      opp_record: oppRec.pct,
      focus_pitch_era: focusPitch?.era || null,
      opp_pitch_era: oppPitch?.era || null,
      park_factor: pf,
      wind_speed: forecast.windSpeed,
      temp: forecast.temp,
    },
  };
}
