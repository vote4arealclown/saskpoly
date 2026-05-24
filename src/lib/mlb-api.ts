const MLB_BASE = "https://statsapi.mlb.com/api/v1";

// All 30 MLB teams
export const MLB_TEAMS = [
  { id: 109, name: "Arizona Diamondbacks", abbr: "ARI" },
  { id: 144, name: "Atlanta Braves", abbr: "ATL" },
  { id: 110, name: "Baltimore Orioles", abbr: "BAL" },
  { id: 111, name: "Boston Red Sox", abbr: "BOS" },
  { id: 112, name: "Chicago Cubs", abbr: "CHC" },
  { id: 145, name: "Chicago White Sox", abbr: "CWS" },
  { id: 113, name: "Cincinnati Reds", abbr: "CIN" },
  { id: 114, name: "Cleveland Guardians", abbr: "CLE" },
  { id: 115, name: "Colorado Rockies", abbr: "COL" },
  { id: 116, name: "Detroit Tigers", abbr: "DET" },
  { id: 117, name: "Houston Astros", abbr: "HOU" },
  { id: 118, name: "Kansas City Royals", abbr: "KC" },
  { id: 108, name: "Los Angeles Angels", abbr: "LAA" },
  { id: 119, name: "Los Angeles Dodgers", abbr: "LAD" },
  { id: 146, name: "Miami Marlins", abbr: "MIA" },
  { id: 158, name: "Milwaukee Brewers", abbr: "MIL" },
  { id: 142, name: "Minnesota Twins", abbr: "MIN" },
  { id: 121, name: "New York Mets", abbr: "NYM" },
  { id: 147, name: "New York Yankees", abbr: "NYY" },
  { id: 133, name: "Oakland Athletics", abbr: "OAK" },
  { id: 143, name: "Philadelphia Phillies", abbr: "PHI" },
  { id: 134, name: "Pittsburgh Pirates", abbr: "PIT" },
  { id: 135, name: "San Diego Padres", abbr: "SD" },
  { id: 137, name: "San Francisco Giants", abbr: "SF" },
  { id: 136, name: "Seattle Mariners", abbr: "SEA" },
  { id: 138, name: "St. Louis Cardinals", abbr: "STL" },
  { id: 139, name: "Tampa Bay Rays", abbr: "TB" },
  { id: 140, name: "Texas Rangers", abbr: "TEX" },
  { id: 141, name: "Toronto Blue Jays", abbr: "TOR" },
  { id: 120, name: "Washington Nationals", abbr: "WSH" },
];

const TEAM_BY_ID: Record<number, typeof MLB_TEAMS[0]> = {};
for (const t of MLB_TEAMS) TEAM_BY_ID[t.id] = t;

export function getTeamById(teamId: number) {
  return TEAM_BY_ID[teamId];
}

export function teamName(teamId: number) {
  return getTeamById(teamId)?.name || "Unknown";
}

// Venue coordinates (lat, lon)
const VENUE_COORDS: Record<number, [number, number]> = {
  14: [43.6414, -79.3894],    // Rogers Centre
  2392: [44.9817, -93.2783],  // Target Field
  3313: [42.3467, -71.0972],  // Fenway Park
  3: [40.8296, -73.9262],     // Yankee Stadium
  12: [39.2841, -76.6216],    // Camden Yards
  5: [27.7683, -82.6534],     // Tropicana Field
  2394: [41.8299, -87.6338],  // Guaranteed Rate
  2395: [41.4962, -81.6852],  // Progressive Field
  2396: [42.3389, -83.0485],  // Comerica Park
  2397: [39.0517, -94.4803],  // Kauffman Stadium
  2399: [47.5914, -122.3327], // T-Mobile Park
  2400: [37.7516, -122.2005], // Oakland Coliseum
  2401: [33.8003, -117.8827], // Angel Stadium
  2402: [32.7073, -117.1566], // Petco Park
  2403: [37.7786, -122.3893], // Oracle Park
  2404: [34.0739, -118.2400], // Dodger Stadium
  2405: [33.4453, -112.0669], // Chase Field
  2406: [39.7561, -104.9941], // Coors Field
  2407: [29.7573, -95.3555],  // Minute Maid Park
  2408: [32.7513, -97.0826],  // Globe Life Field
  2409: [30.3243, -81.6378],  // LoanDepot Park
  2410: [33.7348, -84.3899],  // Truist Park
  2412: [40.4406, -80.0059],  // PNC Park
  2413: [39.0979, -84.5082],  // Great American
  2414: [43.0280, -87.9712],  // American Family Field
  2415: [41.9483, -87.6555],  // Wrigley Field
  2680: [38.6226, -90.1928],  // Busch Stadium
  3309: [40.7571, -73.8458],  // Citi Field
  3310: [39.9061, -75.1665],  // Citizens Bank Park
  3311: [38.8730, -77.0074],  // Nationals Park
};

