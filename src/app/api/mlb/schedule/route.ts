import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&date=${date}&hydrate=team,venue,probablePitcher`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "MLB API error" }, { status: 502 });
    }

    const data = await res.json();
    const games = data?.dates?.[0]?.games || [];

    return NextResponse.json({ games, date });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch schedule" }, { status: 500 });
  }
}
