import { NextResponse } from "next/server";
import { getHypeStatus } from "@/lib/hype-api";

export async function GET() {
  try {
    const status = await getHypeStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch HYPE status" }, { status: 500 });
  }
}