// Park HR factors (3-year rolling approximations)
const PARK_HR_FACTORS: Record<number, number> = {
  14: 1.08,   // Rogers Centre
  2392: 1.02, // Target Field
  3313: 1.15, // Fenway
  3: 1.10,    // Yankee Stadium
  12: 1.05,   // Camden Yards
  5: 0.95,    // Tropicana
  2394: 1.12, // Guaranteed Rate
  2395: 0.98, // Progressive
  2396: 0.92, // Comerica
  2397: 0.88, // Kauffman
  2399: 0.90, // T-Mobile
  2400: 0.85, // Oakland
  2401: 0.95, // Angel Stadium
  2402: 0.92, // Petco
  2403: 0.82, // Oracle
  2404: 1.05, // Dodger
  2405: 1.08, // Chase
  2406: 1.35, // Coors
  2407: 1.12, // Minute Maid
  2408: 0.98, // Globe Life
  2409: 0.88, // LoanDepot
  2410: 1.02, // Truist
  2412: 0.90, // PNC
  2413: 1.18, // Great American
  2414: 1.05, // American Family
  2415: 1.10, // Wrigley
  2680: 0.92, // Busch
  3309: 0.95, // Citi Field
  3310: 1.08, // Citizens Bank
  3311: 0.92, // Nationals
};

async function apiGet(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getSchedule(teamId: number = 141, daysBack = 7, daysFwd = 7) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - daysBack);
  const end = new Date(today);
  end.setDate(today.getDate() + daysFwd);

  const url =
    `${MLB_BASE}/schedule?teamId=${teamId}&season=${today.getFullYear()}&sportId=1&gameType=R` +
    `&startDate=${start.toISOString().split("T")[0]}&endDate=${end.toISOString().split("T")[0]}`;
  return apiGet(url);
}

export async function getGameDetails(gamePk: string | number) {
  return apiGet(`${MLB_BASE}.1/game/${gamePk}/feed/live`);
}

export async function getTeamRecord(teamId: number) {
  const year = new Date().getFullYear();
  const data = await apiGet(`${MLB_BASE}/standings?leagueId=103,104&season=${year}&sportId=1&standingsTypes=regularSeason`);
  for (const record of data?.records || []) {
    for (const team of record?.teamRecords || []) {
      if (team?.team?.id === teamId) {
        const wins = team.wins || 0;
        const losses = team.losses || 0;
        return { w: wins, l: losses, pct: wins + losses > 0 ? wins / (wins + losses) : 0.5 };
      }
    }
  }
  return { w: 0, l: 0, pct: 0.5 };
}

export async function getLastNGames(n: number, teamId: number = 141) {
  const schedule = await getSchedule(teamId, n + 2, 0);
  const games: any[] = [];
  for (const d of schedule?.dates || []) {
    for (const g of d.games || []) {
      if (g.status?.detailedState === "Final") games.push(g);
    }
  }
  return games.slice(-n);
}

