import { NextResponse } from "next/server";

interface NewsItem {
  source: string;
  title: string;
  url: string;
  date: string;
}

const RSS_SOURCES = [
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
];

async function fetchRssNews(): Promise<NewsItem[]> {
  const mentions: NewsItem[] = [];
  const seen = new Set<string>();

  for (const source of RSS_SOURCES) {
    try {
      const res = await fetch(source.url, { next: { revalidate: 300 } });
      if (!res.ok) continue;
      const text = await res.text();

      // Simple regex-based RSS parsing (no XML parser in edge runtime)
      const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of itemMatches.slice(0, 10)) {
        const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

        const title = titleMatch?.[1]?.trim() || "";
        const url = linkMatch?.[1]?.trim() || "";
        const date = dateMatch?.[1]?.trim() || "";

        const textLower = title.toLowerCase();
        if (textLower.includes("hype") || textLower.includes("hyperliquid")) {
          const key = title.slice(0, 60);
          if (!seen.has(key)) {
            seen.add(key);
            mentions.push({ source: source.name, title, url, date });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return mentions.slice(0, 10);
}

export async function GET() {
  try {
    const news = await fetchRssNews();
    return NextResponse.json({ news, fetched_at: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch news" }, { status: 500 });
  }
}
