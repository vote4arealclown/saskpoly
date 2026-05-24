import {
  getNextGame,
  getPitcherMetrics,
  getTrueBullpenStats,
  getParkFactor,
  getWeatherForecast,
  teamName,
} from "./mlb-api";
import { JAYS_CONFIG } from "./jays-config";

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

async function getTeamBattingStats(teamId: number) {
  const data = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?group=hitting&season=${new Date().getFullYear()}&stats=season`
  ).then((r) => (r.ok ? r.json() : null));
  const stat = data?.stats?.[0]?.splits?.[0]?.stat;
  if (!stat) return null;
  const games = parseInt(stat.gamesPlayed) || 1;
  const pa = parseInt(stat.plateAppearances) || games * 38;
  return {
    runsPerGame: parseFloat(stat.runs) / games,
    hrPerGame: parseFloat(stat.homeRuns) / games,
    avg: parseFloat(stat.avg) || 0.25,
    ops: parseFloat(stat.ops) || 0.75,
    strikeoutRate: pa > 0 ? parseInt(stat.strikeOuts) / pa : 0.22,
    walkRate: pa > 0 ? parseInt(stat.baseOnBalls) / pa : 0.08,
    games,
  };
}

function probOver(value: number, line: number, stdDev: number): number {
  // P(X > line) where X ~ Normal(value, stdDev)
  // Using simple normal approximation
  if (stdDev <= 0) return value > line ? 1 : 0;
  const z = (line - value) / stdDev;
  // Approximate normal CDF
  const cdf = 0.5 * (1 + Math.tanh(z * 1.702 / Math.sqrt(2)));
  return 1 - cdf;
}

export async function computePitcherProps(teamId: number = JAYS_CONFIG.team.id) {
  const game = await getNextGame(teamId);
  if (!game) return { error: "No upcoming game found" };

  const focusSide = game.teams.away.team.id === teamId ? "away" : "home";
  const oppSide = focusSide === "away" ? "home" : "away";
  const focusTeam = game.teams[focusSide].team;
  const opponent = game.teams[oppSide].team;
  const focusId = focusTeam.id;
  const oppId = opponent.id;
  const venueId = game.venue?.id || 0;

  const pitcherId = game.teams[focusSide].probablePitcher?.id;
  if (!pitcherId) return { error: "No probable pitcher found" };

  const [pitchStats, oppBatting, bullpen, forecast] = await Promise.all([
    getPitcherMetrics(pitcherId),
    getTeamBattingStats(oppId),
    getTrueBullpenStats(focusId),
    getWeatherForecast(venueId),
  ]);

  if (!pitchStats) return { error: "Pitcher stats unavailable" };

  const pf = getParkFactor(venueId);
  const leagueAvgKRate = 0.22;
  const leagueAvgRuns = 4.4;
  const leagueAvgIp = 5.5;

  // Expected IP: base from pitcher's games started / games played ratio and IP
  // If we don't have per-start IP, estimate from total IP / games started
  const gamesStarted = pitchStats.gamesStarted || 1;
  const totalGames = pitchStats.games || gamesStarted;
  const avgIpPerStart = totalGames > 0 ? pitchStats.ip / gamesStarted : leagueAvgIp;

  // Adjust IP for opponent quality (better hitting teams = shorter outings)
  const oppOps = oppBatting?.ops || 0.75;
  const ipOppFactor = 1 - (oppOps - 0.72) * 0.3; // 0.72 is rough league avg OPS
  let expectedIp = avgIpPerStart * ipOppFactor;

  // Weather: hot weather = shorter outings
  if (forecast.temp !== null && forecast.temp > 85) expectedIp *= 0.97;
  expectedIp = clamp(expectedIp, 3.0, 8.0);

  // Strikeouts
  const k9 = pitchStats.k9 || 8.5;
  const oppKRate = oppBatting?.strikeoutRate || leagueAvgKRate;
  const kOppFactor = oppKRate / leagueAvgKRate;
  let expectedK = (k9 * expectedIp / 9) * kOppFactor;

  // Weather wind bonus: out-blowing wind reduces K's slightly (more contact = fly balls)
  const wd = String(forecast.windDir || "").toLowerCase();
  if (forecast.windSpeed > 10 && (wd.includes("out") || wd.includes("w"))) {
    expectedK *= 0.95;
  }
  expectedK = clamp(expectedK, 1, 15);

  // Earned Runs
  const era = pitchStats.era || 4.0;
  const oppRunsFactor = (oppBatting?.runsPerGame || leagueAvgRuns) / leagueAvgRuns;
  let expectedEr = (era * expectedIp / 9) * oppRunsFactor * Math.sqrt(pf);
  expectedEr = clamp(expectedEr, 0, 8);

  // Walks (BB/9 based)
  const bb9 = pitchStats.bb9 || 3.0;
  const oppWalkRate = oppBatting?.walkRate || 0.08;
  const bbOppFactor = oppWalkRate / 0.08;
  let expectedBb = (bb9 * expectedIp / 9) * bbOppFactor;
  expectedBb = clamp(expectedBb, 0, 6);

  // Probabilities for common lines
  const kLine = Math.floor(expectedK);
  const kStd = Math.sqrt(expectedK * 0.7); // Poisson-like variance
  const kOverProb = probOver(expectedK, kLine + 0.5, kStd);

  const ipLine = Math.floor(expectedIp);
  const ipStd = 0.8;
  const ipOverProb = probOver(expectedIp, ipLine + 0.5, ipStd);

  const erLine = Math.floor(expectedEr);
  const erStd = Math.sqrt(expectedEr * 0.8 + 0.5);
  const erOverProb = probOver(expectedEr, erLine + 0.5, erStd);

  // Recommendations
  let rec = "PASS";
  const bestProp = [
    { type: "K's", line: kLine + 0.5, prob: kOverProb, expected: expectedK },
    { type: "IP", line: ipLine + 0.5, prob: ipOverProb, expected: expectedIp },
    { type: "ER", line: erLine + 0.5, prob: erOverProb, expected: expectedEr },
  ].sort((a, b) => Math.abs(b.prob - 0.5) - Math.abs(a.prob - 0.5))[0];

  if (bestProp.prob > 0.62) {
    rec = `OVER ${bestProp.line} ${bestProp.type} — ${(bestProp.prob * 100).toFixed(0)}%`;
  } else if (bestProp.prob < 0.38) {
    rec = `UNDER ${bestProp.line} ${bestProp.type} — ${((1 - bestProp.prob) * 100).toFixed(0)}%`;
  } else if (bestProp.prob > 0.55) {
    rec = `LEAN OVER ${bestProp.line} ${bestProp.type}`;
  } else if (bestProp.prob < 0.45) {
    rec = `LEAN UNDER ${bestProp.line} ${bestProp.type}`;
  }

  return {
    game: {
      game_pk: game.gamePk,
      date: game.officialDate || "",
      focus_team: focusTeam.name,
      opponent: opponent.name,
      venue: game.venue?.name || "",
    },
    pitcher: {
      name: game.teams[focusSide].probablePitcher?.fullName || "TBD",
      era: pitchStats.era,
      k9: pitchStats.k9,
      bb9: pitchStats.bb9,
      hr9: pitchStats.hr9,
      whip: pitchStats.whip,
    },
    props: {
      strikeouts: {
        expected: Math.round(expectedK * 100) / 100,
        line: kLine + 0.5,
        over_prob: Math.round(kOverProb * 1000) / 1000,
      },
      innings_pitched: {
        expected: Math.round(expectedIp * 100) / 100,
        line: ipLine + 0.5,
        over_prob: Math.round(ipOverProb * 1000) / 1000,
      },
      earned_runs: {
        expected: Math.round(expectedEr * 100) / 100,
        line: erLine + 0.5,
        over_prob: Math.round(erOverProb * 1000) / 1000,
      },
      walks: {
        expected: Math.round(expectedBb * 100) / 100,
        line: Math.floor(expectedBb) + 0.5,
      },
    },
    recommendation: rec,
    confidence: Math.round(Math.abs(bestProp.prob - 0.5) * 2 * 1000) / 1000,
    opponent_batting: oppBatting
      ? {
          ops: oppBatting.ops,
          strikeout_rate: Math.round(oppBatting.strikeoutRate * 1000) / 1000,
          runs_per_game: oppBatting.runsPerGame,
        }
      : null,
    weather: {
      temp: forecast.temp,
      wind_speed: forecast.windSpeed,
      wind_dir: forecast.windDir,
    },
    park_factor: pf,
  };
}