export async function getHeadToHead(opponentId: number, teamId: number = 141) {
  const year = new Date().getFullYear();
  const url = `${MLB_BASE}/schedule?teamId=${teamId}&opponentId=${opponentId}&season=${year}&sportId=1&gameType=R`;
  const data = await apiGet(url);
  const games: any[] = [];
  for (const d of data?.dates || []) {
    for (const g of d.games || []) {
      if (g.status?.detailedState === "Final") games.push(g);
    }
  }
  let wins = 0;
  for (const g of games) {
    const side = g.teams.away.team.id === teamId ? "away" : "home";
    if (g.teams[side].isWinner) wins++;
  }
  return { total: games.length, wins };
}

export async function getPitcherMetrics(pitcherId: number) {
  const data = await apiGet(`${MLB_BASE}/people/${pitcherId}?hydrate=stats(group=[pitching],type=[season])`);
  const stats = data?.people?.[0]?.stats?.[0]?.splits?.[0]?.stat;
  if (!stats) return null;
  const ipStr = String(stats.inningsPitched || "0");
  const ip = parseFloat(ipStr.replace(".1", ".33").replace(".2", ".67")) || 0;
  return {
    era: parseFloat(stats.era) || 4.5,
    whip: parseFloat(stats.whip) || 1.35,
    k9: parseFloat(stats.strikeoutsPer9Inn) || 8.0,
    bb9: parseFloat(stats.basesOnBallsPer9Inn) || 3.0,
    hr9: parseFloat(stats.homeRunsPer9) || 1.2,
    ip,
    games: parseInt(stats.gamesPlayed) || 0,
    gamesStarted: parseInt(stats.gamesStarted) || 0,
  };
}

export async function getBullpenProxy(teamId: number) {
  const data = await apiGet(
    `${MLB_BASE}/teams/${teamId}/stats?group=pitching&season=${new Date().getFullYear()}&stats=season`
  );
  const stats = data?.stats?.[0]?.splits?.[0]?.stat;
  if (!stats) return null;
  return {
    era: parseFloat(stats.era) || 4.0,
    whip: parseFloat(stats.whip) || 1.35,
    k9: parseFloat(stats.strikeoutsPer9Inn) || 8.5,
  };
}

export async function getTrueBullpenStats(teamId: number) {
  try {
    const roster = await apiGet(`${MLB_BASE}/teams/${teamId}/roster?rosterType=active`);
    const relievers: any[] = [];

    for (const person of roster?.roster || []) {
      const pos = person?.position?.abbreviation || "";
      if (pos !== "P") continue;
      const pid = person.person?.id;
      const stats = await getPitcherMetrics(pid);
      if (!stats) continue;
      const gs = stats.gamesStarted || 0;
      const games = stats.games || 0;
      if (games === 0) continue;
      if (gs / games >= 0.5) continue; // Skip starters
      if (stats.ip < 1) continue;
      relievers.push(stats);
    }

    if (relievers.length === 0) {
      return getBullpenProxy(teamId);
    }

    const totalIp = relievers.reduce((sum, r) => sum + (r.ip || 0), 0);
    if (totalIp <= 0) return getBullpenProxy(teamId);

    return {
      era: relievers.reduce((sum, r) => sum + (r.era || 4.5) * (r.ip || 0), 0) / totalIp,
      whip: relievers.reduce((sum, r) => sum + (r.whip || 1.35) * (r.ip || 0), 0) / totalIp,
      k9: relievers.reduce((sum, r) => sum + (r.k9 || 8.5) * (r.ip || 0), 0) / totalIp,
      relievers: relievers.length,
      totalIp,
    };
  } catch {
    return getBullpenProxy(teamId);
  }
}

export async function getWeatherForecast(venueId: number) {
  const coords = VENUE_COORDS[venueId];
  if (!coords) {
    return { temp: null, humidity: null, windSpeed: 0, windDir: "Unknown", condition: "Unknown" };
  }
  const [lat, lon] = coords;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m` +
    `&temperature_unit=fahrenheit&windspeed_unit=mph`;

  const data = await apiGet(url);
  if (!data?.current) {
    return { temp: null, humidity: null, windSpeed: 0, windDir: "Unknown", condition: "Unknown" };
  }
  const cw = data.current;
  const deg = cw.wind_direction_10m || 0;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const windDir = dirs[Math.round(deg / 22.5) % 16];

  return {
    temp: cw.temperature_2m,
    humidity: cw.relative_humidity_2m,
    windSpeed: cw.wind_speed_10m || 0,
    windDir,
    condition: cw.is_day ? "Day" : "Night",
  };
}

export function getParkFactor(venueId: number) {
  return PARK_HR_FACTORS[venueId] || 1.0;
}

export function windBonus(windSpeed: number, windDirection: string) {
  if (windSpeed >= 15 && (windDirection.includes("Out") || windDirection.includes("out"))) return 20.0;
  if (windSpeed >= 10 && (windDirection.includes("Out") || windDirection.includes("out"))) return 12.0;
  if (windSpeed >= 5 && (windDirection.includes("Out") || windDirection.includes("out"))) return 4.0;
  return 0.0;
}

export function tempBonus(tempF: number | null) {
  if (tempF === null) return 0.0;
  if (tempF >= 85) return 8.0;
  if (tempF >= 75) return 4.0;
  if (tempF >= 65) return 2.0;
  return 0.0;
}

export function humidityBonus(humidityPct: number | null) {
  if (humidityPct === null) return 0.0;
  if (humidityPct >= 75) return 3.0;
  if (humidityPct >= 60) return 1.5;
  if (humidityPct <= 25) return -1.0;
  return 0.0;
}

export function getVenueLocation(game: any) {
  const venue = game?.venue;
  if (!venue) return null;
  if (venue.location?.defaultCoordinates) {
    return {
      lat: venue.location.defaultCoordinates.latitude,
      lon: venue.location.defaultCoordinates.longitude,
    };
  }
  if (venue.id) {
    const coords = VENUE_COORDS[venue.id];
    if (coords) return { lat: coords[0], lon: coords[1] };
  }
  return null;
}

export async function getNextGame(teamId: number = 141) {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + 7);
  const url =
    `${MLB_BASE}/schedule?teamId=${teamId}` +
    `&startDate=${today.toISOString().split("T")[0]}` +
    `&endDate=${end.toISOString().split("T")[0]}` +
    `&sportId=1&gameType=R&hydrate=team,venue,weather,probablePitcher`;
  const data = await apiGet(url);
  for (const d of data?.dates || []) {
    for (const g of d.games || []) {
      if (!["Final", "Game Over", "Completed Early"].includes(g.status?.detailedState)) {
        return g;
      }
    }
  }
  return null;
}

export async function getAllGamesForDate(dateStr: string) {
  const url = `${MLB_BASE}/schedule?sportId=1&gameType=R&date=${dateStr}&hydrate=team,venue,probablePitcher`;
  const data = await apiGet(url);
  return data?.dates?.[0]?.games || [];
}

export async function getVsPitcherStats(batterId: number, pitcherId: number | null) {
  if (!pitcherId || !batterId) return { vsHr: 0, vsOps: 0.0, vsAb: 0 };
  const url =
    `${MLB_BASE}/people/${batterId}/stats?stats=vsPlayer&opposingPlayerId=${pitcherId}&group=hitting&gameType=R`;
  const data = await apiGet(url);
  for (const sg of data?.stats || []) {
    if (sg?.type?.displayName === "vsPlayerTotal") {
      for (const split of sg.splits || []) {
        const s = split.stat || {};
        return {
          vsHr: parseInt(s.homeRuns) || 0,
          vsOps: parseFloat(s.ops) || 0.0,
          vsAb: parseInt(s.atBats) || 0,
        };
      }
    }
  }
  return { vsHr: 0, vsOps: 0.0, vsAb: 0 };
}
